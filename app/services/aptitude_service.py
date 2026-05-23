import logging
import math
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.aptitude import (
    AptitudeAttempt, TopicProgress, LearningRoadmap,
    RecommendationHistory, ReadinessScore,
)
from app.schemas.aptitude import (
    AptitudeAttemptCreate,
    AptitudeAttemptResponse,
    TopicAnalytics,
    OverallAnalyticsResponse,
    DashboardResponse,
)

logger = logging.getLogger(__name__)

TOPIC_WEIGHTS: Dict[str, str] = {
    "Quantitative Aptitude": "quantitative_score",
    "Logical Reasoning": "logical_score",
    "Verbal Ability": "verbal_score",
    "Data Interpretation": "data_interpretation_score",
    "Puzzles": "puzzles_score",
}
WEAK_THRESHOLD = 55.0
STRONG_THRESHOLD = 80.0
ACCURACY_WEAK_THRESHOLD = 60.0
SPEED_SLOW_THRESHOLD = 45.0


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(number) or math.isinf(number):
        return default
    return number


def _safe_int(value: Any, default: int = 0) -> int:
    return int(_safe_float(value, float(default)))


def _normalize_topic_analytics(topic: TopicAnalytics) -> TopicAnalytics:
    total_attempts = _safe_int(topic.total_attempts)
    mastery = _safe_float(topic.mastery_score)
    accuracy = _safe_float(topic.average_accuracy)
    speed = _safe_float(topic.average_speed)
    readiness = _safe_float(topic.readiness_percentage)
    trend = _safe_float(topic.improvement_trend)

    if total_attempts <= 0:
        mastery = 0.0
        accuracy = 0.0
        speed = 0.0
        readiness = 0.0
        trend = 0.0
        is_weak = False
        is_strong = False
    else:
        is_weak = accuracy < ACCURACY_WEAK_THRESHOLD
        is_strong = accuracy >= STRONG_THRESHOLD

    return TopicAnalytics(
        topic=topic.topic,
        mastery_score=round(mastery, 2),
        average_accuracy=round(accuracy, 2),
        average_speed=round(speed, 2),
        total_attempts=total_attempts,
        improvement_trend=round(trend, 2),
        readiness_percentage=round(readiness, 2),
        is_weak=is_weak,
        is_strong=is_strong,
    )


def _build_topic_analytics(db: Session, student_id: str) -> List[TopicAnalytics]:
    progresses = {p.topic: p for p in get_topic_progress_all(db, student_id)}
    attempt_rows = (
        db.query(AptitudeAttempt)
        .filter(AptitudeAttempt.student_id == student_id)
        .all()
    )
    attempts_by_topic: Dict[str, List[AptitudeAttempt]] = defaultdict(list)
    for row in attempt_rows:
        attempts_by_topic[row.topic].append(row)

    analytics: List[TopicAnalytics] = []
    for topic in TOPIC_WEIGHTS:
        progress = progresses.get(topic)
        attempts = attempts_by_topic.get(topic, [])
        total_attempts = len(attempts) if attempts else _safe_int(progress.total_attempts if progress else 0)

        if attempts:
            average_accuracy = sum(_safe_float(a.accuracy) for a in attempts) / len(attempts)
            speeds = [_safe_float(a.average_solving_time) for a in attempts if a.average_solving_time is not None]
            average_speed = sum(speeds) / len(speeds) if speeds else 0.0
        elif progress:
            average_accuracy = _safe_float(progress.average_accuracy)
            average_speed = _safe_float(progress.average_speed)
        else:
            average_accuracy = 0.0
            average_speed = 0.0

        if progress and total_attempts > 0:
            mastery_score = _safe_float(progress.mastery_score)
            readiness_percentage = _safe_float(progress.readiness_percentage)
            improvement_trend = _safe_float(progress.improvement_trend)
        elif total_attempts > 0:
            speed_bonus = max(0.0, (60.0 - average_speed) / 60.0) * 10.0 if average_speed > 0 else 0.0
            mastery_score = min(100.0, average_accuracy + speed_bonus)
            readiness_percentage = min(
                100.0,
                mastery_score * 0.7 + min(100.0, total_attempts * 2.0) * 0.3,
            )
            improvement_trend = 0.0
        else:
            mastery_score = 0.0
            readiness_percentage = 0.0
            improvement_trend = 0.0

        analytics.append(
            _normalize_topic_analytics(
                TopicAnalytics(
                    topic=topic,
                    mastery_score=mastery_score,
                    average_accuracy=average_accuracy,
                    average_speed=average_speed,
                    total_attempts=total_attempts,
                    improvement_trend=improvement_trend,
                    readiness_percentage=readiness_percentage,
                    is_weak=False,
                    is_strong=False,
                )
            )
        )

    return analytics


