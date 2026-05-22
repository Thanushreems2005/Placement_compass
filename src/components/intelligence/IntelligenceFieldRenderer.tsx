import { memo } from "react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import type { FieldProvenance } from "@/types/canonicalIntelligence.types";

function humanizeKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): { display: string; isEmpty: boolean } {
  if (value === null || value === undefined) return { display: "—", isEmpty: true };
  if (typeof value === "boolean") return { display: value ? "Yes" : "No", isEmpty: false };
  if (typeof value === "number") {
    // detect large monetary values
    if (Math.abs(value) >= 1_000_000) {
      const b = value / 1_000_000_000;
      const m = value / 1_000_000;
      return {
        display: Math.abs(b) >= 1 ? `$${b.toFixed(2)}B` : `$${m.toFixed(1)}M`,
        isEmpty: false,
      };
    }
    return { display: value.toLocaleString(), isEmpty: false };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { display: "—", isEmpty: true };
    const flat = value.map((v) =>
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v),
    );
    return { display: flat.join(" · "), isEmpty: false };
  }
  if (typeof value === "object" && value !== null) {
    const detail = (value as Record<string, unknown>).details;
    if (detail) return { display: String(detail), isEmpty: false };
    return { display: JSON.stringify(value), isEmpty: false };
  }
  const str = String(value).trim();
  if (!str || str.toLowerCase() === "null" || str === "NA" || str === "0")
    return { display: "—", isEmpty: true };
  return { display: str, isEmpty: false };
}

interface IntelligenceFieldRendererProps {
  fieldKey: string;
  value: unknown;
  provenance: FieldProvenance | null;
  compact?: boolean;
}

export const IntelligenceFieldRenderer = memo(function IntelligenceFieldRenderer({
  fieldKey,
  value,
  provenance,
  compact = false,
}: IntelligenceFieldRendererProps) {
  const { display, isEmpty } = formatValue(value);
  const isFailed = !provenance || provenance.provenance === "FAILED" || isEmpty;

  if (compact && isFailed) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-2.5 text-xs transition-colors",
        isFailed
          ? "border-border/50 bg-secondary/20 opacity-60"
          : "border-border bg-surface hover:border-accent/30 hover:bg-accent/5",
      )}
    >
      {/* Field label */}
      <span className="field-label truncate">{humanizeKey(fieldKey)}</span>

      {/* Value */}
      <span
        className={cn(
          "font-medium leading-snug break-words",
          isFailed ? "text-muted-foreground italic" : "text-foreground",
        )}
        title={String(display)}
      >
        {isFailed ? "Unavailable" : display.length > 120 ? display.slice(0, 120) + "…" : display}
      </span>

      {/* Provenance + confidence */}
      {provenance && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <ProvenanceBadge provenance={provenance.provenance} />
          {provenance.confidence > 0 && (
            <ConfidenceMeter value={provenance.confidence} />
          )}
        </div>
      )}
    </div>
  );
});
