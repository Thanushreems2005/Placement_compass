import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning" | "info" | "secondary";
  loading?: boolean;
  className?: string;
}

const ACCENT: Record<NonNullable<Props["accent"]>, string> = {
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  secondary: "text-secondary-foreground",
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
  loading = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="field-label">{label}</span>
        {Icon && <Icon className={cn("h-4 w-4", ACCENT[accent])} />}
      </div>
      <div className="font-display text-3xl font-semibold tracking-tight tabular-nums">
        {loading ? "Loading…" : value}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
