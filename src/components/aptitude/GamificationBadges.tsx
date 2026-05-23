import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Flame, Zap, Trophy, BookOpen, Target, Sprout } from "lucide-react";
import { safeNum } from "@/lib/aptitude-analytics";
import type { DashboardResponse } from "@/types/aptitude";

interface GamificationBadgesProps {
  xp: number;
  streak: number;
  dashboard?: DashboardResponse | null;
}

interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  color: string;
}

function computeBadges(
  xp: number,
  streak: number,
  dashboard: DashboardResponse | null | undefined,
): BadgeDef[] {
  const totalAttempts = safeNum(dashboard?.total_tests);
  const readinessScore = safeNum(dashboard?.readiness_score);

  // Compute overall avg accuracy from topic_breakdown
  const topics = dashboard?.topic_breakdown ?? [];
  const practicedTopics = topics.filter((t) => safeNum(t.total_attempts) > 0);

  const avgAccuracy =
    practicedTopics.length > 0
      ? practicedTopics.reduce((sum, t) => sum + safeNum(t.average_accuracy), 0) /
        practicedTopics.length
      : 0;

  // Avg speed (lower = faster)
  const speedTopics = practicedTopics.filter((t) => safeNum(t.average_speed) > 0);
  const avgSpeed =
    speedTopics.length > 0
      ? speedTopics.reduce((sum, t) => sum + safeNum(t.average_speed), 0) / speedTopics.length
      : 999;

  return [
    {
      id: "first_attempt",
      emoji: "🌱",
      label: "First Attempt",
      description: "Log your first test",
      icon: <Sprout className="h-5 w-5" />,
      unlocked: totalAttempts >= 1,
      color: "emerald",
    },
    {
      id: "consistency",
      emoji: "🔥",
      label: "Consistency",
      description: "3-day streak",
      icon: <Flame className="h-5 w-5" />,
      unlocked: streak >= 3,
      color: "orange",
    },
    {
      id: "accuracy_master",
      emoji: "🎯",
      label: "Accuracy Master",
      description: "80%+ avg accuracy",
      icon: <Target className="h-5 w-5" />,
      unlocked: avgAccuracy >= 80,
      color: "blue",
    },
    {
      id: "speedster",
      emoji: "⚡",
      label: "Speedster",
      description: "≤30s avg speed",
      icon: <Zap className="h-5 w-5" />,
      unlocked: speedTopics.length > 0 && avgSpeed <= 30,
      color: "yellow",
    },
    {
      id: "practice_pro",
      emoji: "📘",
      label: "Practice Pro",
      description: "5+ total attempts",
      icon: <BookOpen className="h-5 w-5" />,
      unlocked: totalAttempts >= 5,
      color: "violet",
    },
    {
      id: "placement_ready",
      emoji: "🏆",
      label: "Placement Ready",
      description: "85%+ readiness score",
      icon: <Trophy className="h-5 w-5" />,
      unlocked: readinessScore >= 85,
      color: "amber",
    },
  ];
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/20",
  },
  orange: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/40",
    glow: "shadow-orange-500/20",
  },
  blue: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/40",
    glow: "shadow-blue-500/20",
  },
  yellow: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    glow: "shadow-yellow-500/20",
  },
  violet: {
    bg: "bg-violet-500/15",
    text: "text-violet-400",
    border: "border-violet-500/40",
    glow: "shadow-violet-500/20",
  },
  amber: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/40",
    glow: "shadow-amber-500/20",
  },
};

export function GamificationBadges({
  xp = 0,
  streak = 0,
  dashboard,
}: GamificationBadgesProps) {
  const safeXp = safeNum(xp);
  const safeStreak = safeNum(streak);
  const currentLevel = Math.max(1, Math.floor(safeXp / 500) + 1);
  const nextLevelXp = currentLevel * 500;
  const currentLevelStartXp = (currentLevel - 1) * 500;
  const levelProgress = ((safeXp - currentLevelStartXp) / 500) * 100;

  const badges = computeBadges(safeXp, safeStreak, dashboard);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* XP Level (4 columns) */}
      <Card className="glassmorphism md:col-span-4 border-border/40 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Practice Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-black text-foreground">{currentLevel}</span>
            <span className="text-xs font-semibold text-muted-foreground">Level</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">{safeXp} / {nextLevelXp} XP</span>
              <span className="text-primary">{Math.round(levelProgress)}%</span>
            </div>
            <Progress value={levelProgress} className="h-2 rounded-full" />
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold">
            Earn XP by submitting mock tests. Level up to stand out to premium recruiters.
          </p>
        </CardContent>
      </Card>

      {/* Streak (3 columns) */}
      <Card className="glassmorphism md:col-span-3 border-border/40 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-warning/5 blur-2xl" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Flame className="h-4 w-4 text-warning" />
            Daily Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-between h-[120px]">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-black text-warning">{safeStreak}</span>
            <span className="text-xs font-semibold text-muted-foreground">Days</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold">
            {safeStreak > 0
              ? "Keep practicing daily to maintain your streak and earn multipliers!"
              : "Complete a practice module today to start your streak!"}
          </p>
        </CardContent>
      </Card>

      {/* Achievements Card (5 columns) */}
      <Card className="glassmorphism md:col-span-5 border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Achievements
            </span>
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
              {unlockedCount} / {badges.length} Unlocked
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-3 gap-2">
            {badges.map((badge) => {
              const colors = COLOR_MAP[badge.color];
              return (
                <div
                  key={badge.id}
                  title={badge.description}
                  className={`
                    relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center
                    transition-all duration-300
                    ${badge.unlocked
                      ? `${colors.bg} ${colors.border} shadow-lg ${colors.glow}`
                      : "bg-muted/10 border-border/20 opacity-40 grayscale"
                    }
                  `}
                >
                  {badge.unlocked && (
                    <div className={`absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${colors.text.replace("text-", "bg-")}`} />
                    </div>
                  )}
                  <span
                    className={`text-xl leading-none transition-all duration-300 ${badge.unlocked ? "scale-110" : "scale-100"}`}
                    role="img"
                    aria-label={badge.label}
                  >
                    {badge.emoji}
                  </span>
                  <span
                    className={`text-[9px] font-bold leading-tight ${badge.unlocked ? colors.text : "text-muted-foreground"}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
          {unlockedCount === 0 && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground font-medium">
              Log your first test to unlock badges!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
