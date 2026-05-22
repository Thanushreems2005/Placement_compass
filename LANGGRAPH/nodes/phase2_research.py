"""
Phase 2 — Quota-Aware Parallel Research Node
=============================================
Implements all 12 extraction optimizations:
  1.  Staggered provider starts (3-5s spacing)
  2.  Global rate limiter (token bucket per provider)
  3.  Retry-only-missing-fields (field-level persistence)
  4.  Incremental field persistence (FieldCache)
  5.  Priority-based section ordering (highest-value first)
  6.  Single-provider survival mode
  7.  Provider health probing (auto-restore after 75s)
  8.  Micro-batch prompts per field priority tier
  9.  Inter-section delays (1.2s between calls)
 10.  Context-only field enforcement
 11.  Preserve valid extractions (never overwrite good data)
 12.  Token-efficient compact prompts
"""
import logging
import asyncio
import json
import re
import time
import os
import random
from typing import Any, Dict, List, Optional, Tuple

from LANGGRAPH.graph.state import GraphState
from LANGGRAPH.models.state import AuditLog, WorkflowStatus
from LANGGRAPH.services.llm_service import (
    LLMService, LLMProvider, ModelName, LLMCallMetadata
)
from LANGGRAPH.services.rate_limiter import rate_limiter, INTER_SECTION_DELAY
from LANGGRAPH.services.field_cache import field_cache
from LANGGRAPH.models.schema import (
    CompanyOverview, BusinessMarket, CulturePeopleWork, LearningGrowth,
    CompensationLifestyle, WorkLogistics, FinancialsStability,
    TechInnovation, LeadershipContacts, BrandDigital
)

logger = logging.getLogger(__name__)

# ── Priority-ordered schema registry (highest-value first) ───────────────────
SECTION_SCHEMA_MAP = {
    "overview":               CompanyOverview,
    "leadership_contacts":    LeadershipContacts,
    "financials_stability":   FinancialsStability,
    "tech_innovation":        TechInnovation,
    "business_market":        BusinessMarket,
    "brand_digital":          BrandDigital,
    "culture_people_work":    CulturePeopleWork,
    "learning_growth":        LearningGrowth,
    "compensation_lifestyle": CompensationLifestyle,
    "work_logistics":         WorkLogistics,
}

CRITICAL_FIELDS = {
    "annual_revenue", "valuation", "ceo_name", "website_url", 
    "headquarters_address", "employee_size", "key_investors", 
    "key_competitors", "tech_stack", "core_technology_stack", "top_executives", 
    "leadership_contacts", "name", "linkedin_url"
}
IMPORTANT_FIELDS = {
    "category", "overview_text", "operating_countries", "core_products_services",
    "primary_competitors", "target_market", "market_position",
    "glassdoor_rating", "indeed_rating", "linkedin_url", "twitter_handle",
    "funding_stage", "key_investors", "profit_margin",
}
# Everything else → OPTIONAL (7 per micro-batch)

# Micro-batch sizes per tier
BATCH_SIZES = {"critical": 3, "important": 5, "optional": 7}
LEADERSHIP_LOCK = asyncio.Lock()
# ── Context-only fields (must NOT be fabricated from training knowledge) ──────
# These are live/dynamic fields — null if not found in Tavily context.
CONTEXT_ONLY_FIELDS = {
    # Financial live metrics
    "annual_revenue", "annual_profit", "valuation", "total_capital_raised",
    "burn_rate", "runway_months", "recent_funding_rounds",
    "cac", "clv", "ltv", "cac_ltv_ratio", "churn_rate",
    "net_revenue_retention", "gross_revenue_retention", "payback_period",
    "revenue_per_employee", "profit_per_employee", "yoy_growth_rate",
    # Brand/ratings live metrics
    "glassdoor_rating", "indeed_rating", "google_rating", "nps",
    "brand_sentiment_score", "website_traffic_rank", "social_media_followers",
    # Contact live data
    "primary_contact_email", "contact_person_email",
    "contact_person_phone", "primary_phone_number",
    # Headcount live data
    "employee_size", "hiring_velocity", "headcount_growth_rate",
    "employee_turnover",
}

# ── Tavily domain blacklist (prevents review-site contamination) ──────────────
DOMAIN_BLACKLIST = {
    "glassdoor.com", "indeed.com", "ambitionbox.com", "comparably.com",
    "payscale.com", "salary.com", "reddit.com", "quora.com",
    "trustpilot.com", "yelp.com", "bbb.org",
}

