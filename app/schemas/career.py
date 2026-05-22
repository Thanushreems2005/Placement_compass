from datetime import datetime, date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


VALID_PROFICIENCY = {"beginner", "intermediate", "advanced", "expert"}
VALID_COMPLEXITY = {"basic", "medium", "advanced"}


def _clean_skill(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Skill name cannot be empty.")
    if len(cleaned) > 80:
        raise ValueError("Skill name must be 80 characters or fewer.")
    return cleaned


class SkillListMixin(BaseModel):
    skills: List[str] = Field(default_factory=list)

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, value: List[str]) -> List[str]:
        return list(dict.fromkeys(_clean_skill(skill) for skill in value))


class StudentSkillBase(BaseModel):
    skill_name: str
    proficiency_level: str = "beginner"
    years_experience: Optional[float] = Field(default=None, ge=0, le=50)
    evidence: Optional[str] = None
    source: str = "manual"

    @field_validator("skill_name")
    @classmethod
    def validate_skill_name(cls, value: str) -> str:
        return _clean_skill(value)

    @field_validator("proficiency_level")
    @classmethod
    def validate_proficiency(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in VALID_PROFICIENCY:
            raise ValueError(f"proficiency_level must be one of {sorted(VALID_PROFICIENCY)}")
        return normalized


class StudentSkillCreate(StudentSkillBase):
    pass


class StudentSkillResponse(StudentSkillBase):
    id: int
    student_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CertificationBase(SkillListMixin):
    name: str
    issuer: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    credential_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Certification name is required.")
        return cleaned


class CertificationCreate(CertificationBase):
    pass


class CertificationResponse(CertificationBase):
    id: int
    student_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class InternshipBase(SkillListMixin):
    company_name: str
    role: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    impact_summary: Optional[str] = None

    @field_validator("company_name", "role")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required.")
        return cleaned


class InternshipCreate(InternshipBase):
    pass


class InternshipResponse(InternshipBase):
    id: int
    student_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectBase(SkillListMixin):
    title: str
    description: Optional[str] = None
    repo_url: Optional[str] = None
    live_url: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    complexity_level: str = "medium"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Project title is required.")
        return cleaned

    @field_validator("complexity_level")
    @classmethod
    def validate_complexity(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in VALID_COMPLEXITY:
            raise ValueError(f"complexity_level must be one of {sorted(VALID_COMPLEXITY)}")
        return normalized


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    student_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeUploadResponse(BaseModel):
    id: int
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ProfileAnalysisResponse(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    roll_number: Optional[str] = None
    department: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    student_id: int
    profile_strength_score: float
    skill_count: int
    project_count: int
    internship_count: int
    certification_count: int
    resume_uploaded: bool
    strengths: List[str]
    risks: List[str]
    normalized_skills: List[str]
    active_resume_filename: Optional[str] = None
    resume_text_char_count: int = 0


class SkillGapResponse(BaseModel):
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    required_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    project_gaps: List[str]
    summary: str


class RoadmapItem(BaseModel):
    week: int
    title: str
    description: str
    target_skills: List[str]
    priority: str


class RoadmapResponse(BaseModel):
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    readiness_score: float
    roadmap: List[RoadmapItem]


class ReadinessReportResponse(BaseModel):
    id: int
    student_id: int
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    readiness_score: float
    readiness_label: str
    eligible: bool
    matched_skills: List[str]
    missing_skills: List[str]
    evidence: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    roadmap: List[Dict[str, Any]]
    generated_at: datetime

    class Config:
        from_attributes = True


class CompanyEligibilityMatch(BaseModel):
    company_id: Optional[int] = None
    company_name: str
    readiness_score: float
    readiness_label: str
    eligible: bool
    matched_skills: List[str]
    missing_skills: List[str]
    summary: str


class CompanyEligibilityResponse(BaseModel):
    student_id: int
    matches: List[CompanyEligibilityMatch]


class ResumeFirstAnalysisResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    upload: ResumeUploadResponse
    profile: ProfileAnalysisResponse
    matches: List[CompanyEligibilityMatch]


class ResumeScoreBreakdown(BaseModel):
    category: str
    score: float
    max_score: float
    summary: str


class ResumeRoleCompatibility(BaseModel):
    role: str
    score: float
    matched_keywords: List[str]
    missing_keywords: List[str]
    summary: str


class ResumeImprovementSuggestion(BaseModel):
    priority: str
    category: str
    title: str
    description: str
    examples: List[str] = Field(default_factory=list)


class ResumeBulletRewrite(BaseModel):
    original: str
    rewritten: str
    reason: str


class ResumeOptimizerAnalysisResponse(BaseModel):
    filename: str
    extracted_name: str
    extracted_email: Optional[str] = None
    extracted_phone: Optional[str] = None
    ats_score: float
    ats_label: str
    selected_role: str
    target_role_score: float
    target_role_matched_keywords: List[str]
    target_role_missing_keywords: List[str]
    parsed_sections: List[str]
    missing_sections: List[str]
    extracted_skills: List[str]
    extracted_projects: List[str]
    extracted_certifications: List[str]
    detected_links: List[str]
    keyword_density: Dict[str, int]
    score_breakdown: List[ResumeScoreBreakdown]
    role_compatibility: List[ResumeRoleCompatibility]
    missing_keywords: List[str]
    weak_bullets: List[str]
    strong_bullets: List[str]
    bullet_rewrites: List[ResumeBulletRewrite]
    suggestions: List[ResumeImprovementSuggestion]
    text_char_count: int


class ResumeOptimizerReportRequest(BaseModel):
    analysis: ResumeOptimizerAnalysisResponse
