import re
import json
import logging
from typing import Any, Dict, List, Optional, Type, Union, get_origin, get_args
from pydantic import BaseModel
from langsmith import traceable

logger = logging.getLogger(__name__)

@traceable(run_type="chain", name="SchemaHarmonization")
def harmonize_with_schema(data: Any, schema_cls: Type[BaseModel]) -> Dict[str, Any]:
    """
    Recursively normalizes raw LLM output to match a Pydantic schema.
    Supports positional array recovery and strict type coercion.
    """
    # 0. Handle 'null' or 'None' strings from LLM
    if isinstance(data, str) and data.lower() in ["null", "none", "", "n/a"]:
        data = {}

    # 0. POSITIONAL RECOVERY: If LLM returned a list for a section, map it to keys deterministically
    if isinstance(data, list):
        keys = list(schema_cls.model_fields.keys())
        logger.info(f"Triggering Positional Recovery for {schema_cls.__name__} ({len(data)} items)")
        # Reconstruct as dict
        data = {keys[i]: data[i] for i in range(min(len(data), len(keys)))}
    
    if not data or not isinstance(data, (dict, list)):
        data = {}

    harmonized = {}
    
    # Iterate through all fields defined in the schema
    for field_name, field_info in schema_cls.model_fields.items():
        raw_val = data.get(field_name)
        field_type = field_info.annotation
        
        # Check if it's a nested Pydantic model
        origin = get_origin(field_type)
        args = get_args(field_type)
        
        # 1. Handle Nested Models Recursively
        if hasattr(field_type, "model_fields"):
            harmonized[field_name] = harmonize_with_schema(raw_val, field_type)
            
        # 2. Handle Lists of Nested Models
        elif origin is list and args and hasattr(args[0], "model_fields"):
            if isinstance(raw_val, list):
                harmonized[field_name] = [harmonize_with_schema(item, args[0]) for item in raw_val if isinstance(item, (dict, list))]
            else:
                harmonized[field_name] = []
                
        # 3. Handle Primitive / Coerced Types with Safety Padding
        else:
            coerced = _coerce_value(raw_val, field_type, field_name)
            canonical_type = CANONICAL_FIELD_TYPES.get(field_name, "NarrativeField")
            coerced = _apply_numeric_safety_rules(coerced, canonical_type, field_name)
            
            default_val = field_info.default
            has_default = default_val is not None and "Undefined" not in str(default_val) and "PydanticUndefined" not in str(default_val)
            if coerced is None and has_default:
                harmonized[field_name] = default_val
            else:
                harmonized[field_name] = coerced
            
    return harmonized