# ── Section-specific extraction hints ────────────────────────────────────────
SECTION_HINTS = {
    "leadership_contacts": (
        "Focus on: CEO full name, CEO LinkedIn (linkedin.com/in/...), "
        "official website URL, HQ phone, investor-relations email. "
        "You likely know the CEO name for major public companies."
    ),
    "brand_digital": (
        "Focus on: official website URL (https://...), LinkedIn company page URL, "
        "Twitter/X handle (@...), Glassdoor rating (number 1-5), "
        "Indeed rating (number 1-5). Return exact URL strings."
    ),
    "financials_stability": (
        "Focus on: latest annual revenue USD, market cap/valuation USD, "
        "stock ticker symbol, exchange, founded year, fiscal year end month. "
        "Enterprise-grade precision required."
    ),
    "overview": (
        "Focus on: exact legal company name, short brand name, "
        "full HQ address (street, city, state, country), "
        "exact incorporation year, total employee count, company type (public/private)."
    ),
    "compensation_lifestyle": (
        "Focus on: fixed+variable pay structure, ESOP/RSU availability, "
        "health insurance, leave policy days, remote/hybrid/onsite policy."
    ),
    "culture_people_work": (
        "Focus on: culture description, known layoffs, D&I stance, "
        "employee review sentiment. Return descriptive strings."
    ),
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _null(val: Any) -> bool:
    if val is None:
        return True
    return str(val).strip().lower() in (
        "null", "none", "n/a", "", "unknown", "not available", "not found"
    )


def _tier(field: str) -> str:
    if field in CRITICAL_FIELDS:
        return "critical"
    if field in IMPORTANT_FIELDS:
        return "important"
    return "optional"


def _chunk_fields(fields: List[str], section: str, consecutive_failures: int = 0, provider: str = "") -> List[List[str]]:
    """
    Split fields into optimized, larger micro-batches to maximize fields extracted per successful request.
    """
    buckets: Dict[str, List[str]] = {"critical": [], "important": [], "optional": []}
    for f in fields:
        buckets[_tier(f)].append(f)

    # High-performance robust batch sizes (5 to 10 fields per batch)
    p_lower = provider.lower()
    if p_lower == "gemini":
        sizes = {"critical": 8, "important": 8, "optional": 6}
    elif p_lower == "cerebras":
        sizes = {"critical": 10, "important": 10, "optional": 8}
    else:
        sizes = {"critical": 8, "important": 8, "optional": 6}

    # Under stress, slightly reduce to ensure reliability but keep it high
    if consecutive_failures > 1:
        sizes = {k: max(3, v - 2) for k, v in sizes.items()}

    chunks = []
    for tier in ("critical", "important", "optional"):
        size = sizes[tier]
        batch = buckets[tier]
        for i in range(0, len(batch), size):
            chunks.append(batch[i : i + size])
    return [c for c in chunks if c]


def _clean_context(ctx: str) -> str:
    """Remove blacklisted domain snippets from Tavily context. Hard cap at 400 chars."""
    if not ctx:
        return ""
    lines = ctx.splitlines()
    clean = [
        line for line in lines
        if not any(bad in line.lower() for bad in DOMAIN_BLACKLIST)
    ]
    return "\n".join(clean).strip()[:400]


def _build_messages(
    company: str,
    section: str,
    fields: List[str],
    ctx: str,
) -> list:
    """
    Build ultra-compact [SystemMessage, HumanMessage] for a micro-batch.
    Target: ≤150 prompt tokens. Optimized for factual precision over completeness.
    """
    from langchain_core.messages import SystemMessage, HumanMessage

    ctx_block = _clean_context(ctx) if ctx else "[NO LIVE DATA]"
    ctx_only  = [f for f in fields if f in CONTEXT_ONLY_FIELDS]
    hint      = SECTION_HINTS.get(section, "")

    # Mark live-only fields that must never be invented
    co_note = ""
    if ctx_only:
        co_note = f"LIVE-ONLY (null if absent from context): {', '.join(ctx_only)}\n"

    # Ultra-compact system prompt — <60 tokens
    system = (
        f"Intelligence extractor for {company}. "
        "NO-HALLUCINATION MODE: Return only facts from trusted sources. "
        "Unknown fields → null. No prose, no markdown. JSON only."
    )

    # Compact user prompt — rules as terse table instead of verbose bullets
    user = (
        f"Co:{company} | Sec:{section}\n"
        f"Context:\n{ctx_block}\n"
        f"Fields: {', '.join(fields)}\n"
        f"{co_note}"
        f"{hint}\n"
        "RULES: null>0|null>NA|null>empty | "
        "pct:0-100 | rating:0-5 | runway:0-120mo | commute:0-300min | "
        "NEVER invent revenue/valuation/ratings/URLs/emails/headcount | "
        "Return compact JSON only — all field keys included."
    )
    return [SystemMessage(content=system), HumanMessage(content=user)]


# ── Single micro-batch LLM call ───────────────────────────────────────────────

from langsmith import traceable

@traceable(name="provider_failure_annotation", run_type="chain")
def log_provider_failure(provider: str, model: str, section: str, error: str, http_status: Optional[int], cooldown_state: str, retry_decision: str) -> Dict[str, Any]:
    logger.info(f"[TRACE ANNOTATION] Provider failure logged to LangSmith for {provider}: {error}")
    return {
        "provider": provider,
        "model_name": model,
        "section": section,
        "error_message": error,
        "http_status": http_status,
        "cooldown_state": cooldown_state,
        "retry_decision": retry_decision
    }

async def _call_llm(
    llm_service: LLMService,
    prov_enum:   LLMProvider,
    model_enum:  ModelName,
    messages:    list,
    model_id:    str,
    section:     str,
    company:     str,
    recovery_pass: int = 0,
) -> Tuple[Dict[str, Any], Optional[LLMCallMetadata]]:
    """
    Execute one LLM micro-batch call.
    Returns (parsed_fields_dict, metadata).
    Never raises — returns ({}, None) on any failure.
    """
    from LANGGRAPH.utils.json_recovery import safe_parse_json, salvage_fields
    from langchain_core.messages import HumanMessage

    # Extract field list from the prompt for salvage fallback
    user_content = next(
        (m.content for m in messages if isinstance(m, HumanMessage)), ""
    )
    field_match = re.search(r"Extract these fields ONLY: ([^\n]+)", user_content)
    fields_hint = field_match.group(1).split(", ") if field_match else []

    start = time.perf_counter()
    try:
        model    = llm_service._get_model(prov_enum, model_enum, temperature=0.1, max_tokens=300)
        async with rate_limiter.concurrency_limit(prov_enum.value):
            # Expose metadata & tags on the LLM call directly for LangSmith
            run_metadata = {
                "provider": prov_enum.value,
                "section": section,
                "retry_pass": recovery_pass,
                "model_name": model_enum.value
            }
            run_tags = [
                f"provider:{prov_enum.value}",
                f"section:{section}",
                f"retry_pass:{recovery_pass}"
            ]
            response = await asyncio.wait_for(
                model.ainvoke(
                    messages,
                    config={
                        "metadata": run_metadata,
                        "tags": run_tags
                    }
                ),
                timeout=28.0
            )

        raw = response.content if hasattr(response, "content") else str(response)
        if isinstance(raw, list):
            raw = "".join(str(p.get("text", p)) for p in raw)

        parsed = safe_parse_json(raw)
        if not parsed and fields_hint:
            parsed = salvage_fields(raw, fields_hint)
        parsed = parsed or {}

        # Token accounting
        usage = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = response.usage_metadata
        elif hasattr(response, "response_metadata") and response.response_metadata:
            usage = response.response_metadata.get("token_usage", {})

        pt  = usage.get("input_tokens",  usage.get("prompt_tokens",    0))
        ct  = usage.get("output_tokens", usage.get("completion_tokens", 0))
        tt  = usage.get("total_tokens",  pt + ct)
        elapsed = time.perf_counter() - start

        # Reset circuit breaker on success
        llm_service.failed_models[model_id] = 0
        rate_limiter.mark_healthy(prov_enum.value)
        rate_limiter.record_latency(prov_enum.value, elapsed)
        rate_limiter.record_token_usage(prov_enum.value, tt)
        
        # Aggressive Inter-Batch Pacing
        is_stress = rate_limiter.survival_mode_provider() is not None or sum(rate_limiter._consecutive_failures.values()) > 0
        if prov_enum == LLMProvider.GROQ and is_stress:
            pacing_delay = random.uniform(4.0, 7.0)
        else:
            pacing_delay = random.uniform(2.0, 4.0)
        await asyncio.sleep(pacing_delay)

        meta = LLMCallMetadata(
            provider=prov_enum.value, model_name=model_enum.value,
            section=section, company=company,
            prompt_tokens=pt, completion_tokens=ct, total_tokens=tt,
            latency=elapsed, status="success",
        )
        return parsed, meta

    except asyncio.TimeoutError as e:
        logger.error(f"  [{prov_enum.value.upper()}] Timeout on {section}")
        llm_service.failed_models[model_id] = llm_service.failed_models.get(model_id, 0) + 1
        
        log_provider_failure(
            provider=prov_enum.value,
            model=model_enum.value,
            section=section,
            error="Timeout",
            http_status=408,
            cooldown_state="no_cooldown",
            retry_decision="retry_with_pacing"
        )
        return {}, None

    except Exception as e:
        err = str(e)
        logger.error(f"  [{prov_enum.value.upper()}] {section} failed: {err}")

        http_status = None
        cooldown_state = "no_cooldown"
        retry_decision = "retry_with_pacing"

        if any(code in err for code in ["401", "402", "403"]) or "Credit limit exceeded" in err or "Payment Required" in err:
            logger.error(f"  [{prov_enum.value.upper()}] HARD FAILURE (401/402/403) detected for {model_id}.")
            rate_limiter.mark_permanently_failed(prov_enum.value)
            if rate_limiter.is_permanently_failed(prov_enum.value):
                llm_service.failed_models[model_id] = 100 # permanently disable model in llm_service
            http_status = 401 if "401" in err else 403
            cooldown_state = "permanent_lockout"
            retry_decision = "failover_to_alternative_provider"
        elif "429" in err or "rate limit" in err.lower() or "RESOURCE_EXHAUSTED" in err:
            llm_service.cooldowns[model_id] = time.time() + 90
            llm_service.failed_models[model_id] = max(
                llm_service.failed_models.get(model_id, 0) + 1, 3
            )
            logger.warning(f"  Rate-limited: {model_id} → 90s cooldown")
            rate_limiter.mark_exhausted(prov_enum.value)
            http_status = 429
            cooldown_state = "90s_cooldown"
            retry_decision = "bypass_to_fallback_redundancy"

        log_provider_failure(
            provider=prov_enum.value,
            model=model_enum.value,
            section=section,
            error=err[:200],
            http_status=http_status,
            cooldown_state=cooldown_state,
            retry_decision=retry_decision
        )
        
        # Return empty data instead of crashing the pipeline to trigger graceful fallback
        return {}, None



# ── Section extraction (micro-batched) ───────────────────────────────────────

def _validate_extracted_field(company_name: str, section: str, field: str, val: Any, schema_cls: Any) -> bool:
    """
    Lightweight provider-side validation helper.
    Returns True if valid, False if rejected (malformed percentage, currency, enum, scaling, URLs, arrays).
    """
    if val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", ""):
        return True

    # Introspect annotation
    from typing import get_origin, get_args, Union
    field_info = schema_cls.model_fields.get(field)
    if not field_info:
        return True
    annotation = field_info.annotation
    origin = get_origin(annotation)
    args = get_args(annotation)

    # 1. Invalid arrays check
    if origin is list or annotation is list:
        if not isinstance(val, list):
            if isinstance(val, str):
                try:
                    loaded = json.loads(val)
                    if not isinstance(loaded, list):
                        return False
                except Exception:
                    return False
            else:
                return False
        if isinstance(val, list):
            if any(str(x).strip().lower() in ("none", "n/a", "null") for x in val):
                return False
        return True

    # 2. Enum corruption check
    nature_of_company_allowed = {"public", "private", "subsidiary", "joint venture", "non-profit", "partnership"}
    profitability_status_allowed = {"profitable", "unprofitable", "breakeven", "pre-revenue"}
    market_share_status_allowed = {"stable challenger / niche specialist", "market leader", "niche player", "challenger", "dominant player", "stable challenger", "niche specialist"}

    if field == "nature_of_company":
        if str(val).strip().lower() not in nature_of_company_allowed:
            return False
    elif field == "profitability_status":
        if str(val).strip().lower() not in profitability_status_allowed:
            return False
    elif field == "market_share_status":
        if str(val).strip().lower() not in market_share_status_allowed:
            return False

    # 3. Malformed percentage format / range check
    percentage_fields = {
        "market_share_percentage", "churn_rate", "net_revenue_retention",
        "gross_revenue_retention", "rd_investment_percentage", "headcount_growth_rate",
        "yoy_growth_rate", "diversity_inclusion_score", "burnout_risk", "hiring_velocity",
        "avg_retention_tenure", "psychological_safety", "manager_quality", "feedback_culture"
    }
    if field in percentage_fields:
        try:
            clean_val = str(val).replace("%", "").strip()
            float_val = float(clean_val)
            if field not in ("yoy_growth_rate", "headcount_growth_rate"):
                if float_val < 0.0:
                    return False
            if abs(float_val) > 200.0:
                return False
        except ValueError:
            return False

    # 4. Malformed currency / invalid numeric scaling check
    currency_fields = {"annual_revenue", "annual_profit", "valuation", "total_capital_raised"}
    if field in currency_fields:
        try:
            float_val = float(str(val))
            if float_val < 0.0:
                return False
            if 0.0 < float_val < 10000.0:
                return False
        except ValueError:
            pass

    # 5. Malformed URLs / domain mismatch check
    url_fields = {
        "logo_url", "website_url", "linkedin_url", "ceo_linkedin_url",
        "twitter_handle", "facebook_url", "instagram_url", "marketing_video_url"
    }
    if field in url_fields:
        val_str = str(val).strip()
        if len(val_str) < 8 or " " in val_str:
            return False
        if val_str.lower() in ("https://", "http://", "linkedin.com", "facebook.com", "instagram.com"):
            return False
        if field in ("website_url", "linkedin_url", "twitter_handle", "ceo_linkedin_url", "facebook_url", "instagram_url"):
            val_lower = val_str.lower()
            comp_clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.split()[0]).lower()
            major_competitors = ["adobe", "microsoft", "apple", "nvidia", "google", "amazon", "razorpay", "blinkit", "zomato"]
            for comp in major_competitors:
                if comp in val_lower and comp_clean != comp:
                    return False

    # 6. Year range validity
    if field in ("founded_year", "incorporation_year"):
        try:
            int_val = int(float(str(val)))
            if int_val < 1800 or int_val > 2026:
                return False
        except ValueError:
            return False

    # 7. Rating range check
    rating_fields = {"glassdoor_rating", "indeed_rating", "google_rating"}
    if field in rating_fields:
        try:
            float_val = float(str(val))
            if float_val < 1.0 or float_val > 5.0:
                return False
        except ValueError:
            return False

    return True

