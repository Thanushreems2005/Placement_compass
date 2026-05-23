from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.aptitude import (
    AptitudeAttemptCreate,
    AptitudeAttemptResponse,
    OverallAnalyticsResponse,
    ReadinessScoreResponse,
    RoadmapRequest,
    LearningRoadmapResponse,
    DashboardResponse,
)
from app.services import aptitude_service

router = APIRouter(prefix="/aptitude", tags=["aptitude"])


def _submit_attempt(data: AptitudeAttemptCreate, db: Session) -> AptitudeAttemptResponse:
    return aptitude_service.create_attempt(db, data)


@router.post("/attempt", response_model=AptitudeAttemptResponse, status_code=status.HTTP_201_CREATED)
def submit_attempt(data: AptitudeAttemptCreate, db: Session = Depends(get_db)):
    try:
        return _submit_attempt(data, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit attempt: {str(e)}",
        )


@router.post("/attempts", response_model=AptitudeAttemptResponse, status_code=status.HTTP_201_CREATED)
def submit_attempts(data: AptitudeAttemptCreate, db: Session = Depends(get_db)):
    try:
        return _submit_attempt(data, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit attempt: {str(e)}",
        )


@router.get("/attempts/{student_id}", response_model=List[AptitudeAttemptResponse])
def get_attempts(student_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve the recent aptitude attempts for a specific student."""
    return aptitude_service.get_attempts(db, student_id, limit=limit)


@router.get("/analytics/{student_id}", response_model=OverallAnalyticsResponse)
def get_analytics(student_id: str, db: Session = Depends(get_db)):
    """Get detailed topic-wise and cumulative aptitude analytics for a student."""
    return aptitude_service.get_overall_analytics(db, student_id)


@router.get("/weak-areas/{student_id}", response_model=List[str])
def get_weak_areas(student_id: str, db: Session = Depends(get_db)):
    """Identify weak topics where mastery score is below the threshold."""
    analytics = aptitude_service.get_overall_analytics(db, student_id)
    return analytics.weak_areas


@router.get("/strong-areas/{student_id}", response_model=List[str])
def get_strong_areas(student_id: str, db: Session = Depends(get_db)):
    """Identify strong topics where mastery score meets or exceeds the threshold."""
    analytics = aptitude_service.get_overall_analytics(db, student_id)
    return analytics.strong_areas


@router.get("/readiness/{student_id}", response_model=ReadinessScoreResponse)
def get_readiness(student_id: str, db: Session = Depends(get_db)):
    """Get the current placement readiness scores, confidence levels, XP, and badges."""
    score = aptitude_service.get_readiness_score(db, student_id)
    if not score:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Readiness score not found for student {student_id}"
        )
    return score


@router.post("/roadmap/{student_id}", response_model=LearningRoadmapResponse)
def generate_roadmap(student_id: str, data: RoadmapRequest, db: Session = Depends(get_db)):
    """Generate or update a personalized AI learning roadmap for the student."""
    if data.student_id != student_id:
        data.student_id = student_id
    try:
        return aptitude_service.create_or_update_roadmap(
            db=db,
            student_id=student_id,
            target_companies=data.target_companies or [],
            target_readiness=data.target_readiness,
            hours_per_day=data.available_hours_per_day
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning roadmap: {str(e)}"
        )


@router.get("/dashboard/{student_id}", response_model=DashboardResponse)
def get_dashboard(student_id: str, db: Session = Depends(get_db)):
    """Fetch complete aggregated dashboard data for the student's aptitude tracker."""
    try:
        return aptitude_service.get_dashboard_data(db, student_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard data: {str(e)}"
        )
