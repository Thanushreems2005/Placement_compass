"""
Aptitude schemas — scoped to the aptitude_attempts Supabase table.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ─── Request Schemas ─────────────────────────────────────────────────────────


class AptitudeAttemptCreate(BaseModel):
    """Payload for submitting a new aptitude attempt.

    student_id defaults to a hardcoded demo value so the API is usable
    without authentication.  Callers may override it.
    """

    student_id: str = Field(default="student_demo_001", description="Temporary student identifier")
    topic: str = Field(..., description="Aptitude topic (e.g. Quantitative, Logical Reasoning)")
    subtopic: Optional[str] = Field(default=None, description="Optional subtopic")
    total_questions: int = Field(..., ge=1, description="Total questions attempted")
    correct_answers: int = Field(..., ge=0, description="Number of correct answers")
    wrong_answers: int = Field(..., ge=0, description="Number of wrong answers")
    skipped_questions: Optional[int] = Field(default=0, ge=0, description="Number of skipped questions")
    total_time_seconds: Optional[int] = Field(default=None, ge=0, description="Total time taken in seconds")
    difficulty: Optional[str] = Field(default="Medium", description="Easy | Medium | Hard")


# ─── Response Schemas ─────────────────────────────────────────────────────────


class AptitudeAttemptResponse(BaseModel):
    """Single row from aptitude_attempts as returned to the client."""

    id: str
    student_id: str
    topic: str
    subtopic: Optional[str] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    wrong_answers: Optional[int] = None
    skipped_questions: Optional[int] = None
    total_time_seconds: Optional[int] = None
    accuracy: Optional[float] = None
    score: Optional[float] = None
    avg_speed: Optional[float] = None
    speed: Optional[int] = None
    average_solving_time: Optional[float] = None
    difficulty: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TopicSummary(BaseModel):
    """Per-topic aggregated summary used inside the dashboard."""

    topic: str
    avg_accuracy: float
    avg_score: float
    attempts: int
    is_weak: bool
    is_strong: bool


class DashboardResponse(BaseModel):
    """Full dashboard aggregation for a student."""

    student_id: str
    readiness_score: float = Field(description="Average accuracy across all attempts")
    xp: int = Field(description="Total cumulative score")
    streak: int = Field(description="Consecutive practice days (most recent run)")
    total_tests: int = Field(description="Total number of attempts")
    weak_areas: List[str] = Field(description="Topics with avg accuracy < 60%")
    strong_areas: List[str] = Field(description="Topics with avg accuracy > 80%")
    topic_breakdown: List[TopicSummary] = Field(description="Per-topic aggregated stats")
    recent_attempts: List[AptitudeAttemptResponse] = Field(description="Last 10 attempts")
    ai_insight: str = Field(
        default="Keep practicing to improve your weak areas!",
        description="AI-generated insight about performance"
    )