CANONICAL_FIELD_TYPES = {
    # ── OVERVIEW ──
    "name": "NarrativeField",
    "short_name": "NarrativeField",
    "logo_url": "URLField",
    "category": "EnumField",
    "incorporation_year": "IntegerField",
    "nature_of_company": "EnumField",
    "headquarters_address": "NarrativeField",
    "operating_countries": "ListField",
    "office_count": "IntegerField",
    "office_locations": "ListField",
    "employee_size": "IntegerField",
    "overview_text": "NarrativeField",
    "history_timeline": "StructuredObjectField",
    "recent_news": "ListField",
    "company_maturity": "EnumField",

    # ── BUSINESS & MARKET ──
    "pain_points_addressed": "NarrativeField",
    "focus_sectors": "ListField",
    "offerings_description": "NarrativeField",
    "top_customers": "ListField",
    "core_value_proposition": "NarrativeField",
    "unique_differentiators": "NarrativeField",
    "competitive_advantages": "NarrativeField",
    "weaknesses_gaps": "NarrativeField",
    "key_challenges_needs": "NarrativeField",
    "key_competitors": "ListField",
    "tam": "CurrencyField",
    "sam": "CurrencyField",
    "som": "CurrencyField",
    "market_share_percentage": "PercentageRangeField",
    "go_to_market_strategy": "NarrativeField",
    "strategic_priorities": "NarrativeField",
    "future_projections": "NarrativeField",

    # ── CULTURE, PEOPLE & WORK ──
    "work_culture_summary": "NarrativeField",
    "hiring_velocity": "FloatField",
    "employee_turnover": "PercentageField",
    "avg_retention_tenure": "FloatField",
    "manager_quality": "FloatField",
    "psychological_safety": "FloatField",
    "feedback_culture": "FloatField",
    "diversity_metrics": "StructuredObjectField",
    "diversity_inclusion_score": "FloatField",
    "ethical_standards": "NarrativeField",
    "layoff_history": "BooleanField",
    "burnout_risk": "FloatField",
    "mission_clarity": "FloatField",
    "crisis_behavior": "NarrativeField",

    # ── LEARNING & GROWTH ──
    "training_spend": "CurrencyField",
    "onboarding_quality": "FloatField",
    "learning_culture": "FloatField",
    "exposure_quality": "NarrativeField",
    "mentorship_availability": "FloatField",
    "internal_mobility": "FloatField",
    "promotion_clarity": "NarrativeField",
    "tools_access": "NarrativeField",
    "role_clarity": "NarrativeField",
    "early_ownership": "NarrativeField",
    "work_impact": "NarrativeField",
    "execution_thinking_balance": "NarrativeField",
    "automation_level": "FloatField",
    "cross_functional_exposure": "FloatField",
    "exit_opportunities": "ListField",
    "skill_relevance": "FloatField",
    "network_strength": "FloatField",
    "global_exposure": "NarrativeField",
    "external_recognition": "ListField",

    # ── COMPENSATION & LIFESTYLE ──
    "fixed_vs_variable_pay": "NarrativeField",
    "bonus_predictability": "FloatField",
    "esops_incentives": "NarrativeField",
    "family_health_insurance": "NarrativeField",
    "relocation_support": "NarrativeField",
    "lifestyle_benefits": "ListField",
    "leave_policy": "NarrativeField",
    "health_support": "NarrativeField",

    # ── WORK LOGISTICS ──
    "remote_policy_details": "NarrativeField",
    "typical_hours": "RangeField",
    "overtime_expectations": "NarrativeField",
    "weekend_work": "NarrativeField",
    "flexibility_level": "FloatField",
    "location_centrality": "NarrativeField",
    "public_transport_access": "NarrativeField",
    "cab_policy": "NarrativeField",
    "airport_commute_time": "IntegerField",
    "office_zone_type": "NarrativeField",
    "area_safety": "FloatField",
    "safety_policies": "ListField",
    "infrastructure_safety": "NarrativeField",
    "emergency_preparedness": "NarrativeField",

    # ── FINANCIALS & STABILITY ──
    "annual_revenue": "CurrencyField",
    "annual_profit": "CurrencyField",
    "revenue_mix": "StructuredObjectField",
    "valuation": "CurrencyField",
    "yoy_growth_rate": "PercentageField",
    "profitability_status": "EnumField",
    "key_investors": "ListField",
    "recent_funding_rounds": "ListField",
    "total_capital_raised": "CurrencyField",
    "burn_rate": "CurrencyField",
    "runway_months": "IntegerField",
    "burn_multiplier": "FloatField",
    "esg_ratings": "StructuredObjectField",
    "regulatory_status": "NarrativeField",
    "legal_issues": "ListField",
    "supply_chain_dependencies": "ListField",
    "geopolitical_risks": "ListField",
    "macro_risks": "ListField",
    "cac": "CurrencyField",
    "clv": "CurrencyField",
    "ltv": "CurrencyField",
    "cac_ltv_ratio": "FloatField",
    "churn_rate": "PercentageField",
    "net_revenue_retention": "PercentageField",
    "gross_revenue_retention": "PercentageField",
    "payback_period": "FloatField",
    "rd_investment_percentage": "PercentageField",
    "revenue_per_employee": "CurrencyField",
    "profit_per_employee": "CurrencyField",

    # ── TECH & INNOVATION ──
    "tech_stack": "ListField",
    "technology_partners": "ListField",
    "intellectual_property": "StructuredObjectField",
    "r_and_d_investment": "PercentageField",
    "ai_ml_adoption_level": "NarrativeField",
    "cybersecurity_posture": "NarrativeField",
    "innovation_roadmap": "ListField",
    "product_pipeline": "ListField",
    "tech_adoption_rating": "FloatField",
    "partnership_ecosystem": "ListField",

    # ── LEADERSHIP & CONTACTS ──
    "ceo_name": "NarrativeField",
    "ceo_linkedin_url": "URLField",
    "key_leaders": "ListField",
    "board_members": "ListField",
    "warm_intro_pathways": "ListField",
    "decision_maker_access": "FloatField",
    "primary_contact_email": "EmailField",
    "primary_phone_number": "PhoneField",
    "contact_person_name": "NarrativeField",
    "contact_person_title": "NarrativeField",
    "contact_person_email": "EmailField",
    "contact_person_phone": "PhoneField",

    # ── BRAND & DIGITAL ──
    "website_url": "URLField",
    "website_quality": "FloatField",
    "website_rating": "FloatField",
    "website_traffic_rank": "IntegerField",
    "social_media_followers": "StructuredObjectField",
    "glassdoor_rating": "FloatField",
    "indeed_rating": "FloatField",
    "google_rating": "FloatField",
    "linkedin_url": "URLField",
    "twitter_handle": "URLField",
    "facebook_url": "URLField",
    "instagram_url": "URLField",
    "marketing_video_url": "URLField",
    "customer_testimonials": "ListField",
    "awards_recognitions": "ListField",
    "brand_sentiment_score": "FloatField",
    "event_participation": "ListField",
    "brand_value": "CurrencyField",
    "nps": "IntegerField",
    "sales_motion": "NarrativeField",
    "customer_acquisition_channels": "ListField",
    "sales_cycle_length": "FloatField",
    "average_deal_size": "CurrencyField",
    "headcount_growth_rate": "PercentageField",
    "market_share_status": "EnumField"
}

