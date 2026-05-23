import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, UploadFile

from app.services.career_intelligence_service import (
    ALLOWED_RESUME_EXTENSIONS,
    MAX_RESUME_BYTES,
    _extract_resume_text,
    _infer_skills_from_text,
    _parse_resume_profile,
)


ROLE_KEYWORDS: Dict[str, List[str]] = {
    "Frontend Developer": [
        "html",
        "css",
        "javascript",
        "typescript",
        "react",
        "next.js",
        "tailwind",
        "git",
        "rest api",
    ],
    "Backend Developer": [
        "python",
        "java",
        "node",
        "express",
        "fastapi",
        "sql",
        "postgresql",
        "mongodb",
        "rest api",
    ],
    "Full Stack Developer": [
        "javascript",
        "typescript",
        "react",
        "node",
        "python",
        "sql",
        "postgresql",
        "git",
        "rest api",
    ],
    "Data Analyst": [
        "python",
        "sql",
        "data analytics",
        "pandas",
        "numpy",
        "power bi",
        "tableau",
        "communication",
    ],
    "AI/ML Intern": [
        "python",
        "machine learning",
        "deep learning",
        "nlp",
        "pandas",
        "numpy",
        "algorithms",
        "data science",
    ],
}

REQUIRED_SECTIONS = ["education", "skills", "projects"]
OPTIONAL_SECTIONS = ["experience", "certifications", "summary"]
ACTION_VERBS = {
    "built",
    "created",
    "designed",
    "developed",
    "implemented",
    "improved",
    "optimized",
    "deployed",
    "integrated",
    "automated",
    "analyzed",
    "led",
    "managed",
    "reduced",
    "increased",
}


class ResumeOptimizerService:
    """ATS-oriented resume quality analysis independent of company eligibility."""

    async def analyze_upload(self, file: UploadFile, target_role: Optional[str] = None) -> Dict[str, Any]:
        filename = Path(file.filename or "").name
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_RESUME_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Resume must be a PDF, DOC, DOCX, or TXT file.")

        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded resume is empty.")
        if len(contents) > MAX_RESUME_BYTES:
            raise HTTPException(status_code=413, detail="Resume must be 5 MB or smaller.")

        text = _extract_resume_text(filename, file.content_type or "", contents)
        if len(text.strip()) < 80:
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from this resume. Try a text-based PDF or DOCX.",
            )

        parsed = _parse_resume_profile(text, filename)
        sections = _detect_sections(text)
        missing_sections = [section for section in REQUIRED_SECTIONS if section not in sections]
        missing_sections.extend(section for section in OPTIONAL_SECTIONS if section not in sections)
        skills = parsed.get("skills") or _infer_skills_from_text(text)
        projects = [project["title"] for project in parsed.get("projects") or []]
        certifications = [cert["name"] for cert in parsed.get("certifications") or []]
        bullets = _extract_bullets(text)
        strong_bullets, weak_bullets = _classify_bullets(bullets)
        keyword_density = _keyword_density(text, skills)
        selected_role = _resolve_target_role(target_role, skills)
        role_compatibility = _role_compatibility(skills, selected_role)
        target_role_data = next(
            (role for role in role_compatibility if role["role"] == selected_role),
            role_compatibility[0],
        )
        bullet_rewrites = _rewrite_bullets(weak_bullets, target_role_data["missing_keywords"])
        breakdown = _score_breakdown(
            parsed=parsed,
            sections=sections,
            skills=skills,
            projects=projects,
            certifications=certifications,
            strong_bullets=strong_bullets,
            weak_bullets=weak_bullets,
            text=text,
        )
        total_score = round(sum(item["score"] for item in breakdown), 2)

        return {
            "filename": filename,
            "extracted_name": parsed.get("name") or Path(filename).stem,
            "extracted_email": parsed.get("email"),
            "extracted_phone": parsed.get("phone"),
            "ats_score": total_score,
            "ats_label": _ats_label(total_score),
            "selected_role": selected_role,
            "target_role_score": target_role_data["score"],
            "target_role_matched_keywords": target_role_data["matched_keywords"],
            "target_role_missing_keywords": target_role_data["missing_keywords"],
            "parsed_sections": sorted(sections),
            "missing_sections": missing_sections,
            "extracted_skills": skills,
            "extracted_projects": projects,
            "extracted_certifications": certifications,
            "detected_links": [
                link for link in [parsed.get("linkedin_url"), parsed.get("github_url")] if link
            ],
            "keyword_density": keyword_density,
            "score_breakdown": breakdown,
            "role_compatibility": role_compatibility,
            "missing_keywords": target_role_data["missing_keywords"][:18],
            "weak_bullets": weak_bullets[:8],
            "strong_bullets": strong_bullets[:8],
            "bullet_rewrites": bullet_rewrites[:8],
            "suggestions": _suggestions(
                parsed=parsed,
                missing_sections=missing_sections,
                weak_bullets=weak_bullets,
                target_role=target_role_data,
                projects=projects,
                certifications=certifications,
            ),
            "text_char_count": len(text),
        }


