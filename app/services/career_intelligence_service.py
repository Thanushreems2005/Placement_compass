import hashlib
import logging
import re
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.career import (
    ImprovementRecommendation,
    ReadinessReport,
    StudentCertification,
    StudentInternship,
    StudentProject,
    StudentResume,
    StudentSkill,
)
from app.models.company import Company
from app.models.student import Student
from app.models.user import User, UserRole
from app.utils.security import get_password_hash

logger = logging.getLogger(__name__)

UPLOAD_ROOT = Path("storage") / "resumes"
MAX_RESUME_BYTES = 5 * 1024 * 1024
ALLOWED_RESUME_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}

SKILL_ALIASES: Dict[str, List[str]] = {
    "dsa": ["data structures", "algorithms", "problem solving", "coding"],
    "data structures": ["dsa", "algorithms", "problem solving"],
    "algorithms": ["dsa", "data structures", "problem solving"],
    "react": ["reactjs", "frontend", "javascript", "typescript"],
    "javascript": ["js", "react", "node", "frontend"],
    "typescript": ["javascript", "react", "frontend"],
    "python": ["data science", "machine learning", "backend", "automation"],
    "java": ["spring", "backend", "oops", "object oriented programming"],
    "sql": ["postgresql", "mysql", "database"],
    "postgresql": ["postgres", "sql", "database"],
    "node": ["node.js", "express", "javascript", "backend"],
    "machine learning": ["ml", "ai", "python"],
}

HIGH_VALUE_TECH_PATTERNS = [
    "dsa",
    "data structures",
    "algorithms",
    "c",
    "c++",
    "python",
    "java",
    "javascript",
    "typescript",
    "html",
    "css",
    "tailwind",
    "react",
    "next.js",
    "angular",
    "vue",
    "node",
    "express",
    "fastapi",
    "django",
    "flask",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "supabase",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "github",
    "linux",
    "rest api",
    "graphql",
    "machine learning",
    "deep learning",
    "nlp",
    "pandas",
    "numpy",
    "data analytics",
    "power bi",
    "tableau",
    "system design",
    "communication",
]


