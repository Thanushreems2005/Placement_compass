import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { fetchCompaniesByIds, useCompanies } from "@/hooks/use-companies";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { fmtText } from "@/lib/format";
import type { CompanyRow } from "@/lib/company-types";

export const Route = createFileRoute("/skill-mapping")({
  head: () => ({
    meta: [
      { title: "Skill Mapping · SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Match your skills against company tech stacks, AI/ML adoption and automation level. Rule-based fit scoring with skill gaps and prep focus.",
      },
    ],
  }),
  component: SkillMappingPage,
});

interface FitRow {
  c: CompanyRow;
  matched: string[];
  missing: string[];
  fit: "High" | "Medium" | "Low";
  score: number;
}

const SKILL_ALIASES: Record<string, string[]> = {
  react: ["react", "frontend", "front end", "web", "ui", "javascript", "typescript"],
  javascript: ["javascript", "typescript", "react", "frontend", "web", "node"],
  typescript: ["typescript", "javascript", "react", "frontend", "web", "node"],
  java: ["java", "spring", "backend", "enterprise", "software", "platform", "cloud"],
  python: ["python", "data", "analytics", "ai", "ml", "automation", "backend"],
  sql: ["sql", "database", "data", "storage", "analytics", "warehouse", "cloud"],
  aws: ["aws", "cloud", "infrastructure", "devops", "platform"],
};

function useFitRows(skills: string[]) {
  const list = useCompanies({ sort: "name", limit: 500 });
  return useQuery({
    queryKey: ["skill-fit", skills, list.data?.length ?? 0],
    enabled: skills.length > 0 && (list.data?.length ?? 0) > 0,
    queryFn: async (): Promise<FitRow[]> => {
      // Fetch full rows for currently visible companies (capped) — pulls only fields used.
      const ids = Array.from(new Set((list.data ?? []).map((c) => c.id)));
      if (ids.length === 0) return [];
      const data = uniqueCompanies(await fetchCompaniesByIds(ids));

      const rows: FitRow[] = data.map((row) => {
        const techStack = normalizeTags(row.tech_stack);
        const profileText = companySearchText(row, techStack);
        const skillScores = skills.map((skill) => scoreSkill(skill, techStack, profileText));
        const matched = skills.filter((_, index) => skillScores[index] >= 0.35);
        const missing = skills.filter((_, index) => skillScores[index] < 0.35);
        const baseScore =
          skillScores.reduce((total, score) => total + score, 0) / Math.max(skills.length, 1);
        const score = Math.min(1, baseScore * 0.9 + softSignalScore(row));
        const fit: FitRow["fit"] = score >= 0.65 ? "High" : score >= 0.3 ? "Medium" : "Low";
        return {
          c: row,
          matched,
          missing,
          fit,
          score,
        };
      });

      return rows.sort((a, b) => b.score - a.score);
    },
  });
}

function uniqueCompanies(rows: CompanyRow[]): CompanyRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function scoreSkill(skill: string, techStack: string[], profileText: string): number {
  const normalized = skill.trim().toLowerCase();
  const aliases = SKILL_ALIASES[normalized] ?? [normalized];
  const stackText = techStack.map((item) => item.toLowerCase());

  if (stackText.some((item) => item === normalized || aliases.includes(item))) return 1;
  if (stackText.some((item) => aliases.some((alias) => item.includes(alias)))) return 0.85;
  if (profileText.includes(normalized)) return 0.75;
  if (aliases.some((alias) => profileText.includes(alias))) return 0.5;
  return 0;
}

function softSignalScore(row: CompanyRow): number {
  const signals = [
    row.ai_ml_adoption_level,
    row.automation_level,
    row.skill_relevance,
    row.tech_adoption_rating?.toString(),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/high|advanced|deep|excellent|strong|[8-9](\.\d)?|10/.test(signals)) return 0.1;
  if (/medium|moderate|good|[5-7](\.\d)?/.test(signals)) return 0.05;
  return 0;
}

