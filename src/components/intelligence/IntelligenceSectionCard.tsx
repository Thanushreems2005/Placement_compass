import { useState, memo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntelligenceFieldRenderer } from "./IntelligenceFieldRenderer";
import type { IntelligenceSection } from "@/types/canonicalIntelligence.types";

interface IntelligenceSectionCardProps {
  section: IntelligenceSection;
  defaultOpen?: boolean;
}

export const IntelligenceSectionCard = memo(function IntelligenceSectionCard({
  section,
  defaultOpen = true,
}: IntelligenceSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const filledCount = section.fields.filter(
    (f) => f.value !== null && f.value !== undefined && f.provenance?.provenance !== "FAILED",
  ).length;
  const pct = section.fields.length > 0 ? Math.round((filledCount / section.fields.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{section.emoji}</span>
          <span className="font-display text-sm font-semibold tracking-tight">{section.label}</span>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {filledCount}/{section.fields.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini completeness bar */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive/50",
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{pct}%</span>
          </div>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Fields grid */}
      {open && (
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.fields.map((f) => (
              <IntelligenceFieldRenderer
                key={f.key}
                fieldKey={f.key}
                value={f.value}
                provenance={f.provenance}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
