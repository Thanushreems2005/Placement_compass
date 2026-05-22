import logging
from typing import Dict, Any
from LANGGRAPH.aptitude.state import AptitudeGraphState

logger = logging.getLogger(__name__)


def final_formatter_node(state: AptitudeGraphState) -> Dict[str, Any]:
    """
    Node 6: Consolidate and format all intermediate analytics and AI outputs
    into the canonical dashboard structure.
    """
    logger.info("--- Running Aptitude Final Formatter Node ---")
    
    student_id = state.get("student_id")
    metrics = state.get("performance_metrics") or {}
    weak_areas = state.get("weak_areas") or []
    strong_areas = state.get("strong_areas") or []
    readiness_score = state.get("readiness_score", 0.0)
    confidence_level = state.get("confidence_level", "Low")
    company_readiness = state.get("company_readiness") or {}
    
    ai_insights = state.get("ai_insights") or ""
    weekly_goals = state.get("weekly_goals") or []
    daily_targets = state.get("daily_targets") or {}
    recommendations = state.get("recommendations") or []
    
    # Calculate streak, XP, and badges based on attempts
    attempts = state.get("attempts") or []
    total_tests = len(attempts)
    xp_points = min(10000, total_tests * 50)
    
    # Simple badge computation
    badges = []
    if total_tests >= 1:
        badges.append("First Step")
    if total_tests >= 5:
        badges.append("On a Roll")
    if total_tests >= 10:
        badges.append("Dedicated")
    if metrics.get("overall_accuracy", 0.0) >= 90:
        badges.append("Accuracy Ace")
        
    formatted_dashboard = {
        "student_id": student_id,
        "readiness_score": readiness_score,
        "overall_accuracy": metrics.get("overall_accuracy", 0.0),
        "overall_speed": metrics.get("overall_speed", 0.0),
        "total_tests": total_tests,
        "streak_days": state.get("streak_days", 0),  # passed in or default 0
        "xp_points": xp_points,
        "badges": badges,
        "weak_areas": weak_areas,
        "strong_areas": strong_areas,
        "ai_insight": ai_insights,
        "company_readiness": company_readiness,
        "weekly_goals": weekly_goals,
        "daily_targets": daily_targets,
        "recommendations": recommendations
    }
    
    return {
        "formatted_dashboard": formatted_dashboard
    }
