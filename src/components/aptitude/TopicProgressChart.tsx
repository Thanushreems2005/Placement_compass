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
  Cell,
} from "recharts";
import { BarChart3, BrainCircuit } from "lucide-react";
import type { TopicAnalytics } from "@/types/aptitude";
import { safeNum } from "@/lib/aptitude-analytics";

// All 5 canonical topics — always shown even if no data
const ALL_TOPICS = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Data Interpretation",
  "Puzzles",
];

// Short labels for radar axis (to avoid overflow)
function shortLabel(topic: string): string {
  return topic
    .replace("Quantitative Aptitude", "Quant")
    .replace("Logical Reasoning", "Logical")
    .replace("Verbal Ability", "Verbal")
    .replace("Data Interpretation", "Data Interp")
    .replace("Puzzles", "Puzzles");
}

interface TopicProgressChartProps {
  data: TopicAnalytics[];
}

export function TopicProgressChart({ data = [] }: TopicProgressChartProps) {
  // Build a lookup from topic name → analytics
  const byTopic = React.useMemo(() => {
    const map: Record<string, TopicAnalytics> = {};
    (data ?? []).forEach((item) => {
      if (item?.topic) map[item.topic] = item;
    });
    return map;
  }, [data]);

  // Radar data: always 5 rows, use 0 if no data for that topic
  const radarData = React.useMemo(() => {
    return ALL_TOPICS.map((topic) => {
      const item = byTopic[topic];
      const accuracy = item ? Math.round(safeNum(item.average_accuracy)) : 0;
      return {
        topic: shortLabel(topic),
        fullTopic: topic,
        Accuracy: accuracy,
      };
    });
  }, [byTopic]);

  // Bar chart data: always 5 topics, show attempts count
  const barData = React.useMemo(() => {
    return ALL_TOPICS.map((topic) => {
      const item = byTopic[topic];
      return {
        topic: shortLabel(topic),
        fullTopic: topic,
        Attempts: item ? safeNum(item.total_attempts) : 0,
        Accuracy: item ? Math.round(safeNum(item.average_accuracy)) : 0,
      };
    });
  }, [byTopic]);

  const hasAnyData = data.some((t) => safeNum(t.total_attempts) > 0);

  // Bar colors based on accuracy
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return "oklch(var(--chart-2))"; // green-ish
    if (accuracy >= 60) return "oklch(var(--chart-3))"; // yellow-ish
    if (accuracy > 0)   return "oklch(var(--chart-4))"; // red-ish
    return "oklch(var(--muted))";                        // grey — no data
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
            {hasAnyData
              ? "Radar mapping of average accuracy per topic (0–100%)."
              : "Complete at least one test to populate the radar chart."}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] flex items-center justify-center p-0 pt-2">
          {hasAnyData ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid className="stroke-muted/30" />
                <PolarAngleAxis
                  dataKey="topic"
                  tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 9 }}
                  tickCount={5}
                />
                <Radar
                  name="Accuracy %"
                  dataKey="Accuracy"
                  stroke="oklch(var(--chart-1))"
                  fill="oklch(var(--chart-1))"
                  fillOpacity={0.25}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(var(--chart-1))", strokeWidth: 0 }}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border/50 bg-background p-3 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{item.fullTopic}</p>
                          <p className="text-muted-foreground">
                            Accuracy:{" "}
                            <span className="font-semibold font-mono text-foreground">
                              {item.Accuracy}%
                            </span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-6">
              <BrainCircuit className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40 animate-pulse" />
              <p className="font-display text-sm font-semibold text-muted-foreground">
                No topic data yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Log a test attempt to visualise your accuracy radar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Practice Frequency Bar Chart (5 columns) */}
      <Card className="glassmorphism md:col-span-5 border-border/40 shadow-xl flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Practice Frequency
          </CardTitle>
          <CardDescription>
            {hasAnyData
              ? "Attempts per topic — consistency drives readiness."
              : "No practice data yet. Log your first test!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="oklch(var(--muted)/20)"
              />
              <XAxis
                dataKey="topic"
                tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, "auto"]}
              />
              <RechartsTooltip
                cursor={{ fill: "oklch(var(--muted)/10)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border/50 bg-background p-2 shadow-md text-xs space-y-1">
                        <p className="font-semibold text-foreground">{item.fullTopic}</p>
                        <p className="text-muted-foreground">
                          Attempts:{" "}
                          <span className="font-semibold font-mono text-foreground">
                            {item.Attempts}
                          </span>
                        </p>
                        {item.Accuracy > 0 && (
                          <p className="text-muted-foreground">
                            Avg Accuracy:{" "}
                            <span className="font-semibold font-mono text-foreground">
                              {item.Accuracy}%
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="Attempts"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                isAnimationActive={hasAnyData}
              >
                {barData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.Accuracy)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
