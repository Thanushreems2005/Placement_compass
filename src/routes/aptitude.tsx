import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAptitudeDashboard } from "@/hooks/use-aptitude";
import { ReadinessScoreCard } from "@/components/aptitude/ReadinessScoreCard";
import { TopicProgressChart } from "@/components/aptitude/TopicProgressChart";
import { WeaknessHeatmap } from "@/components/aptitude/WeaknessHeatmap";
import { AccuracySpeedChart } from "@/components/aptitude/AccuracySpeedChart";
import { LearningRoadmap } from "@/components/aptitude/LearningRoadmap";
import { AIInsightsPanel } from "@/components/aptitude/AIInsightsPanel";
import { TestHistoryTable } from "@/components/aptitude/TestHistoryTable";
import { GamificationBadges } from "@/components/aptitude/GamificationBadges";
import { SubmitAttemptModal } from "@/components/aptitude/SubmitAttemptModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardResponse, LearningRoadmapResponse } from "@/types/aptitude";

export const Route = createFileRoute("/aptitude")({
  head: () => ({
    meta: [
      { title: "Aptitude Learning Tracker · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "AI-driven diagnostic tracker for aptitude tests. Analyze speed, accuracy, and syllabus readiness with personalized roadmaps.",
      },
    ],
  }),
  component: AptitudePage,
});

