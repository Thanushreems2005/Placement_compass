import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict
from pydantic import BaseModel, Field

from LANGGRAPH.models.state import (
    AuditLog,
    ProvenanceMetadata,
    Timestamps,
    ValidationResult,
    WorkflowStatus,
    LLMCallMetadata,
)


class GraphState(TypedDict):
    """
    Centralized GraphState for the Company Intelligence Platform.
    Using TypedDict for maximum compatibility with dictionary-style access.
    """
    # Primary Identifiers
    company_id: Optional[str]
    company_name: Optional[str]

    # Parallel Model Outputs
    groq_data: Optional[Dict[str, Any]]
    gemini_data: Optional[Dict[str, Any]]
    cerebras_data: Optional[Dict[str, Any]]

    # Parameter Containers
    raw_extractions: Annotated[List[Dict[str, Any]], operator.add]
    section_extractions: Dict[str, List[Dict[str, Any]]]
    extracted_parameters: Dict[str, Any]
    consolidated_parameters: Dict[str, Any]
    validated_parameters: Dict[str, Any]
    failed_parameters: List[str]

    # Workflow Control
    retry_count: int
    workflow_status: WorkflowStatus

    # Cumulative Metadata
    validation_results: Annotated[List[ValidationResult], operator.add]
    audit_logs: Annotated[List[AuditLog], operator.add]
    
    # Metrics
    completeness_score: float
    quality_score: float
    participation_penalty: float
    
    llm_calls: Annotated[List[Dict[str, Any]], operator.add]
    persistence_metadata: Dict[str, Any]
    provenance: Dict[str, str]
    provenance_metadata: Dict[str, Any]
    provenance_counts: Dict[str, int]
    section_contexts: Dict[str, str]

    # Observability Refinement Layer State Keys
    extracted_data: Optional[Dict[str, Any]]
    provider_metrics: Optional[Dict[str, Any]]
    failed_sections: Optional[List[str]]
    retry_state: Optional[Dict[str, Any]]
    provenance_tracking: Optional[Dict[str, Any]]
    token_usage: Optional[Dict[str, Any]]
    extraction_completeness: Optional[float]

    # Dynamic Supabase Sync Integration State Keys
    existing_company_data: Optional[Dict[str, Any]]
    existing_field_provenance: Optional[Dict[str, str]]
    existing_field_confidence: Optional[Dict[str, float]]
    existing_field_timestamps: Optional[Dict[str, str]]
    stale_fields: Optional[List[str]]
    missing_fields: Optional[List[str]]
    unresolved_fields: Optional[List[str]]
    weak_fields: Optional[List[str]]

    # Targeted Field Regeneration State Keys
    regenerated_fields: Optional[List[str]]
    regeneration_attempts: Optional[Dict[str, int]]
    failed_field_reasons: Optional[Dict[str, str]]

    # Enterprise Intelligence Analysis Layer State Keys
    analysis_data: Optional[Dict[str, Any]]
    
    # Final Hardening & Advanced Intelligence Optimization State Keys
    hierarchical_memory: Optional[Dict[str, Any]]
    explainability_reports: Optional[Dict[str, Any]]
    predictive_intelligence: Optional[Dict[str, Any]]

