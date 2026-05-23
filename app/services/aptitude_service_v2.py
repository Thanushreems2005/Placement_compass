"""
Aptitude service — reads/writes directly to Supabase aptitude_attempts table.

No SQLAlchemy.  No Redis.  No LangGraph.  No authentication.
Dashboard calculations are performed in Python from the raw Supabase rows.
"""

import logging
import os
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from app.schemas.aptitude_schema import (
    AptitudeAttemptCreate,
    AptitudeAttemptResponse,
    DashboardResponse,
    TopicSummary,
)

logger = logging.getLogger(__name__)

# ─── Thresholds ───────────────────────────────────────────────────────────────

WEAK_THRESHOLD = 60    # accuracy < 60  → weak topic
STRONG_THRESHOLD = 80  # accuracy > 80  → strong topic


# ─── Supabase client (lazy singleton) ────────────────────────────────────────

def _get_supabase_client() -> Client:
    """Build a Supabase client from environment variables already used by the project."""
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Supabase credentials missing. "
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in your .env file."
        )
    return create_client(url, key)


_supabase_client: Optional[Client] = None


def _client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = _get_supabase_client()
    return _supabase_client


# ─── Table name ───────────────────────────────────────────────────────────────

TABLE = "aptitude_attempts"


# ─── Public service functions ─────────────────────────────────────────────────


def create_attempt(data: AptitudeAttemptCreate) -> AptitudeAttemptResponse:
    """Insert a new aptitude attempt row and return it."""
    # Calculate derived fields
    accuracy = round((data.correct_answers / data.total_questions) * 100)
    # score = accuracy percentage (displayed as score/100, e.g. 75/100)
    score = accuracy
    # avg_speed = questions per minute (higher = faster)
    if data.total_time_seconds and data.total_time_seconds > 0:
        total_minutes = data.total_time_seconds / 60.0
        avg_speed = round(data.total_questions / total_minutes, 1)  # q/min
        speed = round(avg_speed)
        average_solving_time = data.total_time_seconds
    else:
        avg_speed = None
        speed = None
        average_solving_time = None

    payload: Dict[str, Any] = {
        "student_id": data.student_id,
        "topic": data.topic,
        "total_questions": data.total_questions,
        "correct_answers": data.correct_answers,
        "wrong_answers": data.wrong_answers,
        "skipped_questions": data.skipped_questions or 0,
        "accuracy": accuracy,
        "score": score,
        "difficulty": data.difficulty or "Medium",
    }

    if data.subtopic is not None:
        payload["subtopic"] = data.subtopic
    if data.total_time_seconds is not None:
        payload["total_time_seconds"] = data.total_time_seconds
        payload["avg_speed"] = avg_speed
        payload["speed"] = speed
        payload["average_solving_time"] = average_solving_time

    try:
        response = _client().table(TABLE).insert(payload).execute()
        if not response.data:
            raise RuntimeError("Supabase insert returned no data.")
        row = response.data[0]
        logger.info("Inserted aptitude attempt id=%s for student=%s", row.get("id"), data.student_id)
        return _row_to_response(row)
    except Exception as exc:
        logger.error("create_attempt failed: %s", exc)
        raise


