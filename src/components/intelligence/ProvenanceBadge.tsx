import { cn } from "@/lib/utils";
import type { ProvenanceLabel } from "@/types/canonicalIntelligence.types";

const CONFIG: Record<ProvenanceLabel, { label: string; color: string }> = {
  REAL_EXTRACTED:        { label: "Verified",      color: "bg-success/15 text-success border-success/30" },
  CACHE_VERIFIED:        { label: "Cached",         color: "bg-info/15 text-info border-info/30" },
  CACHE_VERIFIED_RECENT: { label: "Live Cache",     color: "bg-accent/15 text-accent border-accent/30" },
  VALIDATED_CONSENSUS:   { label: "Consensus",      color: "bg-primary/10 text-primary border-primary/20" },
  INFERRED_INTELLIGENCE: { label: "Inferred",       color: "bg-warning/15 text-warning border-warning/30" },
  DERIVED_INTELLIGENCE:  { label: "Derived",        color: "bg-warning/10 text-warning border-warning/20" },
  FAILED:                { label: "Unavailable",    color: "bg-destructive/10 text-destructive border-destructive/20" },
  NULL:                  { label: "Null",           color: "bg-muted text-muted-foreground border-border" },
  UNVERIFIED:            { label: "Unverified",     color: "bg-muted text-muted-foreground border-border" },
};

interface ProvenanceBadgeProps {
  provenance: ProvenanceLabel | string;
  className?: string;
}

export function ProvenanceBadge({ provenance, className }: ProvenanceBadgeProps) {
  const cfg = CONFIG[provenance as ProvenanceLabel] ?? {
    label: provenance,
    color: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        cfg.color,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