def _coerce_value(val: Any, target_type: Any, field_name: Optional[str] = None) -> Any:
    """
    Strict Type-Aware Canonical Field Normalization Engine.
    Ensures absolute type safety, preventing canonical schema collapse.
    """
    field_lower = str(field_name or "").lower()
    
    # 0. Handle None or Empty values
    if val is None or val == "n/a" or val == "None" or val == "null" or val == "" or str(val).strip().lower() in ("null", "none", "n/a", ""):
        type_str = str(target_type).lower()
        if "list" in type_str:
            return []
        if "dict" in type_str:
            if isinstance(val, dict):
                return val
            if isinstance(val, list):
                return {"items": val}
            if isinstance(val, str):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, dict):
                        return parsed
                    if isinstance(parsed, list):
                        return {"items": parsed}
                except Exception:
                    pass
                return {"summary": val.strip()}
            return {"summary": str(val)}
        if "bool" in type_str:
            return False
        return None

    # Get Canonical Field Type
    canonical_type = CANONICAL_FIELD_TYPES.get(field_name, "NarrativeField")
    
    # 1. URLField Contract
    if canonical_type == "URLField":
        if isinstance(val, str):
            val_clean = val.strip()
            
            # Semantic URL Validation Rules
            v_lower = val_clean.lower()
            bad_indicators = ["news", "article", "cnbc", "bloomberg", "glassdoor.com/reviews", "twitter.com/search", "x.com/search", "/status/", "/posts/"]
            if any(x in v_lower for x in bad_indicators):
                logger.warning(f"  [SEMANTIC VALIDATION SHIELD] Rejected contaminated URL: {val_clean}")
                return "FAILED_SEMANTIC_VALIDATION"

            # Strict domain checking: Must contain a period representing a TLD, but NO spaces!
            if "." in val_clean and " " not in val_clean:
                if not val_clean.lower().startswith(("http://", "https://", "mailto:", "tel:", "@")):
                    return "https://" + val_clean
            elif val_clean.lower().startswith(("http://", "https://", "www.")):
                if not val_clean.lower().startswith(("http://", "https://")):
                    return "https://" + val_clean
            # If it is a narrative description, return as-is, NEVER prepend https://
            return val_clean
        return str(val)

    # 1.5 PhoneField Contract
    if canonical_type == "PhoneField":
        if isinstance(val, str):
            val_clean = val.strip()
            if not val_clean or val_clean.lower() in ("null", "none", "n/a", "missing"):
                return None
            return val_clean
        elif isinstance(val, (int, float)):
            # preserve leading zeros and formatting, but if int/float, just str it
            if isinstance(val, float) and val.is_integer():
                return str(int(val))
            return str(val)
        return str(val)


    # 2. EmailField Contract
    if canonical_type == "EmailField":
        if isinstance(val, str):
            val_clean = val.strip()
            # Strict email format validation
            if "@" in val_clean and "." in val_clean and len(val_clean) > 5 and " " not in val_clean:
                # Remove common prefixes like 'mailto:' or 'https://'
                val_clean = val_clean.replace("mailto:", "").replace("https://", "").replace("http://", "").strip()
                return val_clean
            return None
        return None

    # 3. EnumField Contract
    if canonical_type == "EnumField":
        if isinstance(val, str):
            val_clean = val.lower().strip()
            # Exact enum allowed list mapping
            if field_lower == "nature_of_company":
                nature_allowed = {"public", "private", "subsidiary", "joint venture", "non-profit", "partnership"}
                for allowed in nature_allowed:
                    if allowed in val_clean:
                        return allowed
            elif field_lower == "profitability_status":
                profit_allowed = {"profitable", "unprofitable", "breakeven", "pre-revenue"}
                for allowed in profit_allowed:
                    if allowed in val_clean:
                        return allowed
            elif field_lower == "market_share_status":
                market_allowed = ["stable challenger / niche specialist", "market leader", "niche player", "challenger", "dominant player", "stable challenger", "niche specialist"]
                for allowed in market_allowed:
                    if allowed in val_clean:
                        return allowed
            elif field_lower == "company_maturity":
                maturity_allowed = {"early stage", "growth stage", "mature", "established", "startup", "unicorn"}
                for allowed in maturity_allowed:
                    if allowed in val_clean:
                        return allowed
            elif field_lower == "category":
                category_allowed = {"it services", "product development", "consulting", "hardware", "biotech", "finance", "education", "saas", "manufacturing"}
                for allowed in category_allowed:
                    if allowed in val_clean:
                        return allowed
            # Keep as original string, NEVER pass through numeric coercion!
            return val.strip()
        return str(val).strip()

    # 4. PercentageField / PercentageRangeField Contract
    if canonical_type in ("PercentageField", "PercentageRangeField"):
        if isinstance(val, str):
            val_clean = val.strip().lower()
            if any(x in val_clean for x in ["estimated", "industry standard", "assumed", "approx"]):
                return None
            
            # Extract numbers
            digits_match = re.findall(r"[-+]?\d*\.\d+|\d+", val_clean)
            if digits_match:
                try:
                    num_val = float(digits_match[0])
                    # If it's a single value (no ranges), return it as a float so bounds checking works
                    if "-" not in val_clean and "to" not in val_clean and "or" not in val_clean:
                        return num_val
                    return val_clean
                except ValueError:
                    pass
            return val_clean
        if isinstance(val, (int, float)):
            return float(val)
        return val

    # 5. RangeField Contract
    if canonical_type == "RangeField":
        if isinstance(val, str):
            return val.strip()
        return str(val)

    # 6. CurrencyField Contract
    if canonical_type == "CurrencyField":
        if isinstance(val, (int, float)):
            return val
        if isinstance(val, str):
            val_clean = val.lower().strip()
            # Currency parsing with multipliers
            multiplier = 1.0
            if "billion" in val_clean or " b" in val_clean or val_clean.endswith("b"):
                multiplier = 1_000_000_000.0
            elif "million" in val_clean or " m" in val_clean or val_clean.endswith("m"):
                multiplier = 1_000_000.0
            elif "thousand" in val_clean or " k" in val_clean or val_clean.endswith("k"):
                multiplier = 1_000.0
            elif "crore" in val_clean or " cr" in val_clean:
                multiplier = 10_000_000.0
            elif "lakh" in val_clean:
                multiplier = 100_000.0

            digits_match = re.findall(r"[-+]?\d*\.\d+|\d+", val_clean)
            if digits_match:
                try:
                    return float(digits_match[0]) * multiplier
                except ValueError:
                    pass
            return None

    # 7. IntegerField Contract
    if canonical_type == "IntegerField":
        if isinstance(val, int):
            return val
        if isinstance(val, float):
            return int(val)
        if isinstance(val, str):
            val_clean = val.strip()
            digits_match = re.findall(r"[-+]?\d+", val_clean)
            if digits_match:
                try:
                    return int(digits_match[0])
                except ValueError:
                    pass
            return None

    # 8. FloatField Contract
    if canonical_type == "FloatField":
        if isinstance(val, float):
            return val
        if isinstance(val, int):
            return float(val)
        if isinstance(val, str):
            val_clean = val.strip()
            digits_match = re.findall(r"[-+]?\d*\.\d+|\d+", val_clean)
            if digits_match:
                try:
                    return float(digits_match[0])
                except ValueError:
                    pass
            return None

    # 9. BooleanField Contract
    if canonical_type == "BooleanField":
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            val_clean = val.lower().strip()
            if val_clean in ("true", "1", "yes", "y", "enabled", "active", "high"):
                return True
            if val_clean in ("false", "0", "no", "n", "disabled", "inactive", "low", "none", "n/a"):
                return False
        return bool(val)

    # 10. ListField Contract
    if canonical_type == "ListField":
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            try:
                loaded = json.loads(val)
                if isinstance(loaded, list):
                    return loaded
            except:
                pass
            if "," in val:
                return [x.strip() for x in val.split(",")]
            if ";" in val:
                return [x.strip() for x in val.split(";")]
            return [val.strip()]
        return [str(val)]

    # 11. StructuredObjectField Contract
    if canonical_type == "StructuredObjectField":
        if isinstance(val, dict):
            return val
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            try:
                return json.loads(val)
            except:
                pass
            return {"details": val}
        return {"details": str(val)}

    # 12. NarrativeField Contract (Fallback)
    if isinstance(val, (list, dict)):
        return val
    return str(val)

