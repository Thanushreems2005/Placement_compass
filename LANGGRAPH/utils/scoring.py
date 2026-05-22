from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class ScoreMetrics(BaseModel):
    """Metrics used for weighted scoring calculation."""
    accuracy: float = Field(0.0, ge=0.0, le=1.0)
    freshness: float = Field(0.0, ge=0.0, le=1.0)
    compliance: float = Field(0.0, ge=0.0, le=1.0)


def calculate_weighted_score(metrics: ScoreMetrics) -> float:
    """
    Calculates a cumulative confidence score based on enterprise weights:
    Accuracy = 45%
    Freshness = 35%
    Rule Compliance = 20%
    """
    weights = {
        "accuracy": 0.45,
        "freshness": 0.35,
        "compliance": 0.20
    }
    
    score = (
        (metrics.accuracy * weights["accuracy"]) +
        (metrics.freshness * weights["freshness"]) +
        (metrics.compliance * weights["compliance"])
    )
    
    return round(score, 3)


def calculate_freshness(timestamp: datetime) -> float:
    """
    Calculates freshness score. Newer timestamps get higher scores.
    For simplicity, we assume anything in the last hour is 1.0.
    """
    now = datetime.utcnow()
    delta = now - timestamp
    seconds = delta.total_seconds()
    
    if seconds < 3600:
        return 1.0
    elif seconds < 86400: # 1 day
        return 0.8
    elif seconds < 604800: # 1 week
        return 0.5
    else:
        return 0.2


def check_compliance(value: Any, param_name: str) -> float:
    """
    Checks if a value complies with basic rules.
    This can be expanded with regex or type checking.
    """
    if value is None or value == "":
        return 0.0
    
    # Example: industry should be more than 3 chars
    if param_name == "industry" and len(str(value)) < 3:
        return 0.3
        
    return 1.0


def calculate_parameter_confidence(
    key: str,
    val: Any,
    provenance: str,
    provider: str,
    age_days: float
) -> Tuple[float, Dict[str, float]]:
    """
    Split confidence modeling engine. Splits parameter confidence into:
    - freshness_confidence
    - semantic_confidence
    - validation_confidence
    - provenance_confidence
    - extraction_confidence

    Returns (overall_weighted_confidence, confidence_breakdown)
    """
    from typing import Tuple, Dict
    prov_upper = str(provenance).upper()
    provider_lower = str(provider).lower()
    
    # 1. Freshness Confidence (Decays based on age of the record)
    high_freshness_fields = {
        "revenue", "valuation", "funding", "leadership", "competitors",
        "partnerships", "hiring", "market_share", "social_media",
        "annual_revenue", "ceo_name", "key_challenges_needs",
        "recent_funding_rounds", "r_and_d_investment", "technology_partners",
        "employee_turnover", "total_capital_raised"
    }
    field_name = key.split(".")[-1]
    base_threshold = 1.0 if any(hf in field_name.lower() for hf in high_freshness_fields) else 7.0
    
    if age_days <= base_threshold:
        freshness_conf = 1.0
    else:
        # Decays gradually to a minimum of 0.20
        freshness_conf = max(0.20, round(1.0 - ((age_days - base_threshold) / (base_threshold * 10)), 3))

    # 2. Semantic Confidence (Evaluates raw content qualities)
    if val is None or str(val).strip().lower() in ("null", "none", "n/a", "unresolved", ""):
        semantic_conf = 0.0
    elif isinstance(val, list):
        if not val or any(str(x).strip().lower() in ("none", "n/a", "null") for x in val):
            semantic_conf = 0.3
        else:
            semantic_conf = 0.95
    elif isinstance(val, dict):
        if not val:
            semantic_conf = 0.3
        else:
            semantic_conf = 0.95
    else:
        val_str = str(val).strip()
        if len(val_str) < 3:
            semantic_conf = 0.4
        elif any(w in val_str.lower() for w in ("placeholder", "unknown", "tbd", "to be determined")):
            semantic_conf = 0.3
        elif len(val_str) > 100:
            semantic_conf = 0.98  # rich narrative content
        else:
            semantic_conf = 0.90
            
    # 3. Validation Confidence (Tracks adherence to strict validation schemas)
    if prov_upper in ("CACHE_VERIFIED_RECENT", "SUPABASE_VERIFIED", "VALIDATED_CONSENSUS"):
        validation_conf = 1.0
    elif prov_upper == "REAL_EXTRACTED":
        validation_conf = 0.90
    elif prov_upper == "DERIVED_INTELLIGENCE":
        validation_conf = 0.85
    elif prov_upper == "INFERRED_INTELLIGENCE":
        validation_conf = 0.75
    else:
        validation_conf = 0.50  # weak validation

    # 4. Provenance Confidence (Reflects trust of source origin)
    if "+" in provider_lower or "consensus" in prov_upper or prov_upper == "VALIDATED_CONSENSUS":
        provenance_conf = 1.0  # multi-LLM debate consensus
    elif "supabase" in provider_lower:
        provenance_conf = 0.90  # verified main database
    elif "tavily" in provider_lower or "web" in provider_lower:
        provenance_conf = 0.92  # real-time web facts
    elif provider_lower in ("groq", "gemini", "cerebras"):
        provenance_conf = 0.85  # single-provider extraction
    else:
        provenance_conf = 0.70  # generic fallback / default

    # 5. Extraction Confidence (Evaluates raw syntax/form accuracy)
    if provider_lower in ("groq", "gemini", "cerebras") and prov_upper in ("REAL_EXTRACTED", "VALIDATED_CONSENSUS"):
        extraction_conf = 0.95
    elif prov_upper == "DERIVED_INTELLIGENCE":
        extraction_conf = 0.90
    elif "supabase" in provider_lower:
        extraction_conf = 0.98  # structured DB extraction
    else:
        extraction_conf = 0.80

    # Overall Weighted Confidence Score Calculation
    # Weights: 20% Freshness, 25% Semantic, 25% Validation, 15% Provenance, 15% Extraction
    overall_conf = (
        0.20 * freshness_conf +
        0.25 * semantic_conf +
        0.25 * validation_conf +
        0.15 * provenance_conf +
        0.15 * extraction_conf
    )
    
    breakdown = {
        "freshness_confidence": round(freshness_conf, 3),
        "semantic_confidence": round(semantic_conf, 3),
        "validation_confidence": round(validation_conf, 3),
        "provenance_confidence": round(provenance_conf, 3),
        "extraction_confidence": round(extraction_conf, 3)
    }
    
    return round(overall_conf, 3), breakdown
