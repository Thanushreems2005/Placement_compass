from pydantic import BaseModel, HttpUrl
from typing import List, Optional

class StudentBase(BaseModel):
    full_name: str
    roll_number: str
    department: str
    graduation_year: int
    cgpa: float
    skills: List[str] = []
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    skills: Optional[List[str]] = None
    resume_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
