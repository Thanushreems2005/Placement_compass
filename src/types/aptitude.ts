// ============================================================
// Aptitude Learning Tracker — TypeScript Interfaces
// ============================================================

export type AptitudeTopic =
  | 'Quantitative Aptitude'
  | 'Logical Reasoning'
  | 'Verbal Ability'
  | 'Data Interpretation'
  | 'Puzzles'
  | 'Coding Aptitude';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type ConfidenceLevel = 'Low' | 'Medium' | 'High';
export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// --- Attempt ---------------------------------------------------

export interface AptitudeAttemptCreate {
  student_id: string;
  topic: AptitudeTopic;
  subtopic?: string;
  score: number;
  max_score?: number;
  accuracy: number;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  skipped_answers?: number;
  average_solving_time?: number;
  total_time_taken?: number;
  difficulty_level?: DifficultyLevel;
  test_date?: string;
}

export interface AptitudeAttemptResponse {
  id: number;
  student_id: string;
  topic: string;
  subtopic?: string;
  score: number;
  max_score: number;
  accuracy: number;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  average_solving_time?: number;
  difficulty_level: string;
  test_date: string;
  created_at: string;
}

// --- Topic Progress --------------------------------------------

export interface TopicAnalytics {
  topic: string;
  mastery_score: number;
  average_accuracy: number;
  average_speed: number;
  total_attempts: number;
  improvement_trend: number;
  readiness_percentage: number;
  is_weak: boolean;
  is_strong: boolean;
}

export interface TopicProgressResponse {
  id: number;
  student_id: string;
  topic: string;
  mastery_score: number;
  consistency_score: number;
  improvement_trend: number;
  total_attempts: number;
  average_accuracy: number;
  average_speed: number;
  readiness_percentage: number;
  last_practiced?: string;
  streak_days: number;
  updated_at: string;
}

// --- Overall Analytics -----------------------------------------

export interface OverallAnalyticsResponse {
  student_id: string;
  total_attempts: number;
  overall_accuracy: number;
  overall_speed: number;
  overall_readiness: number;
  topics: TopicAnalytics[];
  weak_areas: string[];
  strong_areas: string[];
  streak_days: number;
  xp_points: number;
  badges: string[];
  last_updated: string;
}

// --- Readiness Score -------------------------------------------

export interface ReadinessScoreResponse {
  student_id: string;
  overall_score: number;
  quantitative_score: number;
  logical_score: number;
  verbal_score: number;
  data_interpretation_score: number;
  puzzles_score: number;
  confidence_level: ConfidenceLevel;
  improvement_velocity: number;
  company_readiness: Record<string, number>;
  xp_points: number;
  badges: string[];
  current_streak: number;
  calculated_at: string;
}

// --- Roadmap ---------------------------------------------------

export interface WeeklyGoal {
  week: number;
  topics: string[];
  primary_topic?: string;
  target_accuracy: number;
  hours_planned: number;
  daily_questions?: number;
  subtopics_to_cover?: string[];
  milestones: string[];
}

export interface LearningRoadmapResponse {
  student_id: string;
  recommended_topics: string[];
  weekly_goals: WeeklyGoal[];
  daily_targets: Record<string, unknown>;
  focus_areas: string[];
  completion_progress: number;
  ai_insights?: string;
  generated_at: string;
}

export interface RoadmapRequest {
  student_id: string;
  target_companies?: string[];
  target_readiness?: number;
  available_hours_per_day?: number;
}

// --- Recommendations -------------------------------------------

export interface Recommendation {
  type: string;
  topic: string;
  action: string;
  priority: RecommendationPriority;
  estimated_gain?: string;
}

export interface RecommendationsResponse {
  student_id: string;
  recommendations: Recommendation[];
  ai_insights: string;
  priority_topics: string[];
  daily_goal: string;
  generated_at: string;
}

// --- Dashboard -------------------------------------------------

export interface ConsistencyEntry {
  date: string;
  count: number;
}

export interface TrendEntry {
  topic: string;
  data: { date: string; accuracy: number }[];
}

export interface DashboardResponse {
  student_id: string;
  readiness_score: number;
  overall_accuracy: number;
  overall_speed: number;
  total_tests: number;
  streak_days: number;
  xp_points: number;
  badges: string[];
  topic_breakdown: TopicAnalytics[];
  recent_attempts: AptitudeAttemptResponse[];
  weak_areas: string[];
  strong_areas: string[];
  ai_insight: string;
  consistency_heatmap: ConsistencyEntry[];
  improvement_trend: TrendEntry[];
}

// --- Study Plan ------------------------------------------------

export interface StudyPlanDay {
  day: number;
  topic: string;
  target_questions: number;
  is_rest_day: boolean;
  focus: string;
}

export interface StudyPlanResponse {
  student_id: string;
  plan: StudyPlanDay[];
  total_days: number;
}