class CareerIntelligenceService:
    """Reusable career intelligence operations for student readiness APIs."""

    def __init__(self, db: Session):
        self.db = db

    def get_student_for_user(self, current_user: User) -> Student:
        student = self.db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student profile not found. Create /api/v1/students first.",
            )
        return student

    def create_skill(self, student: Student, payload: Dict[str, Any]) -> StudentSkill:
        skill_name = payload["skill_name"].strip()
        existing = (
            self.db.query(StudentSkill)
            .filter(StudentSkill.student_id == student.id)
            .filter(StudentSkill.skill_name.ilike(skill_name))
            .first()
        )
        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            return existing

        record = StudentSkill(student_id=student.id, **payload)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_certification(self, student: Student, payload: Dict[str, Any]) -> StudentCertification:
        record = StudentCertification(student_id=student.id, **payload)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_internship(self, student: Student, payload: Dict[str, Any]) -> StudentInternship:
        record = StudentInternship(student_id=student.id, **payload)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def create_project(self, student: Student, payload: Dict[str, Any]) -> StudentProject:
        record = StudentProject(student_id=student.id, **payload)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    async def store_resume(self, student: Student, file: UploadFile) -> StudentResume:
        """Validate and store a resume with a random filename and checksum."""
        original_name = Path(file.filename or "").name
        contents = await file.read()
        parsed_profile = _parse_resume_profile(
            _extract_resume_text(original_name, file.content_type or "", contents),
            original_name,
        )
        return self._store_resume_bytes(student, original_name, file.content_type or "", contents, parsed_profile)

    async def analyze_resume_first_upload(self, file: UploadFile) -> Tuple[Student, StudentResume, Dict[str, Any]]:
        """Create a temporary resume-backed student profile from one uploaded resume."""
        original_name = Path(file.filename or "").name
        contents = await file.read()
        text = _extract_resume_text(original_name, file.content_type or "", contents)
        parsed_profile = _parse_resume_profile(text, original_name)
        checksum = hashlib.sha256(contents).hexdigest()
        student = self._get_or_create_resume_first_student(parsed_profile, checksum)
        self._replace_resume_first_evidence(student, parsed_profile)
        resume = self._store_resume_bytes(student, original_name, file.content_type or "", contents, parsed_profile)
        return student, resume, parsed_profile

    def _store_resume_bytes(
        self,
        student: Student,
        original_name: str,
        content_type: str,
        contents: bytes,
        parsed_profile: Optional[Dict[str, Any]] = None,
    ) -> StudentResume:
        suffix = Path(original_name).suffix.lower()
        if suffix not in ALLOWED_RESUME_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Resume must be a PDF, DOC, DOCX, or TXT file.")

        content_type = (content_type or "").lower()
        if content_type in {"", "application/octet-stream"}:
            content_type = next(
                (
                    candidate
                    for candidate, candidate_suffix in ALLOWED_RESUME_TYPES.items()
                    if candidate_suffix == suffix
                ),
                content_type,
            )
        if content_type not in ALLOWED_RESUME_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported resume content type.")

        size = len(contents)
        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded resume is empty.")
        if size > MAX_RESUME_BYTES:
            raise HTTPException(status_code=413, detail="Resume must be 5 MB or smaller.")

        expected_suffix = ALLOWED_RESUME_TYPES[content_type]
        if suffix != expected_suffix and not (suffix == ".doc" and expected_suffix == ".docx"):
            raise HTTPException(status_code=400, detail="Resume extension does not match content type.")

        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        stored_filename = f"{student.id}_{uuid.uuid4().hex}{suffix}"
        destination = (UPLOAD_ROOT / stored_filename).resolve()
        root = UPLOAD_ROOT.resolve()
        if root not in destination.parents:
            raise HTTPException(status_code=400, detail="Invalid upload path.")

        destination.write_bytes(contents)
        checksum = hashlib.sha256(contents).hexdigest()

        self.db.query(StudentResume).filter(StudentResume.student_id == student.id).update(
            {"is_active": False}
        )
        record = StudentResume(
            student_id=student.id,
            original_filename=original_name,
            stored_filename=stored_filename,
            storage_path=str(destination),
            content_type=content_type,
            size_bytes=size,
            checksum_sha256=checksum,
            parsed_profile=parsed_profile or {},
            is_active=True,
        )
        self.db.add(record)
        student.resume_url = str(destination)
        self.db.add(student)
        self.db.commit()
        self.db.refresh(record)
        return record

    def _get_or_create_resume_first_student(self, parsed_profile: Dict[str, Any], checksum: str) -> Student:
        synthetic_email = f"resume-upload-{checksum[:12]}@local.test"
        user = self.db.query(User).filter(User.email == synthetic_email).first()
        if not user:
            user = User(
                email=synthetic_email,
                hashed_password=get_password_hash(uuid.uuid4().hex),
                role=UserRole.STUDENT,
                is_active=True,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        student = self.db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            student = Student(user_id=user.id, full_name=parsed_profile["name"], roll_number=f"RESUME-{checksum[:12].upper()}")
            self.db.add(student)

        student.full_name = parsed_profile["name"]
        student.department = parsed_profile.get("department")
        student.graduation_year = parsed_profile.get("graduation_year")
        student.cgpa = parsed_profile.get("cgpa")
        student.skills = parsed_profile.get("skills") or []
        student.linkedin_url = parsed_profile.get("linkedin_url")
        student.github_url = parsed_profile.get("github_url")
        self.db.add(student)
        self.db.commit()
        self.db.refresh(student)
        return student

    def _replace_resume_first_evidence(self, student: Student, parsed_profile: Dict[str, Any]) -> None:
        for model in (
            ImprovementRecommendation,
            ReadinessReport,
            StudentCertification,
            StudentInternship,
            StudentProject,
            StudentSkill,
        ):
            if model is ImprovementRecommendation:
                report_ids = [
                    row.id
                    for row in self.db.query(ReadinessReport.id)
                    .filter(ReadinessReport.student_id == student.id)
                    .all()
                ]
                if report_ids:
                    self.db.query(ImprovementRecommendation).filter(
                        ImprovementRecommendation.readiness_report_id.in_(report_ids)
                    ).delete(synchronize_session=False)
                continue
            self.db.query(model).filter(model.student_id == student.id).delete(synchronize_session=False)

        for skill in parsed_profile.get("skills") or []:
            self.db.add(
                StudentSkill(
                    student_id=student.id,
                    skill_name=skill,
                    proficiency_level="intermediate",
                    evidence="Extracted from uploaded resume.",
                    source="resume_parser",
                )
            )

        for project in parsed_profile.get("projects") or []:
            self.db.add(
                StudentProject(
                    student_id=student.id,
                    title=project["title"],
                    description=project.get("description"),
                    skills=project.get("skills") or [],
                    complexity_level="medium",
                )
            )

        for internship in parsed_profile.get("internships") or []:
            self.db.add(
                StudentInternship(
                    student_id=student.id,
                    company_name=internship["company_name"],
                    role=internship["role"],
                    description=internship.get("description"),
                    skills=internship.get("skills") or [],
                    impact_summary="Extracted from uploaded resume.",
                )
            )

        for certification in parsed_profile.get("certifications") or []:
            self.db.add(
                StudentCertification(
                    student_id=student.id,
                    name=certification["name"],
                    skills=certification.get("skills") or [],
                )
            )

        self.db.commit()

    def analyze_profile(self, student: Student) -> Dict[str, Any]:
        evidence = self._student_evidence(student)
        skills = sorted(evidence["skills"])
        score = 0.0
        score += min(len(skills) / 12, 1) * 35
        score += min(len(evidence["projects"]) / 3, 1) * 25
        score += min(len(evidence["internships"]) / 2, 1) * 20
        score += min(len(evidence["certifications"]) / 3, 1) * 10
        score += 10 if evidence["resume_uploaded"] else 0

        strengths: List[str] = []
        risks: List[str] = []
        if len(skills) >= 8:
            strengths.append("Broad skill profile with enough signals for company matching.")
        else:
            risks.append("Skill profile is thin; add core technical and role-specific skills.")
        if evidence["projects"]:
            strengths.append("Project evidence is available for skill validation.")
        else:
            risks.append("No projects recorded; add projects that prove target skills.")
        if evidence["internships"]:
            strengths.append("Internship experience improves role-readiness confidence.")
        else:
            risks.append("No internships recorded; compensate with strong projects and certifications.")
        if not evidence["resume_uploaded"]:
            risks.append("Resume is not uploaded, so resume-aware review cannot run.")

        return {
            "full_name": evidence["parsed_profile"].get("name") or student.full_name,
            "email": evidence["parsed_profile"].get("email") or (student.user.email if student.user else None),
            "phone": evidence["parsed_profile"].get("phone"),
            "roll_number": student.roll_number,
            "department": student.department,
            "graduation_year": student.graduation_year,
            "cgpa": student.cgpa,
            "linkedin_url": student.linkedin_url or evidence["parsed_profile"].get("linkedin_url"),
            "github_url": student.github_url or evidence["parsed_profile"].get("github_url"),
            "student_id": student.id,
            "profile_strength_score": round(score, 2),
            "skill_count": len(skills),
            "project_count": len(evidence["projects"]),
            "internship_count": len(evidence["internships"]),
            "certification_count": len(evidence["certifications"]),
            "resume_uploaded": evidence["resume_uploaded"],
            "strengths": strengths,
            "risks": risks,
            "normalized_skills": skills,
            "active_resume_filename": evidence["resume_filename"],
            "resume_text_char_count": evidence["parsed_profile"].get("text_char_count", 0),
        }

    def generate_readiness_report(
        self,
        student: Student,
        company_id: Optional[int],
        company_name: Optional[str],
        persist: bool = True,
    ) -> Tuple[Dict[str, Any], Optional[ReadinessReport]]:
        target = self._resolve_company_target(company_id=company_id, company_name=company_name)
        if not target:
            raise HTTPException(status_code=404, detail="Company intelligence not found.")

        result = self._score_student_against_target(student, target)
        report = None
        if persist:
            report = ReadinessReport(
                student_id=student.id,
                company_id=target.get("company_id"),
                company_name=target.get("company_name"),
                readiness_score=result["readiness_score"],
                readiness_label=result["readiness_label"],
                eligible=result["eligible"],
                matched_skills=result["matched_skills"],
                missing_skills=result["missing_skills"],
                evidence=result["evidence"],
                recommendations=result["recommendations"],
                roadmap=result["roadmap"],
            )
            self.db.add(report)
            self.db.flush()
            for item in result["recommendations"]:
                self.db.add(
                    ImprovementRecommendation(
                        readiness_report_id=report.id,
                        priority=item["priority"],
                        category=item["category"],
                        title=item["title"],
                        description=item["description"],
                        target_skills=item["target_skills"],
                    )
                )
            self.db.commit()
            self.db.refresh(report)

        return result, report

    def skill_gap(self, student: Student, company_id: Optional[int], company_name: Optional[str]) -> Dict[str, Any]:
        target = self._resolve_company_target(company_id=company_id, company_name=company_name)
        if not target:
            raise HTTPException(status_code=404, detail="Company intelligence not found.")
        result = self._score_student_against_target(student, target)
        return {
            "company_id": target.get("company_id"),
            "company_name": target.get("company_name"),
            "required_skills": result["required_skills"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "project_gaps": result["project_gaps"],
            "summary": result["summary"],
        }

    def roadmap(self, student: Student, company_id: Optional[int], company_name: Optional[str]) -> Dict[str, Any]:
        target = self._resolve_company_target(company_id=company_id, company_name=company_name)
        if not target:
            raise HTTPException(status_code=404, detail="Company intelligence not found.")
        result = self._score_student_against_target(student, target)
        return {
            "company_id": target.get("company_id"),
            "company_name": target.get("company_name"),
            "readiness_score": result["readiness_score"],
            "roadmap": result["roadmap"],
        }

    def company_matches(self, student: Student, limit: int = 25) -> List[Dict[str, Any]]:
        targets = self._list_company_targets(limit=limit)
        matches = [self._score_student_against_target(student, target) for target in targets]
        return sorted(matches, key=lambda row: row["readiness_score"], reverse=True)

    def _student_evidence(self, student: Student) -> Dict[str, Any]:
        skill_records = self.db.query(StudentSkill).filter(StudentSkill.student_id == student.id).all()
        certifications = (
            self.db.query(StudentCertification).filter(StudentCertification.student_id == student.id).all()
        )
        internships = self.db.query(StudentInternship).filter(StudentInternship.student_id == student.id).all()
        projects = self.db.query(StudentProject).filter(StudentProject.student_id == student.id).all()
        resume = (
            self.db.query(StudentResume)
            .filter(StudentResume.student_id == student.id, StudentResume.is_active == True)
            .first()
        )

        skills = set(_normalize_many(student.skills or []))
        for record in skill_records:
            skills.update(_expand_skill(record.skill_name))
        for record in certifications:
            skills.update(_normalize_many(record.skills or []))
        for record in internships:
            skills.update(_normalize_many(record.skills or []))
        for record in projects:
            skills.update(_normalize_many(record.skills or []))

        return {
            "skills": skills,
            "skill_records": skill_records,
            "certifications": certifications,
            "internships": internships,
            "projects": projects,
            "resume_uploaded": resume is not None,
            "resume_filename": resume.original_filename if resume else None,
            "parsed_profile": resume.parsed_profile if resume and resume.parsed_profile else {},
        }

    def _score_student_against_target(self, student: Student, target: Dict[str, Any]) -> Dict[str, Any]:
        evidence = self._student_evidence(student)
        student_skills = evidence["skills"]
        required_skills = sorted(set(target.get("required_skills") or []))
        matched = sorted(skill for skill in required_skills if _matches_any(skill, student_skills))
        missing = sorted(skill for skill in required_skills if skill not in matched)

        skill_score = (len(matched) / len(required_skills) * 45) if required_skills else 0
        project_score, project_gaps = self._project_score(evidence["projects"], required_skills, matched)
        internship_score = min(len(evidence["internships"]) / 2, 1) * 15
        cert_score = min(len(evidence["certifications"]) / 3, 1) * 10
        cgpa_score = min(max((student.cgpa or 0) / 10, 0), 1) * 10
        resume_bonus = 5 if evidence["resume_uploaded"] else 0
        raw_score = skill_score + project_score + internship_score + cert_score + cgpa_score + resume_bonus
        readiness_score = round(min(raw_score, 100), 2)
        label = _readiness_label(readiness_score)
        eligible = readiness_score >= 60 and len(missing) <= max(4, len(required_skills) // 2)
        recommendations = self._recommendations(missing, project_gaps)
        roadmap = self._roadmap_items(missing, project_gaps)
        company_name = target.get("company_name") or "target company"
        summary = _summary(company_name, readiness_score, missing, project_gaps)

        return {
            "company_id": target.get("company_id"),
            "company_name": company_name,
            "readiness_score": readiness_score,
            "readiness_label": label,
            "eligible": eligible,
            "required_skills": required_skills,
            "matched_skills": matched,
            "missing_skills": missing,
            "project_gaps": project_gaps,
            "evidence": {
                "skills_considered": sorted(student_skills),
                "project_count": len(evidence["projects"]),
                "internship_count": len(evidence["internships"]),
                "certification_count": len(evidence["certifications"]),
                "resume_uploaded": evidence["resume_uploaded"],
                "target_source": target.get("source"),
            },
            "recommendations": recommendations,
            "roadmap": roadmap,
            "summary": summary,
        }

    def _project_score(
        self,
        projects: List[StudentProject],
        required_skills: List[str],
        matched_skills: List[str],
    ) -> Tuple[float, List[str]]:
        if not required_skills:
            return (5.0 if projects else 0.0), []

        project_skills = set()
        complexity_bonus = 0.0
        for project in projects:
            project_skills.update(_normalize_many(project.skills or []))
            if project.complexity_level == "advanced":
                complexity_bonus += 1.5
            elif project.complexity_level == "medium":
                complexity_bonus += 1.0
            else:
                complexity_bonus += 0.5

        skills_with_project_evidence = [
            skill for skill in required_skills if _matches_any(skill, project_skills)
        ]
        project_gaps = [
            skill for skill in required_skills if skill in matched_skills and skill not in skills_with_project_evidence
        ]
        score = (len(skills_with_project_evidence) / len(required_skills)) * 15
        score += min(complexity_bonus, 5)
        return min(score, 20), project_gaps[:8]

    def _recommendations(self, missing: List[str], project_gaps: List[str]) -> List[Dict[str, Any]]:
        recommendations: List[Dict[str, Any]] = []
        if missing:
            top_missing = missing[:5]
            recommendations.append(
                {
                    "priority": "high",
                    "category": "skill_gap",
                    "title": f"Build core skills: {', '.join(top_missing)}",
                    "description": "Focus on the missing skills that appear in the company's hiring signals.",
                    "target_skills": top_missing,
                }
            )
        if project_gaps:
            top_project_gaps = project_gaps[:4]
            recommendations.append(
                {
                    "priority": "high",
                    "category": "project_evidence",
                    "title": f"Add projects proving {', '.join(top_project_gaps)}",
                    "description": "Your profile lists these skills, but project evidence is weak or missing.",
                    "target_skills": top_project_gaps,
                }
            )
        if not recommendations:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "interview_readiness",
                    "title": "Convert readiness into interview performance",
                    "description": "Practice role-specific interview questions and explain your best projects clearly.",
                    "target_skills": [],
                }
            )
        return recommendations

    def _roadmap_items(self, missing: List[str], project_gaps: List[str]) -> List[Dict[str, Any]]:
        roadmap: List[Dict[str, Any]] = []
        missing_chunks = [missing[i : i + 3] for i in range(0, min(len(missing), 9), 3)]
        week = 1
        for chunk in missing_chunks:
            roadmap.append(
                {
                    "week": week,
                    "title": f"Close skill gap: {', '.join(chunk)}",
                    "description": "Study fundamentals, solve practice tasks, and add notes or proof of work.",
                    "target_skills": chunk,
                    "priority": "high",
                }
            )
            week += 1
        if project_gaps:
            roadmap.append(
                {
                    "week": week,
                    "title": "Ship one company-relevant project",
                    "description": f"Build a project that demonstrates {', '.join(project_gaps[:4])}.",
                    "target_skills": project_gaps[:4],
                    "priority": "high",
                }
            )
        if not roadmap:
            roadmap.append(
                {
                    "week": 1,
                    "title": "Interview polish and resume alignment",
                    "description": "Tune resume bullets to the target company and practice explaining trade-offs.",
                    "target_skills": [],
                    "priority": "medium",
                }
            )
        return roadmap

    def _resolve_company_target(
        self, company_id: Optional[int], company_name: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        supabase_target = self._resolve_supabase_company(company_id, company_name)
        if supabase_target:
            return supabase_target

        query = self.db.query(Company)
        if company_id is not None:
            company = query.filter(Company.id == company_id).first()
        elif company_name:
            company = query.filter(Company.name.ilike(f"%{company_name}%")).first()
        else:
            company = None
        if not company:
            return None

        return {
            "company_id": company.id,
            "company_name": company.name,
            "required_skills": _infer_skills_from_text(
                " ".join([company.name or "", company.industry or "", company.description or ""])
            ),
            "source": "local_sqlalchemy",
        }

    def _list_company_targets(self, limit: int) -> List[Dict[str, Any]]:
        targets = self._list_supabase_companies(limit)
        if targets:
            return targets

        companies = self.db.query(Company).filter(Company.is_active == True).limit(limit).all()
        return [
            {
                "company_id": company.id,
                "company_name": company.name,
                "required_skills": _infer_skills_from_text(
                    " ".join([company.name or "", company.industry or "", company.description or ""])
                ),
                "source": "local_sqlalchemy",
            }
            for company in companies
        ]

    def _supabase_client(self):
        try:
            from LANGGRAPH.services.supabase_service import SupabaseClient

            return SupabaseClient().client
        except Exception as exc:
            logger.warning("Supabase client unavailable for career intelligence: %s", exc)
            return None

    def _resolve_supabase_company(
        self, company_id: Optional[int], company_name: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        client = self._supabase_client()
        if client is None:
            return None
        try:
            query = client.table("company_json").select("company_id, short_json, full_json")
            if company_id is not None:
                response = query.eq("company_id", company_id).limit(1).execute()
            elif company_name:
                response = query.execute()
            else:
                return None
            rows = response.data or []
            if company_name and company_id is None:
                normalized = company_name.lower()
                rows = [
                    row for row in rows if normalized in str((row.get("short_json") or {}).get("name", "")).lower()
                ]
            if not rows:
                return None
            row = rows[0]
            return self._target_from_company_json(row)
        except Exception as exc:
            logger.warning("Supabase company lookup failed: %s", exc)
            return None

    def _list_supabase_companies(self, limit: int) -> List[Dict[str, Any]]:
        client = self._supabase_client()
        if client is None:
            return []
        try:
            response = (
                client.table("company_json")
                .select("company_id, short_json, full_json")
                .limit(limit)
                .execute()
            )
            return [self._target_from_company_json(row) for row in (response.data or [])]
        except Exception as exc:
            logger.warning("Supabase company list failed: %s", exc)
            return []

    def _target_from_company_json(self, row: Dict[str, Any]) -> Dict[str, Any]:
        company_id = row.get("company_id")
        short_json = row.get("short_json") or {}
        full_json = row.get("full_json") or {}
        name = short_json.get("name") or full_json.get("name") or f"Company {company_id}"
        skills = set()
        for key in (
            "tech_stack",
            "focus_sectors",
            "technology_partners",
            "ai_ml_adoption_level",
            "automation_level",
            "skill_relevance",
            "product_pipeline",
            "job_description",
        ):
            skills.update(_skills_from_unknown(full_json.get(key)))
        skills.update(self._job_role_skills(company_id))
        return {
            "company_id": int(company_id) if company_id is not None else None,
            "company_name": name,
            "required_skills": sorted(skills),
            "source": "supabase_company_json",
        }

    def _job_role_skills(self, company_id: Optional[int]) -> List[str]:
        if company_id is None:
            return []
        client = self._supabase_client()
        if client is None:
            return []
        try:
            response = (
                client.table("job_role_details_json")
                .select("job_role_json")
                .eq("company_id", company_id)
                .execute()
            )
        except Exception as exc:
            logger.warning("Supabase job role lookup failed: %s", exc)
            return []

        skills = set()
        for row in response.data or []:
            skills.update(_extract_job_role_skills(row.get("job_role_json")))
        return sorted(skills)


def _normalize_skill(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9+#. ]+", " ", str(value)).strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def _normalize_many(values: Iterable[Any]) -> List[str]:
    normalized: List[str] = []
    for value in values:
        if isinstance(value, str):
            normalized.append(_normalize_skill(value))
    return [skill for skill in normalized if skill]


def _expand_skill(value: str) -> List[str]:
    normalized = _normalize_skill(value)
    return [normalized, *SKILL_ALIASES.get(normalized, [])]


def _matches_any(required_skill: str, student_skills: Iterable[str]) -> bool:
    required = _normalize_skill(required_skill)
    expanded = set(_expand_skill(required))
    for skill in student_skills:
        normalized = _normalize_skill(skill)
        if normalized in expanded or required in _expand_skill(normalized):
            return True
    return False


def _skills_from_unknown(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return _normalize_many(value)
    if isinstance(value, dict):
        return _infer_skills_from_text(" ".join(str(v) for v in value.values()))
    return _infer_skills_from_text(str(value))


def _infer_skills_from_text(text: str) -> List[str]:
    normalized_text = _normalize_skill(text)
    found = set()
    for pattern in HIGH_VALUE_TECH_PATTERNS:
        if re.search(rf"\b{re.escape(pattern)}\b", normalized_text):
            found.add(pattern)
    return sorted(found)


def _extract_resume_text(filename: str, content_type: str, contents: bytes) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix == ".pdf" or content_type.lower() == "application/pdf":
        try:
            from pypdf import PdfReader

            reader = PdfReader(BytesIO(contents))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            logger.warning("PDF resume text extraction failed: %s", exc)
            return ""

    if suffix == ".docx" or "wordprocessingml" in content_type.lower():
        try:
            from docx import Document

            document = Document(BytesIO(contents))
            return "\n".join(paragraph.text for paragraph in document.paragraphs)
        except Exception as exc:
            logger.warning("DOCX resume text extraction failed: %s", exc)
            return ""

    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return contents.decode(encoding)
        except UnicodeDecodeError:
            continue
    return contents.decode("latin-1", errors="ignore")


def _parse_resume_profile(text: str, filename: str) -> Dict[str, Any]:
    cleaned_text = re.sub(r"\r\n?", "\n", text or "")
    lines = [line.strip(" \t-•|") for line in cleaned_text.splitlines()]
    lines = [line for line in lines if line]
    joined = "\n".join(lines)

    email = _first_match(r"[\w.+-]+@[\w-]+\.[\w.-]+", joined)
    phone = _first_match(r"(?:\+?\d[\d\s().-]{8,}\d)", joined)
    linkedin_url = _first_match(r"https?://(?:www\.)?linkedin\.com/[^\s,)]+", joined)
    github_url = _first_match(r"https?://(?:www\.)?github\.com/[^\s,)]+", joined)
    cgpa_match = re.search(r"\b(?:cgpa|gpa)\s*[:\-]?\s*(\d+(?:\.\d+)?)", joined, re.IGNORECASE)
    cgpa = float(cgpa_match.group(1)) if cgpa_match else None
    graduation_year = _extract_graduation_year(joined)
    department = _extract_department(joined)
    name = _extract_resume_name(lines, filename)
    skills = _infer_skills_from_text(joined)
    projects = _extract_resume_items(joined, ("projects", "academic projects", "personal projects"), "project")
    internships = _extract_resume_items(
        joined,
        ("experience", "internship", "internships", "work experience", "professional experience"),
        "internship",
    )
    certifications = _extract_resume_items(
        joined,
        ("certifications", "certification", "courses", "licenses"),
        "certification",
    )

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "linkedin_url": linkedin_url,
        "github_url": github_url,
        "cgpa": cgpa,
        "graduation_year": graduation_year,
        "department": department,
        "skills": skills,
        "projects": projects,
        "internships": internships,
        "certifications": certifications,
        "text_char_count": len(cleaned_text),
    }


def _first_match(pattern: str, text: str) -> Optional[str]:
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(0).strip() if match else None


def _extract_resume_name(lines: List[str], filename: str) -> str:
    for line in lines[:8]:
        lowered = line.lower()
        if any(token in lowered for token in ("@", "http", "linkedin", "github", "resume", "curriculum")):
            continue
        candidate = re.sub(r"^(name\s*[:\-]\s*)", "", line, flags=re.IGNORECASE).strip()
        words = candidate.split()
        if 1 <= len(words) <= 5 and re.search(r"[a-zA-Z]", candidate):
            return candidate[:120]
    return Path(filename or "Uploaded Resume").stem.replace("_", " ").replace("-", " ").title()


def _extract_graduation_year(text: str) -> Optional[int]:
    years = [int(year) for year in re.findall(r"\b20[2-4]\d\b", text)]
    return max(years) if years else None


def _extract_department(text: str) -> Optional[str]:
    known = [
        "computer science",
        "information technology",
        "electronics",
        "electrical",
        "mechanical",
        "civil",
        "data science",
        "artificial intelligence",
        "business administration",
    ]
    normalized = text.lower()
    for department in known:
        if department in normalized:
            return department.title()
    return None


def _extract_resume_items(text: str, headings: Tuple[str, ...], kind: str) -> List[Dict[str, Any]]:
    section = _section_text(text, headings)
    if not section:
        return []
    raw_items = [
        re.sub(r"^[•*\-\d.)\s]+", "", line).strip()
        for line in section.splitlines()
        if line.strip()
    ]
    raw_items = [
        item
        for item in raw_items
        if len(item) >= 8 and not _is_section_heading(item)
    ][:5]

    items: List[Dict[str, Any]] = []
    for item in raw_items:
        skills = _infer_skills_from_text(item)
        title = item.split(" - ", 1)[0].split(" | ", 1)[0].strip()[:90]
        if kind == "internship":
            items.append(
                {
                    "company_name": title or "Resume Experience",
                    "role": "Internship / Experience",
                    "description": item[:600],
                    "skills": skills,
                }
            )
        elif kind == "certification":
            items.append({"name": title or "Resume Certification", "skills": skills})
        else:
            items.append({"title": title or "Resume Project", "description": item[:600], "skills": skills})
    return items


def _section_text(text: str, headings: Tuple[str, ...]) -> str:
    lines = text.splitlines()
    start: Optional[int] = None
    for index, line in enumerate(lines):
        normalized = _normalize_heading(line)
        if normalized in headings:
            start = index + 1
            break
    if start is None:
        return ""

    end = len(lines)
    for index in range(start, len(lines)):
        if _is_section_heading(lines[index]):
            end = index
            break
    return "\n".join(lines[start:end])


def _normalize_heading(line: str) -> str:
    return re.sub(r"[^a-z ]+", "", line.strip().lower()).strip()


def _is_section_heading(line: str) -> bool:
    normalized = _normalize_heading(line)
    headings = {
        "summary",
        "profile",
        "education",
        "skills",
        "technical skills",
        "projects",
        "academic projects",
        "personal projects",
        "experience",
        "work experience",
        "professional experience",
        "internship",
        "internships",
        "certifications",
        "certification",
        "courses",
        "achievements",
        "leadership",
        "languages",
    }
    return normalized in headings or (line.strip().isupper() and 3 <= len(normalized) <= 35)


def _extract_job_role_skills(payload: Any) -> List[str]:
    if not isinstance(payload, dict):
        return []
    skills = set()
    role_details = payload.get("job_role_details") or payload.get("roles") or []
    if isinstance(role_details, dict):
        role_details = [role_details]
    if not isinstance(role_details, list):
        return []

    for role in role_details:
        if not isinstance(role, dict):
            continue
        skills.update(_skills_from_unknown(role.get("role_title")))
        skills.update(_skills_from_unknown(role.get("role_category")))
        skills.update(_skills_from_unknown(role.get("job_description")))
        rounds = role.get("hiring_rounds") or role.get("rounds") or []
        if isinstance(rounds, dict):
            rounds = [rounds]
        for round_info in rounds if isinstance(rounds, list) else []:
            if not isinstance(round_info, dict):
                continue
            skills.update(_skills_from_unknown(round_info.get("preparation_focus")))
            skills.update(_skills_from_unknown(round_info.get("description")))
            skill_sets = round_info.get("skill_sets") or round_info.get("skills") or []
            if isinstance(skill_sets, dict):
                skill_sets = [skill_sets]
            for item in skill_sets if isinstance(skill_sets, list) else []:
                if isinstance(item, dict):
                    skills.update(_skills_from_unknown(item.get("skill_set_code")))
                    skills.update(_skills_from_unknown(item.get("typical_questions")))
                else:
                    skills.update(_skills_from_unknown(item))
    return sorted(skills)


def _readiness_label(score: float) -> str:
    if score >= 80:
        return "high"
    if score >= 60:
        return "moderate"
    if score >= 40:
        return "developing"
    return "early"


def _summary(company_name: str, score: float, missing: List[str], project_gaps: List[str]) -> str:
    clauses = [f"{score:.0f}% ready for {company_name}"]
    gaps = []
    if missing:
        gaps.append(", ".join(missing[:3]))
    if project_gaps:
        gaps.append(f"{', '.join(project_gaps[:2])} projects")
    if gaps:
        clauses.append(f"Missing {', '.join(gaps)}")
    else:
        clauses.append("Core skills are covered; focus on interview polish")
    return ". ".join(clauses) + "."
