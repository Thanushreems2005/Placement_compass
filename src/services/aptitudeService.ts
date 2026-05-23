import type {
  DashboardResponse,
  AptitudeAttemptCreate,
  AptitudeAttemptResponse,
  OverallAnalyticsResponse,
  ReadinessScoreResponse,
  RoadmapRequest,
  LearningRoadmapResponse,
} from "@/types/aptitude";
import { normalizeDashboard } from "@/lib/aptitude-analytics";

const FASTAPI_BASE = typeof window !== "undefined" && window.location.port === "5173"
  ? "/api/v1"
  : `${window.location.origin}/api/v1`;

export class AptitudeAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AptitudeAPIError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new AptitudeAPIError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch aptitude tracker dashboard data for a student.
 */
export async function fetchAptitudeDashboard(studentId: string): Promise<DashboardResponse> {
  const url = `${FASTAPI_BASE}/aptitude/dashboard/${encodeURIComponent(studentId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await handleResponse<DashboardResponse>(res);
  return normalizeDashboard(data);
}

/**
 * Submit a new aptitude test attempt.
 */
export async function submitAptitudeAttempt(data: AptitudeAttemptCreate): Promise<AptitudeAttemptResponse> {
  const url = `${FASTAPI_BASE}/aptitude/attempt`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<AptitudeAttemptResponse>(res);
}

/**
 * Fetch detailed topic analytics for a student.
 */
export async function fetchAptitudeAnalytics(studentId: string): Promise<OverallAnalyticsResponse> {
  const url = `${FASTAPI_BASE}/aptitude/analytics/${encodeURIComponent(studentId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return handleResponse<OverallAnalyticsResponse>(res);
}

/**
 * Fetch readiness score details for a student.
 */
export async function fetchAptitudeReadiness(studentId: string): Promise<ReadinessScoreResponse> {
  const url = `${FASTAPI_BASE}/aptitude/readiness/${encodeURIComponent(studentId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return handleResponse<ReadinessScoreResponse>(res);
}

/**
 * Generate or update AI learning roadmap for a student.
 */
export async function generateAptitudeRoadmap(
  studentId: string,
  data: RoadmapRequest
): Promise<LearningRoadmapResponse> {
  const url = `${FASTAPI_BASE}/aptitude/roadmap/${encodeURIComponent(studentId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<LearningRoadmapResponse>(res);
}
