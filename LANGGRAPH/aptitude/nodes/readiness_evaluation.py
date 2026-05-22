import logging
from typing import Dict, Any, List
from LANGGRAPH.aptitude.state import AptitudeGraphState

logger = logging.getLogger(__name__)

# Weights representing topic importance per company type
COMPANY_PROFILE_WEIGHTS = {
    "Google": {
        "Puzzles": 0.35,
        "Logical Reasoning": 0.25,
        "Quantitative Aptitude": 0.20,
        "Verbal Ability": 0.10,
        "Data Interpretation": 0.10
    },
    "Microsoft": {
        "Logical Reasoning": 0.30,
        "Quantitative Aptitude": 0.25,
        "Puzzles": 0.20,
        "Verbal Ability": 0.15,
        "Data Interpretation": 0.10
    },
    "TCS": {
        "Quantitative Aptitude": 0.35,
        "Verbal Ability": 0.30,
        "Logical Reasoning": 0.20,
        "Data Interpretation": 0.15,
        "Puzzles": 0.00
    },
    "Infosys": {
        "Logical Reasoning": 0.35,
        "Quantitative Aptitude": 0.25,
        "Verbal Ability": 0.25,
        "Data Interpretation": 0.10,
        "Puzzles": 0.05
    },
    "Barclays": {
        "Quantitative Aptitude": 0.30,
        "Data Interpretation": 0.30,
        "Logical Reasoning": 0.20,
        "Verbal Ability": 0.10,
        "Puzzles": 0.10
    }
}


def readiness_evaluation_node(state: AptitudeGraphState) -> Dict[str, Any]:
    """
    Node 3: Predict overall readiness, confidence level, and per-company readiness.
    """
    logger.info("--- Running Aptitude Readiness Evaluation Node ---")
    progresses = state.get("progresses") or []
    
    topic_scores = {p.get("topic"): p.get("mastery_score", 0.0) for p in progresses if p.get("topic")}
    
    # Calculate overall readiness as simple average of active topics
    active_scores = [v for v in topic_scores.values() if v > 0]
    overall_score = round(sum(active_scores) / max(1, len(active_scores)), 2)
    
    confidence_level = "Low"
    if overall_score >= 75.0:
        confidence_level = "High"
    elif overall_score >= 50.0:
        confidence_level = "Medium"
        
    # Calculate company specific readiness
    company_readiness: Dict[str, float] = {}
    for company, weights in COMPANY_PROFILE_WEIGHTS.items():
        score = 0.0
        weight_sum = 0.0
        for topic, weight in weights.items():
            mastery = topic_scores.get(topic, 0.0)
            score += mastery * weight
            weight_sum += weight
            
        company_readiness[company] = round(score / max(0.01, weight_sum), 2)
        
    logger.info(f"Overall Readiness: {overall_score} ({confidence_level} Confidence)")
    
    return {
        "readiness_score": overall_score,
        "confidence_level": confidence_level,
        "company_readiness": company_readiness
    }
