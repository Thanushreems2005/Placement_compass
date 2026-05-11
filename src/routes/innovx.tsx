import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  Code2,
  Filter,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useInnovXIndex, useInnovXFacets } from "@/hooks/use-innovx";
import type { CompanyInnovX, InnovXProject } from "@/hooks/use-innovx";
import { useCompanies } from "@/hooks/use-companies";
import type { CompanyListItem } from "@/lib/company-types";
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

export const Route = createFileRoute("/innovx")({
  head: () => ({
    meta: [
      { title: "InnovX Accelerator Intelligence · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Company innovation intelligence — strategy mapping, project recommendations, and skill alignment to help students stand out.",
      },
    ],
  }),
  component: InnovXPage,
});

const ANY = "__any__";

/* ─── Innovation type badge colors ───────────────────────────── */

const TYPE_COLORS: Record<string, string> = {
  "AI-Driven": "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30",
  "Data-Centric": "bg-blue-500/15 text-blue-600 border-blue-500/30",
  "Platform-Based": "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "Service-Oriented": "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  "Cloud-Native": "bg-violet-500/15 text-violet-600 border-violet-500/30",
  "Automation-Led": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/30",
  Medium: "bg-warning/10 text-warning border-warning/30",
  Hard: "bg-destructive/10 text-destructive border-destructive/30",
};

