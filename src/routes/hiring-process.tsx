import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  DollarSign,
  Filter,
  GraduationCap,
  Search,
  X,
} from "lucide-react";
import { useCompanies } from "@/hooks/use-companies";
import { HIRING_ROUNDS_ENABLED, processTags, useJobRoleIndex } from "@/hooks/use-hiring-rounds";
import type { CompanyListItem } from "@/lib/company-types";
import type { CompanyJobRoles, JobRole } from "@/hooks/use-hiring-rounds";
import { HiringProcessTimeline } from "@/components/HiringProcessTimeline";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hiring-process")({
  head: () => ({
    meta: [
      { title: "Hiring Process Intelligence · PES Placement Intelligence" },
      {
        name: "description",
        content:
          "Company-specific hiring pipelines, round difficulty, skill sets, and preparation focus.",
      },
    ],
  }),
  component: HiringProcessPage,
});

const ANY = "__any__";

function HiringProcessPage() {
  const [q, setQ] = useState("");
  const [roleCategory, setRoleCategory] = useState(ANY);
  const [opportunityType, setOpportunityType] = useState(ANY);
  const [roundCount, setRoundCount] = useState(ANY);
  const [selected, setSelected] = useState<string[]>([]);
  const companies = useCompanies({ sort: "name", limit: 500 });
  const jobRoleData = useJobRoleIndex();

  /* Merge company list items with job-role data */
  const companyMap = useMemo(() => {
    const map = new Map<string, CompanyListItem>();
    for (const company of companies.data ?? []) map.set(company.id, company);
    return map;
  }, [companies.data]);

  /* Facet values for filter dropdowns */
  const facets = useMemo(() => {
    const categories = new Set<string>();
    const opTypes = new Set<string>();
    for (const entry of jobRoleData.data ?? []) {
      for (const role of entry.roles) {
        if (role.role_category) categories.add(role.role_category);
        if (role.opportunity_type) opTypes.add(role.opportunity_type);
      }
    }
    return {
      roleCategories: Array.from(categories).sort(),
      opportunityTypes: Array.from(opTypes).sort(),
    };
  }, [jobRoleData.data]);

  /* Enriched entries: company info + job roles */
  type EnrichedEntry = CompanyJobRoles & { company: CompanyListItem | undefined };

  const enriched: EnrichedEntry[] = useMemo(() => {
    return (jobRoleData.data ?? []).map((entry) => ({
      ...entry,
      company: companyMap.get(entry.companyId),
    }));
  }, [companyMap, jobRoleData.data]);

  /* Also include companies that have NO job role data yet */
  const allEntries: EnrichedEntry[] = useMemo(() => {
    const coveredIds = new Set(enriched.map((e) => e.companyId));
    const extras: EnrichedEntry[] = (companies.data ?? [])
      .filter((c) => !coveredIds.has(c.id))
      .map((c) => ({
        companyId: c.id,
        company_name: c.name,
        roles: [],
        company: c,
      }));
    return [...enriched, ...extras];
  }, [enriched, companies.data]);

  /* Apply filters */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allEntries.filter((item) => {
      const name = item.company?.name ?? item.company_name;
      const matchesSearch =
        !term ||
        name.toLowerCase().includes(term) ||
        (item.company?.short_name ?? "").toLowerCase().includes(term) ||
        (item.company?.category ?? "").toLowerCase().includes(term);

      const totalRounds = item.roles.reduce((sum, r) => sum + r.rounds.length, 0);
      const matchesRoundCount =
        roundCount === ANY ||
        (roundCount === "1-3" && totalRounds >= 1 && totalRounds <= 3) ||
        (roundCount === "4-5" && totalRounds >= 4 && totalRounds <= 5) ||
        (roundCount === "6+" && totalRounds >= 6);

      const matchesRoleCategory =
        roleCategory === ANY || item.roles.some((r) => r.role_category === roleCategory);

      const matchesOpportunityType =
        opportunityType === ANY || item.roles.some((r) => r.opportunity_type === opportunityType);

      return matchesSearch && matchesRoundCount && matchesRoleCategory && matchesOpportunityType;
    });
  }, [allEntries, q, roundCount, roleCategory, opportunityType]);

  /* Aggregate stats */
  const stats = useMemo(() => {
    const totalRoles = allEntries.reduce((sum, e) => sum + e.roles.length, 0);
    const totalRounds = allEntries.reduce(
      (sum, e) => sum + e.roles.reduce((s, r) => s + r.rounds.length, 0),
      0,
    );
    const companiesWithRoles = allEntries.filter((e) => e.roles.length > 0).length;
    const avgRounds = companiesWithRoles > 0 ? Math.round(totalRounds / companiesWithRoles) : 0;
    return { total: allEntries.length, totalRoles, avgRounds };
  }, [allEntries]);

  /* Selected companies for compare */
  const selectedEntries = selected
    .map((id) => allEntries.find((e) => e.companyId === id))
    .filter((e): e is EnrichedEntry => !!e);

  const loading = companies.isLoading || jobRoleData.isLoading;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <span className="label-eyebrow">Hiring Process Intelligence</span>
      <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Decode every company hiring pipeline
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Search companies, inspect role-specific hiring rounds with skill sets and typical
            questions, compare pipelines and filter by role category or opportunity type.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Metric label="Companies" value={stats.total} />
          <Metric label="Roles" value={stats.totalRoles} />
          <Metric label="Avg rounds" value={stats.avgRounds} />
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 lg:grid-cols-[1fr_160px_160px_160px_auto]">
        <div>
          <label className="field-label">Search company</label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Company name, short name or category"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Role category</label>
          <Select value={roleCategory} onValueChange={setRoleCategory}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              {facets.roleCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="field-label">Opportunity</label>
          <Select value={opportunityType} onValueChange={setOpportunityType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              {facets.opportunityTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="field-label">Round count</label>
          <Select value={roundCount} onValueChange={setRoundCount}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any</SelectItem>
              <SelectItem value="1-3">1-3 rounds</SelectItem>
              <SelectItem value="4-5">4-5 rounds</SelectItem>
              <SelectItem value="6+">6+ rounds</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setQ("");
              setRoleCategory(ANY);
              setOpportunityType(ANY);
              setRoundCount(ANY);
            }}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {!HIRING_ROUNDS_ENABLED && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Hiring-round queries are disabled until the Supabase migration is applied. Companies are
          still shown below; set{" "}
          <code className="rounded bg-background px-1 font-mono text-xs">
            VITE_ENABLE_HIRING_ROUNDS=true
          </code>{" "}
          after creating{" "}
          <code className="rounded bg-background px-1 font-mono text-xs">
            job_role_details_json
          </code>
          .
        </div>
      )}

      {/* ── Compare panel ────────────────────────────────────── */}
      {selectedEntries.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold tracking-tight">
                Compare selected pipelines
              </h2>
              <p className="text-xs text-muted-foreground">
                Select up to three companies from the list below.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {selectedEntries.map((entry) => (
              <CompareColumn key={entry.companyId} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* ── Company cards ────────────────────────────────────── */}
      <section className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={companies.data?.length ? "No companies matched" : "No companies found"}
            description={
              companies.data?.length
                ? "Adjust the search or filters to see more companies."
                : "Load company records into the database first."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filtered.map((entry) => (
              <CompanyRolesCard
                key={entry.companyId}
                entry={entry}
                selected={selected.includes(entry.companyId)}
                onToggle={() =>
                  setSelected((current) => {
                    if (current.includes(entry.companyId)) {
                      return current.filter((id) => id !== entry.companyId);
                    }
                    return current.length >= 3 ? current : [...current, entry.companyId];
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Metric tile ────────────────────────────────────────────── */

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="field-label">{label}</div>
    </div>
  );
}

/* ─── Company card with role sections ────────────────────────── */

type EnrichedEntry = CompanyJobRoles & { company: CompanyListItem | undefined };

function CompanyRolesCard({
  entry,
  selected,
  onToggle,
}: {
  entry: EnrichedEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  const allRounds = entry.roles.flatMap((r) => r.rounds);
  const tags = processTags(allRounds);

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-accent" />
            <h2 className="truncate font-display text-lg font-semibold tracking-tight">
              {entry.company?.name ?? entry.company_name}
            </h2>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {entry.roles.length} role{entry.roles.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {allRounds.length} round{allRounds.length !== 1 ? "s" : ""}
            </Badge>
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className={tagClass(tag)}>
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant={selected ? "default" : "outline"} size="sm" onClick={onToggle}>
            {selected ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
            Compare
          </Button>
          <Link
            to="/company/$companyId"
            params={{ companyId: entry.companyId }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
          >
            Profile <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Company Overview */}
      {entry.company?.overview_text && (
        <div className="mt-3 rounded-lg bg-secondary/20 p-3 text-xs text-muted-foreground line-clamp-3 italic">
          {entry.company.overview_text}
        </div>
      )}

      {/* Role sections */}
      <div className="mt-4 space-y-3">
        {entry.roles.length > 0 ? (
          entry.roles.map((role, idx) => (
            <RoleSection key={`${role.role_title}-${idx}`} role={role} />
          ))
        ) : (
          <EmptyPipeline companyId={entry.companyId} />
        )}
      </div>
    </article>
  );
}

/* ─── Single role section (collapsible) ──────────────────────── */

function RoleSection({ role }: { role: JobRole }) {
  const fmtCTC =
    role.ctc_or_stipend != null
      ? role.compensation === "Stipend"
        ? `₹${role.ctc_or_stipend.toLocaleString("en-IN")}/mo`
        : `₹${(role.ctc_or_stipend / 100000).toFixed(1)} LPA`
      : null;

  return (
    <Collapsible defaultOpen={false}>
      <div className="rounded-lg border border-border bg-background">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/50">
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="h-4 w-4 text-accent" />
            <span className="font-display text-sm font-semibold">{role.role_title}</span>
            {role.role_category && (
              <Badge variant="outline" className="font-normal text-[11px]">
                {role.role_category.replace(/_/g, " ")}
              </Badge>
            )}
            {role.opportunity_type && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[11px]",
                  role.opportunity_type === "Internship" &&
                    "bg-blue-500/10 text-blue-600 border-blue-500/30",
                  role.opportunity_type === "Employment" &&
                    "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                )}
              >
                {role.opportunity_type}
              </Badge>
            )}
            {fmtCTC && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                <DollarSign className="h-3 w-3" />
                {fmtCTC}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-4 py-3">
            {/* Description + benefits row */}
            {(role.job_description || role.bonus || role.benefits_summary) && (
              <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg bg-secondary/30 p-3 text-xs sm:grid-cols-2">
                {role.job_description && (
                  <div className="sm:col-span-2">
                    <span className="field-label">Job description</span>
                    <p className="mt-0.5 text-muted-foreground line-clamp-3">
                      {role.job_description}
                    </p>
                  </div>
                )}
                {role.bonus && (
                  <div>
                    <span className="field-label">Bonus</span>
                    <p className="mt-0.5 text-muted-foreground">{role.bonus}</p>
                  </div>
                )}
                {role.benefits_summary && (
                  <div>
                    <span className="field-label">Benefits</span>
                    <p className="mt-0.5 text-muted-foreground">{role.benefits_summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Hiring rounds timeline */}
            {role.rounds.length > 0 ? (
              <HiringProcessTimeline rounds={role.rounds} />
            ) : (
              <p className="text-sm text-muted-foreground">No hiring rounds specified.</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ─── Compare column ─────────────────────────────────────────── */

function CompareColumn({ entry }: { entry: EnrichedEntry }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <h3 className="truncate font-display text-sm font-semibold">
        {entry.company?.name ?? entry.company_name}
      </h3>
      <p className="text-xs text-muted-foreground">
        {entry.roles.length} role{entry.roles.length !== 1 ? "s" : ""} ·{" "}
        {entry.roles.reduce((s, r) => s + r.rounds.length, 0)} rounds
      </p>
      <div className="mt-3 space-y-2">
        {entry.roles.length > 0 ? (
          entry.roles.map((role, idx) => (
            <div key={`${role.role_title}-${idx}`}>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <GraduationCap className="h-3 w-3 text-accent" />
                {role.role_title}
                {role.ctc_or_stipend != null && (
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    ₹{role.ctc_or_stipend.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <HiringProcessTimeline rounds={role.rounds} compact />
              </div>
            </div>
          ))
        ) : (
          <EmptyPipeline companyId={entry.companyId} compact />
        )}
      </div>
    </div>
  );
}

/* ─── Empty pipeline ─────────────────────────────────────────── */

function EmptyPipeline({ companyId, compact = false }: { companyId: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
      <div>No hiring rounds added yet.</div>
      {!compact && (
        <Link
          to="/company/$companyId"
          params={{ companyId }}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          Open company profile <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ─── Tag styling ────────────────────────────────────────────── */

function tagClass(tag: string) {
  return cn(
    tag === "Coding Heavy" && "border-accent/40 bg-accent/10 text-accent",
    tag === "Aptitude Heavy" && "border-warning/40 bg-warning/10 text-warning",
    tag === "Interview Heavy" && "border-info/40 bg-info/10 text-info",
  );
}