def get_history(student_id: str, limit: int = 50) -> List[AptitudeAttemptResponse]:
    """Return the most recent attempts for a student, newest first."""
    try:
        response = (
            _client()
            .table(TABLE)
            .select("*")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [_row_to_response(r) for r in (response.data or [])]
    except Exception as exc:
        logger.error("get_history failed for student=%s: %s", student_id, exc)
        raise


def get_dashboard(student_id: str) -> DashboardResponse:
    """
    Compute the student dashboard from all historical attempts.

    Calculations:
    - readiness_score = average accuracy across all attempts
    - weak_topics     = topics where avg accuracy < 60
    - strong_topics   = topics where avg accuracy > 80
    - xp              = sum of all scores
    - streak          = consecutive calendar days with at least one attempt (counting back from today)
    - topic_breakdown = per-topic aggregated stats
    - recent_attempts = last 10 attempts
    """
    try:
        response = (
            _client()
            .table(TABLE)
            .select("*")
            .eq("student_id", student_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        logger.error("get_dashboard failed for student=%s: %s", student_id, exc)
        # Return empty dashboard instead of crashing
        logger.warning("Returning empty dashboard for student=%s (Supabase unavailable)", student_id)
        return DashboardResponse(
            student_id=student_id,
            readiness_score=0.0,
            xp=0,
            streak=0,
            total_tests=0,
            weak_areas=[],
            strong_areas=[],
            topic_breakdown=[],
            recent_attempts=[],
            ai_insight="Supabase connection unavailable. Using demo mode.",
        )

    rows = response.data or []

    if not rows:
        return DashboardResponse(
            student_id=student_id,
            readiness_score=0.0,
            xp=0,
            streak=0,
            total_tests=0,
            weak_areas=[],
            strong_areas=[],
            topic_breakdown=[],
            recent_attempts=[],
            ai_insight="Start your first aptitude test to see your personalized insights!",
        )

    # ── Aggregate by topic ──────────────────────────────────────────────────
    topic_accuracy: Dict[str, List[int]] = defaultdict(list)
    topic_scores: Dict[str, List[int]] = defaultdict(list)

    all_accuracies: List[int] = []
    total_xp: int = 0
    practice_dates: List[date] = []

    for row in rows:
        topic = row.get("topic") or "Unknown"
        acc = row.get("accuracy")
        score = row.get("score")
        created_at = row.get("created_at")

        if acc is not None:
            topic_accuracy[topic].append(int(acc))
            all_accuracies.append(int(acc))
        if score is not None:
            topic_scores[topic].append(int(score))
            total_xp += int(score)
        if created_at:
            practice_dates.append(_parse_date(created_at))

    # ── Readiness score ─────────────────────────────────────────────────────
    readiness_score = (
        round(sum(all_accuracies) / len(all_accuracies), 2) if all_accuracies else 0.0
    )

    # ── Streak (consecutive calendar days, counting back from today) ────────
    streak = _compute_streak(practice_dates)

    # ── Topic breakdown ─────────────────────────────────────────────────────
    topic_breakdown: List[TopicSummary] = []
    weak_areas: List[str] = []
    strong_areas: List[str] = []

    for topic, accs in topic_accuracy.items():
        avg_acc = round(sum(accs) / len(accs), 2)
        scores = topic_scores.get(topic, [])
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
        is_weak = avg_acc < WEAK_THRESHOLD
        is_strong = avg_acc > STRONG_THRESHOLD

        topic_breakdown.append(
            TopicSummary(
                topic=topic,
                avg_accuracy=avg_acc,
                avg_score=avg_score,
                attempts=len(accs),
                is_weak=is_weak,
                is_strong=is_strong,
            )
        )
        if is_weak:
            weak_areas.append(topic)
        if is_strong:
            strong_areas.append(topic)

    # Sort breakdown by accuracy ascending (weakest first)
    topic_breakdown.sort(key=lambda t: t.avg_accuracy)

    # ── Recent attempts (already ordered desc) ──────────────────────────────
    recent_attempts = [_row_to_response(r) for r in rows[:10]]

    # ── Generate AI insight ────────────────────────────────────────────────
    if weak_areas:
        ai_insight = f"Focus on improving {', '.join(weak_areas[:2])}. Keep practicing your strong areas: {', '.join(strong_areas) if strong_areas else 'all topics'}!"
    elif strong_areas:
        ai_insight = f"Great job! You're excelling in {', '.join(strong_areas)}. Keep it up!"
    else:
        ai_insight = "Keep practicing to improve your performance!"

    return DashboardResponse(
        student_id=student_id,
        readiness_score=readiness_score,
        xp=total_xp,
        streak=streak,
        total_tests=len(rows),
        weak_areas=weak_areas,
        strong_areas=strong_areas,
        topic_breakdown=topic_breakdown,
        recent_attempts=recent_attempts,
        ai_insight=ai_insight,
    )


# ─── Internal helpers ─────────────────────────────────────────────────────────


def _row_to_response(row: Dict[str, Any]) -> AptitudeAttemptResponse:
    """Convert a raw Supabase dict row to the Pydantic response model."""
    return AptitudeAttemptResponse(
        id=str(row.get("id", "")),
        student_id=row.get("student_id", ""),
        topic=row.get("topic", ""),
        subtopic=row.get("subtopic"),
        total_questions=row.get("total_questions"),
        correct_answers=row.get("correct_answers"),
        wrong_answers=row.get("wrong_answers"),
        skipped_questions=row.get("skipped_questions"),
        total_time_seconds=row.get("total_time_seconds"),
        accuracy=row.get("accuracy"),
        score=row.get("score"),
        avg_speed=row.get("avg_speed"),
        speed=row.get("speed"),
        average_solving_time=row.get("average_solving_time"),
        difficulty=row.get("difficulty"),
        created_at=_parse_datetime(row.get("created_at")),
    )


def _parse_datetime(value: Any) -> Optional[datetime]:
    """Parse ISO datetime strings returned by Supabase."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        # Supabase returns strings like "2024-05-23T10:30:00+00:00"
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def _parse_date(value: Any) -> Optional[date]:
    dt = _parse_datetime(value)
    return dt.date() if dt else None


def _compute_streak(dates: List[Optional[date]]) -> int:
    """
    Count consecutive calendar days (back from today) that have at least one attempt.
    """
    unique_dates = sorted({d for d in dates if d is not None}, reverse=True)
    if not unique_dates:
        return 0

    today = date.today()
    streak = 0
    expected = today

    for d in unique_dates:
        if d == expected:
            streak += 1
            expected = expected - timedelta(days=1)
        elif d < expected:
            # Gap found — check if the most recent activity was yesterday or today
            if streak == 0:
                # Student hasn't practiced today or yesterday — streak is 0
                break
            break

    return streak
