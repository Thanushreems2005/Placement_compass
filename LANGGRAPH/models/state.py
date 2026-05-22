from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WorkflowStatus(str, Enum):
    """Enumeration of possible workflow states."""
    PENDING = "pending"
    EXTRACTING = "extracting"
    CONSOLIDATING = "consolidating"
    VALIDATING = "validating"
    RETRYING = "retrying"
    COMPLETED = "completed"
    FAILED = "failed"
    DEGRADED = "degraded"
    PARTIAL_SUCCESS = "partial_success"
    SYNTHETIC_ONLY = "synthetic_only"
    FAILED_EXTRACTION = "failed_extraction"
    PARTIAL_EXTRACTION = "partial_extraction"
    FULLY_VERIFIED = "fully_verified"
    PARTIALLY_VERIFIED = "partially_verified"
    DEGRADED_BY_QUOTA = "degraded_by_quota"
    CACHE_RECOVERED = "cache_recovered"
    PROVIDER_FAILURE = "provider_failure"
    FULL_SUCCESS = "full_success"


class LLMCallMetadata(BaseModel):
    provider: str
    model_name: str
    section: Optional[str] = None
    company: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency: float = 0.0
    status: str = "pending"
    retry_count: int = 0
    degraded: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ProvenanceMetadata(BaseModel):
    """Tracks the source and reliability of extracted data."""
    source_url: Optional[str] = None
    source_type: str = "web_scrape"  # e.g., "pdf", "api", "manual"
    extraction_timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    method: str = "llm_extraction"


class ValidationResult(BaseModel):
    """Represents the outcome of a single parameter validation."""
    parameter_name: str
    is_valid: bool
    error_message: Optional[str] = None
    validation_timestamp: datetime = Field(default_factory=datetime.utcnow)
    suggested_fix: Optional[Any] = None


class AuditLog(BaseModel):
    """Structured log entry for workflow actions."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    node_name: str
    action: str
    details: Optional[str] = None
    status: str = "success"


class Timestamps(BaseModel):
    """Centralized timestamp tracking for the workflow lifecycle."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class ParameterState(BaseModel):
    """Modular container for parameters at different stages."""
    parameters: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
