import { Database } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title = "No company data yet",
  description = "Once placement records are loaded into the database, this view will populate automatically.",
  icon,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <Database className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
