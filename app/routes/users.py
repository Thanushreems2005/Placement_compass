from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.dependencies.auth import get_current_active_user, get_admin_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.get("/", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users
