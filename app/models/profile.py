from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    
    skill_level = Column(String(50), default="Beginner", nullable=False)
    prep_goal = Column(String(255), default="FAANG Interview Prep", nullable=False)
    weekly_hours = Column(Integer, default=10, nullable=False)
    preferred_companies = Column(String(500), default="Google,Meta,Amazon", nullable=False)

    user = relationship("User", back_populates="profile")