// ─── Demo / Fallback Data ─────────────────────────────────────────────────────
const DEMO_DATA: DashboardResponse = {
  student_id: "demo",
  readiness_score: 68,
  overall_accuracy: 74.3,
  overall_speed: 28.5,
  total_tests: 14,
  streak_days: 5,
  xp_points: 1350,
  badges: ["First Step", "On a Roll", "Dedicated", "Streak Master"],
  topic_breakdown: [
    {
      topic: "Quantitative Aptitude",
      mastery_score: 72,
      average_accuracy: 76.4,
      average_speed: 32,
      total_attempts: 6,
      improvement_trend: 8.2,
      readiness_percentage: 71,
      is_weak: false,
      is_strong: false,
    },
    {
      topic: "Logical Reasoning",
      mastery_score: 48,
      average_accuracy: 55.0,
      average_speed: 40,
      total_attempts: 4,
      improvement_trend: -3.1,
      readiness_percentage: 45,
      is_weak: true,
      is_strong: false,
    },
    {
      topic: "Verbal Ability",
      mastery_score: 85,
      average_accuracy: 88.2,
      average_speed: 18,
      total_attempts: 5,
      improvement_trend: 12.0,
      readiness_percentage: 87,
      is_weak: false,
      is_strong: true,
    },
    {
      topic: "Data Interpretation",
      mastery_score: 41,
      average_accuracy: 49.7,
      average_speed: 52,
      total_attempts: 3,
      improvement_trend: -5.4,
      readiness_percentage: 39,
      is_weak: true,
      is_strong: false,
    },
    {
      topic: "Puzzles",
      mastery_score: 63,
      average_accuracy: 67.5,
      average_speed: 45,
      total_attempts: 3,
      improvement_trend: 4.8,
      readiness_percentage: 60,
      is_weak: false,
      is_strong: false,
    },
  ],
  recent_attempts: [
    {
      id: 1,
      student_id: "demo",
      topic: "Verbal Ability",
      subtopic: "Reading Comprehension",
      score: 88,
      max_score: 100,
      accuracy: 88,
      questions_attempted: 25,
      correct_answers: 22,
      wrong_answers: 3,
      average_solving_time: 18,
      difficulty_level: "Medium",
      test_date: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 2,
      student_id: "demo",
      topic: "Quantitative Aptitude",
      subtopic: "Time & Work",
      score: 76,
      max_score: 100,
      accuracy: 76,
      questions_attempted: 20,
      correct_answers: 15,
      wrong_answers: 5,
      average_solving_time: 34,
      difficulty_level: "Medium",
      test_date: new Date(Date.now() - 2 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 3,
      student_id: "demo",
      topic: "Logical Reasoning",
      subtopic: "Syllogisms",
      score: 52,
      max_score: 100,
      accuracy: 52,
      questions_attempted: 25,
      correct_answers: 13,
      wrong_answers: 12,
      average_solving_time: 42,
      difficulty_level: "Hard",
      test_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 4,
      student_id: "demo",
      topic: "Data Interpretation",
      subtopic: "Bar & Pie Charts",
      score: 48,
      max_score: 100,
      accuracy: 48,
      questions_attempted: 20,
      correct_answers: 9,
      wrong_answers: 11,
      average_solving_time: 55,
      difficulty_level: "Hard",
      test_date: new Date(Date.now() - 4 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 5,
      student_id: "demo",
      topic: "Puzzles",
      subtopic: "Seating Arrangement",
      score: 64,
      max_score: 100,
      accuracy: 64,
      questions_attempted: 15,
      correct_answers: 9,
      wrong_answers: 6,
      average_solving_time: 48,
      difficulty_level: "Medium",
      test_date: new Date(Date.now() - 5 * 86400000).toISOString(),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ],
  weak_areas: ["Logical Reasoning", "Data Interpretation"],
  strong_areas: ["Verbal Ability"],
  ai_insight:
    "Your Verbal Ability is placement-ready — keep that edge! However, Logical Reasoning and Data Interpretation are dragging your overall readiness. Prioritise DI chart-reading and 20 puzzle drills daily to close the gap within 2 weeks.",
  consistency_heatmap: [],
  improvement_trend: [
    {
      topic: "Quantitative Aptitude",
      data: [
        { date: new Date(Date.now() - 6 * 86400000).toISOString(), accuracy: 60 },
        { date: new Date(Date.now() - 4 * 86400000).toISOString(), accuracy: 70 },
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), accuracy: 76 },
      ],
    },
    {
      topic: "Verbal Ability",
      data: [
        { date: new Date(Date.now() - 5 * 86400000).toISOString(), accuracy: 78 },
        { date: new Date(Date.now() - 3 * 86400000).toISOString(), accuracy: 84 },
        { date: new Date(Date.now() - 1 * 86400000).toISOString(), accuracy: 88 },
      ],
    },
    {
      topic: "Logical Reasoning",
      data: [
        { date: new Date(Date.now() - 6 * 86400000).toISOString(), accuracy: 58 },
        { date: new Date(Date.now() - 3 * 86400000).toISOString(), accuracy: 54 },
        { date: new Date(Date.now() - 2 * 86400000).toISOString(), accuracy: 52 },
      ],
    },
  ],
};

const DEMO_ROADMAP: LearningRoadmapResponse = {
  student_id: "demo",
  recommended_topics: ["Data Interpretation", "Logical Reasoning", "Puzzles"],
  weekly_goals: [
    {
      week: 1,
      topics: ["Data Interpretation"],
      primary_topic: "Data Interpretation",
      target_accuracy: 70,
      hours_planned: 7,
      milestones: [
        "Complete 30 bar/pie chart problems from a standard DI book",
        "Attempt 2 full DI sectional tests (25 questions each)",
        "Review all wrong answers and tag error patterns",
      ],
    },
    {
      week: 2,
      topics: ["Logical Reasoning", "Puzzles"],
      primary_topic: "Logical Reasoning",
      target_accuracy: 75,
      hours_planned: 8,
      milestones: [
        "Master syllogism and blood-relation question types",
        "Complete 2 seating arrangement and ordering puzzles daily",
        "Take 1 timed LR mock test and analyse speed vs accuracy",
      ],
    },
    {
      week: 3,
      topics: ["Quantitative Aptitude"],
      primary_topic: "Quantitative Aptitude",
      target_accuracy: 82,
      hours_planned: 6,
      milestones: [
        "Revise Time & Work, Profit & Loss, and Percentage formulas",
        "Solve 10 advanced QA problems daily under timed conditions",
        "Target sub-30s average solving time per question",
      ],
    },
    {
      week: 4,
      topics: ["Full Syllabus Mock Tests"],
      primary_topic: "Full Syllabus Mock Tests",
      target_accuracy: 80,
      hours_planned: 10,
      milestones: [
        "Take 3 full-length aptitude mocks (60 minutes each)",
        "Achieve readiness score above 80% on the dashboard",
        "Do targeted revision on any topic still below 70% accuracy",
      ],
    },
  ],
  daily_targets: {},
  focus_areas: ["Data Interpretation", "Logical Reasoning"],
  completion_progress: 35,
  ai_insights:
    "Based on your trajectory, you can realistically achieve 80%+ readiness in 4 weeks with 1.5–2 hours of daily practice. Focus heavily on DI this week.",
  generated_at: new Date().toISOString(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
type BannerState = "offline" | "empty" | "demo-manual" | "live";

// ─── Page ─────────────────────────────────────────────────────────────────────
function AptitudePage() {
  const [studentId, setStudentId] = useState("student_1");
  const [manualDemo, setManualDemo] = useState(false);

  const { data: liveData, isLoading, error, refetch } = useAptitudeDashboard(
    manualDemo ? null : studentId
  );

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-12">
          <Skeleton className="h-72 rounded-2xl md:col-span-5" />
          <Skeleton className="h-72 rounded-2xl md:col-span-7" />
        </div>
        <Skeleton className="h-[350px] rounded-2xl" />
      </div>
    );
  }

  // ── Decide data source ──────────────────────────────────────────────────
  // Determine which banner (if any) to show and which dataset to use.
  // IMPORTANT: d is ALWAYS defined — DEMO_DATA is the safe fallback.
  let banner: BannerState = "live";
  let d: DashboardResponse = DEMO_DATA;          // safe default
  let roadmapData: LearningRoadmapResponse | null = null;

  if (manualDemo) {
    banner = "demo-manual";
    d = DEMO_DATA;
    roadmapData = DEMO_ROADMAP;
  } else if (error || !liveData) {
    // Backend offline / 4xx / 5xx / still undefined
    banner = "offline";
    d = DEMO_DATA;
    roadmapData = DEMO_ROADMAP;
  } else if (liveData.total_tests === 0) {
    // Backend reachable but no attempts yet
    banner = "empty";
    d = DEMO_DATA;
    roadmapData = DEMO_ROADMAP;
  } else {
    // Happy path: real data
    banner = "live";
    d = liveData;
    roadmapData =
      d.weak_areas.length > 0
        ? {
            student_id: studentId,
            recommended_topics: d.weak_areas,
            weekly_goals: d.weak_areas.map((area, idx) => ({
              week: idx + 1,
              topics: [area],
              primary_topic: area,
              target_accuracy: 80,
              hours_planned: 4.5,
              milestones: [
                `Complete 20 beginner-level questions in ${area}`,
                `Attempt 1 sectional test focusing on ${area} accuracy`,
                `Solve 5 medium-difficulty problems related to this topic`,
              ],
            })),
            daily_targets: {},
            focus_areas: d.weak_areas,
            completion_progress: Math.min(100, d.total_tests * 8),
            ai_insights: d.ai_insight,
            generated_at: new Date().toISOString(),
          }
        : null;
  }

  const isDemoShowing = banner !== "live";

  // ── Company readiness computed from score ───────────────────────────────
  const companyReadiness: Record<string, number> = {
    "TCS / Infosys (Mass Hiring)": Math.round(Math.min(100, d.readiness_score * 1.12)),
    "Accenture / Cognizant": Math.round(Math.min(100, d.readiness_score * 1.06)),
    "Product / Dev Companies": Math.round(d.readiness_score * 0.92),
    "Premium Tier-1 (Google / MS)": Math.round(d.readiness_score * 0.74),
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="label-eyebrow">Quantitative &amp; Analytical Diagnostic Console</span>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Aptitude Preparation Tracker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Monitor accuracy, solving velocity, and syllabus mastery. Calibrate your preparations for placement screening rounds.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Live / Demo pill */}
            <button
              onClick={() => setManualDemo((v) => !v)}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold border transition-all ${
                isDemoShowing
                  ? "bg-warning/10 text-warning border-warning/30"
                  : "bg-success/10 text-success border-success/30"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isDemoShowing ? "bg-warning animate-pulse" : "bg-success"
                }`}
              />
              {isDemoShowing ? "Demo Mode" : "Live Data"}
            </button>

            {/* Student profile selector */}
            {!manualDemo && (
              <div className="flex items-center gap-2 bg-secondary/40 border border-border px-3 py-1.5 rounded-xl text-xs">
                <span className="text-muted-foreground">Profile:</span>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="bg-transparent font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="student_1">student_1</option>
                  <option value="student_2">student_2</option>
                  <option value="student_test">student_test</option>
                </select>
              </div>
            )}

            {/* Log score — always show for live student profiles */}
            {!manualDemo && <SubmitAttemptModal studentId={studentId} />}

            {/* Retry when offline */}
            {banner === "offline" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-9 rounded-xl text-xs font-semibold gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status banners */}
      {banner === "offline" && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <WifiOff className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">Backend offline — showing demo data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start FastAPI at{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                http://127.0.0.1:8000
              </code>{" "}
              then click <strong>Retry</strong>.
            </p>
          </div>
        </div>
      )}

      {banner === "empty" && (
        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm">
          <Brain className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-info">No test history yet — showing demo data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use <strong>Log Test Score</strong> to submit your first mock test and populate your live dashboard.
            </p>
          </div>
          <SubmitAttemptModal studentId={studentId} />
        </div>
      )}

      {/* Gamification */}
      <GamificationBadges xp={d.xp_points} streak={d.streak_days} unlockedBadges={d.badges} />

      {/* Readiness + Company match */}
      <ReadinessScoreCard
        score={Math.round(d.readiness_score)}
        companyReadiness={companyReadiness}
        topicBreakdown={d.topic_breakdown}
      />

      <div className="border-t border-border/20" />

      {/* Radar + Practice frequency */}
      <TopicProgressChart data={d.topic_breakdown} />

      {/* Speed/Accuracy + Weakness heatmap */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccuracySpeedChart
          topicBreakdown={d.topic_breakdown}
          improvementTrend={d.improvement_trend}
        />
        <WeaknessHeatmap topicBreakdown={d.topic_breakdown} />
      </div>

      {/* AI Learning Roadmap */}
      <LearningRoadmap roadmapData={roadmapData} studentId={studentId} />

      {/* AI Coaching Insights */}
      <AIInsightsPanel
        insight={d.ai_insight}
        weakAreas={d.weak_areas}
        strongAreas={d.strong_areas}
      />

      {/* Test History */}
      <TestHistoryTable attempts={d.recent_attempts} />
    </div>
  );
}
