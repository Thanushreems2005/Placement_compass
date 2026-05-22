from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from app.database import Base

class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    HIRED = "hired"

class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    job_title = Column(String, nullable=False)
    job_description = Column(Text)
    package_details = Column(String)
    eligibility_criteria = Column(String)
    drive_date = Column(DateTime)
    deadline = Column(DateTime)
    
    company = relationship("Company", back_populates="drives")
    applications = relationship("Application", back_populates="drive")
    interviews = relationship("Interview", back_populates="drive")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    drive_id = Column(Integer, ForeignKey("placement_drives.id"))
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)
    applied_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    drive = relationship("PlacementDrive", back_populates="applications")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    drive_id = Column(Integer, ForeignKey("placement_drives.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    scheduled_at = Column(DateTime)
    meeting_link = Column(String)
    status = Column(String, default="scheduled") # scheduled, completed, cancelled

    drive = relationship("PlacementDrive", back_populates="interviews")
    student = relationship("Student")
