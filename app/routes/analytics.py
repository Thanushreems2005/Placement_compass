from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.student import Student
from app.models.company import Company
from app.models.placement import PlacementDrive, Application
from app.schemas.analytics import AnalyticsDashboardResponse, PlacementStats
from app.dependencies.auth import get_admin_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
def get_dashboard_stats(db: Session = Depends(get_db), admin = Depends(get_admin_user)):
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_companies = db.query(func.count(Company.id)).scalar() or 0
    active_drives = db.query(func.count(PlacementDrive.id)).scalar() or 0
    
    # In a real scenario, this would be computed from hired applications/packages
    placed_students = db.query(func.count(Application.id)).filter(Application.status == "hired").scalar() or 0
    
    stats = PlacementStats(
        total_students=total_students,
        placed_students=placed_students,
        total_companies=total_companies,
        active_drives=active_drives,
        average_package=0.0,
        highest_package=0.0
    )
    
    return AnalyticsDashboardResponse(
        stats=stats,
        top_companies=[],
        recent_activity=[]
    )
