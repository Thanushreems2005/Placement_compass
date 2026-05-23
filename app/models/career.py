from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Date,
    Float,
    Boolean,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class StudentSkill(Base):
    __tablename__ = "student_skills"
    __table_args__ = (
        UniqueConstraint("student_id", "skill_name", name="uq_student_skill_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    skill_name = Column(String, nullable=False, index=True)
    proficiency_level = Column(String, nullable=False, default="beginner")
    years_experience = Column(Float, nullable=True)
    evidence = Column(Text, nullable=True)
    source = Column(String, nullable=False, default="manual")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="career_skills")


class StudentCertification(Base):
    __tablename__ = "student_certifications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    issuer = Column(String, nullable=True)
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    credential_url = Column(String, nullable=True)
    skills = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="certifications")


class StudentInternship(Base):
    __tablename__ = "student_internships"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    company_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    skills = Column(JSON, default=list)
    impact_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="internships")


class StudentProject(Base):
    __tablename__ = "student_projects"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    repo_url = Column(String, nullable=True)
    live_url = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    skills = Column(JSON, default=list)
    complexity_level = Column(String, nullable=False, default="medium")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="projects")


class StudentResume(Base):
    __tablename__ = "student_resumes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False, unique=True)
    storage_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    checksum_sha256 = Column(String, nullable=False)
    parsed_profile = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="resumes")


class ReadinessReport(Base):
    __tablename__ = "readiness_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    company_id = Column(Integer, nullable=True, index=True)
    company_name = Column(String, nullable=True, index=True)
    readiness_score = Column(Float, nullable=False)
    readiness_label = Column(String, nullable=False)
    eligible = Column(Boolean, default=False, nullable=False)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    evidence = Column(JSON, default=dict)
    recommendations = Column(JSON, default=list)
    roadmap = Column(JSON, default=list)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    student = relationship("Student", back_populates="readiness_reports")
    improvement_recommendations = relationship(
        "ImprovementRecommendation",
        back_populates="readiness_report",
        cascade="all, delete-orphan",
    )


class ImprovementRecommendation(Base):
    __tablename__ = "improvement_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    readiness_report_id = Column(Integer, ForeignKey("readiness_reports.id"), nullable=False, index=True)
    priority = Column(String, nullable=False, default="medium")
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    target_skills = Column(JSON, default=list)
    status = Column(String, nullable=False, default="open")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    readiness_report = relationship("ReadinessReport", back_populates="improvement_recommendations")