def _detect_sections(text: str) -> set[str]:
    normalized = text.lower()
    section_aliases = {
        "summary": ["summary", "profile", "objective"],
        "education": ["education", "academic"],
        "skills": ["skills", "technical skills", "technologies"],
        "projects": ["projects", "academic projects", "personal projects"],
        "experience": ["experience", "internship", "work experience"],
        "certifications": ["certifications", "certification", "courses", "licenses"],
    }
    found = set()
    for section, aliases in section_aliases.items():
        if any(re.search(rf"\b{re.escape(alias)}\b", normalized) for alias in aliases):
            found.add(section)
    return found


def _extract_bullets(text: str) -> List[str]:
    bullets = []
    for line in text.splitlines():
        cleaned = re.sub(r"^[\s•*\-–—\d.)]+", "", line).strip()
        if 35 <= len(cleaned) <= 220 and re.search(r"[a-zA-Z]", cleaned):
            bullets.append(cleaned)
    return bullets[:40]


def _classify_bullets(bullets: List[str]) -> Tuple[List[str], List[str]]:
    strong = []
    weak = []
    for bullet in bullets:
        normalized = bullet.lower()
        has_action = any(re.search(rf"\b{verb}\b", normalized) for verb in ACTION_VERBS)
        has_metric = bool(re.search(r"\b\d+(\.\d+)?%?\b", bullet))
        has_result = any(word in normalized for word in ("improved", "reduced", "increased", "optimized", "deployed"))
        if has_action and (has_metric or has_result):
            strong.append(bullet)
        elif not has_action or not has_metric:
            weak.append(bullet)
    return strong, weak


def _keyword_density(text: str, skills: List[str]) -> Dict[str, int]:
    normalized = text.lower()
    counts = {}
    for skill in skills[:20]:
        counts[skill] = len(re.findall(rf"\b{re.escape(skill.lower())}\b", normalized))
    return dict(sorted(counts.items(), key=lambda item: item[1], reverse=True)[:12])


def _role_compatibility(skills: List[str]) -> List[Dict[str, Any]]:
    skill_set = set(skills)
    roles = []
    for role, keywords in ROLE_KEYWORDS.items():
        matched = sorted(keyword for keyword in keywords if keyword in skill_set)
        missing = sorted(keyword for keyword in keywords if keyword not in skill_set)
        score = round((len(matched) / len(keywords)) * 100, 2)
        roles.append(
            {
                "role": role,
                "score": score,
                "matched_keywords": matched,
                "missing_keywords": missing,
                "summary": f"{score:.0f}% compatible based on {len(matched)} of {len(keywords)} role keywords.",
            }
        )
    return sorted(roles, key=lambda item: item["score"], reverse=True)


