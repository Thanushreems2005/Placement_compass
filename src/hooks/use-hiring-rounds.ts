import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HIRING_ROUNDS_ENABLED = import.meta.env.VITE_ENABLE_HIRING_ROUNDS === "true";

/* ─── Skill Set ──────────────────────────────────────────────── */

export interface JobRoleSkillSet {
  skill_set_code: string;
  typical_questions: string;
}

/* ─── Round (enriched with skill sets + metadata) ────────────── */

export interface HiringRound {
  id: number;
  company_id: number;
  round_order: number;
  round_name: string;
  round_type: string | null;
  description: string | null;
  difficulty_level: string | null;
  elimination_rate: string | null;
  preparation_focus: string | null;
  tips: string | null;
  /* new fields from job_role_details_json */
  round_category: string | null;
  assessment_mode: string | null;
  evaluation_type: string | null;
  skill_sets: JobRoleSkillSet[];
}

/* ─── Job Role (one role within a company row) ───────────────── */

export interface JobRole {
  role_title: string;
  role_category: string | null;
  opportunity_type: string | null;
  compensation: string | null;
  ctc_or_stipend: number | null;
  job_description: string | null;
  bonus: string | null;
  benefits_summary: string | null;
  rounds: HiringRound[];
}

/* ─── Company-level aggregate ────────────────────────────────── */

export interface CompanyJobRoles {
  companyId: string;
  company_name: string;
  roles: JobRole[];
}

export interface CompanyHiringProcess {
  companyId: string;
  rounds: HiringRound[];
  roundCount: number;
  maxDifficulty: string | null;
  tags: string[];
}

/* ─── DB row shape ───────────────────────────────────────────── */

interface JobRoleRoundRow {
  id: string | number;
  company_id: string | number;
  company_name: string;
  job_role_json: unknown;
}

const JOB_ROLE_COLUMNS = "id, company_id, company_name, job_role_json";

/* ────────────────────────────────────────────────────────────── */
/*  Hooks                                                        */
/* ────────────────────────────────────────────────────────────── */

/** Flat round list for a single company (backward compat). */
export function useHiringRounds(companyId: string | undefined) {
  return useQuery({
    queryKey: ["hiring-rounds", companyId],
    enabled: HIRING_ROUNDS_ENABLED && !!companyId,
    initialData: [],
    queryFn: async (): Promise<HiringRound[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("job_role_details_json")
        .select(JOB_ROLE_COLUMNS)
        .eq("company_id", companyId)
        .order("id", { ascending: true });
      if (error) throw error;
      return jobRoleRowsToRounds((data ?? []) as JobRoleRoundRow[]);
    },
  });
}

