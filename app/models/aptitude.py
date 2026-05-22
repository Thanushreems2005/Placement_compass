from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, Boolean
from sqlalchemy.sql import func
from app.database import Base


class AptitudeAttempt(Base):
    """Stores individual aptitude test attempt records."""
    __tablename__ = "aptitude_attempts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, nullable=False, index=True)
    topic = Column(String, nullable=False, index=True)
    subtopic = Column(String, nullable=True)
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=100.0)
    accuracy = Column(Float, nullable=False)
    questions_attempted = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    wrong_answers = Column(Integer, nullable=False)
    skipped_answers = Column(Integer, default=0)
    average_solving_time = Column(Float, nullable=True)
    total_time_taken = Column(Float, nullable=True)
    difficulty_level = Column(String, default="Medium")
    test_date = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TopicProgress(Base):
    """Tracks cumulative mastery and progress per topic per student."""
    __tablename__ = "topic_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, nullable=False, index=True)
    topic = Column(String, nullable=False, index=True)
    mastery_score = Column(Float, default=0.0)
    consistency_score = Column(Float, default=0.0)
    improvement_trend = Column(Float, default=0.0)
    total_attempts = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    average_accuracy = Column(Float, default=0.0)
    average_speed = Column(Float, default=0.0)
    readiness_percentage = Column(Float, default=0.0)
    last_practiced = Column(DateTime(timezone=True), nullable=True)
    streak_days = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LearningRoadmap(Base):
    """Stores AI-generated personalized learning roadmaps."""
    __tablename__ = "learning_roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, nullable=False, index=True)
    roadmap_data = Column(JSON, nullable=False)
    recommended_topics = Column(JSON, default=list)
    weekly_goals = Column(JSON, default=list)
    daily_targets = Column(JSON, default=dict)
    focus_areas = Column(JSON, default=list)
    completion_progress = Column(Float, default=0.0)
    target_readiness = Column(Float, default=85.0)
    is_active = Column(Boolean, default=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)


class RecommendationHistory(Base):
    """Stores all AI-generated recommendations and insights."""
    __tablename__ = "recommendation_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, nullable=False, index=True)
    recommendation_type = Column(String, nullable=False)
    ai_insights = Column(Text, nullable=True)
    recommendations = Column(JSON, default=list)
    performance_snapshot = Column(JSON, default=dict)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    was_acted_on = Column(Boolean, default=False)
    feedback_rating = Column(Integer, nullable=True)


class ReadinessScore(Base):
    """Stores placement readiness predictions and confidence metrics."""
    __tablename__ = "readiness_scores"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, nullable=False, index=True)
    overall_score = Column(Float, default=0.0)
    quantitative_score = Column(Float, default=0.0)
    logical_score = Column(Float, default=0.0)
    verbal_score = Column(Float, default=0.0)
    data_interpretation_score = Column(Float, default=0.0)
    puzzles_score = Column(Float, default=0.0)
    confidence_level = Column(String, default="Low")
    improvement_velocity = Column(Float, default=0.0)
    company_readiness = Column(JSON, default=dict)
    prediction_metrics = Column(JSON, default=dict)
    xp_points = Column(Integer, default=0)
    badges = Column(JSON, default=list)
    current_streak = Column(Integer, default=0)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
