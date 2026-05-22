import logging
from langgraph.graph import StateGraph, END

from LANGGRAPH.aptitude.state import AptitudeGraphState
from LANGGRAPH.aptitude.nodes.performance_analysis import performance_analysis_node
from LANGGRAPH.aptitude.nodes.weakness_detection import weakness_detection_node
from LANGGRAPH.aptitude.nodes.readiness_evaluation import readiness_evaluation_node
from LANGGRAPH.aptitude.nodes.recommendation_engine import recommendation_engine_node
from LANGGRAPH.aptitude.nodes.insight_generator import insight_generator_node
from LANGGRAPH.aptitude.nodes.final_formatter import final_formatter_node

logger = logging.getLogger(__name__)


def create_aptitude_workflow() -> StateGraph:
    """
    Build and compile the sequential LangGraph workflow for Aptitude Tracking & AI Insights.
    """
    logger.info("Assembling the Aptitude AI LangGraph Workflow...")
    
    # Initialize the graph with the state schema
    workflow = StateGraph(AptitudeGraphState)
    
    # Add all 6 analytical and AI nodes
    workflow.add_node("performance_analysis", performance_analysis_node)
    workflow.add_node("weakness_detection", weakness_detection_node)
    workflow.add_node("readiness_evaluation", readiness_evaluation_node)
    workflow.add_node("recommendation_engine", recommendation_engine_node)
    workflow.add_node("insight_generator", insight_generator_node)
    workflow.add_node("final_formatter", final_formatter_node)
    
    # Establish sequential execution flow
    workflow.set_entry_point("performance_analysis")
    
    workflow.add_edge("performance_analysis", "weakness_detection")
    workflow.add_edge("weakness_detection", "readiness_evaluation")
    workflow.add_edge("readiness_evaluation", "recommendation_engine")
    workflow.add_edge("recommendation_engine", "insight_generator")
    workflow.add_edge("insight_generator", "final_formatter")
    workflow.add_edge("final_formatter", END)
    
    return workflow


# Compile the runnable graph instance
aptitude_graph = create_aptitude_workflow().compile()