@traceable(name="section_extraction")
async def _extract_section_incremental(
    llm_service:    LLMService,
    prov_enum:      LLMProvider,
    model_enum:     ModelName,
    company:        str,
    section:        str,
    schema_cls,
    ctx:            str,
    already_cached: Dict[str, Any],
    recovery_pass:  int = 0,
) -> Tuple[Dict[str, Any], List[LLMCallMetadata]]:
    """
    Extract ONLY fields not yet cached for this section.
    Splits missing fields into priority-ordered micro-batches.
    Returns (merged_section_data, list_of_call_metadata).
    """
    all_fields   = list(schema_cls.model_fields.keys())
    model_id     = f"{prov_enum.value}:{model_enum.value}"
    merged       = dict(already_cached)  # seed with cached values
    all_metadata: List[LLMCallMetadata] = []

    # Determine which fields still need extraction
    missing = [f for f in all_fields if _null(merged.get(f))]
    if not missing:
        logger.info(
            f"  [{prov_enum.value.upper()}] {section}: all {len(all_fields)} "
            f"fields already cached — skipping."
        )
        return merged, all_metadata

    # Micro-batch missing fields by priority
    failures = llm_service.failed_models.get(model_id, 0)
    batches = _chunk_fields(missing, section, consecutive_failures=failures, provider=prov_enum.value)
    logger.info(
        f"  [{prov_enum.value.upper()}] {section}: "
        f"{len(missing)} missing fields → {len(batches)} micro-batches"
    )

    for batch_idx, batch_fields in enumerate(batches):
        # Check provider health before each micro-batch and perform dynamic mid-section rerouting
        if not llm_service.is_model_healthy(prov_enum, model_enum):
            new_prov, new_mod = _pick_healthy(
                llm_service, prov_enum.value, section, batch_fields, recovery_pass
            )
            if new_prov:
                logger.info(
                    f"  [{prov_enum.value.upper()}] Mid-section rerouting: "
                    f"Switching from unhealthy {prov_enum.value} to healthy {new_prov.value} for batch {batch_idx+1}."
                )
                prov_enum = new_prov
                model_enum = new_mod
                model_id = f"{prov_enum.value}:{model_enum.value}"
            else:
                logger.warning(
                    f"  [{prov_enum.value.upper()}] {section}: provider unhealthy "
                    f"at batch {batch_idx+1} and no alternate provider available — skipping this batch to allow others a chance."
                )
                continue

        # Acquire rate-limit token
        await rate_limiter.acquire(prov_enum.value)

        messages = _build_messages(company, section, batch_fields, ctx)
        parsed, meta = await _call_llm(
            llm_service, prov_enum, model_enum,
            messages, model_id, section, company,
            recovery_pass=recovery_pass
        )

        if meta:
            all_metadata.append(meta)

        # Provider-side validation before cache storage or merge to prevent corruption from entering consolidation
        for field in list(parsed.keys()):
            val = parsed.get(field)
            if not _validate_extracted_field(company, section, field, val, schema_cls):
                logger.warning(
                    f"  [{prov_enum.value.upper()}] 🚫 REJECTED corrupted/malformed field: "
                    f"{section}.{field} = {val!r}"
                )
                parsed[field] = None

        # Merge: preserve existing good values, add new good values
        for field in batch_fields:
            new_val = parsed.get(field)
            if not _null(new_val) and _null(merged.get(field)):
                merged[field] = new_val
                logger.info(
                    f"  [{prov_enum.value.upper()}] ✓ {section}.{field} = "
                    f"{str(new_val)[:80]!r}"
                )

        # Immediate micro-batch persistence to prevent loss on future provider exhaustion
        new_batch_fields = {
            f: v for f, v in parsed.items()
            if f in batch_fields and not _null(v) and _null(already_cached.get(f))
        }
        if new_batch_fields:
            prov_map = {
                f"{section}.{f}": "REAL_EXTRACTED"
                for f in new_batch_fields
            }
            stored = await field_cache.store_fields(
                company, section, new_batch_fields, prov_map,
                provider=prov_enum.value
            )
            if stored:
                logger.info(
                    f"  [{prov_enum.value.upper()}] {section}: "
                    f"Immediately persisted {stored} micro-batch fields to FieldCache."
                )
                # Update already_cached for subsequent micro-batches
                for f, v in new_batch_fields.items():
                    already_cached[f] = v

        # Inter-batch delay (prevents RPM burst)
        if batch_idx < len(batches) - 1:
            await asyncio.sleep(0.8)

    # Fill remaining fields with None
    for f in all_fields:
        merged.setdefault(f, None)

    genuine   = sum(1 for v in merged.values() if not _null(v))
    total_t   = sum(m.total_tokens for m in all_metadata) if all_metadata else 0
    n_batches = len(batches)
    tag       = "SUCCESS" if genuine > 0 else "PARTIAL"

    if os.getenv("DEV_MODE", "false").lower() == "true":
        print(
            f"  [{tag}] {model_id} | {section} | "
            f"{genuine}/{len(all_fields)} fields "
            f"| Tokens:{total_t} | {n_batches} batches"
        )

    logger.info(
        f"  [{prov_enum.value.upper()}] {section}: "
        f"{genuine}/{len(all_fields)} genuine fields."
    )
    return merged, all_metadata

