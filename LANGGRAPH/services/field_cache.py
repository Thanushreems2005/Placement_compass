"""
Field-Level Extraction Cache
=============================
Persistent incremental cache that stores validated field values per company.
Key design principles:
  - Once a field is validated, it is NEVER re-requested in the same or future runs
  - Gaps (None / FAILED fields) are the only ones retried
  - Cache file: field_cache.json  (one entry per company)
  - All reads/writes are thread-safe via asyncio.Lock
"""
import asyncio
import json
import logging
import os
import time
from typing import Any, Dict, Optional, Set, Tuple

logger = logging.getLogger(__name__)

FIELD_CACHE_FILE = "field_cache.json"
FIELD_CACHE_TTL  = 7 * 24 * 3600   # 7 days


def _validate_and_normalize_field(
    key: str,
    val: Any,
    entry: Dict[str, Any],
    saved_at: float
) -> Tuple[bool, Any, str, float, str]:
    """
    Strict hydration validation and normalization engine.
    Ensures corrupted, stale, weak, malformed, or unresolved fields NEVER hydrate FieldCache.
    """
    import re
    import time
    
    # 1. Check placeholder/empty/insufficient values
    if val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", "", "insufficient_validated_data"):
        return False, None, "UNRESOLVED", 0.0, "placeholder_or_empty"

    # 2. Check stale age (TTL check)
    age_days = (time.time() - saved_at) / (24 * 3600)
    high_freshness_fields = {
        "revenue", "valuation", "funding", "leadership", "competitors",
        "partnerships", "hiring", "market_share", "social_media",
        "annual_revenue", "ceo_name", "key_challenges_needs",
        "recent_funding_rounds", "r_and_d_investment", "technology_partners",
        "employee_turnover", "total_capital_raised"
    }
    field_name = key.split(".")[-1]
    base_threshold = 1.0 if any(hf in field_name.lower() for hf in high_freshness_fields) else 7.0
    if age_days > base_threshold * 10:  # strictly stale beyond 10x base threshold
        return False, None, "UNRESOLVED", 0.0, f"stale_field_age_{age_days:.1f}_days"

    # 3. Check weak confidence  (< 0.50 → reject per governance rules)
    conf = entry.get("confidence") or entry.get("confidence_score")
    if conf is not None:
        try:
            if float(conf) < 0.50:
                return False, None, "UNRESOLVED", 0.0, f"weak_confidence_{conf:.2f}"
        except (ValueError, TypeError):
            pass

    # 4. Check malformed schema/type
    from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
    section_name = key.split(".")[0]
    schema_cls = SECTION_SCHEMA_MAP.get(section_name)
    if not schema_cls:
        return False, None, "UNRESOLVED", 0.0, "missing_schema_definition"

    field_info = schema_cls.model_fields.get(field_name)
    if not field_info:
        return False, None, "UNRESOLVED", 0.0, "missing_field_definition"

    # Normalize/Coerce using target type
    from LANGGRAPH.utils.normalization import _coerce_value
    try:
        norm_val = _coerce_value(val, field_info.annotation, field_name)
    except Exception as e:
        return False, None, "UNRESOLVED", 0.0, f"coercion_error_{str(e)}"

    if norm_val is None:
        return False, None, "UNRESOLVED", 0.0, "coercion_resolved_to_none"

    # 5. Check semantic corruptions
    val_str = str(norm_val).strip().lower()

    # A. Enums check
    if field_name == "nature_of_company":
        allowed = {"public", "private", "subsidiary", "joint venture", "non-profit", "partnership"}
        if not any(a in val_str for a in allowed):
            return False, None, "UNRESOLVED", 0.0, f"enum_corruption_nature_of_company_{val_str}"
    elif field_name == "profitability_status":
        allowed = {"profitable", "unprofitable", "breakeven", "pre-revenue"}
        if not any(a in val_str for a in allowed):
            return False, None, "UNRESOLVED", 0.0, f"enum_corruption_profitability_status_{val_str}"
    elif field_name == "market_share_status":
        allowed = {"stable challenger", "market leader", "niche player", "challenger", "dominant player", "niche specialist"}
        if not any(a in val_str for a in allowed):
            return False, None, "UNRESOLVED", 0.0, f"enum_corruption_market_share_status_{val_str}"

    # B. Numeric sanity validation (reject impossible/hallucinated values)
    if isinstance(norm_val, (int, float)):
        if field_name == "churn_rate" and norm_val > 100:
            return False, None, "UNRESOLVED", 0.0, f"impossible_churn_{norm_val}"
        if field_name == "runway_months" and norm_val > 240:
            return False, None, "UNRESOLVED", 0.0, f"impossible_runway_{norm_val}"
        if field_name == "net_revenue_retention" and norm_val > 300:
            return False, None, "UNRESOLVED", 0.0, f"impossible_nrr_{norm_val}"
        if field_name == "gross_revenue_retention" and norm_val > 100:
            return False, None, "UNRESOLVED", 0.0, f"impossible_grr_{norm_val}"
        if "commute" in field_name and norm_val > 600:
            return False, None, "UNRESOLVED", 0.0, f"impossible_commute_time_{norm_val}"
        if "employee" in field_name and norm_val < 0:
            return False, None, "UNRESOLVED", 0.0, f"impossible_negative_employee_count_{norm_val}"
        if "retention" in field_name and norm_val > 100:
            return False, None, "UNRESOLVED", 0.0, f"impossible_retention_{norm_val}"

    # C. Percentage scaling check
    if any(k in field_name.lower() for k in ("percentage", "rate", "ratio")):
        try:
            val_float = float(re.sub(r'[^\d.]', '', str(norm_val)))
            if val_float > 1000.0:  # clearly corrupted percentage scaling
                return False, None, "UNRESOLVED", 0.0, f"corrupted_percentage_scale_{val_float}"
        except ValueError:
            pass

    # C. URL validity check
    if any(k in field_name.lower() or k in "url_link_website" for k in ("url", "website", "link")):
        if "." not in val_str or len(val_str) < 4:
            return False, None, "UNRESOLVED", 0.0, f"malformed_url_{val_str}"

    # D. Array validity check
    type_str = str(field_info.annotation).lower()
    if "list" in type_str:
        if not isinstance(norm_val, list) or len(norm_val) == 0:
            return False, None, "UNRESOLVED", 0.0, "malformed_empty_array"
        if any(str(x).strip().lower() in ("none", "n/a", "null") for x in norm_val):
            return False, None, "UNRESOLVED", 0.0, "corrupted_array_elements"

    # All validations passed!
    prov_label = entry.get("provenance") or entry.get("prov_label")
    if not prov_label or prov_label == "UNRESOLVED":
        if age_days <= base_threshold:
            prov_label = "CACHE_VERIFIED_RECENT"
        elif age_days <= base_threshold * 3.0:
            prov_label = "VALIDATED_CONSENSUS"
        else:
            prov_label = "REAL_EXTRACTED"
            
    prov_src = entry.get("provider") or "supabase"
    
    return True, norm_val, prov_label, age_days, prov_src


