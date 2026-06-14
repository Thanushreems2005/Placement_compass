from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.models.profile import StudentProfile
from app.schemas.profile import StudentProfileCreate, StudentProfileUpdate, StudentProfileResponse

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.get("/me", response_model=StudentProfileResponse)
def read_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve current authenticated user's student profile settings (Protected Route)"""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please complete onboarding."
        )
    return profile

@router.post("", response_model=StudentProfileResponse, status_code=status.HTTP_201_CREATED)
def upsert_my_profile(
    profile_in: StudentProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create or update (upsert) current authenticated user's student profile settings"""
    existing_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    if existing_profile:
        # Update existing profile attributes
        existing_profile.skill_level = profile_in.skill_level
        existing_profile.prep_goal = profile_in.prep_goal
        existing_profile.weekly_hours = profile_in.weekly_hours
        existing_profile.preferred_companies = profile_in.preferred_companies
        db.add(existing_profile)
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
        
    # Create fresh onboarding profile
    db_profile = StudentProfile(
        user_id=current_user.id,
        skill_level=profile_in.skill_level,
        prep_goal=profile_in.prep_goal,
        weekly_hours=profile_in.weekly_hours,
        preferred_companies=profile_in.preferred_companies
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile
