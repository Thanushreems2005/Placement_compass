import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EMPTY, isEmpty } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

interface FieldProps {
  label: string;
  value?: string | number | null;
  children?: ReactNode;
  span?: 1 | 2 | 3 | "full";
  mono?: boolean;
}

/** Single labeled data cell — renders EMPTY placeholder when value missing. */
export function Field({ label, value, children, span = 1, mono }: FieldProps) {
  const spanClass =
    span === "full"
      ? "sm:col-span-full"
      : span === 3
        ? "sm:col-span-3"
        : span === 2
          ? "sm:col-span-2"
          : "";
  const empty = children == null && isEmpty(value);
  return (
    <div className={cn("flex flex-col gap-1", spanClass)}>
      <span className="field-label">{label}</span>
      <div
        className={cn(
          "text-sm leading-relaxed text-foreground",
          mono && "font-mono text-[13px]",
          empty && "text-muted-foreground",
        )}
      >
        {children ?? (empty ? EMPTY : value)}
      </div>
    </div>
  );
}

/** Long-form prose field — used for narrative columns like overview_text. */
export function ProseField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      {isEmpty(value) ? (
        <p className="text-sm text-muted-foreground">{EMPTY}</p>
      ) : (
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 text-pretty">
          {value}
        </p>
      )}
    </div>
  );
}

/** Render an array of strings as chips. */
export function TagsField({ label, values }: { label: string; values?: string[] | string | null }) {
  // Normalize values to array
  let arrayValues: string[] = [];
  if (Array.isArray(values)) {
    arrayValues = values;
  } else if (typeof values === "string" && values.length > 0) {
    try {
      const parsed = JSON.parse(values);
      arrayValues = Array.isArray(parsed) ? parsed : [];
    } catch {
      arrayValues = [];
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      {!arrayValues || arrayValues.length === 0 ? (
        <span className="text-sm text-muted-foreground">{EMPTY}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {arrayValues.map((v) => (
            <Badge key={v} variant="secondary" className="font-normal">
              {v}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
