from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from enum import Enum


class DifficultyEnum(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


# ─── Aptitude Attempt ────────────────────────────────────────────────────────

class AptitudeAttemptCreate(BaseModel):
    student_id: str
    topic: str
    subtopic: Optional[str] = None
    score: float = Field(..., ge=0)
    max_score: float = Field(default=100.0, ge=1)
    accuracy: float = Field(..., ge=0, le=100)
    questions_attempted: Optional[int] = Field(default=None, ge=1)
    correct_answers: Optional[int] = Field(default=None, ge=0)
    wrong_answers: Optional[int] = Field(default=None, ge=0)
    skipped_answers: int = Field(default=0, ge=0)
    speed: Optional[float] = Field(default=None, ge=0)
    difficulty: Optional[str] = None
    average_solving_time: Optional[float] = None
    total_time_taken: Optional[float] = None
    difficulty_level: Optional[str] = None
    test_date: Optional[datetime] = None

    @field_validator("accuracy")
    @classmethod
    def validate_accuracy(cls, v: float) -> float:
        return round(v, 2)

    @model_validator(mode="after")
    def normalize_create(self) -> "AptitudeAttemptCreate":
        self.difficulty_level = self.difficulty_level or self.difficulty or DifficultyEnum.MEDIUM.value
        if self.average_solving_time is None and self.speed is not None:
            self.average_solving_time = self.speed
        if self.questions_attempted is None:
            self.questions_attempted = 1
        if self.correct_answers is None:
            self.correct_answers = max(
                0,
                min(self.questions_attempted, round(self.questions_attempted * self.accuracy / 100)),
            )
        if self.wrong_answers is None:
            self.wrong_answers = max(
                0,
                self.questions_attempted - self.correct_answers - self.skipped_answers,
            )
        return self


class AptitudeAttemptResponse(BaseModel):
    id: Union[int, str]
    student_id: str
    topic: str
    subtopic: Optional[str] = None
    score: float
    accuracy: float
    speed: Optional[float] = None
    difficulty: str = "Medium"
    created_at: datetime
    max_score: float = 100.0
    questions_attempted: int = 1
    correct_answers: int = 0
    wrong_answers: int = 0
    average_solving_time: Optional[float] = None
    difficulty_level: str = "Medium"
    test_date: Optional[datetime] = None

    @model_validator(mode="after")
    def normalize_response(self) -> "AptitudeAttemptResponse":
        self.difficulty = self.difficulty or self.difficulty_level or "Medium"
        self.difficulty_level = self.difficulty_level or self.difficulty or "Medium"
        if self.speed is None:
            self.speed = self.average_solving_time
        if self.average_solving_time is None:
            self.average_solving_time = self.speed
        if self.test_date is None:
            self.test_date = self.created_at
        return self


# ─── Topic Progress ───────────────────────────────────────────────────────────

class TopicProgressResponse(BaseModel):
    id: int
    student_id: str
    topic: str
    mastery_score: float
    consistency_score: float
    improvement_trend: float
    total_attempts: int
    average_accuracy: float
    average_speed: float
    readiness_percentage: float
    last_practiced: Optional[datetime] = None
    streak_days: int
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ────────────────────────────────────────────────────────────────

class TopicAnalytics(BaseModel):
    topic: str
    mastery_score: float
    average_accuracy: float
    average_speed: float
    total_attempts: int
    improvement_trend: float
    readiness_percentage: float
    is_weak: bool
    is_strong: bool


class OverallAnalyticsResponse(BaseModel):
    student_id: str
    total_attempts: int
    overall_accuracy: float
    overall_speed: float
    overall_readiness: float
    topics: List[TopicAnalytics]
    weak_areas: List[str]
    strong_areas: List[str]
    streak_days: int
    xp_points: int
    badges: List[str]
    last_updated: datetime


# ─── Readiness Score ─────────────────────────────────────────────────────────

class ReadinessScoreResponse(BaseModel):
    student_id: str
    overall_score: float
    quantitative_score: float
    logical_score: float
    verbal_score: float
    data_interpretation_score: float
    puzzles_score: float
    confidence_level: str
    improvement_velocity: float
    company_readiness: Dict[str, float]
    xp_points: int
    badges: List[str]
    current_streak: int
    calculated_at: datetime

    class Config:
        from_attributes = True


# ─── AI Roadmap & Recommendations ────────────────────────────────────────────

class RoadmapRequest(BaseModel):
    student_id: str
    target_companies: Optional[List[str]] = []
    target_readiness: float = Field(default=85.0, ge=50, le=100)
    available_hours_per_day: float = Field(default=2.0, ge=0.5, le=8)


class WeeklyGoal(BaseModel):
    week: int
    topics: List[str] = []
    primary_topic: Optional[str] = None
    target_accuracy: float
    hours_planned: float
    milestones: List[str] = []


class LearningRoadmapResponse(BaseModel):
    student_id: str
    recommended_topics: List[str]
    weekly_goals: List[WeeklyGoal]
    daily_targets: Dict[str, Any]
    focus_areas: List[str]
    completion_progress: float
    ai_insights: Optional[str] = None
    generated_at: datetime

    class Config:
        from_attributes = True


class AIRecommendationResponse(BaseModel):
    student_id: str
    recommendations: List[Dict[str, Any]]
    ai_insights: str
    performance_snapshot: Dict[str, Any]
    priority_topics: List[str]
    daily_goal: str
    generated_at: datetime


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardResponse(BaseModel):
    student_id: str
    readiness_score: float
    xp: int
    streak: int
    total_tests: int
    weak_areas: List[str]
    strong_areas: List[str]
    topic_breakdown: List[TopicAnalytics]
    recent_attempts: List[AptitudeAttemptResponse]
    ai_insight: str
    improvement_trend: List[Dict[str, Any]] = []
