import logging
from typing import Dict, Any, List
from LANGGRAPH.aptitude.state import AptitudeGraphState

logger = logging.getLogger(__name__)

WEAK_THRESHOLD = 55.0
STRONG_THRESHOLD = 80.0


def weakness_detection_node(state: AptitudeGraphState) -> Dict[str, Any]:
    """
    Node 2: Identify weakest topics, subtopics needing improvement, and strong topics.
    """
    logger.info("--- Running Aptitude Weakness Detection Node ---")
    progresses = state.get("progresses") or []
    
    weak_areas: List[str] = []
    strong_areas: List[str] = []
    
    for p in progresses:
        topic = p.get("topic")
        mastery = p.get("mastery_score", 0.0)
        
        if topic:
            if mastery < WEAK_THRESHOLD:
                weak_areas.append(topic)
            elif mastery >= STRONG_THRESHOLD:
                strong_areas.append(topic)
                
    # Sort weak areas by mastery score (ascending - weakest first)
    weak_sorted = sorted(
        [p for p in progresses if p.get("topic") in weak_areas],
        key=lambda x: x.get("mastery_score", 0.0)
    )
    weak_areas = [p.get("topic") for p in weak_sorted if p.get("topic")]
    
    # Sort strong areas by mastery score (descending - strongest first)
    strong_sorted = sorted(
        [p for p in progresses if p.get("topic") in strong_areas],
        key=lambda x: x.get("mastery_score", 0.0),
        reverse=True
    )
    strong_areas = [p.get("topic") for p in strong_sorted if p.get("topic")]
    
    logger.info(f"Weak Areas: {weak_areas} | Strong Areas: {strong_areas}")
    
    return {
        "weak_areas": weak_areas,
        "strong_areas": strong_areas
    }
