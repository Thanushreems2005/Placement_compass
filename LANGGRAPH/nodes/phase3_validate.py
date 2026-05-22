import sys
import os
from typing import Any, Dict, List
import logging

# Ensure the root project directory and validation_suite are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
validation_suite_path = os.path.join(project_root, "validation_suite")

for path in [project_root, validation_suite_path]:
    if path not in sys.path:
        sys.path.append(path)

from LANGGRAPH.graph.state import GraphState
from LANGGRAPH.models.state import ValidationResult, WorkflowStatus, AuditLog
from validation_suite.validationTool import company_validation_tool

# Set up logging
logger = logging.getLogger(__name__)

MAX_RETRIES = 3


async def validate_node(state: GraphState, model_key: str) -> Dict[str, Any]:
    """
    Parallel validation node: Validates data from a specific model branch.
    """
    data_to_validate = state.get(model_key)
    provider_name = model_key.split("_")[0].upper()
    
    # Validation Guard: Skip if data is None, empty, or has no extracted fields
    if not data_to_validate:
        logger.warning(f"Validation Guard: Skipping validation for {model_key} because provider data is None or empty.")
        return {}
        
    is_empty = True
    if isinstance(data_to_validate, dict):
        for k, v in data_to_validate.items():
            if v and isinstance(v, dict) and any(val is not None for val in v.values()):
                is_empty = False
                break
            elif v and not isinstance(v, dict):
                is_empty = False
                break
                
    if is_empty:
        logger.warning(f"Validation Guard: Skipping validation for {model_key} because all extracted section fields are empty.")
        return {}

    # 1. Harmonize and Flatten
    from LANGGRAPH.utils.normalization import harmonize_with_schema
    from LANGGRAPH.models.schema import CompanyIntelligenceSchema
    
    try:
        harmonized_data = harmonize_with_schema(data_to_validate, CompanyIntelligenceSchema)
        intelligence_obj = CompanyIntelligenceSchema.model_construct(**harmonized_data)
        validation_input = intelligence_obj.flatten()
        
        # Ensure name is present for the tool
        if "name" not in validation_input:
            validation_input["name"] = state.get('company_name') or "Unknown"
            
        # 2. Run Validation Suite
        logger.info(f"--- [PARALLEL VALIDATION] [{provider_name}] [{validation_input['name']}] ---")
        result = company_validation_tool(validation_input)
        
        checks_failed = result.get("checks_failed", 0)
        failed_params = []
        val_results = []
        
        for check in result.get("details", []):
            if not check.get("valid", False):
                failed_params.append(check.get("field", "unknown"))
            
            val_results.append(
                ValidationResult(
                    parameter_name=check.get("field", "unknown"),
                    is_valid=check.get("valid", False),
                    error_message=check.get("message", "")
                )
            )

        # 3. Adaptive Threshold Check
        # Instead of failing on ANY error, we look at the weighted coverage
        from LANGGRAPH.nodes.phase4_consolidate import calculate_completeness, FIELD_WEIGHTS
        report = calculate_completeness({model_key.split("_")[0]: harmonized_data})
        weighted_score = report.get("weighted_score", 0.0)
        
        # Determine if we should retry
        # Only retry if weighted score is catastrophically low (< 30%) or if essential sections are empty
        is_dev = os.getenv("DEV_MODE", "false").lower() == "true"
        should_retry = weighted_score < 30.0 and not is_dev
        
        # Update the model data with the harmonized version
        return_dict = {
            model_key: harmonized_data,
            "validation_results": val_results,
            "audit_logs": [
                AuditLog(
                    node_name=f"{model_key}_validate",
                    action="adaptive_validation",
                    details=f"{provider_name} coverage: {weighted_score}%. Passing all salvaged fields.",
                    status="success"
                )
            ]
        }
        if model_key == "consolidated_parameters":
            return_dict["failed_parameters"] = failed_params
        return return_dict

    except Exception as e:
        logger.error(f"Validation failed for {model_key}: {str(e)}")
        # CRITICAL: Always return the data we have, never wipe the state with {}
        return_dict = {
            model_key: state.get(model_key, {})
        }
        if model_key == "consolidated_parameters":
            return_dict["failed_parameters"] = state.get("failed_parameters", [])
        return return_dict
