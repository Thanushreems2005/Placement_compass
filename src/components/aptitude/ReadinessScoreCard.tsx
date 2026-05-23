import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, Briefcase, ChevronRight, Compass } from "lucide-react";
import { safeNum } from "@/lib/aptitude-analytics";

interface ReadinessScoreCardProps {
  score: number;
  companyReadiness?: Record<string, number>;
  topicBreakdown?: Array<{
    topic: string;
    mastery_score: number;
    readiness_percentage: number;
  }>;
}

export function ReadinessScoreCard({
  score = 0,
  companyReadiness = {},
  topicBreakdown = [],
}: ReadinessScoreCardProps) {
  const safeScore = Math.round(safeNum(score));
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  // Determine feedback based on score
  const getReadinessColor = (val: number) => {
    if (val >= 80) return "text-success border-success/30 bg-success/5";
    if (val >= 60) return "text-warning border-warning/30 bg-warning/5";
    return "text-destructive border-destructive/30 bg-destructive/5";
  };

  const getCircleStrokeColor = (val: number) => {
    if (val >= 80) return "stroke-success";
    if (val >= 60) return "stroke-warning";
    return "stroke-destructive";
  };

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* Circle Ring Overall Score (5 columns) */}
      <Card className="glassmorphism md:col-span-5 relative overflow-hidden border-border/40 shadow-xl">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Compass className="h-5 w-5 text-primary" />
            Overall Placement Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="relative flex items-center justify-center">
            {/* Background SVG Circle */}
            <svg className="h-36 w-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-muted/20"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className={`transition-all duration-1000 ease-out ${getCircleStrokeColor(safeScore)}`}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="font-display text-4xl font-extrabold tracking-tight text-foreground">
                {safeScore}%
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                Ready
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <Badge className={`rounded-full px-3 py-1 font-semibold ${getReadinessColor(safeScore)}`}>
              {safeScore >= 80 ? "Superb Preparation" : safeScore >= 60 ? "Needs Polish" : "Critical Focus Needed"}
            </Badge>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Based on your accuracy, speed, and practice consistency across 5 core topics.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Target Companies Compatibility (7 columns) */}
      <Card className="glassmorphism md:col-span-7 border-border/40 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Briefcase className="h-5 w-5 text-primary" />
            Target Companies Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            {Object.keys(companyReadiness).length > 0 ? (
              Object.entries(companyReadiness).map(([company, readinessScore]) => (
                <div key={company} className="space-y-1">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-1.5 text-foreground/90">
                      <ChevronRight className="h-3.5 w-3.5 text-primary/60" />
                      {company}
                    </span>
                    <span className={safeNum(readinessScore) >= 80 ? "text-success" : safeNum(readinessScore) >= 60 ? "text-warning" : "text-destructive"}>
                      {Math.round(safeNum(readinessScore))}% Match
                    </span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={safeNum(readinessScore)}
                      className="h-2 rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Award className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm">Submit your first test attempt to activate company readiness predictions!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
