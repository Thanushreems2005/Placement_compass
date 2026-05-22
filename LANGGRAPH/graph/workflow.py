import logging
import os
import functools
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from LANGGRAPH.config.settings import settings
from LANGGRAPH.services.llm_service import LLMService

# Initialize LLM Service with credentials
llm_service = LLMService(
    groq_api_key=settings.GROQ_API_KEY if settings else "",
    openrouter_api_key=settings.OPENROUTER_API_KEY if settings else "",
    gemini_api_key=settings.GEMINI_API_KEY if settings else "",
    cerebras_api_key=settings.CEREBRAS_API_KEY if settings else "",
    together_api_key=settings.TOGETHER_API_KEY if settings else "",
    anthropic_api_key=settings.ANTHROPIC_API_KEY if settings else ""
)

from LANGGRAPH.graph.state import GraphState
from LANGGRAPH.models.state import WorkflowStatus
from LANGGRAPH.nodes.phase2_research import research_node
from LANGGRAPH.nodes.phase4_consolidate import consolidate_node
from LANGGRAPH.nodes.phase3_validate import validate_node
from LANGGRAPH.nodes.phase5_retry import retry_node
from LANGGRAPH.nodes.phase6_persist import persist_node
from LANGGRAPH.nodes.phase5_analysis import analysis_node
from LANGGRAPH.services.search_service import SearchService
from LANGGRAPH.graph.routing import route_after_validation, get_routing_map

# Initialize Search Service
search_service = SearchService()

# Set up logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


import asyncio
import json
from datetime import datetime
from LANGGRAPH.models.state import AuditLog

import re
def validate_field_sanity(company_name: str, section: str, field: str, val: Any) -> bool:
    """
    Performs numerical sanity, company-domain consistency, and section coherence checks.
    Returns True if valid/sane, False if inconsistent/corrupted.
    """
    if val is None or str(val).strip().lower() in ("null", "none", "n/a", ""):
        return True
        
    comp_clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.split()[0]).lower()
    
    # 1. Company-domain consistency check for URLs and handles
    if field in ("website_url", "linkedin_url", "twitter_handle", "ceo_linkedin_url", "facebook_url", "instagram_url"):
        val_str = str(val).lower()
        major_competitors = ["adobe", "microsoft", "apple", "nvidia", "google", "amazon", "razorpay", "blinkit", "zomato"]
        for comp in major_competitors:
            if comp in val_str and comp_clean != comp:
                logger.warning(f"  [DATA VALIDATION FAILURE] Company-domain inconsistency in {field}: '{val}' for company '{company_name}'")
                return False
                
    # 2. Numerical sanity checks
    if field in ("annual_revenue", "annual_profit", "valuation", "employee_size", "office_count", "founded_year", "incorporation_year"):
        val_str = str(val)
        if "-" in val_str and not any(kw in val_str.lower() for kw in ("n/a", "none")):
            logger.warning(f"  [DATA VALIDATION FAILURE] Negative numerical value in {field}: '{val}'")
            return False
            
    # 3. Section coherence (e.g. check for CDN/security fields incorrectly assigned to Adobe)
    if isinstance(val, str) and len(val) > 20:
        val_lower = val.lower()
        major_competitors = ["adobe", "microsoft", "apple", "nvidia", "google", "amazon", "razorpay", "blinkit", "zomato"]
        for comp in major_competitors:
            if comp in val_lower and comp_clean != comp:
                if comp_clean not in val_lower:
                    logger.warning(f"  [DATA VALIDATION FAILURE] Section coherence check failed: '{val}' mentions '{comp}' for target '{company_name}'")
                    return False
                    
    return True

