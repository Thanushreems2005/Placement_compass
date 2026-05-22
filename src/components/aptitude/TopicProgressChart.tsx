import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart3, BrainCircuit, Target } from "lucide-react";
import type { TopicAnalytics } from "@/types/aptitude";

interface TopicProgressChartProps {
  data: TopicAnalytics[];
}

export function TopicProgressChart({ data = [] }: TopicProgressChartProps) {
  // If there's no data, show a placeholder
  if (!data || data.length === 0) {
    return (
      <Card className="glassmorphism border-border/40 shadow-xl min-h-[350px] flex items-center justify-center">
        <div className="text-center text-muted-foreground p-6">
          <BrainCircuit className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40 animate-pulse" />
          <p className="font-display text-sm font-semibold">No topic analysis available yet</p>
          <p className="text-xs mt-1">Complete a practice attempt to visualize your topic performance.</p>
        </div>
      </Card>
    );
  }

  // Format data for radar
  // Map topics to shorter names for display if needed, or keep them clean
  const radarData = data.map((item) => ({
    topic: item.topic.replace(" Aptitude", "").replace(" Reasoning", "").replace(" Ability", ""),
    Mastery: Math.round(item.mastery_score),
    Accuracy: Math.round(item.average_accuracy),
    Readiness: Math.round(item.readiness_percentage),
  }));

  const chartConfig = {
    Mastery: {
      label: "Mastery Level",
      color: "oklch(var(--chart-1))",
    },
    Accuracy: {
      label: "Avg Accuracy",
      color: "oklch(var(--chart-2))",
    },
    Readiness: {
      label: "Topic Readiness",
      color: "oklch(var(--chart-5))",
    },
  };

  return (
    <div className="grid gap-6 md:grid-cols-12">
      {/* Radar Chart (7 columns) */}
      <Card className="glassmorphism md:col-span-7 border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Topic Mastery Map
          </CardTitle>
          <CardDescription>
            Radar mapping of your mastery, accuracy, and placement readiness across all modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center p-0 pt-2">
          <ChartContainer config={chartConfig} className="w-full h-full aspect-auto">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid className="stroke-muted/30" />
              <PolarAngleAxis
                dataKey="topic"
                tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 9 }}
              />
              <Radar
                name="Mastery Level"
                dataKey="Mastery"
                stroke="oklch(var(--chart-1))"
                fill="oklch(var(--chart-1))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Avg Accuracy"
                dataKey="Accuracy"
                stroke="oklch(var(--chart-2))"
                fill="oklch(var(--chart-2))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Topic Readiness"
                dataKey="Readiness"
                stroke="oklch(var(--chart-5))"
                fill="oklch(var(--chart-5))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Attempts breakdown (5 columns) */}
      <Card className="glassmorphism md:col-span-5 border-border/40 shadow-xl flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Practice Frequency
          </CardTitle>
          <CardDescription>
            Total attempts completed per sub-topic. Consistency drives readiness.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={radarData.map((item, idx) => ({
                topic: item.topic,
                Attempts: data[idx].total_attempts,
              }))}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
              <XAxis
                dataKey="topic"
                tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <RechartsTooltip
                cursor={{ fill: "oklch(var(--muted)/20)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border/50 bg-background p-2 shadow-md text-xs">
                        <p className="font-semibold text-foreground">{payload[0].payload.topic}</p>
                        <p className="text-muted-foreground mt-0.5">
                          Attempts: <span className="font-semibold font-mono text-foreground">{payload[0].value}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="Attempts" fill="oklch(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={35} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