function InnovXPage() {
  const [q, setQ] = useState("");
  const [innovationType, setInnovationType] = useState(ANY);
  const [areaFilter, setAreaFilter] = useState(ANY);
  const entries = useInnovXIndex();
  const companies = useCompanies({ sort: "name", limit: 500 });
  const allEntries = useMemo(() => entries.data ?? [], [entries.data]);

  const companyMap = useMemo(() => {
    const map = new Map<string, CompanyListItem>();
    for (const c of companies.data ?? []) map.set(c.id, c);
    return map;
  }, [companies.data]);

  const facets = useInnovXFacets(allEntries);

  /* Filter */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return allEntries.filter((entry) => {
      const matchesSearch =
        !term ||
        entry.companyName.toLowerCase().includes(term) ||
        entry.data.innovation_areas.some((a) => a.toLowerCase().includes(term)) ||
        entry.data.required_skills.some((s) => s.toLowerCase().includes(term));

      const matchesType = innovationType === ANY || entry.innovationType === innovationType;
      const matchesArea = areaFilter === ANY || entry.data.innovation_areas.includes(areaFilter);

      return matchesSearch && matchesType && matchesArea;
    });
  }, [allEntries, q, innovationType, areaFilter]);

  /* Stats */
  const stats = useMemo(() => {
    const totalProjects = allEntries.reduce((s, e) => s + e.data.recommended_projects.length, 0);
    const allSkills = new Set(allEntries.flatMap((e) => e.data.required_skills));
    const highImpact = allEntries.reduce(
      (s, e) => s + e.data.recommended_projects.filter((p) => p.difficulty === "Hard").length,
      0,
    );
    return {
      companies: allEntries.length,
      totalProjects,
      uniqueSkills: allSkills.size,
      highImpact,
    };
  }, [allEntries]);

  const loading = entries.isLoading;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <span className="label-eyebrow">InnovX Accelerator Intelligence</span>
      <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Build projects that make companies notice you
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Map company innovation strategy to student projects. Understand what each company is
            building, the skills they need, and the projects that will set you apart in interviews.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <Metric label="Companies" value={stats.companies} icon={Lightbulb} />
          <Metric label="Projects" value={stats.totalProjects} icon={Rocket} />
          <Metric label="Skills" value={stats.uniqueSkills} icon={Code2} />
          <Metric label="High Impact" value={stats.highImpact} icon={Zap} />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-4 lg:grid-cols-[1fr_180px_180px_auto]">
        <div>
          <label className="field-label">Search</label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Company, skill or innovation area"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Innovation type</label>
          <Select value={innovationType} onValueChange={setInnovationType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All types</SelectItem>
              {facets.innovationTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="field-label">Focus area</label>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All areas</SelectItem>
              {facets.innovationAreas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setQ("");
              setInnovationType(ANY);
              setAreaFilter(ANY);
            }}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Company cards */}
      <section className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={allEntries.length ? "No companies matched" : "No InnovX data found"}
            description={
              allEntries.length
                ? "Adjust the search or filters."
                : "Load InnovX records into the innovx_json table first."
            }
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((entry) => (
              <InnovXCompanyCard
                key={entry.id}
                entry={entry}
                company={companyMap.get(entry.companyId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Metric ─────────────────────────────────────────────────── */

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Lightbulb;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <Icon className="mx-auto h-4 w-4 text-accent" />
      <div className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="field-label">{label}</div>
    </div>
  );
}

/* ─── Company card ───────────────────────────────────────────── */

function InnovXCompanyCard({ entry, company }: { entry: CompanyInnovX; company?: CompanyListItem }) {
  const { data } = entry;
  const typeColor =
    TYPE_COLORS[entry.innovationType] ?? "bg-secondary text-muted-foreground border-border";

  return (
    <article className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {entry.companyName}
            </h2>
            <Badge variant="outline" className={cn("text-[11px] font-semibold", typeColor)}>
              {entry.innovationType}
            </Badge>
          </div>
          {data.company_strategy && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground line-clamp-2">
              {data.company_strategy}
            </p>
          )}
        </div>
        <Link
          to="/company/$companyId"
          params={{ companyId: entry.companyId }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
        >
          Company Profile <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Company Overview */}
      {company?.overview_text && (
        <div className="mx-5 mt-3 rounded-lg bg-secondary/20 p-3 text-xs text-muted-foreground italic">
          {company.overview_text}
        </div>
      )}

      <div className="px-5 py-4">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex items-center justify-between group">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                <Sparkles className="h-3.5 w-3.5" /> Innovation Intelligence & Projects
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6">
            {/* Innovation areas + skills */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {data.innovation_areas.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Target className="h-3.5 w-3.5 text-accent" /> Innovation Areas
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.innovation_areas.map((area) => (
                      <Badge key={area} variant="outline" className="font-normal">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.required_skills.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Required Skills
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.required_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Digital transformation focus */}
            {data.digital_transformation_focus.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" /> Digital Transformation Focus
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.digital_transformation_focus.map((focus) => (
                    <Badge key={focus} variant="secondary" className="font-normal text-[11px]">
                      {focus}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Business problems + Preparation strategy (expandable) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.business_problems.length > 0 && (
                <ExpandableSection title="Business Problems" icon={Brain}>
                  <ul className="space-y-1.5">
                    {data.business_problems.map((problem, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {problem}
                      </li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}
              {data.preparation_strategy && (
                <ExpandableSection title="Preparation Strategy" icon={Target}>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.preparation_strategy}
                  </p>
                </ExpandableSection>
              )}
            </div>

            {/* Differentiation tip */}
            {data.differentiation_tip && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Zap className="h-3.5 w-3.5" /> Differentiation Tip
                </div>
                <p className="mt-1 text-sm text-foreground">{data.differentiation_tip}</p>
              </div>
            )}

            {/* Recommended projects */}
            {data.recommended_projects.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Rocket className="h-4 w-4 text-accent" />
                  Recommended Projects
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    — What should a student build to stand out?
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.recommended_projects.map((project, idx) => (
                    <ProjectCard key={`${project.title}-${idx}`} project={project} />
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </article>
  );
}

/* ─── Project card ───────────────────────────────────────────── */

function ProjectCard({ project }: { project: InnovXProject }) {
  const diffColor =
    DIFFICULTY_COLORS[project.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const isHighImpact = project.difficulty === "Hard";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border border-border bg-background p-4 transition-all hover:shadow-md hover:-translate-y-0.5",
        isHighImpact && "border-accent/40 ring-1 ring-accent/20",
      )}
    >
      {isHighImpact && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
          High Impact
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-sm font-semibold tracking-tight">{project.title}</h4>
        <Badge variant="outline" className={cn("shrink-0 text-[10px] font-semibold", diffColor)}>
          {project.difficulty}
        </Badge>
      </div>
      {project.description && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">{project.description}</p>
      )}
      {project.tech_stack.length > 0 && (
        <div className="mt-auto pt-3">
          <div className="flex flex-wrap gap-1">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
      {project.expected_outcome && (
        <div className="mt-2 rounded-md bg-secondary/50 px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Why this project matters
          </span>
          <p className="mt-0.5 text-[11px] text-foreground">{project.expected_outcome}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Expandable section ─────────────────────────────────────── */

function ExpandableSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Brain;
  children: React.ReactNode;
}) {
  return (
    <Collapsible>
      <div className="rounded-lg border border-border bg-background">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-secondary/50">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Icon className="h-3.5 w-3.5 text-accent" />
            {title}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border px-3 py-2.5">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