/** Flat round list per company for the hiring process listing page. */
export function useHiringRoundIndex() {
  return useQuery({
    queryKey: ["hiring-round-index"],
    initialData: [],
    queryFn: async (): Promise<CompanyHiringProcess[]> => {
      const { data, error } = await supabase
        .from("job_role_details_json")
        .select(JOB_ROLE_COLUMNS)
        .order("company_id", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;

      const grouped = new Map<string, HiringRound[]>();
      for (const row of (data ?? []) as JobRoleRoundRow[]) {
        const companyId = String(row.company_id);
        grouped.set(companyId, [...(grouped.get(companyId) ?? []), ...jobRoleRowToRounds(row)]);
      }

      return Array.from(grouped.entries()).map(([companyId, rounds]) => ({
        companyId,
        rounds: rounds.sort((a, b) => a.round_order - b.round_order),
        roundCount: rounds.length,
        maxDifficulty: maxDifficulty(rounds),
        tags: processTags(rounds),
      }));
    },
  });
}

/** Full role-level data for a single company. */
export function useJobRoleDetails(companyId: string | undefined) {
  return useQuery({
    queryKey: ["job-role-details", companyId],
    enabled: HIRING_ROUNDS_ENABLED && !!companyId,
    queryFn: async (): Promise<CompanyJobRoles | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("job_role_details_json")
        .select(JOB_ROLE_COLUMNS)
        .eq("company_id", companyId)
        .order("id", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return null;

      const rows = data as JobRoleRoundRow[];
      const roles: JobRole[] = [];
      for (const row of rows) {
        roles.push(...extractJobRoles(row));
      }

      return {
        companyId,
        company_name: rows[0].company_name,
        roles,
      };
    },
  });
}

/** Full role-level data for all companies (powers the hiring dashboard). */
export function useJobRoleIndex() {
  return useQuery({
    queryKey: ["job-role-index"],
    queryFn: async (): Promise<CompanyJobRoles[]> => {
      const { data, error } = await supabase
        .from("job_role_details_json")
        .select(JOB_ROLE_COLUMNS)
        .order("company_id", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;

      const grouped = new Map<string, { company_name: string; roles: JobRole[] }>();
      for (const row of (data ?? []) as JobRoleRoundRow[]) {
        const companyId = String(row.company_id);
        const existing = grouped.get(companyId) ?? { company_name: row.company_name, roles: [] };
        existing.roles.push(...extractJobRoles(row));
        grouped.set(companyId, existing);
      }

      return Array.from(grouped.entries()).map(([companyId, v]) => ({
        companyId,
        company_name: v.company_name,
        roles: v.roles,
      }));
    },
  });
}

/* ────────────────────────────────────────────────────────────── */
/*  Parsers                                                      */
/* ────────────────────────────────────────────────────────────── */

/** Extract `JobRole[]` from one DB row (navigates into job_role_details). */
function extractJobRoles(row: JobRoleRoundRow): JobRole[] {
  const json = parseJson(row.job_role_json);
  if (!json) return [];

  // Navigate into `job_role_details` array
  const roleDetails = arrayFromUnknown(json.job_role_details ?? json.jobRoleDetails ?? json.roles);

  // Fallback: if no job_role_details wrapper, treat the json itself as a single role
  if (roleDetails.length === 0) {
    const rounds = extractRoundsFromRoleObj(json, row);
    if (rounds.length > 0) {
      return [
        {
          role_title:
            stringFromUnknown(json.role_title ?? json.title ?? json.job_title) ?? "Unknown Role",
          role_category: stringFromUnknown(json.role_category ?? json.category),
          opportunity_type: stringFromUnknown(json.opportunity_type),
          compensation: stringFromUnknown(json.compensation),
          ctc_or_stipend: numberFromUnknown(json.ctc_or_stipend),
          job_description: stringFromUnknown(json.job_description),
          bonus: stringFromUnknown(json.bonus),
          benefits_summary: stringFromUnknown(json.benefits_summary),
          rounds,
        },
      ];
    }
    return [];
  }

  return roleDetails
    .map((detail) => {
      const obj = detail as Record<string, unknown>;
      const rounds = extractRoundsFromRoleObj(obj, row);
      return {
        role_title:
          stringFromUnknown(obj.role_title ?? obj.title ?? obj.job_title) ?? "Unknown Role",
        role_category: stringFromUnknown(obj.role_category ?? obj.category),
        opportunity_type: stringFromUnknown(obj.opportunity_type),
        compensation: stringFromUnknown(obj.compensation),
        ctc_or_stipend: numberFromUnknown(obj.ctc_or_stipend),
        job_description: stringFromUnknown(obj.job_description),
        bonus: stringFromUnknown(obj.bonus),
        benefits_summary: stringFromUnknown(obj.benefits_summary),
        rounds,
      } satisfies JobRole;
    })
    .filter((role) => role.rounds.length > 0 || role.role_title !== "Unknown Role");
}

/** Extract `HiringRound[]` from a single role object within job_role_details. */
function extractRoundsFromRoleObj(
  obj: Record<string, unknown>,
  row: JobRoleRoundRow,
): HiringRound[] {
  const rawRounds = arrayFromUnknown(
    obj.hiring_rounds ?? obj.hiringRounds ?? obj.rounds ?? obj.selection_process,
  );

  return rawRounds.map((round, index) => {
    const source = round as Record<string, unknown>;
    const roundName = stringFromUnknown(
      source.round_name ?? source.name ?? source.round ?? source.round_title ?? source.title,
    );
    const roundType = stringFromUnknown(source.round_type ?? source.type);
    const roundCategory = stringFromUnknown(source.round_category ?? source.category);
    const assessmentMode = stringFromUnknown(source.assessment_mode ?? source.mode);
    const evaluationType = stringFromUnknown(source.evaluation_type ?? source.evaluation);
    const description = stringFromUnknown(
      source.description ?? source.what_is_evaluated ?? source.assessment,
    );
    const preparationFocus = stringFromUnknown(
      source.preparation_focus ?? source.prep_focus ?? source.focus ?? source.skills_tested,
    );
    const skillSets = extractSkillSets(source.skill_sets ?? source.skillSets ?? source.skills);

    return {
      id: Number(`${row.id}${String(index + 1).padStart(3, "0")}`),
      company_id: Number(row.company_id),
      round_order:
        numberFromUnknown(
          source.round_number ??
            source.round_order ??
            source.order ??
            source.sequence ??
            source.round_no,
        ) ?? index + 1,
      round_name: roundName || `Round ${index + 1}`,
      round_type: roundType || inferRoundType(roundName, preparationFocus),
      description: description,
      difficulty_level: stringFromUnknown(source.difficulty_level ?? source.difficulty),
      elimination_rate: stringFromUnknown(
        source.elimination_rate ?? source.elimination ?? source.elimination_percentage,
      ),
      preparation_focus:
        preparationFocus ||
        (skillSets.length > 0 ? skillSets.map((s) => s.skill_set_code).join(", ") : null),
      tips: stringFromUnknown(source.tips ?? source.preparation_tips ?? source.advice),
      round_category: roundCategory,
      assessment_mode: assessmentMode,
      evaluation_type: evaluationType,
      skill_sets: skillSets,
    };
  });
}

/** Extract skill sets from unknown value. */
function extractSkillSets(value: unknown): JobRoleSkillSet[] {
  const arr = arrayFromUnknown(value);
  return arr
    .map((item) => {
      const obj = item as Record<string, unknown>;
      const code = stringFromUnknown(obj.skill_set_code ?? obj.code ?? obj.skill);
      const questions = stringFromUnknown(
        obj.typical_questions ?? obj.questions ?? obj.sample_questions,
      );
      if (!code) return null;
      return { skill_set_code: code, typical_questions: questions ?? "" };
    })
    .filter((item): item is JobRoleSkillSet => item !== null);
}

/** Flatten all rounds from all roles from all rows. */
function jobRoleRowsToRounds(rows: JobRoleRoundRow[]): HiringRound[] {
  return rows
    .flatMap((row) => jobRoleRowToRounds(row))
    .sort((a, b) => a.round_order - b.round_order);
}

/** Flatten all rounds from all roles in a single row. */
function jobRoleRowToRounds(row: JobRoleRoundRow): HiringRound[] {
  const roles = extractJobRoles(row);
  return roles.flatMap((role) => role.rounds);
}

/* ────────────────────────────────────────────────────────────── */
/*  Utilities                                                    */
/* ────────────────────────────────────────────────────────────── */

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function arrayFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function stringFromUnknown(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function numberFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferRoundType(roundName: string | null, preparationFocus: string | null): string | null {
  const text = `${roundName ?? ""} ${preparationFocus ?? ""}`.toLowerCase();
  if (/coding|technical|dsa|programming|core/.test(text)) return "Technical";
  if (/hr|behavior|communication|managerial/.test(text)) return "Behavioral";
  if (/aptitude|screening|assessment|online/.test(text)) return "Screening";
  return null;
}

function maxDifficulty(rounds: HiringRound[]): string | null {
  const rank: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  return (
    rounds
      .map((round) => round.difficulty_level)
      .filter((value): value is string => !!value)
      .sort((a, b) => (rank[b.toLowerCase()] ?? 0) - (rank[a.toLowerCase()] ?? 0))[0] ?? null
  );
}

export function processTags(rounds: HiringRound[]): string[] {
  const text = rounds
    .flatMap((round) => [
      round.round_name,
      round.round_type,
      round.description,
      round.preparation_focus,
      round.round_category,
      round.evaluation_type,
      ...(round.skill_sets ?? []).map((s) => s.skill_set_code),
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];
  if (/coding|dsa|algorithm|programming|technical|cod/.test(text)) tags.push("Coding Heavy");
  if (/aptitude|quant|logical|reasoning|verbal|apti/.test(text)) tags.push("Aptitude Heavy");
  if (/interview|hr|behavior|managerial|communication|comm/.test(text))
    tags.push("Interview Heavy");
  return tags;
}
