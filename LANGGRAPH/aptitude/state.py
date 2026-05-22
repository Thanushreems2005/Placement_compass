from typing import Any, Dict, List, Optional, TypedDict


class AptitudeGraphState(TypedDict):
    """
    State representing the context of the Aptitude Learning Tracker AI Workflow.
    Used by LangGraph nodes to analyze student performance, detect weaknesses,
    predict readiness, and generate roadmap recommendations.
    """
    student_id: str
    attempts: List[Dict[str, Any]]
    progresses: List[Dict[str, Any]]
    
    # Intermediate Analysis States
    performance_metrics: Dict[str, Any]
    weak_areas: List[str]
    strong_areas: List[str]
    
    # Readiness Score predictions
    readiness_score: float
    confidence_level: str
    company_readiness: Dict[str, float]
    
    # AI Output States
    ai_insights: str
    recommendations: List[Dict[str, Any]]
    weekly_goals: List[Dict[str, Any]]
    daily_targets: Dict[str, Any]
    
    # Final Aggregated Output
    formatted_dashboard: Dict[str, Any]
