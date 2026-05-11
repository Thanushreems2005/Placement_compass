import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCompanyStats } from "@/hooks/use-companies";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, TrendingUp, Sparkles, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Distribution and trend visualisations across categories, hiring velocity, profitability and remote-policy mix.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const MIN_THRESHOLD = 5;

type ChartType = "bar" | "bar_horizontal" | "pie";
type Priority = "high" | "medium" | "low";

interface ChartConfigItem {
  key: string;
  title: string;
  priority: Priority;
  color: string;
  type: ChartType;
  fallback: string;
}

const CHART_CONFIG: ChartConfigItem[] = [
  {
    key: "byCategory",
    title: "Companies by category",
    priority: "high",
    color: "var(--chart-1)",
    type: "bar",
    fallback:
      "Categorization data is currently being built. Most companies are tagged under key sectors like Tech Giant and Product.",
  },
  {
    key: "byEmployeeSize",
    title: "Employee size distribution",
    priority: "high",
    color: "var(--chart-3)",
    type: "bar",
    fallback:
      "Scale data is pending. Early indicators show a mix of high-growth startups and established enterprises.",
  },
  {
    key: "byHiringVelocity",
    title: "Hiring velocity",
    priority: "medium",
    color: "var(--chart-2)",
    type: "bar_horizontal",
    fallback:
      "Hiring velocity data is currently limited. Based on available data, most companies fall under moderate patterns.",
  },
  {
    key: "byProfitability",
    title: "Profitability mix",
    priority: "medium",
    color: "var(--chart-4)",
    type: "pie",
    fallback:
      "Financial stability metrics are being aggregated for a more accurate profitability mix.",
  },
  {
    key: "byRemotePolicy",
    title: "Remote / hybrid / on-site",
    priority: "low",
    color: "var(--chart-5)",
    type: "pie",
    fallback: "Work mode policies are currently being tracked for the latest placement season.",
  },
];

function AnalyticsPage() {
  const stats = useCompanyStats();

  if (stats.isLoading) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if ((stats.data?.total ?? 0) === 0) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <EmptyState
          title="No data to chart yet"
          description="Once company records are in the database, visualisations populate automatically."
        />
      </div>
    );
  }

  const s = stats.data!;

  // Prepare visible charts based on data and priority
  const visibleCharts = CHART_CONFIG.map((config) => {
    const data = (s as any)[config.key] as { label: string; count: number }[];
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const coverage = s.total > 0 ? Math.round((totalCount / s.total) * 100) : 0;

    return {
      ...config,
      data,
      totalCount,
      coverage,
      isVisible: totalCount > 0 || config.priority === "high",
      confidence: totalCount >= MIN_THRESHOLD ? "High Data Confidence" : "Limited Data",
    };
  }).filter((c) => c.isVisible);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <span className="label-eyebrow">Analytics</span>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Hiring landscape
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
            <TrendingUp className="h-3 w-3" />
            <span>Aggregate analysis across {s.total} companies</span>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 grid grid-cols-1 gap-4",
          visibleCharts.length === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2",
        )}
      >
        {visibleCharts.map((config) => (
          <ChartCard
            key={config.key}
            title={config.title}
            confidence={config.confidence}
            coverage={config.coverage}
            isFull={visibleCharts.length === 1}
          >
            {config.data.length === 0 ? (
              <InsightFallback message={config.fallback} />
            ) : (
              <ChartRenderer config={config} data={config.data} />
            )}
          </ChartCard>
        ))}
      </div>

      {visibleCharts.length < CHART_CONFIG.length && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center bg-secondary/20">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <h3 className="mt-2 font-display text-sm font-semibold">More insights pending</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto text-balance">
            We are currently building datasets for more metrics. Try exploring{" "}
            <Link to="/categories" className="text-accent hover:underline">
              Categories
            </Link>{" "}
            or{" "}
            <Link to="/skill-mapping" className="text-accent hover:underline">
              Skill Mapping
            </Link>{" "}
            for detailed preparedness insights.
          </p>
        </div>
      )}
    </div>
  );
}

function ChartRenderer({ config, data }: { config: any; data: any[] }) {
  if (config.type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.slice(0, 15)} margin={{ left: 8, right: 8, top: 8, bottom: 40 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill={config.color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === "bar_horizontal") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="var(--muted-foreground)"
            fontSize={11}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "var(--secondary)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" fill={config.color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            outerRadius={100}
            innerRadius={56}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

function ChartCard({
  title,
  confidence,
  coverage,
  children,
  isFull,
}: {
  title: string;
  confidence: string;
  coverage: number;
  children: React.ReactNode;
  isFull?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-5 flex flex-col gap-4 shadow-sm",
        isFull && "max-w-4xl mx-auto w-full",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Data coverage: <span className="font-medium text-foreground">{coverage}%</span>
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-semibold whitespace-nowrap",
            confidence === "High Data Confidence"
              ? "bg-success/10 text-success border-success/30"
              : "bg-warning/10 text-warning border-warning/30",
          )}
        >
          {confidence}
        </Badge>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function InsightFallback({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-6 bg-secondary/10 rounded-lg border border-dashed border-border">
      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
        <Info className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-foreground max-w-xs text-balance">{message}</p>
      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        <span>Insufficient data for visualization</span>
      </div>
    </div>
  );
}