def _score_breakdown(
    parsed: Dict[str, Any],
    sections: set[str],
    skills: List[str],
    projects: List[str],
    certifications: List[str],
    strong_bullets: List[str],
    weak_bullets: List[str],
    text: str,
) -> List[Dict[str, Any]]:
    contact_score = 12 * (
        sum(bool(parsed.get(key)) for key in ("email", "phone", "linkedin_url", "github_url")) / 4
    )
    section_score = 18 * (len(sections.intersection(set(REQUIRED_SECTIONS + OPTIONAL_SECTIONS))) / 6)
    keyword_score = min(len(skills) / 18, 1) * 24
    evidence_score = min((len(projects) * 4 + len(certifications) * 2) / 18, 1) * 18
    bullet_total = max(len(strong_bullets) + len(weak_bullets), 1)
    impact_score = min((len(strong_bullets) / bullet_total) * 18, 18)
    length_score = 0 if len(text) < 600 else 8 if len(text) < 1200 else 10

    return [
        {
            "category": "Contact and links",
            "score": round(contact_score, 2),
            "max_score": 12,
            "summary": "Email, phone, LinkedIn, and GitHub visibility.",
        },
        {
            "category": "Section completeness",
            "score": round(section_score, 2),
            "max_score": 18,
            "summary": "Presence of education, skills, projects, experience, certifications, and summary.",
        },
        {
            "category": "Keyword strength",
            "score": round(keyword_score, 2),
            "max_score": 24,
            "summary": "Relevant technical and role keywords detected by ATS parsing.",
        },
        {
            "category": "Project evidence",
            "score": round(evidence_score, 2),
            "max_score": 18,
            "summary": "Projects and certifications that prove the listed skills.",
        },
        {
            "category": "Bullet impact",
            "score": round(impact_score, 2),
            "max_score": 18,
            "summary": "Action verbs, measurable outcomes, and result-oriented bullet quality.",
        },
        {
            "category": "ATS readability",
            "score": round(length_score, 2),
            "max_score": 10,
            "summary": "Extractable text volume and basic parser friendliness.",
        },
    ]


def _suggestions(
    parsed: Dict[str, Any],
    missing_sections: List[str],
    weak_bullets: List[str],
    role_compatibility: List[Dict[str, Any]],
    projects: List[str],
    certifications: List[str],
) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []
    if missing_sections:
        suggestions.append(
            {
                "priority": "high",
                "category": "section_completeness",
                "title": "Add missing ATS sections",
                "description": f"Add or clearly label these sections: {', '.join(missing_sections[:5])}.",
                "examples": ["Use clear headings like Skills, Projects, Education, Certifications."],
            }
        )
    if not parsed.get("linkedin_url") or not parsed.get("github_url"):
        suggestions.append(
            {
                "priority": "medium",
                "category": "contact_links",
                "title": "Add professional profile links",
                "description": "Recruiters and ATS systems look for LinkedIn/GitHub links when validating project work.",
                "examples": ["LinkedIn: https://linkedin.com/in/your-name", "GitHub: https://github.com/your-handle"],
            }
        )
    if weak_bullets:
        suggestions.append(
            {
                "priority": "high",
                "category": "bullet_quality",
                "title": "Rewrite weak bullets with measurable outcomes",
                "description": "Several bullets lack numbers, impact, or strong action verbs.",
                "examples": [
                    "Built a React dashboard -> Built a React dashboard used by 50+ users, reducing manual tracking by 30%."
                ],
            }
        )
    top_role = role_compatibility[0] if role_compatibility else None
    if top_role and top_role["missing_keywords"]:
        suggestions.append(
            {
                "priority": "high",
                "category": "role_keywords",
                "title": f"Strengthen keywords for {top_role['role']}",
                "description": f"Add project evidence for: {', '.join(top_role['missing_keywords'][:6])}.",
                "examples": ["Mention the keyword only when you can support it with a project or certification."],
            }
        )
    if len(projects) < 3:
        suggestions.append(
            {
                "priority": "medium",
                "category": "project_evidence",
                "title": "Add more project proof",
                "description": "Include 3-4 focused projects with tech stack, problem, implementation, and result.",
                "examples": ["Project title | Tech stack | Problem solved | Result/metric | GitHub link"],
            }
        )
    if len(certifications) == 0:
        suggestions.append(
            {
                "priority": "low",
                "category": "certifications",
                "title": "Add relevant certifications",
                "description": "Certifications help validate skills when internship experience is limited.",
                "examples": ["AWS Cloud Practitioner, Google Data Analytics, Meta Front-End Developer"],
            }
        )
    return suggestions


