import logging
from typing import Literal

from LANGGRAPH.graph.state import GraphState
from LANGGRAPH.models.state import WorkflowStatus

logger = logging.getLogger(__name__)


def route_after_validation(
    state: GraphState
) -> Literal["persist", "retry", "end"]:
    """
    Conditional router used after the Phase 3 Validation node.
    Decides whether to proceed to persistence, trigger a retry, or terminate.
    """
    status = state.workflow_status
    retry_count = state.retry_count
    
    logger.info(f"Routing Decision: Status={status}, Attempt={retry_count}")

    if status in (
        WorkflowStatus.COMPLETED,
        WorkflowStatus.DEGRADED,
        WorkflowStatus.PARTIAL_SUCCESS,
        WorkflowStatus.SYNTHETIC_ONLY,
        WorkflowStatus.FULL_SUCCESS,
        WorkflowStatus.DEGRADED_BY_QUOTA,
        WorkflowStatus.FULLY_VERIFIED,
        WorkflowStatus.PARTIALLY_VERIFIED
    ):
        # Quality Gate: Only persist if quality score is decent (> 5% in DEV_MODE, > 20% in PROD)
        quality_score = state.quality_score
        import os
        dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
        threshold = 5 if dev_mode else 20
        
        if quality_score >= threshold:
            logger.info(f">>> Quality Gate Passed ({quality_score}%). Routing to Persist.")
            return "persist"
        else:
            logger.warning(f">>> Quality Gate Failed ({quality_score}%). Ending without persistence.")
            return "end"

    
    elif status == WorkflowStatus.RETRYING:
        logger.info(f">>> Routing to RETRY (Current attempt: {retry_count})")
        return "retry"
    
    elif status == WorkflowStatus.FAILED:
        logger.warning(">>> Routing to END (Validation FAILED)")
        return "end"
    
    else:
        logger.error(f"Unknown status '{status}'. Terminating workflow.")
        return "end"


def route_after_research(
    state: GraphState
) -> Literal["consolidate", "end"]:
    """
    Optional router to transition from Research to Consolidation.
    """
    if state.workflow_status == WorkflowStatus.FAILED:
        return "end"
    
    return "consolidate"


def get_routing_map() -> dict:
    """
    Returns the mapping required for LangGraph's add_conditional_edges.
    """
    return {
        "persist": "persist_node",
        "retry": "phase5_retry",
        "consolidate": "phase4_consolidate",
        "end": "__end__"
    }
