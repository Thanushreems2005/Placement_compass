from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse
from app.dependencies.auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(User).all()

@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: int, role: UserRole, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.role = role
        db.commit()
        db.refresh(user)
    return user
