import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Briefcase,
  Cpu,
  GitCompareArrows,
  Layers,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanies, useCompanyStats } from "@/hooks/use-companies";
import { CompanyCard } from "@/components/CompanyCard";
import { StatTile } from "@/components/StatTile";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · PES Placement Intelligence" },
      {
        name: "description",
        content:
          "Orientation, discovery and at-a-glance signals across every company hiring on the PES campus.",
      },
    ],
  }),
  component: HomePage,
});

const TILES: Array<{
  label: string;
  match: string[];
  icon: typeof Building2;
  hint: string;
  color: string;
}> = [
  {
    label: "Tech Giants",
    match: ["Tech Giant", "Big Tech"],
    icon: Building2,
    hint: "Scale + brand",
    color: "border-blue-500/20 bg-blue-500/5 text-blue-600",
  },
  {
    label: "Product",
    match: ["Product"],
    icon: Cpu,
    hint: "Engineering depth",
    color: "border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-600",
  },
  {
    label: "Service",
    match: ["Service", "IT Services"],
    icon: Wrench,
    hint: "Volume hirers",
    color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
  },
  {
    label: "Startups",
    match: ["Startup", "Scale-up"],
    icon: Rocket,
    hint: "Early ownership",
    color: "border-amber-500/20 bg-amber-500/5 text-amber-600",
  },
];

function countRows(rows: { count: number }[] | undefined) {
  return (rows ?? []).reduce((sum, row) => sum + row.count, 0);
}

