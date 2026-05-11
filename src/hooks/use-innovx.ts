import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ─── Data Types ─────────────────────────────────────────────── */

export interface InnovXProject {
  title: string;
  description: string;
  tech_stack: string[];
  difficulty: "Easy" | "Medium" | "Hard" | string;
  expected_outcome: string;
}

export interface InnovXData {
  company_strategy: string | null;
  digital_transformation_focus: string[];
  business_problems: string[];
  innovation_areas: string[];
  required_skills: string[];
  recommended_projects: InnovXProject[];
  preparation_strategy: string | null;
  differentiation_tip: string | null;
}

export interface CompanyInnovX {
  id: string;
  companyId: string;
  companyName: string;
  data: InnovXData;
  innovationType: string;
}

/* ─── Innovation type classification ─────────────────────────── */

const INNOVATION_TAGS: { label: string; pattern: RegExp }[] = [
  {
    label: "AI-Driven",
    pattern: /\b(ai|machine learning|ml|deep learning|nlp|gen\s?ai|neural|llm)\b/i,
  },
  {
    label: "Data-Centric",
    pattern: /\b(data|analytics|bi|warehouse|lake|etl|pipeline|big data)\b/i,
  },
  { label: "Platform-Based", pattern: /\b(platform|saas|paas|iaas|cloud|microservice|api)\b/i },
  { label: "Service-Oriented", pattern: /\b(service|consulting|managed|outsourc|support|bpo)\b/i },
  { label: "Cloud-Native", pattern: /\b(cloud|aws|azure|gcp|kubernetes|docker|serverless)\b/i },
  { label: "Automation-Led", pattern: /\b(automat|rpa|robotic|workflow|orchestrat|ci\/cd)\b/i },
];

function classifyInnovationType(data: InnovXData): string {
  const text = [
    data.company_strategy,
    ...data.innovation_areas,
    ...data.digital_transformation_focus,
    ...data.required_skills,
    ...data.recommended_projects.flatMap((p) => [p.title, ...p.tech_stack]),
  ]
    .filter(Boolean)
    .join(" ");

  for (const tag of INNOVATION_TAGS) {
    if (tag.pattern.test(text)) return tag.label;
  }
  return "General";
}

/* ─── DB row shape ───────────────────────────────────────────── */

interface InnovXRow {
  id: string;
  company_id: string;
  name: string;
  json_data: unknown;
}

const INNOVX_COLUMNS = "id, company_id, name, json_data";

/* ─── Parsers ────────────────────────────────────────────────── */

function parseInnovXData(raw: unknown): InnovXData {
  const json = parseJsonObject(raw);
  if (!json) {
    return {
      company_strategy: null,
      digital_transformation_focus: [],
      business_problems: [],
      innovation_areas: [],
      required_skills: [],
      recommended_projects: [],
      preparation_strategy: null,
      differentiation_tip: null,
    };
  }

  const master = (json.innovx_master || {}) as any;
  const pillars = (json.strategic_pillars || []) as any[];
  const projects = (json.innovx_projects || []) as any[];

  return {
    company_strategy: master.core_business_model || str(json.company_strategy),
    digital_transformation_focus: strArr(
      arrFromUnknown(json.industry_trends).map((t: any) => t.trend_name),
    ),
    business_problems: strArr(
      arrFromUnknown(json.industry_trends).map((t: any) => t.trend_description),
    ),
    innovation_areas: strArr(pillars.map((p: any) => p.pillar_name)),
    required_skills: strArr(projects.flatMap((p: any) => p.backend_technologies || [])),
    recommended_projects: parseProjects(projects),
    preparation_strategy: str(json.preparation_strategy),
    differentiation_tip: str(projects[0]?.differentiation_factor) || str(json.differentiation_tip),
  };
}

function parseProjects(value: unknown): InnovXProject[] {
  const arr = arrFromUnknown(value);
  return arr
    .map((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return {
        title: str(obj.project_name || obj.title) ?? "Untitled Project",
        description: str(obj.problem_statement || obj.description) ?? "",
        tech_stack: strArr(obj.backend_technologies || obj.tech_stack),
        difficulty: str(obj.tier_level || obj.difficulty) ?? "Medium",
        expected_outcome: str(obj.business_value || obj.expected_outcome) ?? "",
      } satisfies InnovXProject;
    })
    .filter((p: InnovXProject) => p.title !== "Untitled Project" || p.description);
}

function rowToCompanyInnovX(row: InnovXRow): CompanyInnovX {
  const data = parseInnovXData(row.json_data);
  return {
    id: row.id,
    companyId: String(row.company_id),
    companyName: row.name,
    data,
    innovationType: classifyInnovationType(data),
  };
}

/* ─── Hooks ──────────────────────────────────────────────────── */

/** Fetch InnovX data for a single company. */
export function useInnovX(companyId: string | undefined) {
  return useQuery({
    queryKey: ["innovx", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<CompanyInnovX | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("innovx_json")
        .select(INNOVX_COLUMNS)
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return rowToCompanyInnovX(data as InnovXRow);
    },
  });
}

/** Fetch InnovX data for all companies (powers the dedicated page). */
export function useInnovXIndex() {
  return useQuery({
    queryKey: ["innovx-index"],
    queryFn: async (): Promise<CompanyInnovX[]> => {
      const { data, error } = await supabase
        .from("innovx_json")
        .select(INNOVX_COLUMNS)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => rowToCompanyInnovX(row as InnovXRow));
    },
  });
}

/** Aggregate facets for filters. */
export function useInnovXFacets(entries: CompanyInnovX[]) {
  const innovationAreas = new Set<string>();
  const innovationTypes = new Set<string>();

  for (const entry of entries) {
    for (const area of entry.data.innovation_areas) innovationAreas.add(area);
    innovationTypes.add(entry.innovationType);
  }

  return {
    innovationAreas: Array.from(innovationAreas).sort(),
    innovationTypes: Array.from(innovationTypes).sort(),
  };
}

/* ─── Utilities ──────────────────────────────────────────────── */

function parseJsonObject(value: unknown): Record<string, unknown> | null {
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

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text && text !== "null" && text !== "undefined" ? text : null;
}

function strArr(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [value];
    }
  }
  return [];
}

function arrFromUnknown(value: unknown): unknown[] {
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
