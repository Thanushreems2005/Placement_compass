"""
JSON Recovery Utilities
========================
Robust JSON repair and partial extraction recovery for truncated or
malformed LLM responses. Extends and replaces the basic `repair_json_structure`
helper in normalization.py.

Features:
  - Multi-pass repair pipeline (markdown strip → comment removal → brace balance)
  - Truncated-response recovery (extract complete key-value pairs before cutoff)
  - Schema-safe normalization (coerce primitive types per field expectations)
  - Partial batch salvage (extract as many fields as possible even on parse fail)
  - Never raises — always returns a dict (empty on total failure)
"""

import json
import re
import logging
from typing import Any, Dict, List, Optional, Type

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pass 1: Markdown & comment stripping
# ---------------------------------------------------------------------------

def _strip_markdown(text: str) -> str:
    text = re.sub(r"```json\s*", "", text)
    text = re.sub(r"```\s*", "", text)
    return text


def _strip_comments(text: str) -> str:
    text = re.sub(r"//[^\n]*", "", text)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return text


def _fix_trailing_commas(text: str) -> str:
    return re.sub(r",\s*([\]}])", r"\1", text)


# ---------------------------------------------------------------------------
# Pass 2: Brace balancing (truncated response recovery)
# ---------------------------------------------------------------------------

def _balance_braces(text: str) -> str:
    """
    Attempts to close any unclosed braces/brackets/quotes so json.loads can parse
    as much of the response as possible.
    """
    text = text.rstrip()
    if text.endswith(":"):
        text += "null"
    elif text.endswith(","):
        text = text[:-1]

    in_string = False
    escaped = False
    for ch in text:
        if ch == '"' and not escaped:
            in_string = not in_string
        if ch == '\\' and not escaped:
            escaped = True
        else:
            escaped = False

    if in_string:
        text += '"'

    stack = []
    closing = {"{": "}", "[": "]"}
    result = []

    for ch in text:
        result.append(ch)
        if ch in ("{", "[") and not in_string:
            stack.append(closing[ch])
        elif ch in ("}", "]") and not in_string:
            if stack and stack[-1] == ch:
                stack.pop()
        elif ch == '"' and not escaped:
            in_string = not in_string
        if ch == '\\' and not escaped:
            escaped = True
        else:
            escaped = False

    # Close all unclosed openers in reverse order
    while stack:
        result.append(stack.pop())

    return "".join(result)


# ---------------------------------------------------------------------------
# Pass 3: Key quoting fix (common in small models)
# ---------------------------------------------------------------------------

def _fix_unquoted_keys(text: str) -> str:
    """Quotes bare identifier keys: {foo: 1} → {"foo": 1}"""
    return re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', text)


# ---------------------------------------------------------------------------
# Primary entry point: multi-pass repair
# ---------------------------------------------------------------------------

def repair_json(raw_text: str) -> str:
    """
    Multi-pass JSON repair pipeline. Returns a cleaned JSON string.
    Always safe to pass to json.loads — worst case returns "{}".
    """
    if not raw_text or not raw_text.strip():
        return "{}"

    text = _strip_markdown(raw_text)
    text = _strip_comments(text)
    text = _fix_trailing_commas(text)
    text = _fix_unquoted_keys(text)

    # Find the outermost JSON object
    start = text.find("{")
    if start == -1:
        # Maybe it's an array? Try anyway.
        start = text.find("[")
        if start == -1:
            return "{}"

    # Find the best closing brace
    end = text.rfind("}")
    if end != -1 and end > start:
        candidate = text[start:end + 1]
    else:
        # Truncated — balance braces from start
        candidate = _balance_braces(text[start:])

    candidate = _fix_trailing_commas(candidate)
    return candidate.strip()


# ---------------------------------------------------------------------------
# Safe parse with fallback
# ---------------------------------------------------------------------------

