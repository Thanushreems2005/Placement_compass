import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Activity, Gauge, TrendingUp } from "lucide-react";
import type { TopicAnalytics, TrendEntry } from "@/types/aptitude";
import { safeNum } from "@/lib/aptitude-analytics";

interface AccuracySpeedChartProps {
  topicBreakdown: TopicAnalytics[];
  improvementTrend?: TrendEntry[];
}

export function AccuracySpeedChart({
  topicBreakdown = [],
  improvementTrend = [],
}: AccuracySpeedChartProps) {
  // Scatter Plot Data: Speed vs Accuracy
  const scatterData = topicBreakdown
    .filter((item) => safeNum(item.total_attempts) > 0)
    .map((item) => ({
      name: item.topic.replace(" Aptitude", "").replace(" Reasoning", "").replace(" Ability", ""),
      Speed: Math.round(safeNum(item.average_speed)),
      Accuracy: Math.round(safeNum(item.average_accuracy)),
      Attempts: safeNum(item.total_attempts),
    }));

  // Improvement Trend Data: flattening and formatting dates if multiple topics exist
  // To avoid cluttered charts, we select the top topics or display them as multiple lines
  const hasTrendData = improvementTrend && improvementTrend.length > 0;

  // Let's format the trend data so that Recharts can consume it easily
  // We want an array of objects: { date: '2026-05-01', 'Quantitative': 80, 'Logical': 70 }
  const formattedTrendData = React.useMemo(() => {
    if (!hasTrendData) return [];
    
    // Group all dates
    const dateMap: Record<string, Record<string, number>> = {};
    
    improvementTrend.forEach((trend) => {
      const shortTopic = trend.topic
        .replace(" Aptitude", "")
        .replace(" Reasoning", "")
        .replace(" Ability", "");
        
      trend.data.forEach((entry) => {
        const dateStr = new Date(entry.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        
        if (!dateMap[dateStr]) {
          dateMap[dateStr] = {};
        }
        dateMap[dateStr][shortTopic] = Math.round(safeNum(entry.accuracy));
      });
    });

    return Object.entries(dateMap).map(([date, topics]) => ({
      date,
      ...topics,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [improvementTrend, hasTrendData]);

  const uniqueTopics = improvementTrend.map((t) =>
    t.topic.replace(" Aptitude", "").replace(" Reasoning", "").replace(" Ability", "")
  );

  const colors = [
    "oklch(var(--chart-1))",
    "oklch(var(--chart-2))",
    "oklch(var(--chart-3))",
    "oklch(var(--chart-4))",
    "oklch(var(--chart-5))",
  ];

  return (
    <Card className="glassmorphism border-border/40 shadow-xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Performance Dynamics
            </CardTitle>
            <CardDescription>
              Analyze accuracy vs speed efficiency trade-offs and historical trend lines.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="speed-accuracy" className="w-full">
          <div className="flex justify-end mb-4">
            <TabsList className="grid w-[300px] grid-cols-2">
              <TabsTrigger value="speed-accuracy" className="flex items-center gap-1.5 text-xs">
                <Gauge className="h-3.5 w-3.5" />
                Accuracy vs Speed
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" />
                Historical Trend
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scatter Chart Tab */}
          <TabsContent value="speed-accuracy" className="mt-0 h-[300px]">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis
                    type="number"
                    dataKey="Speed"
                    name="Solving Speed"
                    unit="s"
                    tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                    label={{
                      value: "Speed (Seconds per Question)",
                      position: "bottom",
                      offset: 0,
                      fill: "oklch(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="Accuracy"
                    name="Accuracy"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                    label={{
                      value: "Accuracy (%)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fill: "oklch(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ZAxis type="number" dataKey="Attempts" range={[60, 400]} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border/50 bg-background p-3 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">{data.name}</p>
                            <p className="text-muted-foreground">
                              Accuracy: <span className="font-semibold font-mono text-foreground">{data.Accuracy}%</span>
                            </p>
                            <p className="text-muted-foreground">
                              Speed: <span className="font-semibold font-mono text-foreground">{data.Speed}s/q</span>
                            </p>
                            <p className="text-muted-foreground">
                              Attempts: <span className="font-semibold font-mono text-foreground">{data.Attempts}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Topics" data={scatterData} fill="oklch(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No performance data to plot yet.
              </div>
            )}
          </TabsContent>

          {/* Line Chart Tab */}
          <TabsContent value="history" className="mt-0 h-[300px]">
            {formattedTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedTrendData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "oklch(var(--muted-foreground))", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border/50 bg-background p-3 shadow-md text-xs space-y-1">
                            <p className="font-semibold text-foreground">{label}</p>
                            {payload.map((p, i) => (
                              <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
                                <span className="font-semibold">{p.name}:</span>
                                <span className="font-mono">{safeNum(p.value)}%</span>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, color: "oklch(var(--muted-foreground))" }}
                  />
                  {uniqueTopics.map((topic, index) => (
                    <Line
                      key={topic}
                      type="monotone"
                      dataKey={topic}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Practice trends will be visualised here after completing tests across multiple days.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
