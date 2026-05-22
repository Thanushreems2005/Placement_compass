export interface ResumeScoreBreakdown {
  category: string;
  score: number;
  max_score: number;
  summary: string;
}

export interface ResumeRoleCompatibility {
  role: string;
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
}

export interface ResumeImprovementSuggestion {
  priority: string;
  category: string;
  title: string;
  description: string;
  examples: string[];
}

export interface ResumeBulletRewrite {
  original: string;
  rewritten: string;
  reason: string;
}

export interface ResumeOptimizerAnalysis {
  filename: string;
  extracted_name: string;
  extracted_email: string | null;
  extracted_phone: string | null;
  ats_score: number;
  ats_label: string;
  selected_role: string;
  target_role_score: number;
  target_role_matched_keywords: string[];
  target_role_missing_keywords: string[];
  parsed_sections: string[];
  missing_sections: string[];
  extracted_skills: string[];
  extracted_projects: string[];
  extracted_certifications: string[];
  detected_links: string[];
  keyword_density: Record<string, number>;
  score_breakdown: ResumeScoreBreakdown[];
  role_compatibility: ResumeRoleCompatibility[];
  missing_keywords: string[];
  weak_bullets: string[];
  strong_bullets: string[];
  bullet_rewrites: ResumeBulletRewrite[];
  suggestions: ResumeImprovementSuggestion[];
  text_char_count: number;
}

const FASTAPI_BASE =
  typeof window !== "undefined" && window.location.port === "5173"
    ? "http://127.0.0.1:8000/api/v1"
    : `${window.location.origin}/api/v1`;

export class ResumeOptimizerAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ResumeOptimizerAPIError";
  }
}

export async function analyzeResumeForATS(file: File, targetRole?: string | null) {
  const form = new FormData();
  form.set("file", file);
  const query = targetRole?.trim() ? `?target_role=${encodeURIComponent(targetRole.trim())}` : "";

  const res = await fetch(`${FASTAPI_BASE}/career/resume-optimizer/analyze${query}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      // keep fallback
    }
    throw new ResumeOptimizerAPIError(res.status, String(detail));
  }

  return res.json() as Promise<ResumeOptimizerAnalysis>;
}

export async function downloadResumeOptimizerReport(analysis: ResumeOptimizerAnalysis) {
  const res = await fetch(`${FASTAPI_BASE}/career/resume-optimizer/report`, {
    method: "POST",
    headers: {
      Accept: "text/plain",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ analysis }),
  });

  if (!res.ok) {
    throw new ResumeOptimizerAPIError(res.status, `Report download failed with HTTP ${res.status}`);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  return {
    blob: await res.blob(),
    filename: filenameMatch?.[1] ?? "resume-ats-report.txt",
  };
}
