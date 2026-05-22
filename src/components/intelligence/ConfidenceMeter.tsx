import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  value: number; // 0.0 – 1.0
  className?: string;
  showLabel?: boolean;
}

function getColor(v: number) {
  if (v >= 0.9) return "bg-success";
  if (v >= 0.75) return "bg-accent";
  if (v >= 0.5)  return "bg-warning";
  return "bg-destructive";
}

export function ConfidenceMeter({ value, className, showLabel = true }: ConfidenceMeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const color = getColor(value);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative h-1.5 w-10 overflow-hidden rounded-full bg-secondary">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </span>
      {showLabel && (
        <span className="font-mono text-[9px] font-bold tabular-nums text-muted-foreground">
          {pct}%
        </span>
      )}
    </span>
  );
}