def safe_parse_json(raw_text: str) -> Dict[str, Any]:
    """
    Attempts to parse raw LLM output as JSON using the multi-pass repair
    pipeline. Returns {} on total failure — never raises.
    """
    repaired = repair_json(raw_text)

    # Attempt 1: repaired string
    try:
        result = json.loads(repaired)
        if isinstance(result, dict):
            return result
        if isinstance(result, list) and result and isinstance(result[0], dict):
            return result[0]
        return {}
    except Exception:
        pass

    # Attempt 2: find first complete {...} in original text
    try:
        match = re.search(r"\{[^{}]*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass

    logger.warning(f"[JSON RECOVERY] Total parse failure. Raw preview: {raw_text[:120]!r}")
    return {}


# ---------------------------------------------------------------------------
# Partial field salvage (regex fallback per field)
# ---------------------------------------------------------------------------

def salvage_fields(raw_text: str, field_names: List[str]) -> Dict[str, Any]:
    """
    When json.loads completely fails, attempts to extract individual fields
    via regex. Captures strings, numbers, booleans, and null.

    Returns a dict of successfully salvaged field → value pairs.
    Only includes fields where a value was clearly found.
    """
    result: Dict[str, Any] = {}

    for field in field_names:
        # Pattern: "field_name": <value>
        # Handles: strings, numbers, true/false/null
        pattern = rf'"{re.escape(field)}"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)'
        match = re.search(pattern, raw_text)
        if match:
            raw_val = match.group(1).strip()
            try:
                parsed = json.loads(raw_val)
                # Only accept genuinely extracted values — not null
                if parsed is not None and parsed != "" and str(parsed).lower() not in ("null", "none", "n/a"):
                    result[field] = parsed
            except Exception:
                if raw_val and raw_val not in ('"null"', '"none"', '"n/a"', '""'):
                    result[field] = raw_val.strip('"')

    if result:
        logger.info(f"[JSON RECOVERY] Salvaged {len(result)}/{len(field_names)} fields via regex.")

    return result


# ---------------------------------------------------------------------------
# Schema-safe normalization
# ---------------------------------------------------------------------------

# Lightweight type inference from field name patterns
_STR_HINTS   = {"name", "url", "text", "title", "description", "address",
                "email", "phone", "handle", "status", "policy", "category",
                "label", "summary", "type", "mode", "market", "overview"}
_INT_HINTS   = {"year", "size", "count", "rank", "employees", "headcount"}
_FLOAT_HINTS = {"rating", "score", "rate", "growth", "ratio", "percentage",
                "valuation", "revenue", "profit", "salary", "nps"}
_LIST_HINTS  = {"stack", "partners", "channels", "technologies", "products",
                "competitors", "awards", "testimonials", "events", "tags"}
_BOOL_HINTS  = {"remote", "hybrid", "onsite", "sponsored", "listed",
                "public", "verified", "active"}


def normalize_field_value(field_name: str, value: Any) -> Any:
    """
    Coerces a raw extracted value to the most likely schema-safe type
    based on field name heuristics. Returns None for missing/null values.
    """
    if value is None or str(value).lower().strip() in ("null", "none", "n/a", "", "unknown"):
        return None

    fname_lower = field_name.lower()

    # Determine target type from name hints
    is_list  = any(h in fname_lower for h in _LIST_HINTS)
    is_bool  = any(h in fname_lower for h in _BOOL_HINTS)
    is_float = any(h in fname_lower for h in _FLOAT_HINTS)
    is_int   = any(h in fname_lower for h in _INT_HINTS)

    if is_list:
        if isinstance(value, list):
            return [v for v in value if v is not None]
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return [str(value)]

    if is_bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ("true", "yes", "1")
        return bool(value)

    if is_float:
        try:
            digits = re.sub(r"[^\d.]", "", str(value))
            return float(digits) if digits else None
        except Exception:
            return None

    if is_int:
        try:
            digits = re.sub(r"[^\d]", "", str(value))
            return int(digits) if digits else None
        except Exception:
            return None

    # Default: return as string
    return str(value).strip() if value is not None else None