def _extract_bullets(text: str) -> List[str]:
    bullets = []
    for line in text.splitlines():
        cleaned = re.sub(r"^[\s•*\-–—\d.)]+", "", line).strip()
        if _is_resume_metadata_line(cleaned):
            continue
        if 35 <= len(cleaned) <= 240 and re.search(r"[a-zA-Z]", cleaned):
            bullets.append(cleaned)
    return bullets[:40]


def _is_resume_metadata_line(line: str) -> bool:
    if not line:
        return True
    lowered = line.lower().strip()
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", lowered):
        return True
    if "linkedin.com" in lowered or "github.com" in lowered or "http" in lowered:
        return True
    if re.search(r"^\+?\d[\d\s().-]{8,}$", lowered):
        return True
    heading_like = {
        "skills",
        "technical skills",
        "tools",
        "tools & databases",
        "core concepts",
        "education",
        "projects",
        "certifications",
        "experience",
        "summary",
    }
    if re.sub(r"[^a-z &]+", "", lowered).strip() in heading_like:
        return True
    if ":" in line and len(line.split()) <= 10:
        return True
    if ":" in line and any(
        token in lowered
        for token in ("skills", "tools", "databases", "concepts", "languages", "frameworks")
    ):
        return True
    return False


def _role_compatibility(skills: List[str], selected_role: str) -> List[Dict[str, Any]]:
    skill_set = set(skills)
    role_keywords = dict(ROLE_KEYWORDS)
    if selected_role not in role_keywords:
        role_keywords[selected_role] = _custom_role_keywords(selected_role)
    roles = []
    for role, keywords in role_keywords.items():
        matched = sorted(keyword for keyword in keywords if keyword in skill_set)
        missing = sorted(keyword for keyword in keywords if keyword not in skill_set)
        score = round((len(matched) / len(keywords)) * 100, 2)
        roles.append(
            {
                "role": role,
                "score": score,
                "matched_keywords": matched,
                "missing_keywords": missing,
                "summary": f"{score:.0f}% compatible based on {len(matched)} of {len(keywords)} role keywords.",
            }
        )
    return sorted(roles, key=lambda item: item["score"], reverse=True)


def _resolve_target_role(target_role: Optional[str], skills: List[str]) -> str:
    cleaned = (target_role or "").strip()
    if cleaned:
        return cleaned[:80]
    ranked = _role_compatibility(skills, "Full Stack Developer")
    return ranked[0]["role"] if ranked else "Full Stack Developer"


def _custom_role_keywords(role: str) -> List[str]:
    normalized = role.lower()
    keywords = set()
    if "cloud" in normalized:
        keywords.update(["aws", "azure", "gcp", "docker", "kubernetes", "linux"])
    if "devops" in normalized:
        keywords.update(["docker", "kubernetes", "linux", "aws", "git", "automation"])
    if "cyber" in normalized or "security" in normalized:
        keywords.update(["linux", "python", "networking", "security", "sql"])
    if "ui" in normalized or "ux" in normalized or "design" in normalized:
        keywords.update(["figma", "html", "css", "javascript", "communication"])
    if "data" in normalized:
        keywords.update(["python", "sql", "data analytics", "pandas", "numpy", "power bi"])
    if "frontend" in normalized:
        keywords.update(ROLE_KEYWORDS["Frontend Developer"])
    if "backend" in normalized:
        keywords.update(ROLE_KEYWORDS["Backend Developer"])
    if "full" in normalized:
        keywords.update(ROLE_KEYWORDS["Full Stack Developer"])
    if "ai" in normalized or "ml" in normalized or "machine" in normalized:
        keywords.update(ROLE_KEYWORDS["AI/ML Intern"])
    return sorted(keywords or ["communication", "git", "sql", "python", "project experience"])


