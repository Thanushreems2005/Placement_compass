import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useCompanies, useFilterFacets } from "@/hooks/use-companies";
import { CompanyCard } from "@/components/CompanyCard";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Search, X } from "lucide-react";

const searchSchema = z.object({
  q: fallback(z.string().optional(), undefined),
  category: fallback(z.string().optional(), undefined),
  focus_sector: fallback(z.string().optional(), undefined),
  profitability: fallback(z.string().optional(), undefined),
  remote: fallback(z.string().optional(), undefined),
  hiring_velocity: fallback(z.string().optional(), undefined),
  sort: fallback(z.enum(["name", "yoy_growth_rate", "brand_value"]), "name").default("name"),
  asc: fallback(z.boolean(), true).default(true),
});

export const Route = createFileRoute("/explore")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Explore Companies · PES Placement Intelligence" },
      {
        name: "description",
        content:
          "Filter and sort every company in the PES placement database by category, sector, hiring velocity, profitability and more.",
      },
    ],
  }),
  component: ExplorePage,
});

const ANY = "__any__";

function ExplorePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const facets = useFilterFacets();

  const list = useCompanies({
    q: search.q,
    category: search.category ?? null,
    focusSector: search.focus_sector ?? null,
    profitability: search.profitability ?? null,
    remotePolicy: search.remote ?? null,
    hiringVelocity: search.hiring_velocity ?? null,
    sort: search.sort,
    ascending: search.asc,
  });

  const setParam = (key: keyof typeof search, value: unknown) => {
    navigate({
      search: (prev) => ({
        ...prev,
        [key]: value === undefined || value === "" ? undefined : value,
      }),
    });
  };

  const setSelect = (key: keyof typeof search, raw: string) =>
    setParam(key, raw === ANY ? undefined : raw);

  const activeCount = [
    search.q,
    search.category,
    search.focus_sector,
    search.profitability,
    search.remote,
    search.hiring_velocity,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <span className="label-eyebrow">Explore</span>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Companies coming to campus
        </h1>
        <p className="text-sm text-muted-foreground">
          {list.isLoading
            ? "Loading…"
            : `${list.data?.length ?? 0} companies match the current filters.`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <label className="field-label">Search</label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search.q ?? ""}
              onChange={(e) => setParam("q", e.target.value || undefined)}
              placeholder="name, short name…"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <FacetSelect
          label="Category"
          value={search.category}
          options={facets.data?.category}
          onChange={(v) => setSelect("category", v)}
        />
        <FacetSelect
          label="Focus sector"
          value={search.focus_sector}
          options={facets.data?.focus_sectors}
          onChange={(v) => setSelect("focus_sector", v)}
        />
        <FacetSelect
          label="Profitability"
          value={search.profitability}
          options={facets.data?.profitability_status}
          onChange={(v) => setSelect("profitability", v)}
        />
        <FacetSelect
          label="Remote policy"
          value={search.remote}
          options={facets.data?.remote_policy_details}
          onChange={(v) => setSelect("remote", v)}
        />
        <FacetSelect
          label="Hiring velocity"
          value={search.hiring_velocity}
          options={facets.data?.hiring_velocity}
          onChange={(v) => setSelect("hiring_velocity", v)}
        />

        <div className="md:col-span-2">
          <label className="field-label">Sort by</label>
          <Select value={search.sort} onValueChange={(v) => setParam("sort", v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="yoy_growth_rate">YoY growth</SelectItem>
              <SelectItem value="brand_value">Brand value</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2 md:col-span-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setParam("asc", !search.asc)}
            className="w-full"
          >
            <ArrowDownUp className="mr-1 h-3 w-3" />
            {search.asc ? "Asc" : "Desc"}
          </Button>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ search: { sort: "name", asc: true } })}
              className="shrink-0"
            >
              <X className="h-3 w-3" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        {list.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : list.error ? (
          <EmptyState title="Couldn’t load companies" description={(list.error as Error).message} />
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No matches"
            description="No companies match these filters yet. Try clearing some, or load more records into the database."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.data!.map((c) => (
              <CompanyCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[] | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="md:col-span-2">
      <label className="field-label">{label}</label>
      <Select value={value ?? ANY} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {(options ?? []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
