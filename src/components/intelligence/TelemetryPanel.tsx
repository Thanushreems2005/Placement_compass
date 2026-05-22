import { Activity, Database, Cpu, Shield, Clock } from "lucide-react";
import type { IntelligenceResponse } from "@/types/canonicalIntelligence.types";
import { cn } from "@/lib/utils";

interface TelemetryPanelProps {
  data: IntelligenceResponse;
}

function Stat({ label, value, icon: Icon, accent = false }: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col gap-1 rounded-lg border p-3",
      accent ? "border-accent/30 bg-accent/5" : "border-border bg-secondary/30",
    )}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3", accent ? "text-accent" : "text-muted-foreground")} />
        <span className="field-label">{label}</span>
      </div>
      <span className={cn(
        "font-mono text-sm font-bold tabular-nums",
        accent ? "text-accent" : "text-foreground",
      )}>
        {value}
      </span>
    </div>
  );
}

export function TelemetryPanel({ data }: TelemetryPanelProps) {
  const q = data.quality;
  const pc = q.provenance_counts ?? {};

  const verified   = (pc.real_extracted ?? 0) + (pc.cache_verified ?? 0) + (pc.cache_verified_recent ?? 0) + (pc.validated_consensus ?? 0);
  const inferred   = (pc.inferred_intelligence ?? 0) + (pc.derived_intelligence ?? 0) + (pc.inferred ?? 0);
  const failed     = pc.failed ?? 0;
  const validationPct = q.total_fields > 0
    ? Math.round(((q.total_fields - failed) / q.total_fields) * 100)
    : 0;

  const providerCounts: Record<string, number> = {};
  for (const prov of Object.values(data.provenance)) {
    const p = prov.provider;
    if (p && p !== "unknown" && p !== "cache" && p !== "failed" && p !== "supabase") {
      providerCounts[p] = (providerCounts[p] ?? 0) + 1;
    }
  }
  const providers = Object.entries(providerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k)
    .join(", ") || "cached";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold">Extraction Telemetry</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
          <span className="h-1 w-1 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Completeness" value={`${q.completeness_score?.toFixed(1) ?? 0}%`} icon={Shield} accent />
        <Stat label="Quality Score" value={`${q.quality_score?.toFixed(1) ?? 0}%`} icon={Activity} accent />
        <Stat label="Total Fields"  value={q.total_fields}   icon={Database} />
        <Stat label="Populated"     value={q.populated_fields} icon={Database} />
        <Stat label="Validation %" value={`${validationPct}%`} icon={Shield} />
        <Stat label="Providers"     value={providers}         icon={Cpu} />
      </div>

      {/* Provenance breakdown */}
      <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-border">
        {[
          { label: "Verified", count: verified,  color: "bg-success/10 text-success border-success/20" },
          { label: "Inferred", count: inferred,  color: "bg-warning/10 text-warning border-warning/20" },
          { label: "Failed",   count: failed,    color: "bg-destructive/10 text-destructive border-destructive/20" },
        ].map(({ label, count, color }) => (
          <span key={label} className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold", color)}>
            {label}: {count}
          </span>
        ))}
        {data.meta.record_updated_at && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {data.meta.record_updated_at === "Just now" ? "Just extracted" : data.meta.record_updated_at.slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  );
}