def _rewrite_bullets(weak_bullets: List[str], missing_keywords: List[str]) -> List[Dict[str, str]]:
    rewrites = []
    keyword_hint = ", ".join(missing_keywords[:2])
    for bullet in weak_bullets[:8]:
        original = bullet.strip()
        base = original.rstrip(" .")
        if _starts_with_action(base):
            rewritten = base
        else:
            sentence = base[0].lower() + base[1:] if base else base
            rewritten = f"Developed {sentence}"

        if keyword_hint:
            rewritten = f"{rewritten}, applying {keyword_hint}"
        if re.search(r"\b\d+(\.\d+)?%?\b", original):
            rewritten = f"{rewritten} and connecting the metric to a clear user or business outcome"
        else:
            rewritten = f"{rewritten} and quantifying impact with users, accuracy, latency, or efficiency metrics"
        rewritten = f"{rewritten}."
        rewrites.append(
            {
                "original": original,
                "rewritten": rewritten[:320],
                "reason": "Adds a stronger action verb, clearer scope, role keywords, and measurable impact.",
            }
        )
    return rewrites


def _leading_action(text: str) -> str:
    lowered = text.lower()
    if any(re.search(rf"\b{verb}\b", lowered) for verb in ACTION_VERBS):
        return "Strengthened"
    return "Developed"


def _starts_with_action(text: str) -> bool:
    first_word = re.sub(r"[^a-zA-Z]", "", text.split(" ", 1)[0]).lower() if text else ""
    return first_word in ACTION_VERBS


def _suggestions(
    parsed: Dict[str, Any],
    missing_sections: List[str],
    weak_bullets: List[str],
    target_role: Dict[str, Any],
    projects: List[str],
    certifications: List[str],
) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []
    if missing_sections:
        suggestions.append(
            {
                "priority": "high",
                "category": "section_completeness",
                "title": "Add missing ATS sections",
                "description": f"Add or clearly label these sections: {', '.join(missing_sections[:5])}.",
                "examples": ["Use clear headings like Skills, Projects, Education, Certifications."],
            }
        )
    if not parsed.get("linkedin_url") or not parsed.get("github_url"):
        suggestions.append(
            {
                "priority": "medium",
                "category": "contact_links",
                "title": "Add professional profile links",
                "description": "Recruiters and ATS systems look for LinkedIn/GitHub links when validating project work.",
                "examples": [
                    "LinkedIn: https://linkedin.com/in/your-name",
                    "GitHub: https://github.com/your-handle",
                ],
            }
        )
    if weak_bullets:
        suggestions.append(
            {
                "priority": "high",
                "category": "bullet_quality",
                "title": "Rewrite weak bullets with measurable outcomes",
                "description": "Some resume lines need clearer action, scope, tools, and outcomes.",
                "examples": [
                    "Built a dashboard -> Built a React dashboard used by 50+ users, reducing manual tracking by 30%."
                ],
            }
        )
    if target_role and target_role["missing_keywords"]:
        suggestions.append(
            {
                "priority": "high",
                "category": "role_keywords",
                "title": f"Strengthen keywords for {target_role['role']}",
                "description": f"Add evidence for: {', '.join(target_role['missing_keywords'][:6])}.",
                "examples": ["Mention a keyword only when you can support it with a project or certification."],
            }
        )
    if len(projects) < 3:
        suggestions.append(
            {
                "priority": "medium",
                "category": "project_evidence",
                "title": "Add more project proof",
                "description": "Include 3-4 focused projects with tech stack, problem, implementation, and result.",
                "examples": ["Project title | Tech stack | Problem solved | Result/metric | GitHub link"],
            }
        )
    if len(certifications) == 0:
        suggestions.append(
            {
                "priority": "low",
                "category": "certifications",
                "title": "Add relevant certifications",
                "description": "Certifications help validate skills when internship experience is limited.",
                "examples": ["AWS Cloud Practitioner, Google Data Analytics, Meta Front-End Developer"],
            }
        )
    return suggestions


