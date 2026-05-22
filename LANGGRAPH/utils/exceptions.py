"""
Production Exception Classification
=====================================
Centralised exception taxonomy for the Enterprise LangGraph pipeline.

All provider, network, and pipeline errors are classified into a small set
of canonical exception types so that circuit breakers, retry logic, and
observability tools have a single consistent vocabulary.
"""

from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Exception Taxonomy
# ---------------------------------------------------------------------------

class ErrorClass(str, Enum):
    """Canonical error classifications used across the pipeline."""
    RATE_LIMIT      = "rate_limit"       # 429 — transient, wait & retry
    QUOTA_EXHAUSTED = "quota_exhausted"  # daily/monthly cap hit — long cooldown
    TIMEOUT         = "timeout"          # asyncio.TimeoutError or httpx timeout
    JSON_PARSE      = "json_parse"       # LLM returned malformed JSON
    SCHEMA_MISMATCH = "schema_mismatch"  # Pydantic validation failure
    AUTH_FAILURE    = "auth_failure"     # 401/403 — key invalid/missing
    PROVIDER_DOWN   = "provider_down"    # 5xx / connection refused
    CIRCUIT_BROKEN  = "circuit_broken"   # internal circuit breaker tripped
    CONTENT_FILTER  = "content_filter"   # provider safety filter triggered
    UNKNOWN         = "unknown"          # catch-all


# ---------------------------------------------------------------------------
# Pipeline Exception Base
# ---------------------------------------------------------------------------

class PipelineError(Exception):
    """
    Base exception for all Enterprise LangGraph pipeline errors.
    Carries classification, provider context, and retriability flag.
    """

    def __init__(
        self,
        message: str,
        error_class: ErrorClass = ErrorClass.UNKNOWN,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        section: Optional[str] = None,
        retriable: bool = True,
        raw_error: Optional[Exception] = None,
    ):
        super().__init__(message)
        self.error_class = error_class
        self.provider = provider
        self.model = model
        self.section = section
        self.retriable = retriable
        self.raw_error = raw_error

    def __str__(self) -> str:
        parts = [f"[{self.error_class.value}]"]
        if self.provider:
            parts.append(f"{self.provider}")
        if self.model:
            parts.append(f"/{self.model}")
        if self.section:
            parts.append(f"→{self.section}")
        parts.append(f": {self.args[0]}")
        return " ".join(parts)


# ---------------------------------------------------------------------------
# Typed Subclasses
# ---------------------------------------------------------------------------

class RateLimitError(PipelineError):
    def __init__(self, provider: str, model: str, section: str = "", raw_error: Optional[Exception] = None):
        super().__init__(
            f"Rate limit exceeded",
            error_class=ErrorClass.RATE_LIMIT,
            provider=provider, model=model, section=section,
            retriable=True, raw_error=raw_error
        )


class QuotaExhaustedError(PipelineError):
    def __init__(self, provider: str, model: str, raw_error: Optional[Exception] = None):
        super().__init__(
            f"Daily quota exhausted — long cooldown required",
            error_class=ErrorClass.QUOTA_EXHAUSTED,
            provider=provider, model=model,
            retriable=False, raw_error=raw_error
        )


class ProviderTimeoutError(PipelineError):
    def __init__(self, provider: str, model: str, section: str = "", timeout_s: float = 30.0):
        super().__init__(
            f"Provider call timed out after {timeout_s}s",
            error_class=ErrorClass.TIMEOUT,
            provider=provider, model=model, section=section,
            retriable=True
        )


class JsonParseError(PipelineError):
    def __init__(self, provider: str, model: str, section: str = "", preview: str = ""):
        super().__init__(
            f"Malformed JSON response. Preview: {preview[:80]!r}",
            error_class=ErrorClass.JSON_PARSE,
            provider=provider, model=model, section=section,
            retriable=True
        )


class SchemaMismatchError(PipelineError):
    def __init__(self, provider: str, model: str, section: str = "", detail: str = ""):
        super().__init__(
            f"Schema validation failed: {detail}",
            error_class=ErrorClass.SCHEMA_MISMATCH,
            provider=provider, model=model, section=section,
            retriable=False   # type mismatch won't self-correct on retry
        )


class AuthFailureError(PipelineError):
    def __init__(self, provider: str, model: str = ""):
        super().__init__(
            f"Authentication failure — check API key",
            error_class=ErrorClass.AUTH_FAILURE,
            provider=provider, model=model,
            retriable=False
        )


class CircuitBrokenError(PipelineError):
    def __init__(self, provider: str, model: str, cooldown_s: float = 0):
        super().__init__(
            f"Circuit breaker open (cooldown: {cooldown_s:.0f}s)",
            error_class=ErrorClass.CIRCUIT_BROKEN,
            provider=provider, model=model,
            retriable=False
        )


class ContentFilterError(PipelineError):
    def __init__(self, provider: str, model: str, section: str = ""):
        super().__init__(
            f"Content filtered by provider safety system",
            error_class=ErrorClass.CONTENT_FILTER,
            provider=provider, model=model, section=section,
            retriable=False
        )


# ---------------------------------------------------------------------------
# Error Classifier Utility
# ---------------------------------------------------------------------------

def classify_error(error: Exception, provider: str = "", model: str = "",
                   section: str = "") -> PipelineError:
    """
    Converts any raw exception into a typed PipelineError.
    Call this in the except block of every LLM call wrapper.
    """
    msg = str(error).lower()

    if "429" in msg or "rate limit" in msg or "too_many_requests" in msg:
        # Distinguish daily quota vs per-minute rate limit
        if any(kw in msg for kw in ("day", "daily", "quota", "per day", "tokens per day")):
            return QuotaExhaustedError(provider, model, raw_error=error)
        return RateLimitError(provider, model, section, raw_error=error)

    if "401" in msg or "403" in msg or "authentication" in msg or "invalid api" in msg:
        return AuthFailureError(provider, model)

    if "timeout" in msg or "timed out" in msg:
        return ProviderTimeoutError(provider, model, section)

    if "5xx" in msg or "500" in msg or "502" in msg or "503" in msg or "connection" in msg:
        return PipelineError(
            "Provider server error or unreachable",
            error_class=ErrorClass.PROVIDER_DOWN,
            provider=provider, model=model, section=section,
            retriable=True, raw_error=error
        )

    if "json" in msg or "parse" in msg or "decode" in msg:
        return JsonParseError(provider, model, section, preview=str(error))

    if "safety" in msg or "content_filter" in msg or "blocked" in msg:
        return ContentFilterError(provider, model, section)

    if "circuit" in msg:
        return CircuitBrokenError(provider, model)

    return PipelineError(
        str(error),
        error_class=ErrorClass.UNKNOWN,
        provider=provider, model=model, section=section,
        retriable=True, raw_error=error
    )
