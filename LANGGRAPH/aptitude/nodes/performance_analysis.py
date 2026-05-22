import logging
from typing import Dict, Any
from LANGGRAPH.aptitude.state import AptitudeGraphState

logger = logging.getLogger(__name__)


def performance_analysis_node(state: AptitudeGraphState) -> Dict[str, Any]:
    """
    Node 1: Analyze student's historical test attempts, trends, accuracies, and speed.
    """
    logger.info("--- Running Aptitude Performance Analysis Node ---")
    attempts = state.get("attempts") or []
    progresses = state.get("progresses") or []
    
    total_attempts = len(attempts)
    
    if total_attempts == 0:
        return {
            "performance_metrics": {
                "overall_accuracy": 0.0,
                "overall_speed": 0.0,
                "total_attempts": 0,
                "accuracy_trend": "No attempts yet",
                "solving_speed_trend": "No attempts yet"
            }
        }
        
    overall_accuracy = round(sum(a.get("accuracy", 0) for a in attempts) / total_attempts, 2)
    overall_speed = round(sum(a.get("average_solving_time", 0) or 0 for a in attempts) / total_attempts, 2)
    
    # Calculate recent trends (comparing last 5 attempts to prior attempts)
    sorted_attempts = sorted(attempts, key=lambda x: x.get("test_date") or x.get("created_at"), reverse=True)
    recent = sorted_attempts[:5]
    older = sorted_attempts[5:15]
    
    recent_accuracy = sum(a.get("accuracy", 0) for a in recent) / max(1, len(recent))
    older_accuracy = sum(a.get("accuracy", 0) for a in older) / max(1, len(older)) if older else recent_accuracy
    
    accuracy_diff = recent_accuracy - older_accuracy
    if accuracy_diff > 2:
        accuracy_trend = f"Improving (+{accuracy_diff:.1f}% accuracy gain recently)"
    elif accuracy_diff < -2:
        accuracy_trend = f"Declining ({accuracy_diff:.1f}% drop in recent tests)"
    else:
        accuracy_trend = "Stable (less than 2% variance)"
        
    return {
        "performance_metrics": {
            "overall_accuracy": overall_accuracy,
            "overall_speed": overall_speed,
            "total_attempts": total_attempts,
            "accuracy_trend": accuracy_trend,
            "recent_average_accuracy": round(recent_accuracy, 2)
        }
    }
