from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class QuestionSchema(BaseModel):
    id: str
    topic: str
    text: str
    options: List[str]
    benchmark_seconds: int

class AssessmentStartResponse(BaseModel):
    skill_level: str
    questions: List[QuestionSchema]

class AssessmentSubmitRequest(BaseModel):
    skill_level: str
    answers: Dict[str, int] = Field(..., description="Mapping of question_id to selected_option_index")
    time_spent: Dict[str, int] = Field(..., description="Mapping of question_id to time_spent_seconds")

class GradedQuestionSchema(BaseModel):
    id: str
    text: str
    topic: str
    type: str = "mcq"
    options: List[str]
    user_answer: Optional[int] = None
    correct_answer: str
    is_correct: bool
    explanation: str

class AssessmentResponse(BaseModel):
    id: int
    user_id: int
    skill_level: str
    score: int
    accuracy: float
    speed_index: float
    speed_category: str
    topic_scores: Dict[str, float]
    ai_analysis: str
    completed: bool
    created_at: str
    graded_questions: Optional[List[GradedQuestionSchema]] = None

    class Config:
        from_attributes = True
