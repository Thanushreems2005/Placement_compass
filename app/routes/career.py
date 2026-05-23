from typing import List, Optional

from fastapi import APIRouter, Body, Depends, File, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.career import (
    StudentCertification,
    StudentInternship,
    StudentProject,
    StudentSkill,
)
from app.models.user import User
from app.schemas.career import (
    CertificationCreate,
    CertificationResponse,
    CompanyEligibilityMatch,
    CompanyEligibilityResponse,
    InternshipCreate,
    InternshipResponse,
    ProfileAnalysisResponse,
    ProjectCreate,
    ProjectResponse,
    ReadinessReportResponse,
    ResumeUploadResponse,
    ResumeFirstAnalysisResponse,
    ResumeOptimizerAnalysisResponse,
    ResumeOptimizerReportRequest,
    RoadmapResponse,
    SkillGapResponse,
    StudentSkillCreate,
    StudentSkillResponse,
)
from app.services.career_intelligence_service import CareerIntelligenceService
from app.services.resume_optimizer_service import ResumeOptimizerService, build_resume_optimizer_report
from app.utils.security import create_access_token

router = APIRouter(prefix="/career", tags=["career-intelligence"])


def get_career_service(db: Session = Depends(get_db)) -> CareerIntelligenceService:
    return CareerIntelligenceService(db)


@router.post("/skills", response_model=StudentSkillResponse)
def upsert_skill(
    skill_in: StudentSkillCreate,
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Create or update a student's normalized skill evidence."""
    student = service.get_student_for_user(current_user)
    return service.create_skill(student, skill_in.model_dump())


@router.get("/skills", response_model=List[StudentSkillResponse])
def list_skills(
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    student = service.get_student_for_user(current_user)
    return (
        service.db.query(StudentSkill)
        .filter(StudentSkill.student_id == student.id)
        .order_by(StudentSkill.skill_name.asc())
        .all()
    )


@router.post("/certifications", response_model=CertificationResponse)
def create_certification(
    cert_in: CertificationCreate,
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Add certification evidence used by readiness scoring."""
    student = service.get_student_for_user(current_user)
    return service.create_certification(student, cert_in.model_dump())


@router.get("/certifications", response_model=List[CertificationResponse])
def list_certifications(
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    student = service.get_student_for_user(current_user)
    return (
        service.db.query(StudentCertification)
        .filter(StudentCertification.student_id == student.id)
        .order_by(StudentCertification.created_at.desc())
        .all()
    )


@router.post("/internships", response_model=InternshipResponse)
def create_internship(
    internship_in: InternshipCreate,
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Add internship experience used by readiness and eligibility matching."""
    student = service.get_student_for_user(current_user)
    return service.create_internship(student, internship_in.model_dump())


@router.get("/internships", response_model=List[InternshipResponse])
def list_internships(
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    student = service.get_student_for_user(current_user)
    return (
        service.db.query(StudentInternship)
        .filter(StudentInternship.student_id == student.id)
        .order_by(StudentInternship.created_at.desc())
        .all()
    )


@router.post("/projects", response_model=ProjectResponse)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Add project proof used for skill evidence and project-gap analysis."""
    student = service.get_student_for_user(current_user)
    return service.create_project(student, project_in.model_dump())


@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    student = service.get_student_for_user(current_user)
    return (
        service.db.query(StudentProject)
        .filter(StudentProject.student_id == student.id)
        .order_by(StudentProject.created_at.desc())
        .all()
    )


@router.post("/resume", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Securely upload the active resume for the authenticated student."""
    student = service.get_student_for_user(current_user)
    return await service.store_resume(student, file)


@router.post("/resume-first/analyze", response_model=ResumeFirstAnalysisResponse)
async def analyze_resume_first(
    file: UploadFile = File(...),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Upload a resume, parse it, create a temporary resume-backed student profile, and return dashboard access."""
    student, upload, _ = await service.analyze_resume_first_upload(file)
    access_token = create_access_token(data={"sub": student.user.email, "role": student.user.role})
    profile = service.analyze_profile(student)
    matches = [
        CompanyEligibilityMatch(
            company_id=item.get("company_id"),
            company_name=item["company_name"],
            readiness_score=item["readiness_score"],
            readiness_label=item["readiness_label"],
            eligible=item["eligible"],
            matched_skills=item["matched_skills"],
            missing_skills=item["missing_skills"],
            summary=item["summary"],
        )
        for item in service.company_matches(student, limit=9)
    ]
    return ResumeFirstAnalysisResponse(
        access_token=access_token,
        upload=upload,
        profile=profile,
        matches=matches,
    )


@router.post("/resume-optimizer/analyze", response_model=ResumeOptimizerAnalysisResponse)
async def analyze_resume_optimizer(
    file: UploadFile = File(...),
    target_role: Optional[str] = Query(default=None, max_length=80),
):
    """Analyze resume ATS quality, role compatibility, missing keywords, and improvement actions."""
    return await ResumeOptimizerService().analyze_upload(file, target_role=target_role)


@router.post("/resume-optimizer/report")
def download_resume_optimizer_report(payload: ResumeOptimizerReportRequest = Body(...)):
    """Return a downloadable ATS improvement report generated by the backend."""
    content = build_resume_optimizer_report(payload.analysis.model_dump())
    filename = payload.analysis.filename.rsplit(".", 1)[0].lower().replace(" ", "-")
    safe_filename = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in filename).strip("-")
    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="resume-ats-report-{safe_filename or "resume"}.txt"'
        },
    )


@router.get("/profile-analysis", response_model=ProfileAnalysisResponse)
def profile_analysis(
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Analyze a student's career evidence without using mock/default data."""
    student = service.get_student_for_user(current_user)
    return service.analyze_profile(student)


@router.post("/readiness", response_model=ReadinessReportResponse)
def generate_readiness_report(
    company_id: Optional[int] = Query(default=None),
    company_name: Optional[str] = Query(default=None, min_length=2),
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Generate and persist a company-specific readiness report."""
    student = service.get_student_for_user(current_user)
    _, report = service.generate_readiness_report(student, company_id, company_name, persist=True)
    return report


@router.get("/skill-gap", response_model=SkillGapResponse)
def skill_gap_analysis(
    company_id: Optional[int] = Query(default=None),
    company_name: Optional[str] = Query(default=None, min_length=2),
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Return required, matched, and missing skills for a target company."""
    student = service.get_student_for_user(current_user)
    return service.skill_gap(student, company_id, company_name)


@router.get("/roadmap", response_model=RoadmapResponse)
def personalized_roadmap(
    company_id: Optional[int] = Query(default=None),
    company_name: Optional[str] = Query(default=None, min_length=2),
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Build a personalized improvement roadmap from current gaps."""
    student = service.get_student_for_user(current_user)
    return service.roadmap(student, company_id, company_name)


@router.get("/company-matches", response_model=CompanyEligibilityResponse)
def company_eligibility_matches(
    limit: int = Query(default=25, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    service: CareerIntelligenceService = Depends(get_career_service),
):
    """Score the student against available company intelligence records."""
    student = service.get_student_for_user(current_user)
    matches = [
        CompanyEligibilityMatch(
            company_id=item.get("company_id"),
            company_name=item["company_name"],
            readiness_score=item["readiness_score"],
            readiness_label=item["readiness_label"],
            eligible=item["eligible"],
            matched_skills=item["matched_skills"],
            missing_skills=item["missing_skills"],
            summary=item["summary"],
        )
        for item in service.company_matches(student, limit=limit)
    ]
    return CompanyEligibilityResponse(student_id=student.id, matches=matches)