function companySearchText(row: CompanyRow, techStack: string[]): string {
  const values: unknown[] = [
    techStack,
    row.focus_sectors,
    row.technology_partners,
    row.category,
    row.nature_of_company,
    row.overview_text,
    row.offerings_description,
    row.pain_points_addressed,
    row.core_value_proposition,
    row.strategic_priorities,
    row.product_pipeline,
    row.ai_ml_adoption_level,
    row.automation_level,
    row.skill_relevance,
    row.cybersecurity_posture,
    row.intellectual_property,
    row.innovation_roadmap,
    row.industry_associations,
    row.awards_recognitions,
  ];

  return values
    .flatMap((value) => normalizeTags(value))
    .join(" ")
    .toLowerCase();
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim()) {
    // Check if it's a JSON array string
    if (value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        // Fall through to semicolon/comma split
      }
    }
    // Handle semicolon or comma separated values
    return value
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function SkillMappingPage() {
  const [input, setInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const addSkills = () => {
    const parts = input
      .split(/[,\n]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return;
    setSkills((prev) => Array.from(new Set([...prev, ...parts])));
    setInput("");
  };

  const fits = useFitRows(skills);

  const summary = useMemo(() => {
    const data = fits.data ?? [];
    return {
      high: data.filter((r) => r.fit === "High").length,
      medium: data.filter((r) => r.fit === "Medium").length,
      low: data.filter((r) => r.fit === "Low").length,
    };
  }, [fits.data]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <span className="label-eyebrow">Skill Mapping · Student tool</span>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Match your skills against the campus hiring landscape
      </h1>
      <p className="text-sm text-muted-foreground">
        Rule-based only. Matches your skills against{" "}
        <code className="rounded bg-secondary px-1 font-mono">tech_stack</code> with soft signals
        from <code className="rounded bg-secondary px-1 font-mono">ai_ml_adoption_level</code>,{" "}
        <code className="rounded bg-secondary px-1 font-mono">automation_level</code> and{" "}
        <code className="rounded bg-secondary px-1 font-mono">skill_relevance</code>.
      </p>

      {/* Input */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <label className="field-label">Your skills</label>
        <div className="mt-2 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkills();
              }
            }}
            placeholder="React, Python, AWS, SQL…"
            className="flex-1"
          />
          <Button onClick={addSkills}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1 font-normal">
                {s}
                <button
                  onClick={() => setSkills((p) => p.filter((x) => x !== s))}
                  className="opacity-60 hover:opacity-100"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button
              onClick={() => setSkills([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {skills.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Add your skills to get started"
            description="Paste a comma-separated list and press Enter. Matching runs against every company in the database."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="High fit" value={summary.high} accent="text-success" />
            <Stat label="Medium fit" value={summary.medium} accent="text-warning" />
            <Stat label="Low fit" value={summary.low} accent="text-destructive" />
          </div>

          <div className="mt-4">
            {fits.isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : fits.error ? (
              <EmptyState
                title="Couldn't score companies"
                description={(fits.error as Error).message}
              />
            ) : (fits.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No companies to score"
                description="Load company records into the database to enable skill mapping."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {fits.data!.map((r) => (
                  <FitItem key={r.c.id} row={r} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <span className="field-label">{label}</span>
      <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${accent}`}>
        {value}
      </div>
    </div>
  );
}

function FitItem({ row }: { row: FitRow }) {
  const tone =
    row.fit === "High"
      ? "border-success/40 bg-success/5"
      : row.fit === "Medium"
        ? "border-warning/40 bg-warning/5"
        : "border-border";
  return (
    <li className={`rounded-xl border ${tone}`}>
      <Link
        to="/company/$companyId"
        params={{ companyId: row.c.id }}
        className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[2fr_1fr_2fr_auto]"
      >
        <div>
          <div className="font-display font-semibold">{row.c.name}</div>
          <div className="text-xs text-muted-foreground">{fmtText(row.c.category)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              row.fit === "High"
                ? "bg-success text-success-foreground"
                : row.fit === "Medium"
                  ? "bg-warning text-warning-foreground"
                  : "bg-secondary text-muted-foreground"
            }
          >
            {row.fit}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {Math.round(row.score * 100)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {row.matched.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="font-normal">
              {t}
            </Badge>
          ))}
          {row.missing.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              gap: {row.missing.slice(0, 3).join(", ")}
              {row.missing.length > 3 && ` +${row.missing.length - 3}`}
            </span>
          )}
        </div>
        <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
      </Link>
    </li>
  );
}
