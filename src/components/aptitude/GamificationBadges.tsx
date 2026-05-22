import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Flame, Zap, Trophy, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GamificationBadgesProps {
  xp: number;
  streak: number;
  unlockedBadges: string[];
}

const BADGE_LIST = [
  {
    id: "First Step",
    name: "First Step",
    description: "Completed your first aptitude test",
    icon: "🌱",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
  {
    id: "On a Roll",
    name: "On a Roll",
    description: "Completed 5 mock attempts",
    icon: "🔥",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  {
    id: "Dedicated",
    name: "Dedicated",
    description: "Completed 10 mock attempts",
    icon: "🎓",
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  },
  {
    id: "Streak Master",
    name: "Streak Master",
    description: "Maintained a 7-day practice streak",
    icon: "⚡",
    color: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  },
  {
    id: "Ace",
    name: "Ace",
    description: "Achieved 90%+ accuracy in any attempt",
    icon: "🎯",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  },
  {
    id: "Speed Demon",
    name: "Speed Demon",
    description: "Average solving speed under 15 seconds",
    icon: "🚀",
    color: "bg-sky-500/10 text-sky-500 border-sky-500/30",
  },
];

export function GamificationBadges({
  xp = 0,
  streak = 0,
  unlockedBadges = [],
}: GamificationBadgesProps) {
  // Determine current tier/level
  // Level threshold: 500 XP per level
  const currentLevel = Math.max(1, Math.floor(xp / 500) + 1);
  const nextLevelXp = currentLevel * 500;
  const currentLevelStartXp = (currentLevel - 1) * 500;
  const levelProgress = ((xp - currentLevelStartXp) / 500) * 100;

  return (
    <TooltipProvider>
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
                <span className="text-muted-foreground">{xp} / {nextLevelXp} XP</span>
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
              <span className="font-display text-5xl font-black text-warning">{streak}</span>
              <span className="text-xs font-semibold text-muted-foreground">Days</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {streak > 0
                ? "Keep practicing daily to maintain your streak and earn multipliers!"
                : "Complete a practice module today to start your streak!"}
            </p>
          </CardContent>
        </Card>

        {/* Unlocked Badges (5 columns) */}
        <Card className="glassmorphism md:col-span-5 border-border/40 shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Trophy className="h-4 w-4 text-primary" />
              Achievements Unlocked
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-6 gap-2">
              {BADGE_LIST.map((badge) => {
                const isUnlocked = unlockedBadges.includes(badge.id);
                return (
                  <Tooltip key={badge.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`aspect-square flex items-center justify-center rounded-xl border text-xl font-bold cursor-pointer transition-all duration-300 ${
                          isUnlocked
                            ? `${badge.color} scale-100 shadow-md shadow-primary/5 hover:scale-105`
                            : "bg-muted/10 text-muted-foreground/30 border-dashed border-border grayscale opacity-40 hover:opacity-60"
                        }`}
                      >
                        {badge.icon}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover border border-border p-3 rounded-lg shadow-xl text-xs space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        {badge.name}
                        {isUnlocked ? (
                          <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.2 rounded font-bold">Unlocked</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.2 rounded font-bold">Locked</span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-[10px]">{badge.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <span>Unlocked: {unlockedBadges.length} / {BADGE_LIST.length} Badges</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
