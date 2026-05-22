from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse
from app.dependencies.auth import get_current_active_user

router = APIRouter(prefix="/students", tags=["students"])

@router.post("/", response_model=StudentResponse)
def create_student(student_in: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    existing_student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Student profile already exists for this user.")
        
    db_student = Student(**student_in.model_dump(), user_id=current_user.id)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.get("/me", response_model=StudentResponse)
def read_student_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.put("/me", response_model=StudentResponse)
def update_student_me(student_in: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    update_data = student_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
        
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student