function HomePage() {
  const stats = useCompanyStats();
  const [q, setQ] = useState("");
  const search = useCompanies({ q, limit: 8 });

  // ── Supabase connection probe (remove after confirming data loads) ──
  useEffect(() => {
    async function probe() {
      try {
        console.log("[DB PROBE] Testing Supabase connection…");
        const { data, error, count } = await supabase
          .from("company_json")
          .select("company_id", { count: "exact" })
          .limit(3);
        if (error) {
          console.error("[DB PROBE] ERROR:", error.message, error);
        } else {
          console.log(`[DB PROBE] OK — count=${count}, rows=${data?.length}`, data);
        }
      } catch (e) {
        console.error("[DB PROBE] EXCEPTION:", e);
      }
    }
    probe();
  }, []);

  const hiringQuery = useQuery({
    queryKey: ["hiring-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("job_role_details_json")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const innovixQuery = useQuery({
    queryKey: ["innovix-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("innovx_json")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const tileCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of stats.data?.byCategory ?? []) map.set(c.label.toLowerCase(), c.count);
    return TILES.map((t) => {
      const total = t.match.reduce(
        (sum, m) =>
          sum +
          Array.from(map.entries())
            .filter(([k]) => k.includes(m.toLowerCase()))
            .reduce((s, [, v]) => s + v, 0),
        0,
      );
      return { ...t, count: total };
    });
  }, [stats.data]);

  const total = stats.data?.total ?? 0;

  return (
    <div className="relative isolate min-h-screen">
      {/* Background decoration */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[500px] bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute left-1/2 top-0 -z-10 h-[400px] w-full -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] sm:h-[600px]">
        <svg
          className="absolute inset-0 h-full w-full stroke-primary/[0.03] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
              width={200}
              height={200}
              x="50%"
              y={-1}
              patternUnits="userSpaceOnUse"
            >
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            strokeWidth={0}
            fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
          />
        </svg>
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Hero */}
        <section className="relative flex flex-col items-center text-center gap-6">
          <Badge
            variant="outline"
            className="px-4 py-1 rounded-full bg-surface border-primary/20 text-primary font-bold tracking-wide shadow-sm animate-in fade-in slide-in-from-top-2 duration-700"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" /> Placement Intelligence Dashboard
          </Badge>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl text-balance max-w-4xl text-foreground/90 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Decide which companies to target — using{" "}
            <span className="text-primary italic">data</span>, not anecdotes.
          </h1>

          <div className="mt-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-border/60 bg-surface/80 p-2.5 pr-2.5 backdrop-blur shadow-2xl shadow-primary/5 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="flex flex-1 items-center gap-3 px-3">
              <Search className="h-5 w-5 text-muted-foreground/50" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search company name, category or focus area…"
                className="border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
              />
            </div>
            <Link
              to="/explore"
              search={{ q: q || undefined } as never}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              Explore Intelligence <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <StatTile
            label="Companies tracked"
            value={total}
            icon={Building2}
            loading={stats.isLoading}
            className="shadow-sm hover:shadow-md transition-shadow"
          />
          <StatTile
            label="Categories"
            value={stats.data?.byCategory.length ?? 0}
            icon={Layers}
            accent="accent"
            loading={stats.isLoading}
            className="shadow-sm hover:shadow-md transition-shadow"
          />
          <StatTile
            label="Hiring roles"
            value={hiringQuery.data ?? 0}
            icon={Briefcase}
            accent="warning"
            loading={hiringQuery.isLoading}
            className="shadow-sm hover:shadow-md transition-shadow"
          />
          <StatTile
            label="InnovX data"
            value={innovixQuery.data ?? 0}
            icon={Lightbulb}
            accent="secondary"
            loading={innovixQuery.isLoading}
            className="shadow-sm hover:shadow-md transition-shadow"
          />
        </section>

        {/* Entry Points */}
        <section className="mt-20">
          <div className="flex flex-col gap-1 items-center sm:items-start">
            <h2 className="font-display text-2xl font-bold tracking-tight">Rapid Segments</h2>
            <p className="text-sm text-muted-foreground">
              Deep dive into specific institutional hiring categories.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {tileCounts.map((t) => (
              <Link
                key={t.label}
                to="/explore"
                className={cn(
                  "group relative flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-300",
                  "hover:-translate-y-1.5 hover:shadow-xl",
                  t.color,
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-surface/50 p-2.5 backdrop-blur">
                    <t.icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-sm font-bold opacity-60 tabular-nums">
                    {t.count}
                  </span>
                </div>
                <div>
                  <div className="font-display text-lg font-bold tracking-tight text-foreground">
                    {t.label}
                  </div>
                  <div className="text-xs font-medium opacity-60">{t.hint}</div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1">
                  Explore Segments <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Insight cards */}
        <section className="mt-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DistributionCard
              title="Remote / hybrid / on-site"
              rows={stats.data?.byRemotePolicy ?? []}
              loading={stats.isLoading}
              className="shadow-xl shadow-secondary/5"
            />
            <div className="hidden lg:flex flex-col justify-center p-8 rounded-2xl border border-dashed border-border bg-secondary/10">
              <Sparkles className="h-10 w-10 text-accent/40 mb-4" />
              <h3 className="font-display text-xl font-bold">More Insights Pending</h3>
              <p className="mt-2 text-sm text-muted-foreground text-balance">
                We are currently processing financial and hiring velocity metrics for the next batch
                of companies. Check back soon for updated distribution charts.
              </p>
            </div>
          </div>
        </section>

        {/* Search results / featured */}
        <section className="mt-24">
          <div className="flex items-center justify-between border-b border-border/60 pb-5">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {q ? "Search results" : "Recently Featured"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {q
                  ? `Showing intelligent matches for "${q}"`
                  : "The latest intelligence updates from across the platform."}
              </p>
            </div>
            <Link
              to="/explore"
              className="group inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2 text-xs font-bold transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Browse Registry{" "}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {search.isLoading ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : (search.data?.length ?? 0) === 0 ? (
            <div className="mt-8">
              <EmptyState
                title={q ? `No companies matched “${q}”` : "No companies in the database yet"}
                description="Load placement records into the public.company table — every screen will populate from the same source of truth."
                action={
                  <Link
                    to="/compare"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-bold shadow-sm hover:bg-secondary transition-all"
                  >
                    <GitCompareArrows className="h-4 w-4" /> Try comparison view
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {search.data!.map((c) => (
                <CompanyCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  rows,
  loading,
  className,
}: {
  title: string;
  rows: { label: string; count: number }[];
  loading: boolean;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
        <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-widest px-2">
          Live View
        </Badge>
      </div>
      <div className="flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 rounded-md" />)
        ) : rows.length === 0 ? (
          <div className="py-8 text-center bg-secondary/20 rounded-xl border border-dashed border-border">
            <p className="text-sm font-medium text-muted-foreground">Aggregating data points...</p>
          </div>
        ) : (
          rows.slice(0, 6).map((r) => (
            <div key={r.label} className="group flex items-center gap-4 text-xs">
              <span className="w-32 font-bold text-foreground/70 group-hover:text-foreground transition-colors truncate">
                {r.label}
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-secondary/50">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/80 transition-all duration-1000 ease-out"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right font-mono text-sm font-bold tabular-nums text-foreground/80">
                {r.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
