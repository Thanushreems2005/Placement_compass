export interface CareerTokenResponse {
  access_token: string;
  token_type: string;
}

export interface ProfileAnalysis {
  full_name: string;
  email: string | null;
  phone: string | null;
  roll_number: string | null;
  department: string | null;
  graduation_year: number | null;
  cgpa: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  student_id: number;
  profile_strength_score: number;
  skill_count: number;
  project_count: number;
  internship_count: number;
  certification_count: number;
  resume_uploaded: boolean;
  strengths: string[];
  risks: string[];
  normalized_skills: string[];
  active_resume_filename: string | null;
  resume_text_char_count: number;
}

export interface CompanyEligibilityMatch {
  company_id: number | null;
  company_name: string;
  readiness_score: number;
  readiness_label: string;
  eligible: boolean;
  matched_skills: string[];
  missing_skills: string[];
  summary: string;
}

export interface CompanyEligibilityResponse {
  student_id: number;
  matches: CompanyEligibilityMatch[];
}

export interface SkillGapResponse {
  company_id: number | null;
  company_name: string | null;
  required_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  project_gaps: string[];
  summary: string;
}

export interface RoadmapItem {
  week: number;
  title: string;
  description: string;
  target_skills: string[];
  priority: string;
}

export interface RoadmapResponse {
  company_id: number | null;
  company_name: string | null;
  readiness_score: number;
  roadmap: RoadmapItem[];
}

export interface ReadinessReportResponse {
  id: number;
  student_id: number;
  company_id: number | null;
  company_name: string | null;
  readiness_score: number;
  readiness_label: string;
  eligible: boolean;
  matched_skills: string[];
  missing_skills: string[];
  evidence: Record<string, unknown>;
  recommendations: Array<{
    priority: string;
    category: string;
    title: string;
    description: string;
    target_skills: string[];
  }>;
  roadmap: RoadmapItem[];
  generated_at: string;
}

export interface ResumeUploadResponse {
  id: number;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface ResumeFirstAnalysisResponse {
  access_token: string;
  token_type: string;
  upload: ResumeUploadResponse;
  profile: ProfileAnalysis;
  matches: CompanyEligibilityMatch[];
}

const FASTAPI_BASE =
  typeof window !== "undefined" && window.location.port === "5173"
    ? "http://127.0.0.1:8000/api/v1"
    : `${window.location.origin}/api/v1`;

export class CareerAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CareerAPIError";
  }
}

async function requestJson<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${FASTAPI_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? body.errors ?? detail;
    } catch {
      // keep fallback detail
    }
    throw new CareerAPIError(res.status, String(detail));
  }

  return res.json() as Promise<T>;
}

export async function loginCareerUser(
  email: string,
  password: string,
): Promise<CareerTokenResponse> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const res = await fetch(`${FASTAPI_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!res.ok) {
    throw new CareerAPIError(res.status, "Could not sign in with those credentials.");
  }

  return res.json() as Promise<CareerTokenResponse>;
}

export function fetchProfileAnalysis(token: string) {
  return requestJson<ProfileAnalysis>("/career/profile-analysis", token);
}

export function fetchCompanyMatches(token: string, limit = 24) {
  return requestJson<CompanyEligibilityResponse>(`/career/company-matches?limit=${limit}`, token);
}

export function fetchSkillGap(token: string, companyName: string) {
  return requestJson<SkillGapResponse>(
    `/career/skill-gap?company_name=${encodeURIComponent(companyName)}`,
    token,
  );
}

export function fetchRoadmap(token: string, companyName: string) {
  return requestJson<RoadmapResponse>(
    `/career/roadmap?company_name=${encodeURIComponent(companyName)}`,
    token,
  );
}

export function generateReadinessReport(token: string, companyName: string) {
  return requestJson<ReadinessReportResponse>(
    `/career/readiness?company_name=${encodeURIComponent(companyName)}`,
    token,
    { method: "POST" },
  );
}

export async function uploadResume(token: string, file: File) {
  const form = new FormData();
  form.set("file", file);
  return requestJson<ResumeUploadResponse>("/career/resume", token, {
    method: "POST",
    body: form,
  });
}

export async function analyzeResumeFirst(file: File) {
  const form = new FormData();
  form.set("file", file);

  const res = await fetch(`${FASTAPI_BASE}/career/resume-first/analyze`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? body.errors ?? detail;
    } catch {
      // keep fallback detail
    }
    throw new CareerAPIError(res.status, String(detail));
  }

  return res.json() as Promise<ResumeFirstAnalysisResponse>;
}