def to_attempt_response(attempt: AptitudeAttempt) -> AptitudeAttemptResponse:
    difficulty = attempt.difficulty_level or "Medium"
    speed = _safe_float(attempt.average_solving_time, 0.0) or None
    created_at = attempt.created_at or attempt.test_date
    test_date = attempt.test_date or created_at
    return AptitudeAttemptResponse(
        id=attempt.id,
        student_id=attempt.student_id,
        topic=attempt.topic,
        subtopic=attempt.subtopic,
        score=_safe_float(attempt.score),
        accuracy=_safe_float(attempt.accuracy),
        speed=speed,
        difficulty=difficulty,
        created_at=created_at,
        max_score=_safe_float(attempt.max_score, 100.0),
        questions_attempted=_safe_int(attempt.questions_attempted, 1),
        correct_answers=_safe_int(attempt.correct_answers),
        wrong_answers=_safe_int(attempt.wrong_answers),
        average_solving_time=speed,
        difficulty_level=difficulty,
        test_date=test_date,
    )


def create_attempt(db: Session, data: AptitudeAttemptCreate) -> AptitudeAttemptResponse:
    payload = data.model_dump(exclude={"speed", "difficulty"}, exclude_none=True)
    attempt = AptitudeAttempt(**payload)
    db.add(attempt)
    db.flush()
    _update_topic_progress(db, data)
    _recalculate_readiness(db, data.student_id)
    db.commit()
    db.refresh(attempt)
    logger.info(f"Attempt {attempt.id} created for student {data.student_id}")
    return to_attempt_response(attempt)


def get_attempts(db: Session, student_id: str, limit: int = 50) -> List[AptitudeAttemptResponse]:
    rows = (
        db.query(AptitudeAttempt)
        .filter(AptitudeAttempt.student_id == student_id)
        .order_by(desc(AptitudeAttempt.test_date))
        .limit(limit)
        .all()
    )
    return [to_attempt_response(row) for row in rows]


def get_topic_progress_all(db: Session, student_id: str) -> List[TopicProgress]:
    return db.query(TopicProgress).filter(TopicProgress.student_id == student_id).all()


def get_overall_analytics(db: Session, student_id: str) -> OverallAnalyticsResponse:
    topic_analytics = _build_topic_analytics(db, student_id)
    attempts = get_attempts(db, student_id, limit=200)
    weak = [t.topic for t in topic_analytics if t.is_weak]
    strong = [t.topic for t in topic_analytics if t.is_strong]

    readiness_rec = db.query(ReadinessScore).filter(
        ReadinessScore.student_id == student_id
    ).order_by(desc(ReadinessScore.updated_at)).first()

    if attempts:
        overall_accuracy = round(
            sum(_safe_float(a.accuracy) for a in attempts) / len(attempts), 2
        )
        speeds = [
            _safe_float(a.average_solving_time)
            for a in attempts
            if a.average_solving_time is not None
        ]
        overall_speed = round(sum(speeds) / len(speeds), 2) if speeds else 0.0
    else:
        overall_accuracy = 0.0
        overall_speed = 0.0

    return OverallAnalyticsResponse(
        student_id=student_id,
        total_attempts=len(attempts),
        overall_accuracy=overall_accuracy,
        overall_speed=overall_speed,
        overall_readiness=_safe_float(readiness_rec.overall_score if readiness_rec else 0.0),
        topics=topic_analytics,
        weak_areas=weak,
        strong_areas=strong,
        streak_days=_safe_int(readiness_rec.current_streak if readiness_rec else 0),
        xp_points=_safe_int(readiness_rec.xp_points if readiness_rec else 0),
        badges=readiness_rec.badges if readiness_rec else [],
        last_updated=datetime.utcnow(),
    )


def get_readiness_score(db: Session, student_id: str) -> Optional[ReadinessScore]:
    return (
        db.query(ReadinessScore)
        .filter(ReadinessScore.student_id == student_id)
        .order_by(desc(ReadinessScore.updated_at))
        .first()
    )


def get_dashboard_data(db: Session, student_id: str) -> DashboardResponse:
    analytics = get_overall_analytics(db, student_id)
    recent = get_attempts(db, student_id, limit=10)
    readiness = get_readiness_score(db, student_id)
    trend = _build_improvement_trend(db, student_id)

    readiness_score = _safe_float(
        readiness.overall_score if readiness else analytics.overall_readiness
    )

    return DashboardResponse(
        student_id=student_id,
        readiness_score=readiness_score,
        xp=_safe_int(analytics.xp_points),
        streak=_safe_int(analytics.streak_days),
        total_tests=_safe_int(analytics.total_attempts),
        weak_areas=analytics.weak_areas,
        strong_areas=analytics.strong_areas,
        topic_breakdown=analytics.topics,
        recent_attempts=recent,
        ai_insight=_generate_coach_insight(analytics),
        improvement_trend=trend,
    )


