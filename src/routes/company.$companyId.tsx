import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  DollarSign,
  GitCompareArrows,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Rocket,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCompany } from "@/hooks/use-companies";
import { useJobRoleDetails } from "@/hooks/use-hiring-rounds";
import type { CompanyJobRoles, JobRole } from "@/hooks/use-hiring-rounds";
import { useInnovX } from "@/hooks/use-innovx";
import type { CompanyInnovX, InnovXProject } from "@/hooks/use-innovx";
import { CompanyLogo } from "@/components/CompanyLogo";
import { HiringProcessTimeline } from "@/components/HiringProcessTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SectionCard } from "@/components/SectionCard";
import {
  SECTIONS,
  Section1Overview,
  Section2Business,
  Section3Culture,
  Section4Growth,
  Section5Comp,
  Section6Logistics,
  Section7Financials,
  Section8Tech,
  Section9Leadership,
  Section10Brand,
} from "@/components/company-sections";
import { fmtText } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/company/$companyId")({
  head: () => ({
    meta: [
      { title: "Company Profile · PES Placement Intelligence" },
      {
        name: "description",
        content:
          "Deeply structured intelligence across hiring, culture, financials, technology, leadership and brand for a single company.",
      },
    ],
  }),
  component: CompanyDetailPage,
});

function CompanyDetailPage() {
  const { companyId } = Route.useParams();
  const { data: c, isLoading, error } = useCompany(companyId);
  const jobRoles = useJobRoleDetails(companyId);
  const innovx = useInnovX(companyId);
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  // Sticky in-page nav highlighting
  useEffect(() => {
    if (!c) return;
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(s.id);
        },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [c]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <Skeleton className="h-32 rounded-xl" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <EmptyState title="Couldn’t load company" description={(error as Error).message} />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
        <EmptyState
          title="Company not found"
          description="This company id does not exist in the database."
          action={
            <Link to="/explore" className="text-sm font-medium text-accent hover:underline">
              Back to Explore
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-accent"
      >
        <ArrowLeft className="h-3 w-3" /> Explore
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center">
        <CompanyLogo name={c.name} url={c.logo_url} website={c.website_url} size={72} />
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {fmtText(c.category)}
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {c.name}
            {c.short_name && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                · {c.short_name}
              </span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{fmtText(c.headquarters_address)}</span>
            <span>·</span>
            <span>{fmtText(c.employee_size)}</span>
            <span>·</span>
            <span>{fmtText(c.hiring_velocity)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(c.focus_sectors ?? []).slice(0, 6).map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <Link
          to="/compare"
          search={{ a: c.id } as never}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <GitCompareArrows className="h-3.5 w-3.5" /> Compare
        </Link>
      </div>

      {/* Body: sticky nav + sections */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-2 text-sm">
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  active === s.id && "bg-secondary text-foreground",
                )}
              >
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <s.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs">{s.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex flex-col gap-6">
          <HiringProcessCard
            loading={jobRoles.isLoading}
            error={jobRoles.error}
            data={jobRoles.data ?? null}
          />
          <InnovXAcceleratorCard
            loading={innovx.isLoading}
            error={innovx.error}
            data={innovx.data ?? null}
          />
          <Section1Overview c={c} />
          <Section2Business c={c} />
          <Section3Culture c={c} />
          <Section4Growth c={c} />
          <Section5Comp c={c} />
          <Section6Logistics c={c} />
          <Section7Financials c={c} />
          <Section8Tech c={c} />
          <Section9Leadership c={c} />
          <Section10Brand c={c} />
        </div>
      </div>
    </div>
  );
}

function HiringProcessCard({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: Error | null;
  data: CompanyJobRoles | null;
}) {
  if (loading) {
    return (
      <SectionCard
        id="hiring-process"
        title="Hiring Process"
        icon={<ListChecks className="h-4 w-4" />}
      >
        <Skeleton className="h-36 rounded-lg" />
      </SectionCard>
    );
  }

  if (error || !data || data.roles.length === 0) {
    return (
      <SectionCard
        id="hiring-process"
        title="Hiring Process"
        description={
          error
            ? "Hiring round data could not be loaded."
            : "No company-specific hiring rounds have been added yet."
        }
        icon={<ListChecks className="h-4 w-4" />}
      >
        <Link
          to="/hiring-process"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          Open Hiring Process Intelligence
        </Link>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="hiring-process"
      title="Hiring Process"
      description={`${data.roles.length} role${data.roles.length !== 1 ? "s" : ""} with hiring pipelines, skill sets and typical questions.`}
      icon={<ListChecks className="h-4 w-4" />}
    >
      <div className="space-y-4">
        {data.roles.map((role, idx) => (
          <RoleDetailSection key={`${role.role_title}-${idx}`} role={role} />
        ))}
      </div>
      <Link
        to="/hiring-process"
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        Compare hiring pipelines
      </Link>
    </SectionCard>
  );
}

function RoleDetailSection({ role }: { role: JobRole }) {
  const fmtCTC =
    role.ctc_or_stipend != null
      ? role.compensation === "Stipend"
        ? `₹${role.ctc_or_stipend.toLocaleString("en-IN")}/mo`
        : `₹${(role.ctc_or_stipend / 100000).toFixed(1)} LPA`
      : null;

  return (
    <Collapsible defaultOpen>
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
              <Badge variant="secondary" className="text-[11px]">
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
            {(role.job_description || role.bonus || role.benefits_summary) && (
              <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg bg-secondary/30 p-3 text-xs sm:grid-cols-2">
                {role.job_description && (
                  <div className="sm:col-span-2">
                    <span className="field-label">Job description</span>
                    <p className="mt-0.5 text-muted-foreground">{role.job_description}</p>
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
            <HiringProcessTimeline rounds={role.rounds} compact />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ─── InnovX Accelerator Section ─────────────────────────────── */

const DIFF_COLORS: Record<string, string> = {
  Easy: "bg-success/10 text-success border-success/30",
  Medium: "bg-warning/10 text-warning border-warning/30",
  Hard: "bg-destructive/10 text-destructive border-destructive/30",
};

function InnovXAcceleratorCard({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: Error | null;
  data: CompanyInnovX | null;
}) {
  if (loading) {
    return (
      <SectionCard
        id="innovx-accelerator"
        title="InnovX Accelerator"
        icon={<Lightbulb className="h-4 w-4" />}
      >
        <Skeleton className="h-36 rounded-lg" />
      </SectionCard>
    );
  }

  if (error || !data) {
    return (
      <SectionCard
        id="innovx-accelerator"
        title="InnovX Accelerator"
        description={
          error
            ? `InnovX data error: ${(error as Error).message}`
            : "No innovation intelligence available for this company yet."
        }
        icon={<Lightbulb className="h-4 w-4" />}
      >
        <Link
          to="/innovx"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          Open InnovX Accelerator Intelligence
        </Link>
      </SectionCard>
    );
  }

  const d = data.data;

  return (
    <SectionCard
      id="innovx-accelerator"
      title="InnovX Accelerator"
      description="Innovation strategy, recommended projects, and skills to differentiate yourself."
      icon={<Lightbulb className="h-4 w-4" />}
    >
      {/* Strategy */}
      {d.company_strategy && (
        <div className="mb-4 rounded-lg bg-secondary/30 p-3">
          <span className="field-label">Company Strategy</span>
          <p className="mt-1 text-sm text-foreground">{d.company_strategy}</p>
        </div>
      )}

      {/* Innovation areas + Required skills */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {d.innovation_areas.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Target className="h-3.5 w-3.5 text-accent" /> Innovation Areas
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.innovation_areas.map((area) => (
                <Badge key={area} variant="outline" className="font-normal">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {d.required_skills.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Required Skills
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.required_skills.map((skill) => (
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

      {/* Differentiation tip + Preparation Strategy */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
        {d.differentiation_tip && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Zap className="h-3.5 w-3.5" /> Differentiation Tip
            </div>
            <p className="mt-1 text-sm text-foreground">{d.differentiation_tip}</p>
          </div>
        )}
        {d.preparation_strategy && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Preparation Strategy
            </div>
            <p className="mt-1 text-sm text-foreground">{d.preparation_strategy}</p>
          </div>
        )}
      </div>

      {/* Recommended projects */}
      {d.recommended_projects.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Rocket className="h-4 w-4 text-accent" /> Recommended Projects
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {d.recommended_projects.map((project, idx) => (
              <InnovXProjectCard key={`${project.title}-${idx}`} project={project} />
            ))}
          </div>
        </div>
      )}

      <Link
        to="/innovx"
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
      >
        Explore all InnovX intelligence
      </Link>
    </SectionCard>
  );
}

function InnovXProjectCard({ project }: { project: InnovXProject }) {
  const diffColor =
    DIFF_COLORS[project.difficulty] ?? "bg-secondary text-muted-foreground border-border";
  const isHighImpact = project.difficulty === "Hard";

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-background p-3",
        isHighImpact && "border-accent/40 ring-1 ring-accent/20",
      )}
    >
      {isHighImpact && (
        <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
          High Impact
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-xs font-semibold">{project.title}</h4>
        <Badge variant="outline" className={cn("shrink-0 text-[10px] font-semibold", diffColor)}>
          {project.difficulty}
        </Badge>
      </div>
      {project.description && (
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{project.description}</p>
      )}
      {project.tech_stack.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.tech_stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
      {project.expected_outcome && (
        <div className="mt-2 rounded-md bg-secondary/50 px-2 py-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Why this matters
          </span>
          <p className="mt-0.5 text-[10px] text-foreground">{project.expected_outcome}</p>
        </div>
      )}
    </div>
  );
}
