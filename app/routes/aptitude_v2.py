"""
Aptitude router — minimal, Supabase-backed, no authentication.

Endpoints:
  POST /aptitude/attempt            → submit a new attempt
  GET  /aptitude/history/{sid}      → list past attempts for a student
  GET  /aptitude/dashboard/{sid}    → aggregated dashboard for a student
"""

from typing import List

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.aptitude_schema import (
    AptitudeAttemptCreate,
    AptitudeAttemptResponse,
    DashboardResponse,
)
from app.services import aptitude_service_v2 as aptitude_service

router = APIRouter(prefix="/aptitude", tags=["Aptitude"])

# ─── Default student (no auth) ────────────────────────────────────────────────

DEFAULT_STUDENT_ID = "student_demo_001"


# ─── POST /aptitude/attempt ───────────────────────────────────────────────────


@router.post(
    "/attempt",
    response_model=AptitudeAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new aptitude attempt",
)
def submit_attempt(payload: AptitudeAttemptCreate):
    """
    Submit a new aptitude attempt to Supabase.

    If `student_id` is not supplied in the request body, it defaults to
    `student_demo_001` (temporary hardcoded student — no auth required).
    """
    try:
        return aptitude_service.create_attempt(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit attempt: {exc}",
        )


# ─── GET /aptitude/history/{student_id} ──────────────────────────────────────


@router.get(
    "/history/{student_id}",
    response_model=List[AptitudeAttemptResponse],
    summary="Get aptitude history for a student",
)
def get_history(
    student_id: str,
    limit: int = Query(default=50, ge=1, le=200, description="Max records to return"),
):
    """
    Return the most recent aptitude attempts for `student_id`, newest first.

    Use `student_id=student_demo_001` to test without authentication.
    """
    try:
        return aptitude_service.get_history(student_id, limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch history: {exc}",
        )


# ─── GET /aptitude/dashboard/{student_id} ────────────────────────────────────


@router.get(
    "/dashboard/{student_id}",
    response_model=DashboardResponse,
    summary="Get aggregated dashboard for a student",
)
def get_dashboard(student_id: str):
    """
    Return the aggregated aptitude dashboard for `student_id`.

    Dashboard includes:
    - **readiness_score** — average accuracy across all attempts
    - **xp**             — total cumulative score
    - **streak**         — consecutive practice days (counting back from today)
    - **weak_topics**    — topics with avg accuracy < 60 %
    - **strong_topics**  — topics with avg accuracy > 80 %
    - **topic_breakdown** — per-topic summary
    - **recent_attempts** — last 10 attempts

    Use `student_id=student_demo_001` to test without authentication.
    """
    try:
        return aptitude_service.get_dashboard(student_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard: {exc}",
        )
