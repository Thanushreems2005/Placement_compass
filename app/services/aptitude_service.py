import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.aptitude import (
    AptitudeAttempt, TopicProgress, LearningRoadmap,
    RecommendationHistory, ReadinessScore,
)
from app.schemas.aptitude import (
    AptitudeAttemptCreate, TopicAnalytics,
    OverallAnalyticsResponse, DashboardResponse,
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


def create_attempt(db: Session, data: AptitudeAttemptCreate) -> AptitudeAttempt:
    attempt = AptitudeAttempt(**data.model_dump(exclude_none=True))
    db.add(attempt)
    db.flush()
    _update_topic_progress(db, data)
    _recalculate_readiness(db, data.student_id)
    db.commit()
    db.refresh(attempt)
    logger.info(f"Attempt {attempt.id} created for student {data.student_id}")
    return attempt


def get_attempts(db: Session, student_id: str, limit: int = 50) -> List[AptitudeAttempt]:
    return (
        db.query(AptitudeAttempt)
        .filter(AptitudeAttempt.student_id == student_id)
        .order_by(desc(AptitudeAttempt.test_date))
        .limit(limit)
        .all()
    )


def get_topic_progress_all(db: Session, student_id: str) -> List[TopicProgress]:
    return db.query(TopicProgress).filter(TopicProgress.student_id == student_id).all()


def get_overall_analytics(db: Session, student_id: str) -> OverallAnalyticsResponse:
    progresses = get_topic_progress_all(db, student_id)
    attempts = get_attempts(db, student_id, limit=200)
    topic_analytics, weak, strong = [], [], []

    for p in progresses:
        is_weak = p.mastery_score < WEAK_THRESHOLD
        is_strong = p.mastery_score >= STRONG_THRESHOLD
        ta = TopicAnalytics(
            topic=p.topic, mastery_score=p.mastery_score,
            average_accuracy=p.average_accuracy, average_speed=p.average_speed,
            total_attempts=p.total_attempts, improvement_trend=p.improvement_trend,
            readiness_percentage=p.readiness_percentage, is_weak=is_weak, is_strong=is_strong,
        )
        topic_analytics.append(ta)
        if is_weak: weak.append(p.topic)
        if is_strong: strong.append(p.topic)

    readiness_rec = db.query(ReadinessScore).filter(
        ReadinessScore.student_id == student_id
    ).order_by(desc(ReadinessScore.updated_at)).first()

    overall_accuracy = round(sum(a.accuracy for a in attempts) / max(1, len(attempts)), 2)
    overall_speed = round(
        sum(a.average_solving_time or 0 for a in attempts) / max(1, len(attempts)), 2
    )

    return OverallAnalyticsResponse(
        student_id=student_id, total_attempts=len(attempts),
        overall_accuracy=overall_accuracy, overall_speed=overall_speed,
        overall_readiness=readiness_rec.overall_score if readiness_rec else 0.0,
        topics=topic_analytics, weak_areas=weak, strong_areas=strong,
        streak_days=readiness_rec.current_streak if readiness_rec else 0,
        xp_points=readiness_rec.xp_points if readiness_rec else 0,
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
    heatmap = _build_consistency_heatmap(db, student_id)
    trend = _build_improvement_trend(db, student_id)

    return DashboardResponse(
        student_id=student_id,
        readiness_score=readiness.overall_score if readiness else 0.0,
        overall_accuracy=analytics.overall_accuracy,
        overall_speed=analytics.overall_speed,
        total_tests=analytics.total_attempts,
        streak_days=analytics.streak_days,
        xp_points=analytics.xp_points,
        badges=analytics.badges,
        topic_breakdown=analytics.topics,
        recent_attempts=recent,
        weak_areas=analytics.weak_areas,
        strong_areas=analytics.strong_areas,
        ai_insight=_generate_quick_insight(analytics),
        consistency_heatmap=heatmap,
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

    n = progress.total_attempts
    progress.average_accuracy = round((progress.average_accuracy * n + data.accuracy) / (n + 1), 2)
    if data.average_solving_time:
        progress.average_speed = round(
            (progress.average_speed * n + data.average_solving_time) / (n + 1), 2
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
                "data": [{"date": str(r.test_date.date()), "accuracy": r.accuracy} for r in rows],
            })
    return trend


def _generate_quick_insight(analytics: OverallAnalyticsResponse) -> str:
    if not analytics.topics:
        return "Start practicing to get personalized AI insights!"
    if analytics.weak_areas:
        top_weak = analytics.weak_areas[0]
        return (
            f"Focus on {top_weak} — it's your highest impact improvement area. "
            f"Just 30 minutes daily can boost your readiness score by up to 15 points."
        )
    if analytics.overall_accuracy >= 85:
        return (
            f"Excellent work! Your {analytics.overall_accuracy:.1f}% accuracy puts you in the "
            f"top tier. Focus on speed optimization next."
        )
    return (
        f"You're at {analytics.overall_readiness:.1f}% readiness. Consistent daily practice "
        f"in your weak areas will accelerate your progress significantly."
    )
