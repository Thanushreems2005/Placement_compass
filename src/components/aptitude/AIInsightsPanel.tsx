import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Trophy, Lightbulb, Compass } from "lucide-react";

interface AIInsightsPanelProps {
  insight: string;
  weakAreas?: string[];
  strongAreas?: string[];
}

export function AIInsightsPanel({
  insight = "",
  weakAreas = [],
  strongAreas = [],
}: AIInsightsPanelProps) {
  // Simple fallback default insights if none returned
  const displayInsight = insight || "Excellent focus on Quantitative modules! However, your solving speed in Logical Reasoning is dragging down your readiness indicator. We recommend allocating 30 mins daily to puzzle sets to boost efficiency.";

  return (
    <Card className="glassmorphism border-border/40 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
          <Brain className="h-5 w-5 text-primary" />
          AI Placement Coach
        </CardTitle>
        <CardDescription>
          Automated diagnostic feedback based on your syllabus answers and speed.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar and Coach response */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border/20">
              <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <span className="font-display font-bold text-xs text-foreground uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-warning fill-warning" />
                  Performance Diagnostics
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  "{displayInsight}"
                </p>
              </div>
            </div>
          </div>

          {/* Quick analysis lists (strengths/weaknesses) */}
          <div className="w-full md:w-80 space-y-4">
            {/* Strengths */}
            {strongAreas.length > 0 && (
              <div className="space-y-2">
                <span className="label-eyebrow flex items-center gap-1.5 text-success">
                  <Trophy className="h-3.5 w-3.5" />
                  Primary Strengths
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {strongAreas.map((topic) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className="border-success/20 bg-success/5 text-success rounded-lg text-[10px] font-semibold"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {weakAreas.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/20">
                <span className="label-eyebrow flex items-center gap-1.5 text-destructive">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Requires Revision
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {weakAreas.map((topic) => (
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
