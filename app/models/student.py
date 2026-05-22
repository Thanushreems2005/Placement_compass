from sqlalchemy import Column, Integer, String, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    full_name = Column(String, nullable=False)
    roll_number = Column(String, unique=True, index=True)
    department = Column(String)
    graduation_year = Column(Integer)
    cgpa = Column(Float)
    
    skills = Column(JSON, default=list) # List of skills
    resume_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)

    user = relationship("User", back_populates="student_profile")
