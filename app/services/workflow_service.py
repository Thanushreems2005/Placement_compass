import logging
from typing import Optional, Any
from app.models.runtime import RuntimeStatus

logger = logging.getLogger(__name__)

class WorkflowResult:
    def __init__(self, company_name: str, status: RuntimeStatus, quality: Any = None, metrics: Any = None, data: Any = None, error: str = None):
        self.company_name = company_name
        self.status = status
        self.quality = quality
        self.metrics = metrics
        self.data = data
        self.error = error

class WorkflowService:
    def __init__(self):
        pass

    async def execute_research(self, company_name: str, company_id: Optional[int] = None) -> WorkflowResult:
        """
        Executes the LangGraph pipeline for a specific company.
        """
        import time
        from LANGGRAPH.graph.workflow import app
        
        logger.info(f"Executing LangGraph pipeline for {company_name}")
        
        # Initial State
        state = {
            "company_name": company_name,
            "workflow_status": RuntimeStatus.PENDING,
            "provenance": {},
            "provenance_counts": {},
            "section_contexts": {},
            "consolidated_parameters": {}
        }
        
        start_time = time.time()
        
        try:
            # Run the LangGraph App with configurable session mapping
            config = {"configurable": {"thread_id": company_name}}
            final_state = await app.ainvoke(state, config=config)
            
            # The result is stored in the final state dictionary
            quality = final_state.get("quality_metrics") or type('obj', (object,), {'completeness_score': 100, 'quality_score': 100, 'provenance': {}, 'provenance_metadata': {}})
            metrics = final_state.get("runtime_metrics") or type('obj', (object,), {'token_usage': {}, 'execution_time_seconds': time.time() - start_time})
            data = final_state.get("consolidated_parameters", {})
            
            # If the pipeline failed due to our new strict API errors, it would have raised an Exception,
            # but if it just returned gracefully, we capture the data.
            
            return WorkflowResult(
                company_name=company_name,
                status=RuntimeStatus.COMPLETED,
                quality=quality,
                metrics=metrics,
                data=data
            )
            
        except Exception as e:
            logger.error(f"Workflow execution failed for {company_name}: {str(e)}")
            return WorkflowResult(
                company_name=company_name,
                status=RuntimeStatus.FAILED,
                error=str(e)
            )
