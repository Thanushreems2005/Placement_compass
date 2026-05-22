import logging
import os
from typing import Any, Dict, List, Optional

from pydantic import create_model

from LANGGRAPH.graph.state import GraphState
from LANGGRAPH.models.state import AuditLog, WorkflowStatus
from LANGGRAPH.services.llm_service import LLMService, LLMProvider, ModelName
from LANGGRAPH.utils.retry_utils import build_retry_prompt, merge_retried_results

logger = logging.getLogger(__name__)


async def retry_node(state: GraphState) -> Dict[str, Any]:
    """
    LangGraph node for Phase 5: Selective Retry.
    Attempts to fix failed parameters without re-extracting the entire record.
    """
    failed_params = state.get("failed_parameters")
    
    if not failed_params or os.getenv("DEV_MODE", "false").lower() == "true":
        logger.info("Skipping retry phase (None found or DEV_MODE active).")
        return {"workflow_status": WorkflowStatus.COMPLETED}

    # 1. Initialize Service & Build Targeted Prompt
    llm_service = LLMService(
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", ""),
        gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
        cerebras_api_key=os.getenv("CEREBRAS_API_KEY", "")
    )
    company_name = state.get("company_name") or "Unknown Company"
    
    prompt = build_retry_prompt(
        company_name=company_name,
        failed_params=failed_params,
        validation_results=state.get("validation_results")
    )

    # 2. Dynamic Schema for Selective Extraction
    retry_fields = {field: (Any, ...) for field in failed_params}
    RetrySchema = create_model("RetrySchema", **retry_fields)

    # 3. Call LLM (Using Groq for reliable retry)
    logger.info(f"Retrying extraction for {len(failed_params)} failed fields...")
    
    try:
        response = await llm_service.call_llm(
            provider=LLMProvider.GROQ,
            model_name=ModelName.LLAMA_3_1_8B,
            prompt=prompt,
            output_schema=RetrySchema,
            section_name="retry_correction",
            company_name=company_name
        )

        
        corrected_values = response.content
        
        # 4. Merge Results
        # If we are retrying after consolidation, we update consolidated_parameters
        # If we are retrying after research, we update raw_extractions (simplified here)
        current_data = state.get("consolidated_parameters") or state.get("extracted_parameters")
        new_params = merge_retried_results(current_data, corrected_values)
        
        return {
            "consolidated_parameters": new_params,
            "llm_calls": [response.metadata.dict()],
            "workflow_status": WorkflowStatus.VALIDATING, # Go back to validation
            "audit_logs": [
                AuditLog(
                    node_name="phase5_retry",
                    action="retry_correction",
                    details=f"Attempted correction for fields: {', '.join(failed_params)}",
                    status="success"
                )
            ]
        }

    except Exception as e:
        logger.error(f"Retry LLM call failed: {str(e)}")
        return {
            "audit_logs": [
                AuditLog(
                    node_name="phase5_retry",
                    action="retry_correction",
                    details=f"Retry failed for fields {failed_params}: {str(e)}",
                    status="error"
                )
            ]
        }
