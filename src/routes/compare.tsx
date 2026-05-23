/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useCompanies, useCompany } from "@/hooks/use-companies";
import { CompanyLogo } from "@/components/CompanyLogo";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNumber, fmtPercent, fmtRating, fmtText, isEmpty } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft } from "lucide-react";
import type { CompanyListItem, CompanyRow } from "@/lib/company-types";

const searchSchema = z.object({
  a: fallback(z.string().optional(), undefined),
  b: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/compare")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Compare · PES Placement Intelligence" },
      {
        name: "description",
        content:
          "Side-by-side comparison of two companies across culture, compensation, learning, financials and technology.",
      },
    ],
  }),
  component: ComparePage,
});

const NONE = "__none__";

import { COMPANY_FIELDS } from "@/lib/company-constants";

const ROWS = COMPANY_FIELDS.map((f) => ({
  group: f.group,
  label: f.label,
  pick: (c: CompanyRow) => {
    const val = (c as any)[f.key];
    if (f.type === "percent") return fmtPercent(val as number);
    if (f.type === "rating") return fmtRating(val as number);
    if (f.type === "number") return fmtNumber(val as number);
    if (f.type === "tags") return (val as string[])?.join(", ") || "—";
    if (f.type === "json") return val ? "View details" : "—";
    return fmtText(val as string);
  },
}));

function ComparePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const all = useCompanies({ sort: "name", limit: 500 });
  const a = useCompany(search.a);
  const b = useCompany(search.b);

  const setSide = (side: "a" | "b", value: string) =>
    navigate({
      search: (prev) => ({ ...prev, [side]: value === NONE ? undefined : value }),
    });

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <span className="label-eyebrow">Comparison</span>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Compare two companies
      </h1>
      <p className="text-sm text-muted-foreground">
        Strengths, trade-offs and risk areas across culture, compensation, learning, financials and
        technology — only fields with values are highlighted.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <PickerCard side="A" id={search.a} all={all.data ?? []} onChange={(v) => setSide("a", v)} />
        <div className="hidden items-center justify-center sm:flex">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
        </div>
        <PickerCard side="B" id={search.b} all={all.data ?? []} onChange={(v) => setSide("b", v)} />
      </div>

      {a.data && b.data ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          {Array.from(new Set(ROWS.map((r) => r.group))).map((group) => (
            <div key={group}>
              <div className="border-y border-border bg-secondary/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group}
              </div>
              {ROWS.filter((r) => r.group === group).map((r) => {
                const va = r.pick(a.data!);
                const vb = r.pick(b.data!);
                return (
                  <div
                    key={r.label}
                    className="grid grid-cols-[1fr_2fr_2fr] items-start gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0"
                  >
                    <div className="text-xs font-medium text-muted-foreground">{r.label}</div>
                    <Cell value={va} highlight={va !== vb && !isEmpty(va)} />
                    <Cell value={vb} highlight={va !== vb && !isEmpty(vb)} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          {a.isLoading || b.isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <EmptyState
              title="Pick two companies to compare"
              description="Select Company A and Company B above. Differences will be highlighted automatically."
            />
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ value, highlight }: { value: string; highlight: boolean }) {
  return (
    <div
      className={
        highlight
          ? "rounded-md bg-accent/10 px-2 py-1 text-foreground ring-1 ring-accent/30"
          : "px-2 py-1 text-foreground"
      }
    >
      {value}
    </div>
  );
}

function PickerCard({
  side,
  id,
  all,
  onChange,
}: {
  side: string;
  id: string | undefined;
  all: CompanyListItem[];
  onChange: (value: string) => void;
}) {
  const selected = all.find((c) => c.id === id);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <span className="field-label">Company {side}</span>
      <Select value={id ?? NONE} onValueChange={onChange}>
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Select a company" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {all.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
          <CompanyLogo name={selected.name} url={selected.logo_url} size={36} />
          <div className="min-w-0">
            <div className="truncate font-display font-semibold">{selected.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {fmtText(selected.category)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
