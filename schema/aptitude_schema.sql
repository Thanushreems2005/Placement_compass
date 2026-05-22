-- SQL DDL for Aptitude Preparation Tracking & AI Analytics Schema

-- 1. Aptitude Test Attempts Table
CREATE TABLE IF NOT EXISTS aptitude_attempts (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    subtopic VARCHAR(255),
    score FLOAT NOT NULL,
    max_score FLOAT DEFAULT 100.0,
    accuracy FLOAT NOT NULL,
    questions_attempted INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    wrong_answers INTEGER NOT NULL,
    skipped_answers INTEGER DEFAULT 0,
    average_solving_time FLOAT,
    total_time_taken FLOAT,
    difficulty_level VARCHAR(50) DEFAULT 'Medium',
    test_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_aptitude_attempts_student ON aptitude_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_aptitude_attempts_topic ON aptitude_attempts(topic);


-- 2. Topic-wise Cumulative Progress Table
CREATE TABLE IF NOT EXISTS topic_progress (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    mastery_score FLOAT DEFAULT 0.0,
    consistency_score FLOAT DEFAULT 0.0,
    improvement_trend FLOAT DEFAULT 0.0,
    total_attempts INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    average_accuracy FLOAT DEFAULT 0.0,
    average_speed FLOAT DEFAULT 0.0,
    readiness_percentage FLOAT DEFAULT 0.0,
    last_practiced TIMESTAMP WITH TIME ZONE,
    streak_days INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_progress_student ON topic_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_topic ON topic_progress(topic);
CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_progress_student_topic ON topic_progress(student_id, topic);


-- 3. AI Personalized Learning Roadmaps Table
CREATE TABLE IF NOT EXISTS learning_roadmaps (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    roadmap_data JSONB NOT NULL,
    recommended_topics JSONB DEFAULT '[]'::jsonb,
    weekly_goals JSONB DEFAULT '[]'::jsonb,
    daily_targets JSONB DEFAULT '{}'::jsonb,
    focus_areas JSONB DEFAULT '[]'::jsonb,
    completion_progress FLOAT DEFAULT 0.0,
    target_readiness FLOAT DEFAULT 85.0,
    is_active BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_student ON learning_roadmaps(student_id);


-- 4. Recommendation History & Feedback Table
CREATE TABLE IF NOT EXISTS recommendation_history (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(100) NOT NULL,
    ai_insights TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    performance_snapshot JSONB DEFAULT '{}'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    was_acted_on BOOLEAN DEFAULT FALSE,
    feedback_rating INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recommendation_history_student ON recommendation_history(student_id);


-- 5. Predictive Placement Readiness Scores Table
CREATE TABLE IF NOT EXISTS readiness_scores (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    overall_score FLOAT DEFAULT 0.0,
    quantitative_score FLOAT DEFAULT 0.0,
    logical_score FLOAT DEFAULT 0.0,
    verbal_score FLOAT DEFAULT 0.0,
    data_interpretation_score FLOAT DEFAULT 0.0,
    puzzles_score FLOAT DEFAULT 0.0,
    confidence_level VARCHAR(50) DEFAULT 'Low',
    improvement_velocity FLOAT DEFAULT 0.0,
    company_readiness JSONB DEFAULT '{}'::jsonb,
    prediction_metrics JSONB DEFAULT '{}'::jsonb,
    xp_points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    current_streak INTEGER DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_readiness_scores_student ON readiness_scores(student_id);
