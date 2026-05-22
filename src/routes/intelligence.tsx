import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { Search, Sparkles, RefreshCw, AlertTriangle, Cpu, ChevronDown, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntelligence, useIntelligenceSections } from "@/hooks/useIntelligence";
import { IntelligenceSectionCard } from "@/components/intelligence/IntelligenceSectionCard";
import { TelemetryPanel } from "@/components/intelligence/TelemetryPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/intelligence")({
  head: () => ({
    meta: [
      { title: "LangGraph Intelligence · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Trigger live LangGraph multi-agent extraction for any company — 163 parameters with provenance and confidence scoring.",
      },
    ],
  }),
  component: IntelligencePage,
});

// ── Pipeline stage animation ──────────────────────────────────────────────────
const STAGES = [
  { id: "init",        label: "Initializing",   pct: 5  },
  { id: "search",      label: "Searching Web",  pct: 20 },
  { id: "research",    label: "Researching",    pct: 45 },
  { id: "validating",  label: "Validating",     pct: 65 },
  { id: "consolidate", label: "Consolidating",  pct: 82 },
  { id: "analyzing",   label: "Analyzing",      pct: 93 },
  { id: "done",        label: "Complete",       pct: 100 },
];

function useSimulatedProgress(isLoading: boolean) {
  const [stageIdx, setStageIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setStageIdx(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      if (i < STAGES.length - 1) {
        setStageIdx(i);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 2200);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStageIdx(STAGES.length - 1);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStageIdx(0);
  }, []);

  return { stageIdx, start, stop, reset };
}

function ExtractionProgress({ isLoading, stageIdx }: { isLoading: boolean; stageIdx: number }) {
  if (!isLoading) return null;
  const stage = STAGES[stageIdx] ?? STAGES[0];

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-3">
      <div className="flex items-center gap-2.5">
        <Cpu className="h-4 w-4 text-accent animate-pulse" />
        <span className="font-display text-sm font-semibold text-accent">
          LangGraph Pipeline Running
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {stage.pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-700 ease-out"
          style={{ width: `${stage.pct}%` }}
        />
      </div>

      {/* Stage steps */}
      <div className="flex flex-wrap gap-1.5">
        {STAGES.slice(0, -1).map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-all",
              i < stageIdx
                ? "bg-success/15 text-success border-success/30"
                : i === stageIdx
                  ? "bg-accent/20 text-accent border-accent/40 animate-pulse"
                  : "bg-secondary text-muted-foreground border-border",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Multi-agent extraction running in the background — this may take 30–90 seconds for a fresh company.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function IntelligencePage() {
  const [inputValue, setInputValue]     = useState("");
  const [activeQuery, setActiveQuery]   = useState<string | null>(null);
  const [showRawJson, setShowRawJson]   = useState(false);
  const [copied, setCopied]             = useState(false);

  const { data, isLoading, error, refetch } = useIntelligence(activeQuery);
  const sections = useIntelligenceSections(data);
  const progress = useSimulatedProgress(isLoading);

  const handleSearch = useCallback(() => {
    const q = inputValue.trim();
    if (!q) return;
    if (q === activeQuery) {
      refetch();
    } else {
      setActiveQuery(q);
      progress.start();
    }
  }, [inputValue, activeQuery, refetch, progress]);

  // Stop progress animation when data arrives
  if (data && isLoading === false && progress.stageIdx < STAGES.length - 1) {
    progress.stop();
  }

  const handleCopyReport = () => {
    if (!data) return;
    const report = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      toast.success("Intelligence report copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="label-eyebrow">LangGraph Intelligence Engine</span>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Generate Company Intelligence
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Trigger the live multi-agent pipeline to extract all{" "}
              <span className="font-bold text-foreground">163 parameters</span> for any company —
              with provenance tracking, confidence scoring and anti-hallucination governance.
            </p>
          </div>
          <Link
            to="/explore"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            ← Explore Companies
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
          <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <Input
            id="intelligence-search-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter company name (e.g. Zepto, Blinkit, Google)…"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-base"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(""); setActiveQuery(null); progress.reset(); }}
              className="text-muted-foreground/40 hover:text-muted-foreground text-xs font-medium shrink-0"
            >
              ✕
            </button>
          )}
        </div>
        <Button
          id="intelligence-generate-btn"
          onClick={handleSearch}
          disabled={!inputValue.trim() || isLoading}
          className="h-10 gap-2 px-6 font-bold"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLoading ? "Extracting…" : "Generate Intelligence"}
        </Button>
        {data && !isLoading && (
          <Button
            id="intelligence-retry-btn"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => { progress.start(); refetch(); }}
            title="Re-run extraction"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress */}
      <ExtractionProgress isLoading={isLoading} stageIdx={progress.stageIdx} />

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-destructive">Intelligence pipeline error</p>
            <p className="text-muted-foreground">{error.message}</p>
            <p className="text-xs text-muted-foreground">
              Make sure the FastAPI server is running at{" "}
              <code className="rounded bg-secondary px-1 py-0.5">http://127.0.0.1:8000</code>
            </p>
          </div>
        </div>
      )}

      {/* Skeleton loading */}
      {isLoading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      )}

      {/* Results */}
      {data && !isLoading && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Company identity banner */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
            {data.basic_info?.logo_url && (
              <img
                src={data.basic_info.logo_url}
                alt={data.basic_info.name ?? ""}
                className="h-10 w-10 rounded-lg object-contain border border-border bg-background p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold tracking-tight">
                {data.basic_info?.name ?? data.meta.company_name}
              </h2>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                {data.basic_info?.category && <span>{data.basic_info.category}</span>}
                {data.basic_info?.website_url && (
                  <a
                    href={data.basic_info.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {data.basic_info.website_url}
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                id="intelligence-copy-btn"
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="gap-1.5 text-xs"
              >
                {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Export JSON"}
              </Button>
            </div>
          </div>

          {/* Telemetry */}
          <TelemetryPanel data={data} />

          {/* Intelligence sections */}
          <div className="space-y-3">
            {sections.map((section, i) => (
              <IntelligenceSectionCard
                key={section.id}
                section={section}
                defaultOpen={i < 2} // first 2 sections open by default
              />
            ))}
          </div>

          {/* Raw JSON debug panel */}
          <div className="rounded-xl border border-border bg-surface">
            <button
              type="button"
              onClick={() => setShowRawJson((p) => !p)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-secondary/30 transition-colors rounded-xl"
            >
              <span>Raw JSON Debug Panel</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showRawJson && "rotate-180")} />
            </button>
            {showRawJson && (
              <div className="border-t border-border px-4 pb-4">
                <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-secondary/30 p-3 text-[10px] font-mono text-foreground/80 leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-border bg-secondary/10">
          <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h3 className="font-display text-lg font-semibold">Ready to Extract</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground text-balance">
            Enter any company name above and click <strong>Generate Intelligence</strong> to trigger
            the LangGraph multi-agent pipeline and extract all 163 parameters.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Zepto", "Blinkit", "Google", "Infosys", "Swiggy"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setInputValue(name)}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent/40 hover:text-accent hover:bg-accent/5 transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