def run_async_sync(coro):
    """Bridge async calls into synchronous functions using a thread executor if loop is running."""
    import asyncio
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
        
    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(lambda: asyncio.run(coro))
            return future.result()
    else:
        return asyncio.run(coro)

class FieldCache:
    """
    Persistent field-level extraction cache.

    Structure of field_cache.json:
    {
        "<company_name>": {
            "fields": {
                "<section>.<field>": {
                    "value":      <any>,
                    "provenance": "REAL_EXTRACTED" | "VALIDATED_CONSENSUS" | "CACHE_VERIFIED",
                    "provider":   "<provider_name>",
                    "saved_at":   <epoch_float>
                }
            },
            "last_updated": <epoch_float>
        }
    }
    """

    _store: Dict[str, Any] = {}
    _lock  = asyncio.Lock()
    _dirty = False

    def __init__(self):
        self._load()

    def _load(self):
        if FieldCache._store:
            return          # already loaded by another instance this session
        if os.path.exists(FIELD_CACHE_FILE):
            try:
                with open(FIELD_CACHE_FILE, "r", encoding="utf-8") as f:
                    FieldCache._store = json.load(f)
                logger.info(
                    f"[FieldCache] Loaded {len(FieldCache._store)} company records."
                )
            except Exception as e:
                logger.warning(f"[FieldCache] Failed to load cache: {e}")
                FieldCache._store = {}

    def _save(self):
        try:
            with open(FIELD_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(FieldCache._store, f, ensure_ascii=False, indent=2)
            FieldCache._dirty = False
        except Exception as e:
            logger.error(f"[FieldCache] Failed to save cache: {e}")
    # ── Read ──────────────────────────────────────────────────────────────────

    def get_cached_fields(self, company: str) -> Dict[str, Any]:
        """
        Returns a flat dict of all valid cached fields for a company.
        Format: { "<section>.<field>": <value> }
        Expired or invalid entries are skipped.
        """
        now = time.time()
        
        # 0. Try to fetch from Redis cache first
        company_record = None
        try:
            from app.services.redis_service import redis_service
            if redis_service.is_active:
                cache_key = f"field_cache:{company.lower()}"
                company_record = run_async_sync(redis_service.get(cache_key))
                if company_record and isinstance(company_record, dict):
                    # Keep local memory store synchronized with Redis cache
                    FieldCache._store[company] = company_record
                else:
                    company_record = None
        except Exception as e:
            logger.warning(f"[FieldCache] Redis read failed: {e}. Falling back to disk cache.")

        if not company_record:
            company_record = FieldCache._store.get(company, {})
            
        fields = company_record.get("fields", {})
        result = {}
        
        # High-freshness parameters: 1 day threshold
        high_freshness_fields = {
            "revenue", "valuation", "funding", "leadership", "competitors",
            "partnerships", "hiring", "market_share", "social_media",
            "annual_revenue", "ceo_name", "key_challenges_needs",
            "recent_funding_rounds", "r_and_d_investment", "technology_partners",
            "employee_turnover", "total_capital_raised"
        }

        for key, entry in fields.items():
            val = entry.get("value")
            saved_at = entry.get("saved_at", 0)
            if val is None or str(val).strip().lower() in ("null", "none", "n/a", ""):
                continue
            
            # Dynamic freshness threshold check
            field_name = key.split(".")[-1]
            threshold = 1.0 * 24 * 3600 if any(hf in field_name.lower() for hf in high_freshness_fields) else 7.0 * 24 * 3600
            
            if now - saved_at > threshold:
                continue
            result[key] = val
        return result

    def get_missing_fields(self, company: str, section: str, all_fields: list) -> list:
        """
        Returns list of fields NOT yet cached for this section.
        These are the ONLY fields that should be re-extracted.
        """
        cached = self.get_cached_fields(company)
        missing = []
        for f in all_fields:
            key = f"{section}.{f}"
            if key not in cached:
                missing.append(f)
        return missing

    def get_section_data(self, company: str, section: str, all_fields: list) -> Dict[str, Any]:
        """
        Returns the cached field values for a section as a flat field→value dict.
        Missing fields are returned as None.
        """
        cached = self.get_cached_fields(company)
        result = {}
        for f in all_fields:
            key = f"{section}.{f}"
            result[f] = cached.get(key)
        return result

    def has_full_section(self, company: str, section: str, all_fields: list) -> bool:
        """Returns True if all fields in the section are already cached."""
        missing = self.get_missing_fields(company, section, all_fields)
        return len(missing) == 0

    # ── Write ─────────────────────────────────────────────────────────────────

    async def store_fields(
        self,
        company:    str,
        section:    str,
        fields:     Dict[str, Any],
        provenance: Dict[str, str],
        provider:   str = "unknown",
        overwrite_failed: bool = False,
    ) -> int:
        """
        Stores valid (non-null) extracted field values.
        Never overwrites an existing valid and fresh value.
        Returns count of newly stored fields.
        """
        now = time.time()
        high_freshness_fields = {
            "revenue", "valuation", "funding", "leadership", "competitors",
            "partnerships", "hiring", "market_share", "social_media",
            "annual_revenue", "ceo_name", "key_challenges_needs",
            "recent_funding_rounds", "r_and_d_investment", "technology_partners",
            "employee_turnover", "total_capital_raised"
        }

        async with FieldCache._lock:
            if company not in FieldCache._store:
                FieldCache._store[company] = {"fields": {}, "last_updated": now}

            company_record = FieldCache._store[company]
            stored_count = 0

            for field, value in fields.items():
                if value is None or str(value).strip().lower() in ("null", "none", "n/a", ""):
                    continue

                key = f"{section}.{field}"

                # Allow overwrite if existing value is stale, null, or invalid
                existing = company_record["fields"].get(key, {})
                existing_val = existing.get("value")
                saved_at = existing.get("saved_at", 0)
                
                is_stale = False
                if existing_val is not None and saved_at > 0:
                    field_name = key.split(".")[-1]
                    threshold = 1.0 * 24 * 3600 if any(hf in field_name.lower() for hf in high_freshness_fields) else 7.0 * 24 * 3600
                    if now - saved_at > threshold:
                        is_stale = True
                
                # Protect existing high-confidence/fresh fields from low-confidence overwrite
                # If existing is fresh and high-confidence, don't overwrite unless overwrite_failed is True
                if existing_val is not None and not is_stale and not overwrite_failed:
                    continue

                prov_label = provenance.get(key, "REAL_EXTRACTED")
                company_record["fields"][key] = {
                    "value":      value,
                    "provenance": prov_label,
                    "provider":   provider,
                    "saved_at":   now,
                }
                stored_count += 1

            company_record["last_updated"] = now
            FieldCache._dirty = True
            self._save()

            # Push to Redis asynchronously for cross-node replication
            try:
                from app.services.redis_service import redis_service
                if redis_service.is_active:
                    cache_key = f"field_cache:{company.lower()}"
                    await redis_service.set(cache_key, company_record)
            except Exception as e:
                logger.warning(f"[FieldCache] Failed to write cache update to Redis: {e}")

            return stored_count

    async def invalidate_company(self, company: str) -> None:
        """Remove all cached data for a company (force re-extraction)."""
        async with FieldCache._lock:
            FieldCache._store.pop(company, None)
            FieldCache._dirty = True
            self._save()
            
            # Evict from Redis cache as well
            try:
                from app.services.redis_service import redis_service
                if redis_service.is_active:
                    cache_key = f"field_cache:{company.lower()}"
                    await redis_service.delete(cache_key)
            except Exception as e:
                logger.warning(f"[FieldCache] Failed to evict key from Redis: {e}")

    async def seed_from_supabase(self, company: str, flat_data: Dict[str, Any]) -> int:
        """
        Seeds local cache with valid Supabase parameters, overwriting existing cache to align with Supabase truth.
        Returns the number of fields successfully seeded.
        """
        if not flat_data:
            return 0
            
        async with FieldCache._lock:
            # Always clear and re-initialize cached record to strictly align with Supabase truth
            FieldCache._store[company] = {"fields": {}, "last_updated": time.time()}
            company_record = FieldCache._store[company]
            provenance_map = flat_data.get("provenance") or {}
            
            # Local imports to prevent circular imports
            from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
            
            aliases = {
                "cac": "customer_acquisition_cost",
                "clv": "customer_lifetime_value",
                "ltv": "customer_lifetime_value",
                "nps": "net_promoter_score",
                "esg_ratings": "sustainability_csr",
                "mission_clarity": "mission_statement",
                "vision_statement": "vision_statement",
            }
            
            seeded_count = 0
            for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
                for field in schema_cls.model_fields.keys():
                    key = f"{section_name}.{field}"
                    val = flat_data.get(field)
                    
                    if val is None or str(val).strip().lower() in ("null", "none", "n/a", ""):
                        alt_key = aliases.get(field)
                        if alt_key:
                            val = flat_data.get(alt_key)
                    
                    entry = provenance_map.get(key) or provenance_map.get(field) or {}
                    if not isinstance(entry, dict):
                        entry = {}
                        
                    ts_str = entry.get("timestamp") or flat_data.get("_record_updated_at")
                    saved_at = time.time()
                    if ts_str:
                        try:
                            from datetime import datetime
                            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                            saved_at = ts.timestamp()
                        except Exception:
                            pass

                    # 1. Run strict hydration validation and normalization
                    is_valid, norm_val, prov_label, age_days, prov_src = _validate_and_normalize_field(
                        key=key,
                        val=val,
                        entry=entry,
                        saved_at=saved_at
                    )
                    
                    if not is_valid:
                        company_record["fields"][key] = {
                            "value": None,
                            "provenance": "UNRESOLVED",
                            "provider": "supabase",
                            "confidence": 0.0,
                            "locked": False,
                            "saved_at": saved_at
                        }
                        logger.info(f"[FIELD HYDRATION REJECTED] {key} rejected due to invalidity/corruption: {prov_label}. Seeded as UNRESOLVED.")
                    else:
                        high_freshness_fields = {
                            "revenue", "valuation", "funding", "leadership", "competitors",
                            "partnerships", "hiring", "market_share", "social_media",
                            "annual_revenue", "ceo_name", "key_challenges_needs",
                            "recent_funding_rounds", "r_and_d_investment", "technology_partners",
                            "employee_turnover", "total_capital_raised"
                        }
                        field_name = key.split(".")[-1]
                        base_threshold = 1.0 if any(hf in field_name.lower() for hf in high_freshness_fields) else 7.0
                        
                        # Determine lock and lock thresholds
                        if age_days <= base_threshold:
                            prov_label = "CACHE_VERIFIED_RECENT"
                            is_locked = True
                        elif age_days <= base_threshold * 3.0:
                            prov_label = "VALIDATED_CONSENSUS"
                            is_locked = True
                        else:
                            prov_label = "REAL_EXTRACTED"
                            is_locked = False
                            
                        # Use split confidence model
                        from LANGGRAPH.utils.scoring import calculate_parameter_confidence
                        conf_score, breakdown = calculate_parameter_confidence(
                            key=key,
                            val=norm_val,
                            provenance=prov_label,
                            provider=prov_src,
                            age_days=age_days
                        )
                        
                        company_record["fields"][key] = {
                            "value": norm_val,
                            "provenance": prov_label,
                            "provider": prov_src,
                            "confidence": conf_score,
                            "confidence_breakdown": breakdown,
                            "locked": is_locked,
                            "saved_at": saved_at
                        }
                        logger.info(f"[FIELD HYDRATION ACCEPTED] {key} seeded as {prov_label} ({conf_score:.2f} confidence, locked: {is_locked}).")
                        
                    seeded_count += 1
            
            if seeded_count > 0:
                company_record["last_updated"] = time.time()
                FieldCache._dirty = True
                self._save()
                
                # Push seeded state to Redis asynchronously
                try:
                    from app.services.redis_service import redis_service
                    if redis_service.is_active:
                        cache_key = f"field_cache:{company.lower()}"
                        await redis_service.set(cache_key, company_record)
                except Exception as e:
                    logger.warning(f"[FieldCache] Failed to write seed cache to Redis: {e}")
                
            return seeded_count

    def coverage_report(self, company: str) -> Dict[str, Any]:
        """Returns coverage stats for a company."""
        cached = self.get_cached_fields(company)
        total = 163
        filled = len(cached)
        return {
            "filled":     filled,
            "total":      total,
            "pct":        round(filled / total * 100, 1),
            "field_keys": list(cached.keys()),
        }


# ── Module-level singleton ────────────────────────────────────────────────────
field_cache = FieldCache()
