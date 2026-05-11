import {
  BriefcaseBusiness,
  ChevronDown,
  Code2,
  MessageCircle,
  PenLine,
  ShieldQuestion,
  Monitor,
  Users,
  Zap,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { HiringRound, JobRoleSkillSet } from "@/hooks/use-hiring-rounds";
import { cn } from "@/lib/utils";

interface Props {
  rounds: HiringRound[];
  compact?: boolean;
}

export function HiringProcessTimeline({ rounds, compact = false }: Props) {
  return (
    <ol className="relative flex flex-col gap-3">
      {rounds.map((round, index) => (
        <li key={round.id} className="grid grid-cols-[32px_1fr] gap-3">
          <div className="flex flex-col items-center">
            <div className="grid h-8 w-8 place-items-center rounded-full border border-border bg-secondary text-xs font-semibold">
              {round.round_order}
            </div>
            {index < rounds.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
          </div>
          <RoundCard round={round} compact={compact} />
        </li>
      ))}
    </ol>
  );
}

/* ─── Skill Set Code → Color Map ─────────────────────────────── */

const SKILL_COLORS: Record<string, string> = {
  DSA: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  COD: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  APTI: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  SQL: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  OS: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  COMM: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  SWE: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  AI: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30",
};

const SKILL_LABELS: Record<string, string> = {
  DSA: "Data Structures & Algorithms",
  COD: "Coding",
  APTI: "Aptitude",
  SQL: "SQL & Databases",
  OS: "Operating Systems",
  COMM: "Communication",
  SWE: "Software Engineering",
  AI: "AI / Machine Learning",
};

function RoundCard({ round, compact }: { round: HiringRound; compact: boolean }) {
  const Icon = iconForRound(round);
  const codingHeavy = /coding|dsa|algorithm|programming|cod/i.test(
    `${round.round_name} ${round.preparation_focus} ${round.description} ${round.skill_sets.map((s) => s.skill_set_code).join(" ")}`,
  );

  return (
    <Collapsible>
      <div
        className={cn(
          "rounded-lg border border-border bg-background p-3",
          codingHeavy && "border-accent/50 bg-accent/5",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold tracking-tight">
                {round.round_name}
              </h3>
              {round.difficulty_level && (
                <Badge variant="secondary" className={difficultyClass(round.difficulty_level)}>
                  {round.difficulty_level}
                </Badge>
              )}
              {round.round_category && (
                <Badge variant="outline" className="font-normal">
                  {round.round_category}
                </Badge>
              )}
              {round.round_type && round.round_type !== round.round_category && (
                <Badge variant="outline" className="font-normal">
                  {round.round_type}
                </Badge>
              )}
            </div>
            {/* Mode + Evaluation badges */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {round.assessment_mode && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Monitor className="h-3 w-3" />
                  {round.assessment_mode}
                </span>
              )}
              {round.evaluation_type && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {round.evaluation_type}
                </span>
              )}
            </div>
            {/* Skill set code pills (always visible) */}
            {round.skill_sets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {round.skill_sets.map((skillSet, idx) => (
                  <span
                    key={`${skillSet.skill_set_code}-${idx}`}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      SKILL_COLORS[skillSet.skill_set_code] ??
                        "bg-secondary text-muted-foreground border-border",
                    )}
                  >
                    {skillSet.skill_set_code}
                  </span>
                ))}
              </div>
            )}
            {round.description && (
              <p className="mt-1 text-sm text-muted-foreground">{round.description}</p>
            )}
          </div>
          <CollapsibleTrigger className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="mt-3 border-t border-border pt-3">
            {/* Skill sets with questions */}
            {round.skill_sets.length > 0 ? (
              <div className="space-y-3">
                {round.skill_sets.map((skillSet, idx) => (
                  <SkillSetCard key={`${skillSet.skill_set_code}-${idx}`} skillSet={skillSet} />
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  "grid grid-cols-1 gap-3 text-xs sm:grid-cols-3",
                  compact && "sm:grid-cols-1",
                )}
              >
                <Info label="Preparation focus" value={round.preparation_focus} />
                <Info label="Elimination rate" value={round.elimination_rate} />
                <Info label="Tips" value={round.tips} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SkillSetCard({ skillSet }: { skillSet: JobRoleSkillSet }) {
  const label = SKILL_LABELS[skillSet.skill_set_code] ?? skillSet.skill_set_code;
  const colorClass =
    SKILL_COLORS[skillSet.skill_set_code] ?? "bg-secondary text-muted-foreground border-border";
  const questions = skillSet.typical_questions
    .split(";")
    .map((q) => q.trim())
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", colorClass)}
        >
          {skillSet.skill_set_code}
        </span>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      {questions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <HelpCircle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <div className="mt-1 text-foreground">{value || "Not specified"}</div>
    </div>
  );
}

function iconForRound(round: HiringRound) {
  const text =
    `${round.round_name} ${round.round_type ?? ""} ${round.preparation_focus ?? ""} ${round.evaluation_type ?? ""} ${round.round_category ?? ""}`.toLowerCase();
  if (/coding|technical|dsa|programming/.test(text)) return Code2;
  if (/hr|behavior|communication/.test(text)) return MessageCircle;
  if (/aptitude|screening|assessment/.test(text)) return PenLine;
  if (/case|managerial|system/.test(text)) return BriefcaseBusiness;
  return ShieldQuestion;
}

function difficultyClass(value: string | null) {
  if (/hard/i.test(value ?? "")) return "bg-destructive/10 text-destructive";
  if (/medium/i.test(value ?? "")) return "bg-warning/10 text-warning";
  if (/easy/i.test(value ?? "")) return "bg-success/10 text-success";
  return "font-normal";
}