def _extract_bullets(text: str) -> List[str]:
    bullets = []
    active_section = False
    saw_bullet_section = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        heading = re.sub(r"[^a-z ]+", "", line.lower()).strip()
        if heading in {"projects", "experience", "work experience", "internship", "internships"}:
            active_section = True
            saw_bullet_section = True
            continue
        if heading in {
            "summary",
            "profile",
            "education",
            "skills",
            "technical skills",
            "certifications",
            "certification",
            "achievements",
        }:
            active_section = False
            continue
        cleaned = re.sub(r"^[\s•*\-–—\d.)]+", "", line).strip()
        if _is_resume_metadata_line(cleaned):
            continue
        if active_section and 35 <= len(cleaned) <= 240 and re.search(r"[a-zA-Z]", cleaned):
            bullets.append(cleaned)

    if bullets or saw_bullet_section:
        return bullets[:40]

    for raw_line in text.splitlines():
        cleaned = re.sub(r"^[\s•*\-–—\d.)]+", "", raw_line).strip()
        if _is_resume_metadata_line(cleaned):
            continue
        if 35 <= len(cleaned) <= 240 and re.search(r"[a-zA-Z]", cleaned):
            bullets.append(cleaned)
    return bullets[:40]


def build_resume_optimizer_report(analysis: Dict[str, Any]) -> str:
    lines = [
        "Resume ATS Optimizer Report",
        "===========================",
        "",
        f"Resume: {analysis.get('filename')}",
        f"Name: {analysis.get('extracted_name')}",
        f"Email: {analysis.get('extracted_email') or 'Not found'}",
        f"Phone: {analysis.get('extracted_phone') or 'Not found'}",
        f"ATS score: {round(analysis.get('ats_score') or 0)}% ({analysis.get('ats_label')})",
        f"Selected role: {analysis.get('selected_role')}",
        f"Role compatibility: {round(analysis.get('target_role_score') or 0)}%",
        "",
        "Score Breakdown",
        "---------------",
    ]
    for item in analysis.get("score_breakdown") or []:
        lines.append(
            f"- {item.get('category')}: {round(item.get('score') or 0)} / {item.get('max_score')} - {item.get('summary')}"
        )
    lines.extend(["", "Missing Keywords", "----------------"])
    for keyword in analysis.get("target_role_missing_keywords") or analysis.get("missing_keywords") or []:
        lines.append(f"- {keyword}")
    lines.extend(["", "Rewrite Suggestions", "-------------------"])
    rewrites = analysis.get("bullet_rewrites") or []
    if rewrites:
        for item in rewrites:
            lines.extend(
                [
                    f"Original: {item.get('original')}",
                    f"Rewrite: {item.get('rewritten')}",
                    f"Why: {item.get('reason')}",
                    "",
                ]
            )
    else:
        lines.append("- No weak bullets detected.")
    lines.extend(["", "Improvement Suggestions", "-----------------------"])
    for item in analysis.get("suggestions") or []:
        lines.append(f"{str(item.get('priority')).upper()} - {item.get('title')}")
        lines.append(str(item.get("description") or ""))
        if item.get("examples"):
            lines.append(f"Example: {item['examples'][0]}")
        lines.append("")
    return "\n".join(lines)


def _ats_label(score: float) -> str:
    if score >= 85:
        return "excellent"
    if score >= 70:
        return "strong"
    if score >= 55:
        return "improving"
    return "needs work"
