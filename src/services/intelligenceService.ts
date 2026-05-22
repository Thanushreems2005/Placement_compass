import type { IntelligenceResponse } from "@/types/canonicalIntelligence.types";

// In development use the Vite proxy (relative path) so the browser avoids CORS.
const FASTAPI_BASE = typeof window !== "undefined" && window.location.port === "5173"
  ? "/api/v1"
  : `${window.location.origin}/api/v1`;

export class IntelligenceAPIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "IntelligenceAPIError";
  }
}

/**
 * Fetch all 163 intelligence parameters for a company from FastAPI.
 * Throws IntelligenceAPIError on non-2xx responses.
 */
export async function fetchIntelligence(companyName: string): Promise<IntelligenceResponse> {
  if (!companyName.trim()) throw new Error("Company name is required");

  const encoded = encodeURIComponent(companyName.trim());
  const url = `${FASTAPI_BASE}/companies/search/${encoded}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(120_000), // 2 min for live pipeline
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new IntelligenceAPIError(res.status, detail);
  }

  return res.json() as Promise<IntelligenceResponse>;
}

/** Health-check ping to the FastAPI server */
export async function pingFastAPI(): Promise<boolean> {
  try {
    const res = await fetch(`${FASTAPI_BASE.replace("/api/v1", "")}/`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
