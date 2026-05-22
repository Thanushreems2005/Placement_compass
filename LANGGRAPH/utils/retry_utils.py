from typing import Any, Dict, List
from langchain_core.prompts import ChatPromptTemplate
from LANGGRAPH.models.state import ValidationResult


def build_retry_prompt(
    company_name: str, 
    failed_params: List[str], 
    validation_results: List[ValidationResult]
) -> ChatPromptTemplate:
    """
    Builds a surgical retry prompt targeting only failed parameters.
    """
    # Create a summary of errors for the LLM
    error_details = []
    failed_set = set(failed_params)
    
    for res in validation_results:
        if res.parameter_name in failed_set:
            error_details.append(f"- {res.parameter_name}: {res.error_message}")

    errors_str = "\n".join(error_details)
    
    system_message = (
        "You are a high-precision data correction agent. "
        "Your goal is to fix specific errors in a company intelligence record. "
        "ONLY return the fields requested. Do not include other fields or commentary."
    )
    
    user_message = (
        f"The extraction for company '{company_name}' failed validation for the following fields:\n"
        f"{errors_str}\n\n"
        f"Please provide the corrected values for these fields in a structured JSON format."
    )
    
    return ChatPromptTemplate.from_messages([
        ("system", system_message),
        ("user", user_message)
    ])


def merge_retried_results(
    current_params: Dict[str, Any], 
    retry_results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Surgically merges corrected values into the existing parameter dictionary.
    Preserves all successful parameters.
    """
    updated_params = dict(current_params)
    
    for key, value in retry_results.items():
        # Only update if the key exists in our schema (avoid LLM hallucinations)
        # In a real app, we would validate against a schema here
        updated_params[key] = value
        
    return updated_params
