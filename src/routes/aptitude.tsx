import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAptitudeDashboard } from "@/hooks/use-aptitude";
import { ReadinessScoreCard } from "@/components/aptitude/ReadinessScoreCard";
import { LearningRoadmap } from "@/components/aptitude/LearningRoadmap";
import { AIInsightsPanel } from "@/components/aptitude/AIInsightsPanel";
import { TestHistoryTable } from "@/components/aptitude/TestHistoryTable";
import { GamificationBadges } from "@/components/aptitude/GamificationBadges";
import { TopicProgressChart } from "@/components/aptitude/TopicProgressChart";
import { SubmitAttemptModal } from "@/components/aptitude/SubmitAttemptModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardResponse, LearningRoadmapResponse } from "@/types/aptitude";
import { buildRuleBasedRoadmap, normalizeDashboard } from "@/lib/aptitude-analytics";

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
  xp: 1350,
  streak: 5,
  total_tests: 14,
  weak_areas: ["Logical Reasoning", "Data Interpretation"],
  strong_areas: ["Verbal Ability"],
  topic_breakdown: [
    {
      topic: "Quantitative Aptitude",
      mastery_score: 76,
      average_accuracy: 76.4,
      average_speed: 28,
      total_attempts: 6,
      improvement_trend: 4,
      readiness_percentage: 74,
      is_weak: false,
      is_strong: false,
    },
    {
      topic: "Logical Reasoning",
      mastery_score: 52,
      average_accuracy: 55.0,
      average_speed: 42,
      total_attempts: 4,
      improvement_trend: -2,
      readiness_percentage: 50,
      is_weak: true,
      is_strong: false,
    },
    {
      topic: "Verbal Ability",
      mastery_score: 88,
      average_accuracy: 88.2,
      average_speed: 18,
      total_attempts: 5,
      improvement_trend: 6,
      readiness_percentage: 86,
      is_weak: false,
      is_strong: true,
    },
    {
      topic: "Data Interpretation",
      mastery_score: 48,
      average_accuracy: 49.7,
      average_speed: 38,
      total_attempts: 3,
      improvement_trend: -5,
      readiness_percentage: 46,
      is_weak: true,
      is_strong: false,
    },
    {
      topic: "Puzzles",
      mastery_score: 67,
      average_accuracy: 67.5,
      average_speed: 32,
      total_attempts: 3,
      improvement_trend: 1,
      readiness_percentage: 65,
      is_weak: false,
      is_strong: false,
    },
  ],
  recent_attempts: [
    {
      id: "1",
      student_id: "demo",
      topic: "Verbal Ability",
      subtopic: "Reading Comprehension",
      total_questions: 20,
      correct_answers: 18,
      wrong_answers: 2,
      skipped_questions: 0,
      total_time_seconds: 360,
      score: 88,
      accuracy: 90,
      avg_speed: 18,
      speed: 18,
      average_solving_time: 360,
      difficulty: "Medium",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "2",
      student_id: "demo",
      topic: "Quantitative Aptitude",
      subtopic: "Algebra",
      total_questions: 25,
      correct_answers: 19,
      wrong_answers: 4,
      skipped_questions: 2,
      total_time_seconds: 850,
      score: 76,
      accuracy: 76,
      avg_speed: 34,
      speed: 34,
      average_solving_time: 850,
      difficulty: "Medium",
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: "3",
      student_id: "demo",
      topic: "Logical Reasoning",
      subtopic: "Analogy",
      total_questions: 15,
      correct_answers: 8,
      wrong_answers: 5,
      skipped_questions: 2,
      total_time_seconds: 630,
      score: 52,
      accuracy: 53,
      avg_speed: 42,
      speed: 42,
      average_solving_time: 630,
      difficulty: "Hard",
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
  ],
  ai_insight:
    "Your Verbal Ability is placement-ready — keep that edge! However, Logical Reasoning and Data Interpretation are dragging your overall readiness. Prioritise DI chart-reading and 20 puzzle drills daily to close the gap within 2 weeks.",
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
  const [roadmapData, setRoadmapData] = useState<LearningRoadmapResponse | null>(null);

  const { data: liveData, isLoading, error, refetch } = useAptitudeDashboard(
    manualDemo ? null : studentId
  );

  React.useEffect(() => {
    setRoadmapData(null);
  }, [studentId]);

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
  // NO DEMO DATA - show empty state instead
  let banner: BannerState = "live";
  let d: DashboardResponse | null = liveData ? normalizeDashboard(liveData) : null;

  if (manualDemo) {
    banner = "demo-manual";
    d = normalizeDashboard(DEMO_DATA);
  } else if (error) {
    // Backend error - show error state
    banner = "offline";
    d = null;
  } else if (!liveData) {
    // Still loading
    d = null;
  } else if (liveData.total_tests === 0) {
    // Backend reachable but no attempts yet
    banner = "empty";
    d = null;
  } else {
    banner = "live";
    d = normalizeDashboard(liveData);
  }

  const activeRoadmap =
    roadmapData ??
    (manualDemo ? DEMO_ROADMAP : d && d.total_tests > 0 ? buildRuleBasedRoadmap(d, studentId) : null);

  const isDemoShowing = banner !== "live";

  // ── Company readiness computed from score ───────────────────────────────
  const readiness = d ? Math.round(Number(d.readiness_score || 0)) : 0;
  const companyReadiness: Record<string, number> = d ? {
    "TCS / Infosys (Mass Hiring)": Math.round(Math.min(100, readiness * 1.12)),
    "Accenture / Cognizant": Math.round(Math.min(100, readiness * 1.06)),
    "Product / Dev Companies": Math.round(readiness * 0.92),
    "Premium Tier-1 (Google / MS)": Math.round(readiness * 0.74),
  } : {};

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
            <p className="font-semibold text-info">No test history yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use <strong>Log Test Score</strong> to submit your first mock test and populate your live dashboard.
            </p>
          </div>
          <SubmitAttemptModal studentId={studentId} />
        </div>
      )}

      {/* Show empty state if no data and not in demo mode */}
      {!manualDemo && !d && (
        <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 text-center">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {banner === "offline" ? "Backend Connection Error" : "Ready to Get Started?"}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {banner === "offline"
              ? "Unable to reach the backend. Make sure FastAPI is running at http://127.0.0.1:8000"
              : "Submit your first aptitude test to see your personalized dashboard and insights."}
          </p>
          <div className="flex gap-3 justify-center">
            {banner === "offline" ? (
              <Button
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </Button>
            ) : (
              <SubmitAttemptModal studentId={studentId} />
            )}
          </div>
        </div>
      )}

      {/* Only show dashboard if we have real data */}
      {d && (
        <>
          {/* Gamification + Dynamic Badges */}
          <GamificationBadges
            xp={Number(d.xp || 0)}
            streak={Number(d.streak || 0)}
            dashboard={d}
          />

          {/* Topic Radar + Practice Frequency Bar Chart */}
          <TopicProgressChart data={d.topic_breakdown} />

          {/* Readiness + Company match */}
          <ReadinessScoreCard
            score={readiness}
            companyReadiness={companyReadiness}
            topicBreakdown={d.topic_breakdown}
          />

          {/* AI Learning Roadmap */}
          <LearningRoadmap
            roadmapData={activeRoadmap}
            studentId={studentId}
            dashboard={d}
            onRoadmapUpdate={setRoadmapData}
          />

          {/* AI Coaching Insights */}
          <AIInsightsPanel
            insight={d.ai_insight}
            weakAreas={d.weak_areas}
            strongAreas={d.strong_areas}
          />

          {/* Test History */}
          <TestHistoryTable attempts={d.recent_attempts} />
        </>
      )}
    </div>
  );
}
