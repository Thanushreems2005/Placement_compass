from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.placement import ApplicationStatus

class PlacementDriveBase(BaseModel):
    company_id: int
    job_title: str
    job_description: Optional[str] = None
    package_details: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    drive_date: Optional[datetime] = None
    deadline: Optional[datetime] = None

class PlacementDriveCreate(PlacementDriveBase):
    pass

class PlacementDriveUpdate(BaseModel):
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    package_details: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    drive_date: Optional[datetime] = None
    deadline: Optional[datetime] = None

class PlacementDriveResponse(PlacementDriveBase):
    id: int

    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    drive_id: int

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationResponse(ApplicationBase):
    id: int
    student_id: int
    status: ApplicationStatus
    applied_at: datetime

    class Config:
        from_attributes = True

class InterviewBase(BaseModel):
    drive_id: int
    student_id: int
    scheduled_at: datetime
    meeting_link: Optional[str] = None

class InterviewCreate(InterviewBase):
    pass

class InterviewResponse(InterviewBase):
    id: int
    status: str

    class Config:
        from_attributes = True
