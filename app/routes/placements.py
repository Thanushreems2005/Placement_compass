from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.placement import PlacementDrive, Application
from app.models.student import Student
from app.models.user import User
from app.schemas.placement import PlacementDriveCreate, PlacementDriveResponse, ApplicationCreate, ApplicationResponse
from app.dependencies.auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/placements", tags=["placements"])

@router.post("/drives", response_model=PlacementDriveResponse)
def create_drive(drive_in: PlacementDriveCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    db_drive = PlacementDrive(**drive_in.model_dump())
    db.add(db_drive)
    db.commit()
    db.refresh(db_drive)
    return db_drive

@router.get("/drives", response_model=List[PlacementDriveResponse])
def get_drives(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(PlacementDrive).all()

@router.post("/applications", response_model=ApplicationResponse)
def apply_to_drive(app_in: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Verify student profile exists
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile required to apply")
        
    existing_app = db.query(Application).filter(
        Application.drive_id == app_in.drive_id,
        Application.student_id == student.id
    ).first()
    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied to this drive")
        
    application = Application(student_id=student.id, drive_id=app_in.drive_id)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application

@router.get("/applications/me", response_model=List[ApplicationResponse])
def get_my_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []
    return db.query(Application).filter(Application.student_id == student.id).all()
