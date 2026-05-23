import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Target,
  Clock,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Zap,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { DashboardResponse, LearningRoadmapResponse } from "@/types/aptitude";
import { buildRuleBasedRoadmap, safeNum } from "@/lib/aptitude-analytics";
import { toast } from "sonner";

interface LearningRoadmapProps {
  roadmapData: LearningRoadmapResponse | null;
  studentId: string;
  dashboard?: DashboardResponse | null;
  onRoadmapUpdate?: (roadmap: LearningRoadmapResponse) => void;
}

export function LearningRoadmap({
  roadmapData,
  studentId,
  dashboard,
  onRoadmapUpdate,
}: LearningRoadmapProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRebuildRoadmap = async () => {
    if (!dashboard) {
      toast.error("Dashboard data is not available yet.");
      return;
    }
    setIsUpdating(true);
    try {
      const roadmap = buildRuleBasedRoadmap(dashboard, studentId);
      onRoadmapUpdate?.(roadmap);
      toast.success("Learning roadmap updated from your latest performance.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update roadmap");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!roadmapData) {
    return (
      <Card className="glassmorphism border-border/40 shadow-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <Sparkles className="h-10 w-10 text-primary mb-3 animate-pulse" />
        <h3 className="font-display text-base font-bold text-foreground">AI Placement roadmap inactive</h3>
        <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
          Generate a custom week-by-week study plan calibrated for your target companies and weak syllabus areas.
        </p>
        <Button
          onClick={handleRebuildRoadmap}
          disabled={isUpdating}
          className="rounded-xl px-6 font-semibold"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing syllabus...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Roadmap
            </>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glassmorphism border-border/40 shadow-xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/20">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Learning Roadmap
            </CardTitle>
            <CardDescription>
              Custom milestones generated to bridge your performance gaps.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isUpdating}
            onClick={handleRebuildRoadmap}
            className="rounded-lg h-9 text-xs font-semibold self-start"
          >
            {isUpdating ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Update Plan
          </Button>
        </div>

        {/* Overall Completion Progress */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-warning" />
              Plan Completion
            </span>
            <span className="font-mono text-foreground">{Math.round(safeNum(roadmapData.completion_progress))}%</span>
          </div>
          <Progress value={safeNum(roadmapData.completion_progress)} className="h-2 rounded-full" />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-12">
          {/* Main Roadmap Steps (8 columns) */}
          <div className="md:col-span-8 space-y-6">
            <h4 className="label-eyebrow mb-2">Weekly Milestones</h4>
            <div className="relative border-l border-border/40 pl-6 ml-2 space-y-8">
              {roadmapData.weekly_goals?.map((goal, index) => (
                <div key={index} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-sm text-foreground">
                        Week {goal.week}: {goal.primary_topic || goal.topics?.[0]}
                      </span>
                      <Badge className="bg-primary/5 text-primary border-primary/20 text-[10px] rounded-full">
                        {goal.hours_planned} hrs planned
                      </Badge>
                      <Badge className="bg-success/5 text-success border-success/20 text-[10px] rounded-full">
                        Target Accuracy: {goal.target_accuracy}%
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground font-semibold">
                      Topics covered: {goal.topics?.join(", ")}
                    </p>

                    {/* Milestones / Checklist */}
                    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                      {goal.milestones?.map((milestone, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                          <span>{milestone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side Info Panel: Focus Areas & AI Advice (4 columns) */}
          <div className="md:col-span-4 space-y-6">
            {roadmapData.focus_areas && roadmapData.focus_areas.length > 0 && (
              <div className="p-4 rounded-xl border border-border/30 bg-muted/20">
                <h4 className="label-eyebrow flex items-center gap-1.5 text-foreground mb-3">
                  <Target className="h-4 w-4 text-destructive" />
                  High Priority Focus
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {roadmapData.focus_areas.map((topic) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg text-[10px] font-semibold"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {roadmapData.ai_insights && (
              <div className="p-4 rounded-xl border border-border/30 bg-accent/5">
                <h4 className="label-eyebrow flex items-center gap-1.5 text-foreground mb-2">
                  💡 AI Coach Advisory
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "{roadmapData.ai_insights}"
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl border border-border/30 bg-surface">
              <h4 className="label-eyebrow text-foreground mb-3">Roadmap Metrics</h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Daily Practice Target
                  </span>
                  <span className="font-semibold font-mono">1.5 hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Estimated Completion
                  </span>
                  <span className="font-semibold font-mono">4 Weeks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