def _flatten_dict(d: Dict[str, Any]) -> str:
    """
    Converts a dictionary into a compact string.
    """
    if not isinstance(d, dict):
        return str(d)
        
    title = d.get("title") or d.get("event") or d.get("name") or d.get("headline")
    year = d.get("year") or d.get("date") or d.get("timestamp")
    
    if title and year:
        return f"{title} ({year})"
    elif title:
        return str(title)
    
    return ", ".join([f"{k}: {v}" for k, v in d.items() if v])

def repair_json_structure(raw_text: str) -> str:
    """
    High-resilience JSON cleanup. Delegates to the dedicated json_recovery
    module for multi-pass repair (markdown strip, comment removal,
    brace balancing, key quoting).
    """
    from LANGGRAPH.utils.json_recovery import repair_json
    return repair_json(raw_text)

def _apply_numeric_safety_rules(val: Any, canonical_type: str, field_name: str) -> Any:
    """
    Applies enterprise-grade numeric safety and bounds checking to prevent hallucinations.
    """
    if val is None:
        return None
        
    field_lower = str(field_name).lower()
    
    # 1. Zero Handling: If the field is a numeric or rate and the value is exactly 0, reject it.
    # LLMs frequently hallucinate 0 for missing data.
    if isinstance(val, (int, float)) and val == 0:
        if field_lower not in ("office_count", "layoff_history", "burnout_risk"):
            return None

    # 2. Percentage Bounds
    if canonical_type in ("PercentageField", "PercentageRangeField"):
        # If it's a string range (e.g. "100-110%"), parse out the maximum number found in it
        if isinstance(val, str):
            nums = [float(x) for x in re.findall(r"[-+]?\d*\.\d+|\d+", val)]
            if nums:
                max_num = max(nums)
                if "growth" in field_lower:
                    if max_num > 5000: return None
                else:
                    if max_num > 100: return None
        elif isinstance(val, (int, float)):
            if "growth" in field_lower:
                if val < -100 or val > 5000: return None
            else:
                if val < 0 or val > 100: return None
                
    # 3. Rating Bounds
    if "rating" in field_lower or "score" in field_lower:
        if isinstance(val, (int, float)):
            if "nps" in field_lower:
                if val < -100 or val > 100:
                    return None
            elif val < 0 or val > 100:
                # Ratings are either 0-5, 0-10, or 0-100. Any value > 100 is corrupted scaling.
                return None
                
    # 4. Logical Boundary Checks based on Field Context
    if isinstance(val, (int, float)):
        if "runway" in field_lower:
            # Max realistic runway is 10 years (120 months)
            if val > 120 or val < 0:
                return None
                
        if "commute" in field_lower or "time" in field_lower:
            # Commute time > 500 mins (8 hours) is hallucinated scaling (e.g. 45000000)
            if val > 500 or val < 0:
                return None
                
        if "employee_size" in field_lower or "headcount" in field_lower:
            # Over 2 million is Walmart. Over 10 million is hallucinatory.
            if val > 5000000 or val < 0:
                return None

        if "valuation" in field_lower or "revenue" in field_lower:
            # Negative revenue/valuation makes no sense in this context.
            if val < 0:
                return None
                
    # 5. Null String Handling
    if isinstance(val, str):
        if val.strip().lower() in ("0", "na", "n/a", "none", "null", "unknown", "missing", "not available", "-"):
            return None
            
    return val

