import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  title: string;
  number?: number;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ id, title, number, description, icon, children, className }: Props) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 rounded-xl border border-border bg-surface shadow-sm", className)}
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        {icon && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {number !== undefined && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Section {String(number).padStart(2, "0")}
              </span>
            )}
          </div>
          <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}