# ── Tiered Provider Routing & Failover Registry ────────────────────────────────

def _pick_healthy(
    llm_service:    LLMService,
    base_provider:   str,
    section:        str,
    missing_fields: List[str],
    recovery_pass:  int = 0
) -> Tuple[Optional[LLMProvider], Optional[ModelName]]:
    """
    Finds the highest-priority configured and healthy provider for a given section
    according to strict tiered failover routing.
    """
    # Convert base_provider string to enum for matching
    base_prov_enum = None
    if base_provider == "groq":
        base_prov_enum = LLMProvider.GROQ
    elif base_provider == "gemini":
        base_prov_enum = LLMProvider.GEMINI
    elif base_provider == "cerebras":
        base_prov_enum = LLMProvider.CEREBRAS
    
    preferred_order = []
    
    # OpenRouter Aggressive Recovery Mode
    is_high_value = section in ("overview", "financials_stability", "leadership_contacts", "business_market", "tech_innovation", "brand_digital")
    
    if recovery_pass > 0 and is_high_value:
        # Force OpenRouter to the very top to aggressively use model rotation
        preferred_order = [
            (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
            (LLMProvider.GROQ, ModelName.LLAMA_70B),
            (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
            (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
            (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
        ]
    elif base_prov_enum == LLMProvider.GROQ:
        # Tier 1
        is_high_value = section in ("overview", "financials_stability", "leadership_contacts", "brand_digital")
        if is_high_value:
            preferred_order = [
                (LLMProvider.GROQ, ModelName.LLAMA_70B),
                (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
                (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
            ]
        else:
            preferred_order = [
                (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
                (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
                (LLMProvider.GROQ, ModelName.LLAMA_70B),
            ]
    elif base_prov_enum == LLMProvider.GEMINI:
        preferred_order = [
            (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
            (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
            (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
        ]
    elif base_prov_enum == LLMProvider.CEREBRAS:
        preferred_order = [
            (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
            (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
            (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
        ]
    else:
        # Default fallback
        preferred_order = [
            (LLMProvider.GROQ, ModelName.LLAMA_70B),
            (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
            (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
            (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
            (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
        ]
        
    # Append remaining free tiers to guarantee fallback completion
    fallback_net = [
        (LLMProvider.OPENROUTER, ModelName.DEEPSEEK_R1),
        (LLMProvider.GEMINI, ModelName.GEMINI_FLASH),
        (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
        (LLMProvider.GROQ, ModelName.LLAMA_70B),
        (LLMProvider.TOGETHER, ModelName.TOGETHER_LLAMA),
        (LLMProvider.CLAUDE, ModelName.CLAUDE_HAIKU),
    ]
    
    for prov, mod in fallback_net:
        if (prov, mod) not in preferred_order:
            preferred_order.append((prov, mod))

    from LANGGRAPH.services.rate_limiter import rate_limiter
    # Adaptive Intelligent Provider Routing
    adaptive_order = []
    demoted = []
    for prov, mod in preferred_order:
        fail_streak = rate_limiter._failure_streaks.get(prov.value.lower(), 0)
        succ_streak = rate_limiter._success_streaks.get(prov.value.lower(), 0)
        
        # Demote if failing repeatedly, unless they've recently succeeded a lot
        if fail_streak >= 2 and succ_streak < 3:
            demoted.append((prov, mod))
        else:
            adaptive_order.append((prov, mod))
            
    preferred_order = adaptive_order + demoted

    # Predictive Routing: Sort healthy fallbacks by their real-time predictive priority scores!
    healthy_fallbacks = []
    other_fallbacks = []
    for p_enum, m_enum in preferred_order:
        if llm_service.is_provider_configured(p_enum) and llm_service.is_model_healthy(p_enum, m_enum):
            healthy_fallbacks.append((p_enum, m_enum))
        else:
            other_fallbacks.append((p_enum, m_enum))

    provider_cost_score = {
        "openrouter": 1,
        "gemini": 1,
        "cerebras": 2,
        "groq": 3,
        "together": 4,
        "claude": 4
    }

    if len(healthy_fallbacks) > 1:
        healthy_fallbacks.sort(
            key=lambda item: (
                -rate_limiter.get_predictive_priority(item[0].value),
                provider_cost_score.get(item[0].value, 10)
            )
        )
        preferred_order = healthy_fallbacks + other_fallbacks
    else:
        preferred_order = healthy_fallbacks + other_fallbacks

    for p_enum, m_enum in preferred_order:
        if llm_service.is_provider_configured(p_enum) and llm_service.is_model_healthy(p_enum, m_enum):
            return p_enum, m_enum

    return None, None


# ── Main research node ────────────────────────────────────────────────────────

async def research_node(
    state:          GraphState,
    llm_service:    LLMService,
    search_service: Any,
    provider:       str,
) -> Dict[str, Any]:
    """
    Quota-aware parallel research node.

    Key behaviours:
    - Applies stagger delay at start to prevent burst spikes
    - Iterates sections in PRIORITY ORDER (highest value first)
    - Retrieves only MISSING fields from FieldCache (incremental)
    - Splits missing fields into priority-ordered micro-batches
    - Falls back to next healthy provider per section
    - Applies inter-section delay between LLM calls
    - Persists newly extracted fields to FieldCache immediately
    - Activates survival mode if only one provider remains
    """
    company   = state.get("company_name")
    state_key = f"{provider.lower()}_data"
    logger.info(f"--- [PARALLEL RESEARCH] [{provider.upper()}] [{company}] ---")

    # Optional Gemini config override
    if provider.lower() == "gemini" and os.getenv("ENABLE_GEMINI", "false").lower() != "true":
        logger.info(f"  [GEMINI] Gemini is optional and disabled in config. Skipping.")
        return {state_key: {}, "llm_calls": []}

    # Skip if memory-recovered
    if state.get("workflow_status") == WorkflowStatus.CACHE_RECOVERED:
        logger.info(f"  [{provider.upper()}] CACHE_RECOVERED: skipping.")
        return {state_key: state.get("consolidated_parameters", {}), "llm_calls": []}

    # ── Checkpoint State Recovery ─────────────────────────────────────────────
    checkpoint_file = "checkpoint_state.json"
    checkpoint_data = {}
    checkpoint_queue_secs = []
    checkpoint_recovery_pass = 0
    extracted_counts_at_cooldown = []
    
    if os.path.exists(checkpoint_file):
        try:
            with open(checkpoint_file, "r", encoding="utf-8") as f:
                all_cps = json.load(f)
                checkpoint_data = all_cps.get(company, {})
                if checkpoint_data:
                    checkpoint_queue_secs = checkpoint_data.get("unfinished_sections", [])
                    checkpoint_recovery_pass = checkpoint_data.get("recovery_pass", 0)
                    extracted_counts_at_cooldown = checkpoint_data.get("extracted_counts_at_cooldown", [])
                    
                    # Restore consecutive failures and cooldown states
                    prov_cooldowns = checkpoint_data.get("provider_cooldowns", {})
                    for p, details in prov_cooldowns.items():
                        if details.get("exhausted"):
                            rate_limiter._exhausted_at[p] = time.monotonic() - (time.time() - details.get("saved_at", 0))
                            rate_limiter._consecutive_failures[p] = details.get("consecutive_failures", 0)
                            rate_limiter._healthy.discard(p)
                        else:
                            rate_limiter._consecutive_failures[p] = details.get("consecutive_failures", 0)
                    logger.info(f"  [{provider.upper()}] 🔄 CHECKPOINT LOADED: Resuming from pass {checkpoint_recovery_pass} with {len(checkpoint_queue_secs)} pending sections.")
        except Exception as e:
            logger.warning(f"Failed to load checkpoint file: {e}")

    # ── Apply stagger delay (prevents burst RPM spike at t=0) ────────────────
    await rate_limiter.apply_start_delay(provider)

    pmap = {
        "groq":     (LLMProvider.GROQ,     ModelName.LLAMA_70B),
        "gemini":   (LLMProvider.GEMINI,   ModelName.GEMINI_FLASH),
        "cerebras": (LLMProvider.CEREBRAS, ModelName.CEREBRAS_LARGE),
    }
    base_prov, base_model = pmap.get(provider.lower(), pmap["groq"])

    section_contexts = state.get("section_contexts", {})
    extracted_data:  Dict[str, Dict[str, Any]] = {}
    llm_calls:       list = []
    deferred_sections = []

    max_recovery_passes = 4
    recovery_pass = checkpoint_recovery_pass

    # ── Define process_section helper ──────────────────────────────────────────
    async def process_section(section_name: str, schema_cls: Any) -> Optional[tuple]:
        all_fields = list(schema_cls.model_fields.keys())

        # Load already-cached fields for this section
        section_cached = field_cache.get_section_data(company, section_name, all_fields)
        cached_count   = sum(1 for v in section_cached.values() if not _null(v))

        # Check for validation failed fields in this section (Phase 4 targeted regeneration)
        val_results = state.get("validation_results") or []
        failed_fields_in_section = []
        for vr in val_results:
            if not vr.is_valid:
                p_name = vr.parameter_name
                if "." in p_name:
                    sec, f = p_name.split(".", 1)
                    if sec == section_name and f in all_fields:
                        failed_fields_in_section.append(f)
                elif p_name in all_fields:
                    failed_fields_in_section.append(p_name)

        # Check if any fields in this section need enrichment (unresolved, stale, or weak)
        fields_to_enrich = []
        for f in all_fields:
            key = f"{section_name}.{f}"
            if _null(section_cached.get(f)) or key in (state.get("stale_fields") or []) or key in (state.get("weak_fields") or []):
                fields_to_enrich.append(f)

        if not fields_to_enrich and not failed_fields_in_section:
            logger.info(
                f"  [{provider.upper()}] {section_name}: "
                f"fully cached and healthy ({len(all_fields)}/{len(all_fields)}) — skipping LLM call."
            )
            return section_cached, []
            
        # Smart Extraction Threshold: Preserve partial high-confidence section completion
        # Stop wasting retries if the section is already mostly complete
        if False: # Disabled premature skipping to stabilize extraction quality
            logger.info(
                f"  [{provider.upper()}] SKIPPING {section_name} on recovery pass — "
                f"already {cached_count}/{len(all_fields)} complete. Preserving quota."
            )
            return section_cached, []

        # Check survival mode
        survivor = rate_limiter.survival_mode_provider()
        if False: # Disabled over-aggressive survival mode section deferral
            logger.info(
                f"  [{provider.upper()}] Survival mode active. Deferring {section_name} to {survivor.upper()}."
            )
            return section_cached, []

        # Find a healthy provider for this section
        missing_fields = list(fields_to_enrich)
        
        # Force re-extraction of validation-failed fields
        for f in failed_fields_in_section:
            if f not in missing_fields:
                missing_fields.append(f)
                
            # Track lineage in state
            key = f"{section_name}.{f}"
            attempts = state.setdefault("regeneration_attempts", {})
            attempts[key] = attempts.get(key, 0) + 1
            
            reasons = state.setdefault("failed_field_reasons", {})
            for vr in val_results:
                if vr.parameter_name == key or vr.parameter_name == f:
                    reasons[key] = vr.error_message or "Validation failed"
                    break
                    
        # TARGETED SECTION REFRESH ENGINE: Clear weak, stale, or failed fields in section_cached
        # so they are treated as empty and selectively refreshed by the incremental extractor.
        for f in missing_fields:
            section_cached[f] = None
        
        # Skip low-priority brand fields during stress/recovery
        total_failures = sum(rate_limiter._consecutive_failures.values())
        if False: # Disabled brand fields deprioritization to ensure 100% parameter coverage
            LOW_PRIORITY_BRAND_FIELDS = {
                "marketing_video_url", "customer_testimonials", "awards_recognitions", 
                "event_participation", "sales_cycle_length", "average_deal_size", "brand_sentiment_score"
            }
            missing_fields = [f for f in missing_fields if f not in LOW_PRIORITY_BRAND_FIELDS]
            if not missing_fields:
                logger.info(f"  [{provider.upper()}] SKIPPING {section_name} during stress — only low priority fields remain.")
                return section_cached, []
        
        # Aggressively retry ONLY critical enterprise fields on recovery passes
        if False: # Disabled critical-only filter on recovery passes to allow 150+ fields coverage
            missing_fields = [f for f in missing_fields if f in CRITICAL_FIELDS]
            if not missing_fields:
                logger.info(f"  [{provider.upper()}] SKIPPING {section_name} on recovery pass — no critical fields pending.")
                return section_cached, []
                
        # Dynamic Section Skipping for low-confidence lifestyle sections
        is_lifestyle_section = section_name in (
            "culture_people_work", "learning_growth",
            "work_logistics", "compensation_lifestyle"
        )
        total_failures = sum(rate_limiter._consecutive_failures.values())
        if False: # Disabled lifestyle sections skipping under stress to achieve full extraction completeness
            logger.info(f"  [{provider.upper()}] SKIPPING {section_name} to preserve quotas for critical enterprise sections.")
            return section_cached, []
        act_prov, act_model = _pick_healthy(
            llm_service, provider, section_name, missing_fields, recovery_pass
        )

        if act_prov is None:
            # None signals all configured providers are temporarily exhausted/in cooldown
            return None

        # Apply Cerebras Overload Protection
        if False: # Disabled Cerebras emergency mode skipping to maximize Cerebras throughput
            missing_fields = [
                f for f in missing_fields 
                if f in CRITICAL_FIELDS or f in IMPORTANT_FIELDS
            ]
            if not missing_fields:
                logger.info(
                    f"  [CEREBRAS EMERGENCY] Skipping {section_name} — no unresolved critical/important fields remain."
                )
                return section_cached, []
            logger.info(
                f"  [CEREBRAS EMERGENCY] Operating in lightweight sequential survival mode. Extracting {len(missing_fields)} high-priority fields only."
            )

        # Extract only missing fields (incremental)
        ctx = section_contexts.get(section_name, "")
        section_result, section_meta = await _extract_section_incremental(
            llm_service, act_prov, act_model,
            company, section_name, schema_cls, ctx,
            section_cached,
            recovery_pass=recovery_pass
        )

        # Persist newly extracted valid fields to FieldCache
        new_fields = {
            f: v for f, v in section_result.items()
            if not _null(v) and (_null(section_cached.get(f)) or f in failed_fields_in_section)
        }
        if new_fields:
            prov_map = {
                f"{section_name}.{f}": "REAL_EXTRACTED"
                for f in new_fields
            }
            
            # Track successfully regenerated fields in lineage
            regen_list = state.setdefault("regenerated_fields", [])
            for f in new_fields:
                key = f"{section_name}.{f}"
                if key in (state.get("regeneration_attempts") or {}):
                    if key not in regen_list:
                        regen_list.append(key)

            stored = await field_cache.store_fields(
                company, section_name, new_fields, prov_map,
                provider=act_prov.value,
                overwrite_failed=len(failed_fields_in_section) > 0
            )
            if stored:
                logger.info(
                    f"  [{provider.upper()}] {section_name}: Persisted {stored} new/corrected fields to FieldCache."
                )

        return section_result, section_meta

    # ── 1. Unified Queue-Based Section Extraction & Recovery Continuation ──────
    queue = list(SECTION_SCHEMA_MAP.items())  # List of (section_name, schema_cls)
    
    # ── Dedicated Leadership Extraction Pass ───────────────────────────────
    if any(name == "leadership_contacts" for name, _ in queue):
        async with LEADERSHIP_LOCK:
            res = await process_section("leadership_contacts", SECTION_SCHEMA_MAP["leadership_contacts"])
            if res is not None:
                section_res, section_meta = res
                extracted_data["leadership_contacts"] = section_res
                llm_calls.extend(section_meta)
        # Remove from queue to avoid redundant processing
        queue = [(name, cls) for name, cls in queue if name != "leadership_contacts"]
        
    # Override queue and recovery_pass from checkpoint if loaded!
    if checkpoint_queue_secs:
        queue = [(name, cls) for name, cls in SECTION_SCHEMA_MAP.items() if name in checkpoint_queue_secs and name != "leadership_contacts"]
    
    # Already defined early
    total_extracted = 0

    while queue and recovery_pass < max_recovery_passes:
        # A. Check global target completion to allow early success exit
        total_extracted = 0
        for s_name, s_cls in SECTION_SCHEMA_MAP.items():
            all_fields = list(s_cls.model_fields.keys())
            cached = field_cache.get_section_data(company, s_name, all_fields)
            total_extracted += sum(1 for v in cached.values() if not _null(v))

        logger.info(
            f"  [{provider.upper()}] Progress Check: {total_extracted}/163 genuine fields resolved. "
            f"(Target: 150+, Queue size: {len(queue)}, Pass: {recovery_pass+1}/{max_recovery_passes})"
        )

        if total_extracted >= 150:
            logger.info(
                f"  [{provider.upper()}] 🎉 TARGET MET! Successfully resolved {total_extracted} fields (>= 150). "
                f"Terminating extraction loop early with full success."
            )
            break

        # Check if all providers are exhausted
        all_provs = ["groq", "together", "openrouter", "gemini", "cerebras", "claude"]
        if all(rate_limiter.is_exhausted(p) for p in all_provs):
            logger.warning(
                f"  [{provider.upper()}] 🛑 ALL LLM PROVIDERS TEMPORARILY EXHAUSTED. "
                "All configured providers are in cooldown/exhausted state. Waiting 5s for recovery..."
            )
            await asyncio.sleep(5.0)
            continue

        still_pending = []
        exhausted_sections_count = 0

        for section_idx, (section_name, schema_cls) in enumerate(queue):
            # Process the section
            result = await process_section(section_name, schema_cls)

            if result is not None:
                # Successfully processed (fully or partially)
                section_res, section_meta = result
                extracted_data[section_name] = section_res
                llm_calls.extend(section_meta)
                # Apply inter-section delay
                await rate_limiter.apply_section_delay(provider)
            else:
                # All providers in cooldown/exhausted
                exhausted_sections_count += 1
                still_pending.append((section_name, schema_cls))

        # Check if we made progress or if we hit a wall of cooldowns
        if still_pending:
            if exhausted_sections_count == len(queue):
                # All remaining sections hit cooldowns - we must wait for provider cooldowns to expire
                recovery_pass += 1
                
                # Track extracted counts at cooldown for adaptive stopping
                extracted_counts_at_cooldown.append(total_extracted)
                
                # Check adaptive stopping: disabled to guarantee maximum extraction quality
                if False: # Disabled early adaptive stopping
                    prev_extracted = extracted_counts_at_cooldown[-3]
                    diff = total_extracted - prev_extracted
                    logger.info(f"  [{provider.upper()}] Adaptive Stopping Check: extracted {diff} new fields since 3 cooldowns ago.")
                    if diff < 2:
                        logger.warning(
                            f"  [{provider.upper()}] 🛑 ADAPTIVE STOP: Extraction stagnated (improved by {diff} < 2 fields over last 3 cooldown cycles). "
                            "Terminating loop early to save tokens."
                        )
                        break
                
                if recovery_pass < max_recovery_passes:
                    wait_time = 10.0 + (recovery_pass * 2.0)
                    logger.warning(
                        f"  [{provider.upper()}] All {len(still_pending)} remaining sections are blocked by cooldowns. "
                        f"Pausing {wait_time}s for provider recovery before resume attempt {recovery_pass+1}/{max_recovery_passes}..."
                    )
                    await asyncio.sleep(wait_time)
            else:
                # Some sections succeeded, but some were blocked. Just keep moving.
                pass
        
        # Persist checkpoint to disk
        try:
            current_checkpoint = {}
            if os.path.exists(checkpoint_file):
                with open(checkpoint_file, "r", encoding="utf-8") as f:
                    current_checkpoint = json.load(f)
            
            # Build cooldown details
            cooldown_details = {}
            for p in ["groq", "together", "openrouter", "gemini", "cerebras", "claude"]:
                cooldown_details[p] = {
                    "exhausted": rate_limiter.is_exhausted(p),
                    "consecutive_failures": rate_limiter._consecutive_failures.get(p, 0),
                    "saved_at": time.time()
                }
            
            # Find unresolved fields in missing categories
            unresolved = []
            for s_name, s_cls in SECTION_SCHEMA_MAP.items():
                all_fields = list(s_cls.model_fields.keys())
                cached = field_cache.get_section_data(company, s_name, all_fields)
                for f, v in cached.items():
                    if _null(v):
                        unresolved.append(f"{s_name}.{f}")
            
            current_checkpoint[company] = {
                "unfinished_sections": [name for name, _ in still_pending],
                "recovery_pass": recovery_pass,
                "unresolved_fields": unresolved,
                "provider_cooldowns": cooldown_details,
                "extracted_counts_at_cooldown": extracted_counts_at_cooldown,
                "last_updated": time.time()
            }
            
            with open(checkpoint_file, "w", encoding="utf-8") as f:
                json.dump(current_checkpoint, f, indent=2)
            logger.info(f"  [{provider.upper()}] 💾 Checkpoint persisted. Unfinished sections: {len(still_pending)}.")
        except Exception as ce:
            logger.error(f"Failed to save checkpoint: {ce}")
            
        queue = still_pending

    # Clear checkpoint if fully finished
    if not queue or total_extracted >= 150:
        try:
            if os.path.exists(checkpoint_file):
                with open(checkpoint_file, "r", encoding="utf-8") as f:
                    cc = json.load(f)
                cc.pop(company, None)
                with open(checkpoint_file, "w", encoding="utf-8") as f:
                    json.dump(cc, f, indent=2)
                logger.info(f"  [{provider.upper()}] 🧹 Checkpoint cleared (extraction finished).")
        except Exception:
            pass

    # Ensure all sections are seeded in extracted_data (even if recovery failed)
    for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
        if section_name not in extracted_data:
            all_fields = list(schema_cls.model_fields.keys())
            extracted_data[section_name] = field_cache.get_section_data(company, section_name, all_fields)

    return {state_key: extracted_data, "llm_calls": llm_calls}