def strict_hydrate_validation(company_name: str, db_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    Runs full schema validation on all 163 fields fetched from Supabase.
    Classifies fields into: VALIDATED, STALE, WEAK_CONFIDENCE, CORRUPTED, MISSING.
    """
    from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
    import re
    import time
    import json
    from datetime import datetime, timezone
    
    classification = {}
    
    # Standard enum sets
    nature_of_company_allowed = {"public", "private", "subsidiary", "joint venture", "non-profit", "partnership"}
    profitability_status_allowed = {"profitable", "unprofitable", "breakeven", "pre-revenue"}
    market_share_status_allowed = {"stable challenger / niche specialist", "market leader", "niche player", "challenger", "dominant player", "stable challenger", "niche specialist"}
    
    # High-freshness parameters list
    high_freshness_fields = {
        "revenue", "valuation", "funding", "leadership", "competitors",
        "partnerships", "hiring", "market_share", "social_media",
        "annual_revenue", "ceo_name", "key_challenges_needs",
        "recent_funding_rounds", "r_and_d_investment", "technology_partners",
        "employee_turnover", "total_capital_raised"
    }
    
    aliases = {
        "cac": "customer_acquisition_cost",
        "clv": "customer_lifetime_value",
        "ltv": "customer_lifetime_value",
        "nps": "net_promoter_score",
        "esg_ratings": "sustainability_csr",
        "mission_clarity": "mission_statement",
        "vision_statement": "vision_statement",
    }
    
    # Helper to check type correctness dynamically
    def is_type_correct(val: Any, annotation: Any) -> bool:
        if val is None:
            return True
        from typing import get_origin, get_args, Union
        origin = get_origin(annotation)
        args = get_args(annotation)
        
        if origin is Union:
            return any(is_type_correct(val, arg) for arg in args)
            
        if origin is list:
            if not isinstance(val, list):
                if isinstance(val, str):
                    try:
                        loaded = json.loads(val)
                        if isinstance(loaded, list):
                            return all(is_type_correct(x, args[0]) for x in loaded)
                    except Exception:
                        pass
                return False
            if args:
                return all(is_type_correct(x, args[0]) for x in val)
            return True
            
        if origin is dict:
            if not isinstance(val, dict):
                if isinstance(val, str):
                    try:
                        loaded = json.loads(val)
                        if isinstance(loaded, dict):
                            return True
                    except Exception:
                        pass
                return False
            return True
            
        if annotation is int:
            try:
                int(val)
                return True
            except ValueError:
                return False
        elif annotation is float:
            try:
                float(val)
                return True
            except ValueError:
                return False
        elif annotation is bool:
            if isinstance(val, bool):
                return True
            if str(val).lower() in ("true", "false", "yes", "no", "1", "0"):
                return True
            return False
        elif annotation is str:
            return isinstance(val, (str, int, float))
            
        return True

    # Introspect target company clean tokens
    comp_clean = re.sub(r'[^a-zA-Z0-9]', '', company_name.split()[0]).lower()
    employee_size = db_data.get("employee_size")
    try:
        emp_size_int = int(float(employee_size)) if employee_size is not None else None
    except Exception:
        emp_size_int = None

    provenance_map = db_data.get("provenance") or {}
    record_updated_at = db_data.get("_record_updated_at")

    for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
        for field in schema_cls.model_fields.keys():
            key = f"{section_name}.{field}"
            val = db_data.get(field)
            if val is None or str(val).strip().lower() in ("null", "none", "n/a", ""):
                alt_key = aliases.get(field)
                if alt_key:
                    val = db_data.get(alt_key)
            
            # Fetch saved_at / timestamp
            entry = provenance_map.get(key) or provenance_map.get(field) or {}
            ts_str = entry.get("timestamp") or record_updated_at
            saved_at = time.time()
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    saved_at = ts.timestamp()
                except Exception:
                    pass

            # 1. MISSING / Null Integrity
            is_placeholder = val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", "")
            if is_placeholder:
                classification[key] = {
                    "value": None,
                    "status": "MISSING",
                    "saved_at": saved_at,
                    "confidence": 0.0,
                    "provenance": "UNRESOLVED"
                }
                continue

            # 2. CORRUPTED Check
            is_corrupted = False
            corrupt_reason = ""

            # Rule A: Type Correctness
            field_info = schema_cls.model_fields[field]
            if not is_type_correct(val, field_info.annotation):
                is_corrupted = True
                corrupt_reason = "type_mismatch"

            # Rule B: Enum Correctness
            if not is_corrupted:
                if field == "nature_of_company":
                    if str(val).strip().lower() not in nature_of_company_allowed:
                        is_corrupted = True
                        corrupt_reason = "enum_mismatch"
                elif field == "profitability_status":
                    if str(val).strip().lower() not in profitability_status_allowed:
                        is_corrupted = True
                        corrupt_reason = "enum_mismatch"
                elif field == "market_share_status":
                    if str(val).strip().lower() not in market_share_status_allowed:
                        is_corrupted = True
                        corrupt_reason = "enum_mismatch"

            # Rule C: Percentage format / range validity
            if not is_corrupted:
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
                                is_corrupted = True
                                corrupt_reason = "negative_percentage"
                        if abs(float_val) > 200.0:
                            is_corrupted = True
                            corrupt_reason = "percentage_overflow"
                    except ValueError:
                        is_corrupted = True
                        corrupt_reason = "malformed_percentage"

            # Rule D: Currency scaling
            if not is_corrupted:
                currency_fields = {"annual_revenue", "annual_profit", "valuation", "total_capital_raised"}
                if field in currency_fields:
                    try:
                        float_val = float(str(val))
                        if float_val < 0.0:
                            is_corrupted = True
                            corrupt_reason = "negative_currency"
                        elif float_val > 0.0 and float_val < 10000.0:
                            if emp_size_int and emp_size_int >= 100:
                                is_corrupted = True
                                corrupt_reason = "currency_scaling_error"
                    except ValueError:
                        pass

            # Rule E: URL validity
            if not is_corrupted:
                url_fields = {
                    "logo_url", "website_url", "linkedin_url", "ceo_linkedin_url",
                    "twitter_handle", "facebook_url", "instagram_url", "marketing_video_url"
                }
                if field in url_fields:
                    val_str = str(val).strip()
                    if len(val_str) < 8 or " " in val_str:
                        is_corrupted = True
                        corrupt_reason = "malformed_url"
                    elif val_str.lower() in ("https://", "http://", "linkedin.com", "facebook.com", "instagram.com"):
                        is_corrupted = True
                        corrupt_reason = "placeholder_url"

            # Rule F: Semantic integrity / domain mismatch
            if not is_corrupted:
                if field in ("website_url", "linkedin_url", "twitter_handle", "ceo_linkedin_url", "facebook_url", "instagram_url"):
                    val_lower = str(val).lower()
                    major_competitors = ["adobe", "microsoft", "apple", "nvidia", "google", "amazon", "razorpay", "blinkit", "zomato"]
                    for comp in major_competitors:
                        if comp in val_lower and comp_clean != comp:
                            is_corrupted = True
                            corrupt_reason = "domain_mismatch"
                            break

            # Rule G: Range validity
            if not is_corrupted:
                rating_fields = {"glassdoor_rating", "indeed_rating", "google_rating"}
                if field in rating_fields:
                    try:
                        float_val = float(str(val))
                        if float_val < 1.0 or float_val > 5.0:
                            is_corrupted = True
                            corrupt_reason = "rating_out_of_range"
                    except ValueError:
                        is_corrupted = True
                        corrupt_reason = "malformed_rating"
                elif field in ("founded_year", "incorporation_year"):
                    try:
                        int_val = int(float(str(val)))
                        if int_val < 1800 or int_val > 2026:
                            is_corrupted = True
                            corrupt_reason = "year_out_of_range"
                    except ValueError:
                        is_corrupted = True
                        corrupt_reason = "malformed_year"

            if is_corrupted:
                logger.warning(f"  [STRICT VALIDATION] CORRUPTED field detected: {key} (Reason: {corrupt_reason}, Value: {val})")
                classification[key] = {
                    "value": val,
                    "status": "CORRUPTED",
                    "saved_at": saved_at,
                    "confidence": 0.0,
                    "provenance": "CORRUPTED"
                }
                continue

            # 3. WEAK CONFIDENCE Check
            prov = str(entry.get("provenance") or "UNKNOWN").upper()
            conf = entry.get("confidence")
            if conf is None:
                if prov == "CACHE_VERIFIED_RECENT":
                    conf = 0.98
                elif prov == "VALIDATED_CONSENSUS":
                    conf = 0.88
                elif prov in ("REAL_EXTRACTED", "SUPABASE"):
                    conf = 0.78
                elif prov == "DERIVED":
                    conf = 0.68
                elif prov == "INFERRED":
                    conf = 0.50
                else:
                    conf = 0.80

            is_weak = conf < 0.85 or prov in ("INFERRED", "SYNTHETIC", "FAILED")
            if is_weak:
                classification[key] = {
                    "value": val,
                    "status": "WEAK_CONFIDENCE",
                    "saved_at": saved_at,
                    "confidence": conf,
                    "provenance": prov
                }
                continue

            # 4. STALE Check
            age_days = (time.time() - saved_at) / (24 * 3600)
            base_threshold = 1.0 if any(hf in field.lower() for hf in high_freshness_fields) else 7.0
            is_stale = age_days > base_threshold
            if is_stale:
                classification[key] = {
                    "value": val,
                    "status": "STALE",
                    "saved_at": saved_at,
                    "confidence": conf,
                    "provenance": prov
                }
                continue

            # 5. VALIDATED
            classification[key] = {
                "value": val,
                "status": "VALIDATED",
                "saved_at": saved_at,
                "confidence": conf,
                "provenance": prov
            }
            
    return classification

def create_workflow() -> StateGraph:
    """
    Assembles the Multi-Model Parallel LangGraph workflow.
    """
    workflow = StateGraph(GraphState)

    # 1. Add Entry Node
    async def entry_node(state: GraphState):
        logger.info(f"--- [ STARTING PARALLEL EXTRACTION ] [{state.get('company_name')}] ---")
        # Reset circuit breakers so each company run in a batch starts fresh
        llm_service.failed_models = {}
        llm_service.cooldowns = {}
        llm_service._failed_fingerprints = set()
        
        company_name = state.get("company_name") or state.get("company_id")
        if not company_name:
            logger.error("Validation Guard: company_name and company_id are both missing!")
            return {"workflow_status": WorkflowStatus.FAILED}
            
        # [SUPABASE SYNC] Fetch existing validated company intelligence from Supabase
        existing_company_data = {}
        existing_field_provenance = {}
        existing_field_confidence = {}
        existing_field_timestamps = {}
        stale_fields = []
        missing_fields = []
        unresolved_fields = []
        weak_fields = []
        hierarchical_memory = {}
        
        aliases = {
            "cac": "customer_acquisition_cost",
            "clv": "customer_lifetime_value",
            "ltv": "customer_lifetime_value",
            "nps": "net_promoter_score",
            "esg_ratings": "sustainability_csr",
            "mission_clarity": "mission_statement",
            "vision_statement": "vision_statement",
        }
        
        # Initialize telemetry trackers
        hydrated_field_count = 0
        stale_field_count = 0
        extraction_queue_size = 0
        cache_reuse_percentage = 0.0
        supabase_reuse_percentage = 0.0
        skipped_extraction_sections = []
        skipped_provider_calls = 0
        analysis_only_execution = False
        state_consolidated = {}

        try:
            import time
            from datetime import datetime, timezone
            from LANGGRAPH.services.supabase_service import SupabaseClient
            from LANGGRAPH.services.field_cache import field_cache
            from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
            
            supabase_db = SupabaseClient()
            db_data = supabase_db.get_company_intelligence(company_name)
            
            if db_data:
                # ── RUN STRICT HYDRATION VALIDATION FIRST ──
                logger.info(f"  [STRICT HYDRATION VALIDATION] Running strict schema validation on retrieved Supabase record for {company_name}...")
                validated_map = strict_hydrate_validation(company_name, db_data)
                
                # Count and log classification stats
                stats = {"VALIDATED": 0, "MISSING": 0, "CORRUPTED": 0, "WEAK_CONFIDENCE": 0, "STALE": 0}
                for entry in validated_map.values():
                    stats[entry["status"]] += 1
                logger.info(f"  [STRICT HYDRATION VALIDATION] Results: {stats}")
                
                # Create a modified db_data payload where non-validated fields are set to None
                cleaned_db_data = {k: v for k, v in db_data.items() if k not in ("provenance", "_hierarchical_memory")}
                cleaned_provenance = {}
                
                for key, val_info in validated_map.items():
                    section_name, field = key.split(".", 1)
                    if val_info["status"] == "VALIDATED":
                        cleaned_db_data[field] = val_info["value"]
                        # Preserve provenance metadata for validated fields
                        cleaned_provenance[key] = {
                            "provider": "supabase",
                            "provenance": val_info["provenance"],
                            "confidence": val_info["confidence"],
                            "timestamp": datetime.fromtimestamp(val_info["saved_at"], timezone.utc).isoformat() + "Z"
                        }
                    else:
                        # Non-validated: Set to None
                        cleaned_db_data[field] = None
                        cleaned_provenance[key] = {
                            "provider": "supabase",
                            "provenance": val_info["status"],
                            "confidence": 0.0,
                            "timestamp": datetime.fromtimestamp(val_info["saved_at"], timezone.utc).isoformat() + "Z"
                        }
                        
                cleaned_db_data["provenance"] = cleaned_provenance
                cleaned_db_data["_hierarchical_memory"] = db_data.get("_hierarchical_memory") or {}
                
                # ONLY load VALIDATED fields into cache
                logger.info(f"  [SUPABASE FULL HYDRATION] Seeding field cache with STRICTLY VALIDATED data from Supabase for {company_name}...")
                seeded = await field_cache.seed_from_supabase(company_name, cleaned_db_data)
                logger.info(f"  [SUPABASE FULL HYDRATION] Seeded {seeded} strictly validated fields from Supabase into FieldCache.")
                
                # Assign cleaned mappings for state hydration downstream
                db_data = cleaned_db_data
                prov_meta = db_data.get("provenance") or {}
                if not isinstance(prov_meta, dict):
                    prov_meta = {}
                    
                existing_company_data = {k: v for k, v in db_data.items() if k not in ("provenance", "_hierarchical_memory")}
                hierarchical_memory = db_data.get("_hierarchical_memory") or {}
                
                # Fetch company record from FieldCache to get dynamic fields and saved timestamps
                cached_company = field_cache._store.get(company_name, {})
                cached_fields = cached_company.get("fields", {})
                
                high_freshness_fields = {
                    "revenue", "valuation", "funding", "leadership", "competitors",
                    "partnerships", "hiring", "market_share", "social_media",
                    "annual_revenue", "ceo_name", "key_challenges_needs",
                    "recent_funding_rounds", "r_and_d_investment", "technology_partners",
                    "employee_turnover", "total_capital_raised"
                }

                # ── TEMPORAL INTELLIGENCE & DRIFT DETECTION (1-SHOT PRE-SCAN) ──
                drift_detected = {
                    "overview": False,
                    "financials_stability": False,
                    "leadership_contacts": False,
                    "culture_people_work": False,
                    "brand_digital": False
                }
                try:
                    logger.info(f"  [TEMPORAL DRIFT] Pre-scanning active news/filings for {company_name} to check for intelligence drift...")
                    drift_search = await search_service.asearch(f"{company_name} news CEO revenue layoffs funding", max_results=3)
                    drift_ctx = " ".join([r.get("content", "") for r in drift_search]) if drift_search else ""
                    
                    if drift_ctx:
                        # 1. Leadership change
                        ceo_cached = ""
                        for k, entry in cached_fields.items():
                            if k.endswith("ceo_name"):
                                ceo_cached = str(entry.get("value") or "")
                                break
                        if ceo_cached and len(ceo_cached) > 3:
                            ceo_tokens = [t for t in ceo_cached.lower().split() if len(t) > 2]
                            if ceo_tokens and not any(t in drift_ctx.lower() for t in ceo_tokens):
                                if "ceo" in drift_ctx.lower() or "chief executive" in drift_ctx.lower():
                                    drift_detected["leadership_contacts"] = True
                                    logger.info(f"  [TEMPORAL DRIFT TRIGGERED] CEO change suspected! Cached '{ceo_cached}' absent in active news. Refreshing leadership_contacts.")

                        # 2. Valuation / Capital / Funding round drift
                        funding_kws = ["series a", "series b", "series c", "series d", "series e", "ipo", "acquisition", "acquired"]
                        for kw in funding_kws:
                            if kw in drift_ctx.lower():
                                cached_funding = ""
                                for k, entry in cached_fields.items():
                                    if k.endswith("total_capital_raised") or k.endswith("recent_funding_rounds"):
                                        cached_funding += " " + str(entry.get("value") or "").lower()
                                if kw not in cached_funding:
                                    drift_detected["financials_stability"] = True
                                    logger.info(f"  [TEMPORAL DRIFT TRIGGERED] New funding round '{kw}' detected! Refreshing financials_stability.")
                                    break

                        # 3. Sentiment / Layoffs trend change
                        layoff_kws = ["layoff", "lay off", "downsizing", "restructuring", "severance", "headcount cut"]
                        if any(kw in drift_ctx.lower() for kw in layoff_kws):
                            drift_detected["culture_people_work"] = True
                            drift_detected["brand_digital"] = True
                            logger.info(f"  [TEMPORAL DRIFT TRIGGERED] Layoffs/restructuring news found! Refreshing culture_people_work & brand_digital.")
                except Exception as de:
                    logger.warning(f"  [TEMPORAL DRIFT] Pre-scan failed: {de}")

                # Spread flat fields into state consolidated_parameters by section (Full Hydration)
                for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
                    state_consolidated[section_name] = {}
                    for field in schema_cls.model_fields.keys():
                        key = f"{section_name}.{field}"
                        
                        # 1. Fetch value from cache or database
                        cache_entry = cached_fields.get(key) or {}
                        val = cache_entry.get("value")
                        if val is None:
                            val = existing_company_data.get(field)
                        if val is None or str(val).strip().lower() in ("null", "none", "n/a", ""):
                            alt_name = aliases.get(field)
                            if alt_name:
                                val = existing_company_data.get(alt_name)
                                
                        # 2. Check for empty / placeholder values
                        is_placeholder = val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", "")
                        
                        # 3. Determine Freshness decay & Section-Level Evolution Drift
                        saved_at = cache_entry.get("saved_at") or time.time()
                        age_days = (time.time() - saved_at) / (24 * 3600)
                        base_threshold = 1.0 if any(hf in field.lower() for hf in high_freshness_fields) else 7.0
                        is_stale = (age_days > base_threshold) or drift_detected.get(section_name, False)

                        # 4. Determine Confidence degradation
                        existing_conf = cache_entry.get("confidence")
                        existing_prov = cache_entry.get("provenance") or "UNRESOLVED"
                        
                        if existing_conf is None:
                            if existing_prov == "CACHE_VERIFIED_RECENT":
                                existing_conf = 0.98
                            elif existing_prov == "VALIDATED_CONSENSUS":
                                existing_conf = 0.88
                            elif existing_prov == "REAL_EXTRACTED":
                                existing_conf = 0.78
                            elif existing_prov == "DERIVED":
                                existing_conf = 0.68
                            elif existing_prov == "INFERRED":
                                existing_conf = 0.50
                            else:
                                existing_conf = 0.0

                        is_weak = existing_conf < 0.85 or existing_prov in ("INFERRED", "SYNTHETIC", "FAILED")

                        # 5. Categorize fields into strict queues
                        is_valid = True
                        if not is_placeholder:
                            is_valid = validate_field_sanity(company_name, section_name, field, val)
                            
                        if is_placeholder:
                            unresolved_fields.append(key)
                            prov_type = "UNRESOLVED"
                            conf = 0.0
                            val = None # Preserve as NULL/UNRESOLVED
                        elif not is_valid:
                            stale_fields.append(key)
                            prov_type = "STALE_OR_CORRUPTED"
                            conf = 0.10
                            logger.info(f"  [VALIDATION FAILURE] Downgraded {key} to STALE_OR_CORRUPTED. Enqueued for targeted refresh.")
                        elif is_stale:
                            stale_fields.append(key)
                            prov_type = existing_prov
                            conf = max(0.40, existing_conf - 0.20) # Degrade confidence on stale data
                        elif is_weak:
                            weak_fields.append(key)
                            prov_type = existing_prov
                            conf = existing_conf
                        else:
                            # Healthy locked field
                            prov_type = existing_prov
                            conf = existing_conf
                            hydrated_field_count += 1
                            logger.info(f"  [FIELD LOCKED] [CACHE VERIFIED] {key} locked from Supabase with {conf:.2f} confidence.")
                        
                        if val is not None:
                            state_consolidated[section_name][field] = val
                            
                        existing_field_provenance[key] = prov_type
                        existing_field_confidence[key] = conf
                        
                        from datetime import datetime
                        existing_field_timestamps[key] = datetime.fromtimestamp(saved_at).isoformat() + "Z" if saved_at else ""

                # Populate targeting enrichment queue
                missing_fields = unresolved_fields + weak_fields
                stale_field_count = len(stale_fields)
                extraction_queue_size = len(missing_fields) + len(stale_fields)
                
                # Skip extraction sections that are fully healthy
                all_sections = set(SECTION_SCHEMA_MAP.keys())
                pending_sections = set(k.split(".")[0] for k in missing_fields + stale_fields)
                skipped_sections = all_sections - pending_sections
                skipped_extraction_sections = list(skipped_sections)
                for sec in skipped_extraction_sections:
                    logger.info(f"  [EXTRACTION SKIPPED] Section {sec} completely cached and skipped.")
                
                # Check for skipped provider calls
                if len(pending_sections) == 0:
                    skipped_provider_calls = 3 # skipped Groq, Gemini, Cerebras extraction
                    analysis_only_execution = True
                    logger.info("  [ANALYSIS-ONLY EXECUTION] All 163 canonical fields are fresh and CACHE_VERIFIED. Skipping extraction stage entirely.")
                
                # Calculations
                cache_reuse_percentage = (hydrated_field_count / 163.0) * 100.0
                supabase_reuse_percentage = cache_reuse_percentage
                
                # Hydration Assertions
                if len(missing_fields) == 0 and len(stale_fields) == 0:
                    assert hydrated_field_count == 163, f"Expected 163 hydrated fields, got {hydrated_field_count}"
                    assert extraction_queue_size == 0, f"Expected 0 queue size, got {extraction_queue_size}"
                    logger.info("  [VALIDATION] Hydration validation assertions passed successfully.")
            else:
                logger.info(f"  [SUPABASE SYNC] No existing validated record found in Supabase for {company_name}.")
                
                # Check staging company table fallback!
                try:
                    from LANGGRAPH.services.staging_orchestrator import StagingParametersOrchestrator
                    orchestrator = StagingParametersOrchestrator()
                    staging_data = await orchestrator.fetch_first_staging_row(company_name)
                    
                    staging_comp_name = staging_data.get("name", "")
                    is_staging_match = False
                    if staging_comp_name:
                        def norm(s): return re.sub(r"[^a-zA-Z0-9]", "", s).lower()
                        if norm(company_name) in norm(staging_comp_name) or norm(staging_comp_name) in norm(company_name):
                            is_staging_match = True
                            
                    if is_staging_match and staging_data:
                        logger.info(f"  [STAGING HYDRATION] Match found! Seeding FieldCache with staging parameters from secondary DB for {company_name}...")
                        
                        staging_fields_seeded = 0
                        existing_company_data = {}
                        seeded_keys = set()
                        
                        FIELD_TRANSFORMATIONS = {
                            "customer_acquisition_cost": "cac",
                            "customer_lifetime_value": "clv",
                            "net_promoter_score": "nps",
                            "r_and_d_investment": "rd_investment_percentage",
                            "market_share_percentage": "market_share_status",
                            "employee_turnover": "headcount_growth_rate",
                            "cac_ltv_ratio": "cac_ltv_ratio",
                            "churn_rate": "churn_rate"
                        }
                        
                        # 1. Seed database columns with their mapped field names
                        for field, val in staging_data.items():
                            if field in ("company_id", "updated_at", "created_at"):
                                continue
                            
                            mapped_field = FIELD_TRANSFORMATIONS.get(field, field)
                            section_name = orchestrator._schema_mapping.get(mapped_field, "unknown")
                            if section_name != "unknown":
                                key = f"{section_name}.{mapped_field}"
                                existing_company_data[mapped_field] = val
                                if company_name not in field_cache._store:
                                    field_cache._store[company_name] = {"fields": {}}
                                
                                # Do not seed with placeholders or empty strings
                                is_empty = val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", "")
                                if not is_empty:
                                    field_cache._store[company_name]["fields"][key] = {
                                        "value": val,
                                        "confidence": 0.95,
                                        "provenance": "CACHE_VERIFIED_RECENT",
                                        "saved_at": time.time()
                                    }
                                    seeded_keys.add(key)
                                    staging_fields_seeded += 1
                                    
                        # 2. Guarantee that ALL 163 fields are represented in the cache
                        from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
                        for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
                            for field in schema_cls.model_fields.keys():
                                key = f"{section_name}.{field}"
                                if key not in seeded_keys:
                                    if company_name not in field_cache._store:
                                        field_cache._store[company_name] = {"fields": {}}
                                    
                                    # Seed unresolved fields as None with UNRESOLVED provenance
                                    field_cache._store[company_name]["fields"][key] = {
                                        "value": None,
                                        "confidence": 0.0,
                                        "provenance": "UNRESOLVED",
                                        "saved_at": time.time()
                                    }
                                
                        logger.info(f"  [STAGING HYDRATION] Seeded {staging_fields_seeded} parameters from secondary staging_company table into FieldCache.")
                        field_cache._save()
                        
                        cached_company = field_cache._store.get(company_name, {})
                        cached_fields = cached_company.get("fields", {})
                        
                        for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
                            state_consolidated[section_name] = {}
                            for field in schema_cls.model_fields.keys():
                                key = f"{section_name}.{field}"
                                cache_entry = cached_fields.get(key) or {}
                                val = cache_entry.get("value")
                                
                                is_placeholder = val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", "")
                                
                                if is_placeholder:
                                    unresolved_fields.append(key)
                                else:
                                    state_consolidated[section_name][field] = val
                                    hydrated_field_count += 1
                                    existing_field_provenance[key] = "CACHE_VERIFIED_RECENT"
                                    existing_field_confidence[key] = 0.95
                                    existing_field_timestamps[key] = datetime.now(timezone.utc).isoformat() + "Z"
                                    
                        missing_fields = unresolved_fields + weak_fields
                        stale_field_count = len(stale_fields)
                        extraction_queue_size = len(missing_fields) + len(stale_fields)
                        
                        all_sections = set(SECTION_SCHEMA_MAP.keys())
                        pending_sections = set(k.split(".")[0] for k in missing_fields + stale_fields)
                        skipped_sections = all_sections - pending_sections
                        skipped_extraction_sections = list(skipped_sections)
                        
                        if len(pending_sections) == 0:
                            skipped_provider_calls = 3
                            analysis_only_execution = True
                            logger.info("  [STAGING HYDRATION SUCCESS] All staging parameters are fully fresh and verified. Skipping extraction.")
                            
                        cache_reuse_percentage = (hydrated_field_count / 163.0) * 100.0
                        supabase_reuse_percentage = cache_reuse_percentage
                    else:
                        from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
                        for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
                            for field in schema_cls.model_fields.keys():
                                missing_fields.append(f"{section_name}.{field}")
                        extraction_queue_size = len(missing_fields)
                except Exception as stage_err:
                    logger.warning(f"  [STAGING HYDRATION] Fallback failed: {stage_err}")
                    from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP
                    for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
                        for field in schema_cls.model_fields.keys():
                            missing_fields.append(f"{section_name}.{field}")
                    extraction_queue_size = len(missing_fields)
        except Exception as se:
            logger.warning(f"  [SUPABASE SYNC] Failed to auto-sync field cache from Supabase: {se}")

        # A. Try loading fresh record from validated_memory.json
        memory_file = "validated_memory.json"
        is_fresh_memory = False
        memory_data = {}
        provenance = {}
        provenance_counts = {}
        completeness_score = 0.0
        quality_score = 0.0
        
        if os.path.exists(memory_file):
            try:
                with open(memory_file, "r", encoding="utf-8") as f:
                    all_mem = json.load(f)
                    if company_name in all_mem:
                        record = all_mem[company_name]
                        ts_str = record.get("timestamp")
                        if ts_str:
                            # Parse UTC datetime
                            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                            from datetime import timezone
                            age_days = (datetime.now(timezone.utc) - ts).total_seconds() / (24 * 3600)
                            if age_days < 0.5: # fresh within 12 hours
                                memory_data = record.get("consolidated_parameters") or record.get("data") or {}
                                provenance = record.get("provenance") or {}
                                provenance_counts = record.get("provenance_counts") or {}
                                completeness_score = record.get("completeness_score") or 0.0
                                quality_score = record.get("quality_score") or 0.0
                                is_fresh_memory = True
                                logger.info(f"  [MEMORY RECOVERY] Found fresh validated memory cache for {company_name}. Reusing cached values.")
            except Exception as e:
                logger.warning(f"  [MEMORY RECOVERY] Failed to load memory cache: {e}")
                
        if is_fresh_memory and memory_data:
            return {
                "company_name": company_name,
                "workflow_status": WorkflowStatus.CACHE_RECOVERED,
                "consolidated_parameters": memory_data,
                "provenance": provenance,
                "provenance_counts": provenance_counts,
                "completeness_score": completeness_score,
                "quality_score": quality_score,
                "existing_company_data": {"analysis_json": record.get("analysis_json")},
                "audit_logs": [
                    AuditLog(
                        node_name="entry",
                        action="memory_recovery",
                        details=f"Recovered validated record from memory with score {quality_score}%.",
                        status="success"
                    )
                ]
            }
            
        # B. No fresh memory: Pre-fetch compressed Tavily contexts in parallel for all 10 sections!
        logger.info(f"  [PRE-FETCH] Analyzing pending sections to optimize pre-fetch...")
        sections = [
            "overview",
            "business_market",
            "culture_people_work",
            "learning_growth",
            "compensation_lifestyle",
            "work_logistics",
            "financials_stability",
            "tech_innovation",
            "leadership_contacts",
            "brand_digital"
        ]
        
        pending_sections = set()
        for key in missing_fields + stale_fields:
            if "." in key:
                pending_sections.add(key.split(".", 1)[0])
                
        sections_to_fetch = [s for s in sections if s in pending_sections]
        section_contexts = {}
        
        if sections_to_fetch:
            logger.info(f"  [PRE-FETCH] Parallel fetching compressed Tavily search contexts for {len(sections_to_fetch)} pending sections: {sections_to_fetch}...")
            tasks = [search_service.search_company_info(company_name, sec) for sec in sections_to_fetch]
            results = await asyncio.gather(*tasks)
            section_contexts = {sections_to_fetch[i]: results[i] for i in range(len(sections_to_fetch))}
            logger.info(f"  [PRE-FETCH] Pre-fetched search contexts for {len(section_contexts)} sections.")
        else:
            logger.info(f"  [PRE-FETCH] All sections fully fresh in cache — skipping Tavily pre-fetch entirely!")
        
        return {
            "company_name": company_name,
            "workflow_status": WorkflowStatus.EXTRACTING,
            "provenance": {},
            "provenance_counts": {},
            "section_contexts": section_contexts,
            "consolidated_parameters": state_consolidated,
            
            # Telemetry Metrics
            "hydrated_field_count": hydrated_field_count,
            "stale_field_count": stale_field_count,
            "extraction_queue_size": extraction_queue_size,
            "cache_reuse_percentage": cache_reuse_percentage,
            "supabase_reuse_percentage": supabase_reuse_percentage,
            "skipped_extraction_sections": skipped_extraction_sections,
            "skipped_provider_calls": skipped_provider_calls,
            "analysis_only_execution": analysis_only_execution,
            "extraction_tokens": 0,
            "reasoning_tokens": 0,
            
            # Phase 1: State Integration variables
            "existing_company_data": existing_company_data,
            "existing_field_provenance": existing_field_provenance,
            "existing_field_confidence": existing_field_confidence,
            "existing_field_timestamps": existing_field_timestamps,
            "stale_fields": stale_fields,
            "missing_fields": missing_fields,
            "unresolved_fields": unresolved_fields,
            "weak_fields": weak_fields,
            
            # Phase 4: Targeted Regeneration variables
            "regenerated_fields": [],
            "regeneration_attempts": {},
            "failed_field_reasons": {},
            
            # Hierarchical Memory Key
            "hierarchical_memory": hierarchical_memory
        }
    
    # 2. Define wrapper nodes for the decentralized provider validation and retry logic
    async def groq_generate_wrapper(state: GraphState) -> Dict[str, Any]:
        return await research_node(state, llm_service, search_service, provider="groq")

    async def groq_validate_wrapper(state: GraphState) -> Dict[str, Any]:
        res = await validate_node(state, model_key="groq_data")
        val_results = res.get("validation_results", [])
        has_failures = any(not r.is_valid for r in val_results)
        groq_data = state.get("groq_data") or {}
        current_retry = groq_data.get("retry_count", 0)
        
        new_groq_data = {**(res.get("groq_data") or groq_data)}
        if has_failures:
            new_groq_data["validation_failed"] = True
            new_groq_data["retry_count"] = current_retry + 1
        else:
            new_groq_data["validation_failed"] = False
        
        res["groq_data"] = new_groq_data
        return res

    async def gemini_generate_wrapper(state: GraphState) -> Dict[str, Any]:
        return await research_node(state, llm_service, search_service, provider="gemini")

    async def gemini_validate_wrapper(state: GraphState) -> Dict[str, Any]:
        res = await validate_node(state, model_key="gemini_data")
        val_results = res.get("validation_results", [])
        has_failures = any(not r.is_valid for r in val_results)
        gemini_data = state.get("gemini_data") or {}
        current_retry = gemini_data.get("retry_count", 0)
        
        new_gemini_data = {**(res.get("gemini_data") or gemini_data)}
        if has_failures:
            new_gemini_data["validation_failed"] = True
            new_gemini_data["retry_count"] = current_retry + 1
        else:
            new_gemini_data["validation_failed"] = False
            
        res["gemini_data"] = new_gemini_data
        return res

    async def cerebras_generate_wrapper(state: GraphState) -> Dict[str, Any]:
        return await research_node(state, llm_service, search_service, provider="cerebras")

    async def cerebras_validate_wrapper(state: GraphState) -> Dict[str, Any]:
        res = await validate_node(state, model_key="cerebras_data")
        val_results = res.get("validation_results", [])
        has_failures = any(not r.is_valid for r in val_results)
        cerebras_data = state.get("cerebras_data") or {}
        current_retry = cerebras_data.get("retry_count", 0)
        
        new_cerebras_data = {**(res.get("cerebras_data") or cerebras_data)}
        if has_failures:
            new_cerebras_data["validation_failed"] = True
            new_cerebras_data["retry_count"] = current_retry + 1
        else:
            new_cerebras_data["validation_failed"] = False
            
        res["cerebras_data"] = new_cerebras_data
        return res

    # Register all nodes
    workflow.add_node("entry", entry_node)
    workflow.add_node("groq_generate", groq_generate_wrapper)
    workflow.add_node("groq_validate", groq_validate_wrapper)
    workflow.add_node("gemini_generate", gemini_generate_wrapper)
    workflow.add_node("gemini_validate", gemini_validate_wrapper)
    workflow.add_node("cerebras_generate", cerebras_generate_wrapper)
    workflow.add_node("cerebras_validate", cerebras_validate_wrapper)
    workflow.add_node("consolidate", consolidate_node)
    workflow.add_node("excel", persist_node)
    workflow.add_node("analysis", analysis_node)

    # 3. Define routers for the local branch loopbacks (Dashed conditional edges)
    def route_groq_validate(state: GraphState) -> str:
        import os
        if os.getenv("DEV_MODE", "false").lower() == "true":
            return "consolidate"
        groq_data = state.get("groq_data") or {}
        if groq_data.get("validation_failed", False) and groq_data.get("retry_count", 0) < 2:
            return "groq_generate"
        return "consolidate"

    def route_gemini_validate(state: GraphState) -> str:
        import os
        if os.getenv("DEV_MODE", "false").lower() == "true":
            return "consolidate"
        gemini_data = state.get("gemini_data") or {}
        if gemini_data.get("validation_failed", False) and gemini_data.get("retry_count", 0) < 2:
            return "gemini_generate"
        return "consolidate"

    def route_cerebras_validate(state: GraphState) -> str:
        import os
        if os.getenv("DEV_MODE", "false").lower() == "true":
            return "consolidate"
        cerebras_data = state.get("cerebras_data") or {}
        if cerebras_data.get("validation_failed", False) and cerebras_data.get("retry_count", 0) < 2:
            return "cerebras_generate"
        return "consolidate"

    # 4. Set entry points and define dynamic routing to skip extraction if fully hydrated
    workflow.set_entry_point("entry")
    
    def route_after_entry(state: GraphState):
        if state.get("analysis_only_execution"):
            logger.info("  [ANALYSIS-ONLY EXECUTION] All 163 fields exist and are CACHE_VERIFIED. Routing directly to consolidate, skipping extraction stage.")
            return ["consolidate"]
        return ["groq_generate", "gemini_generate", "cerebras_generate"]

    workflow.add_conditional_edges(
        "entry",
        route_after_entry,
        {
            "consolidate": "consolidate",
            "groq_generate": "groq_generate",
            "gemini_generate": "gemini_generate",
            "cerebras_generate": "cerebras_generate"
        }
    )

    workflow.add_edge("groq_generate", "groq_validate")
    workflow.add_edge("gemini_generate", "gemini_validate")
    workflow.add_edge("cerebras_generate", "cerebras_validate")

    workflow.add_conditional_edges(
        "groq_validate", 
        route_groq_validate, 
        {"groq_generate": "groq_generate", "consolidate": "consolidate"}
    )
    workflow.add_conditional_edges(
        "gemini_validate", 
        route_gemini_validate, 
        {"gemini_generate": "gemini_generate", "consolidate": "consolidate"}
    )
    workflow.add_conditional_edges(
        "cerebras_validate", 
        route_cerebras_validate, 
        {"cerebras_generate": "cerebras_generate", "consolidate": "consolidate"}
    )

    workflow.add_edge("consolidate", "analysis")
    workflow.add_edge("analysis", "excel")
    workflow.add_edge("excel", END)

    return workflow


# Compile the graph
try:
    from LANGGRAPH.utils.redis_checkpointer import SafeRedisSaver
    checkpointer = SafeRedisSaver()
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"Failed to load SafeRedisSaver: {e}")
    checkpointer = None

workflow_app = create_workflow().compile(checkpointer=checkpointer)

# Export for use in other modules
app = workflow_app

if __name__ == "__main__":
    logger.info("LangGraph Workflow Compiled Successfully.")
    # To visualize the graph (requires pygraphviz):
    # try:
    #     app.get_graph().draw_mermaid_png(output_file_path="workflow_graph.png")
    #     print("Workflow graph visualization saved to workflow_graph.png")
    # except Exception as e:
    #     print(f"Visualization skipped: {e}")
