from enum import Enum

class RuntimeStatus(Enum):
    PENDING = "pending"
    EXTRACTING = "extracting"
    VALIDATING = "validating"
    CONSOLIDATING = "consolidating"
    COMPLETED = "completed"
    FAILED = "failed"
