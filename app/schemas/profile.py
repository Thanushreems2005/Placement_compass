from typing import Optional
from pydantic import BaseModel, ConfigDict

class StudentProfileBase(BaseModel):
    skill_level: Optional[str] = "Beginner"
    prep_goal: Optional[str] = "FAANG Interview Prep"
    weekly_hours: Optional[int] = 10
    preferred_companies: Optional[str] = "Google,Meta,Amazon"

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfileUpdate(BaseModel):
    skill_level: Optional[str] = None
    prep_goal: Optional[str] = None
    weekly_hours: Optional[int] = None
    preferred_companies: Optional[str] = None

class StudentProfileResponse(StudentProfileBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)
