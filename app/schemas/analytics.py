from pydantic import BaseModel
from typing import Dict, Any, List

class PlacementStats(BaseModel):
    total_students: int
    placed_students: int
    total_companies: int
    active_drives: int
    average_package: float
    highest_package: float

class CompanyAnalytics(BaseModel):
    company_name: str
    total_applications: int
    shortlisted: int
    hired: int

class AnalyticsDashboardResponse(BaseModel):
    stats: PlacementStats
    top_companies: List[CompanyAnalytics]
    recent_activity: List[Dict[str, Any]]