def create_or_update_roadmap(
    db: Session, student_id: str, target_companies: List[str],
    target_readiness: float, hours_per_day: float
) -> LearningRoadmap:
    analytics = get_overall_analytics(db, student_id)
    all_topics = [t.topic for t in sorted(analytics.topics, key=lambda x: x.mastery_score)]
    weekly_goals = _generate_weekly_goals(all_topics, hours_per_day, target_readiness)
    daily_targets = _generate_daily_targets(analytics.weak_areas, hours_per_day)

    roadmap_data = {
        "target_companies": target_companies,
        "target_readiness": target_readiness,
        "hours_per_day": hours_per_day,
        "analytics_snapshot": {
            "overall_readiness": analytics.overall_readiness,
            "weak_areas": analytics.weak_areas,
            "strong_areas": analytics.strong_areas,
        },
    }

    existing = db.query(LearningRoadmap).filter(
        LearningRoadmap.student_id == student_id,
        LearningRoadmap.is_active == True
    ).first()

    if existing:
        existing.roadmap_data = roadmap_data
        existing.recommended_topics = all_topics
        existing.weekly_goals = weekly_goals
        existing.daily_targets = daily_targets
        existing.focus_areas = analytics.weak_areas
        existing.generated_at = datetime.utcnow()
        existing.target_readiness = target_readiness
        db.commit()
        db.refresh(existing)
        return existing

    roadmap = LearningRoadmap(
        student_id=student_id, roadmap_data=roadmap_data,
        recommended_topics=all_topics, weekly_goals=weekly_goals,
        daily_targets=daily_targets, focus_areas=analytics.weak_areas,
        target_readiness=target_readiness,
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    return roadmap


# ─── Internal Helpers ─────────────────────────────────────────────────────────

def _update_topic_progress(db: Session, data: AptitudeAttemptCreate) -> None:
    progress = db.query(TopicProgress).filter(
        TopicProgress.student_id == data.student_id,
        TopicProgress.topic == data.topic,
    ).first()

    if not progress:
        progress = TopicProgress(student_id=data.student_id, topic=data.topic)
        db.add(progress)

    n = _safe_int(progress.total_attempts)
    prev_accuracy = _safe_float(progress.average_accuracy)
    progress.average_accuracy = round((prev_accuracy * n + _safe_float(data.accuracy)) / (n + 1), 2)
    if data.average_solving_time is not None:
        prev_speed = _safe_float(progress.average_speed)
        progress.average_speed = round(
            (prev_speed * n + _safe_float(data.average_solving_time)) / (n + 1), 2
        )
    progress.total_attempts += 1
    progress.total_questions += data.questions_attempted

    speed_bonus = max(0, (60 - (data.average_solving_time or 60)) / 60) * 10
    progress.mastery_score = round(min(100.0, progress.average_accuracy + speed_bonus), 2)

    recent = (
        db.query(AptitudeAttempt)
        .filter(AptitudeAttempt.student_id == data.student_id, AptitudeAttempt.topic == data.topic)
        .order_by(desc(AptitudeAttempt.test_date)).limit(10).all()
    )
    if len(recent) >= 4:
        old_avg = sum(a.accuracy for a in recent[5:]) / max(1, len(recent[5:]))
        new_avg = sum(a.accuracy for a in recent[:5]) / max(1, len(recent[:5]))
        progress.improvement_trend = round(new_avg - old_avg, 2)

    progress.readiness_percentage = round(
        min(100.0, (progress.mastery_score * 0.7 + min(100, progress.total_attempts * 2) * 0.3)), 2
    )
    progress.last_practiced = datetime.utcnow()
    progress.streak_days = _compute_streak(db, data.student_id, data.topic)


def _recalculate_readiness(db: Session, student_id: str) -> None:
    progresses = db.query(TopicProgress).filter(TopicProgress.student_id == student_id).all()
    topic_map = {p.topic: p for p in progresses}

    scores = {}
    for topic, field in TOPIC_WEIGHTS.items():
        p = topic_map.get(topic)
        scores[field] = round(p.mastery_score, 2) if p else 0.0

    filled = [v for v in scores.values() if v > 0]
    overall = round(sum(filled) / max(1, len(filled)), 2)
    confidence = "Low" if overall < 50 else ("Medium" if overall < 75 else "High")
    total_attempts = sum(p.total_attempts for p in progresses)
    xp = min(10000, total_attempts * 50)
    badges = _compute_badges(total_attempts, overall)
    streak = max((p.streak_days for p in progresses), default=0)

    rec = db.query(ReadinessScore).filter(ReadinessScore.student_id == student_id).first()
    if rec:
        velocity = round(overall - rec.overall_score, 2)
        rec.overall_score = overall
        rec.confidence_level = confidence
        rec.improvement_velocity = velocity
        rec.xp_points = xp
        rec.badges = badges
        rec.current_streak = streak
        for k, v in scores.items():
            setattr(rec, k, v)
    else:
        rec = ReadinessScore(
            student_id=student_id, overall_score=overall,
            confidence_level=confidence, xp_points=xp,
            badges=badges, current_streak=streak, **scores,
        )
        db.add(rec)


def _compute_streak(db: Session, student_id: str, topic: str) -> int:
    dates = (
        db.query(func.date(AptitudeAttempt.test_date))
        .filter(AptitudeAttempt.student_id == student_id, AptitudeAttempt.topic == topic)
        .distinct().order_by(desc(func.date(AptitudeAttempt.test_date))).limit(30).all()
    )
    if not dates:
        return 0
    streak = 1
    for i in range(1, len(dates)):
        try:
            diff = (dates[i - 1][0] - dates[i][0]).days
            if diff == 1:
                streak += 1
            else:
                break
        except Exception:
            break
    return streak


def _compute_badges(total: int, accuracy: float) -> List[str]:
    badges = []
    if total >= 1:  badges.append("First Step")
    if total >= 5:  badges.append("On a Roll")
    if total >= 10: badges.append("Dedicated")
    if total >= 25: badges.append("Consistent Learner")
    if total >= 50: badges.append("Marathon Runner")
    if accuracy >= 90: badges.append("Accuracy Ace")
    if accuracy >= 80: badges.append("Sharp Mind")
    return badges


def _generate_weekly_goals(topics: List[str], hours: float, target: float) -> List[Dict]:
    weeks = []
    for i, topic in enumerate(topics[:6]):
        weeks.append({
            "week": i + 1,
            "topics": [topic],
            "primary_topic": topic,
            "target_accuracy": min(100, 50 + (i + 1) * 8),
            "hours_planned": round(hours * 7, 1),
            "milestones": [
                f"Complete 10 {topic} tests",
                f"Achieve {min(100, 50 + (i+1)*8)}% accuracy",
            ],
        })
    return weeks


def _generate_daily_targets(weak_topics: List[str], hours: float) -> Dict:
    if not weak_topics:
        return {"message": "No weak areas detected. Keep practicing consistently!"}
    per_topic = round(hours / max(1, len(weak_topics[:3])), 1)
    return {
        t: {"hours": per_topic, "questions_target": int(per_topic * 12)}
        for t in weak_topics[:3]
    }


def _build_consistency_heatmap(db: Session, student_id: str) -> List[Dict]:
    since = datetime.utcnow() - timedelta(days=90)
    rows = (
        db.query(
            func.date(AptitudeAttempt.test_date).label("day"),
            func.count(AptitudeAttempt.id).label("count"),
        )
        .filter(AptitudeAttempt.student_id == student_id, AptitudeAttempt.test_date >= since)
        .group_by(func.date(AptitudeAttempt.test_date)).all()
    )
    return [{"date": str(r.day), "count": r.count} for r in rows]


def _build_improvement_trend(db: Session, student_id: str) -> List[Dict]:
    trend = []
    for topic in TOPIC_WEIGHTS:
        rows = (
            db.query(AptitudeAttempt)
            .filter(AptitudeAttempt.student_id == student_id, AptitudeAttempt.topic == topic)
            .order_by(AptitudeAttempt.test_date).limit(20).all()
        )
        if rows:
            trend.append({
                "topic": topic,
                "data": [
                    {
                        "date": str(r.test_date.date()),
                        "accuracy": _safe_float(r.accuracy),
                    }
                    for r in rows
                ],
            })
    return trend


def _generate_coach_insight(analytics: OverallAnalyticsResponse) -> str:
    if analytics.total_attempts <= 0:
        return "Log your first practice attempt to unlock personalized coaching recommendations."

    practiced = [t for t in analytics.topics if t.total_attempts > 0]
    if not practiced:
        return "Log your first practice attempt to unlock personalized coaching recommendations."

    parts: List[str] = []
    weak = [t for t in practiced if t.average_accuracy < ACCURACY_WEAK_THRESHOLD]
    slow = [t for t in practiced if t.average_speed > SPEED_SLOW_THRESHOLD]
    strong = [t for t in practiced if t.is_strong]

    if weak:
        parts.append(
            f"Revise {weak[0].topic} — accuracy is below 60%. "
            "Allocate 30 minutes daily to foundational drills."
        )
    if slow:
        parts.append(
            f"Practice timed sets in {slow[0].topic} — average speed exceeds 45s per question."
        )
    if strong:
        parts.append(
            f"Maintain your streak in {strong[0].topic} — this is a placement-ready strength."
        )
    if not parts:
        parts.append(
            f"Continue consistent practice. Overall readiness is "
            f"{_safe_float(analytics.overall_readiness):.0f}%."
        )

    return " ".join(parts)
