import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, CircleDot, HelpCircle } from "lucide-react";
import type { TopicAnalytics } from "@/types/aptitude";
import { safeNum } from "@/lib/aptitude-analytics";

interface WeaknessHeatmapProps {
  topicBreakdown: TopicAnalytics[];
}

export function WeaknessHeatmap({ topicBreakdown = [] }: WeaknessHeatmapProps) {
  const getStatusInfo = (mastery: number) => {
    if (mastery >= 80) {
      return {
        label: "Mastery Achieved",
        color: "text-success border-success/30 bg-success/5",
        barColor: "bg-success",
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        action: "Ready for tier-1 company rounds. Maintain streak.",
      };
    }
    if (mastery >= 55) {
      return {
        label: "Intermediate",
        color: "text-warning border-warning/30 bg-warning/5",
        barColor: "bg-warning",
        icon: <CircleDot className="h-4 w-4 text-warning" />,
        action: "Focus on intermediate sectional mock tests.",
      };
    }
    return {
      label: "Critical Focus",
      color: "text-destructive border-destructive/30 bg-destructive/5",
      barColor: "bg-destructive",
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      action: "Revise foundational concepts & formulas immediately.",
    };
  };

  return (
    <Card className="glassmorphism border-border/40 shadow-xl overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
          <HelpCircle className="h-5 w-5 text-primary" />
          Aptitude Topic Matrix
        </CardTitle>
        <CardDescription>
          Detailed diagnostic matrix across syllabus components. Red zones require prompt revision.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topicBreakdown.map((item) => {
            const hasAttempts = safeNum(item.total_attempts) > 0;
            const mastery = safeNum(item.mastery_score);
            const accuracy = safeNum(item.average_accuracy);
            const speed = safeNum(item.average_speed);
            const status = getStatusInfo(mastery);
            return (
              <div
                key={item.topic}
                className="relative flex flex-col justify-between p-4 rounded-xl border border-border/40 bg-surface/50 dark:bg-surface-elevated/40 hover:border-primary/20 transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-display text-sm font-semibold text-foreground/95 truncate">
                      {item.topic}
                    </h4>
                    <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 ${status.color}`}>
                      <span className="flex items-center gap-1">
                        {status.icon}
                        {status.label}
                      </span>
                    </Badge>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Mastery Score</span>
                      <span className="font-semibold font-mono text-foreground">
                        {hasAttempts ? `${Math.round(mastery)}/100` : "0/100"}
                      </span>
                    </div>
                    <Progress value={hasAttempts ? mastery : 0} className="h-1.5 rounded-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/20 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Avg Accuracy</span>
                      <span className="font-semibold font-mono text-foreground">
                        {hasAttempts ? `${Math.round(accuracy)}%` : "0%"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Speed/Question</span>
                      <span className="font-semibold font-mono text-foreground">
                        {hasAttempts ? `${Math.round(speed)}s` : "0s"}
                      </span>
                    </div>
                  </div>
                  {!hasAttempts && (
                    <p className="mt-2 text-[10px] text-muted-foreground italic">No attempts yet</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/20 text-[11px] text-muted-foreground/90 italic">
                  💡 {status.action}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
