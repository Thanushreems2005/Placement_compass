/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type CompanyListItem, type CompanyRow, type ShortJson } from "@/lib/company-types";

type CompanySource = "company_json" | "company" | "companies";

let cachedCompanySource: CompanySource | undefined;

async function resolveCompanySource(): Promise<CompanySource> {
  cachedCompanySource = "company_json";
  return cachedCompanySource;
}

function companyJsonToListItem(item: any): CompanyListItem {
  let shortJson: any = {};
  try {
    if (typeof item.short_json === "string") {
      shortJson = JSON.parse(item.short_json);
    } else if (item.short_json && typeof item.short_json === "object") {
      shortJson = item.short_json;
    }
  } catch (e) {
    console.error("Error parsing short_json", e);
  }

  return {
    // Base layer: spread shortJson first so explicit fields below WIN
    ...shortJson,
    // Explicit mappings that override the spread (normalized + with fallbacks)
    id: String(item.company_id),
    name: shortJson.name || item.name || "Unknown company",
    category: shortJson.category || item.category || undefined,
    logo_url: shortJson.logo_url || undefined,
    website_url: item.website_url || shortJson.website_url || undefined,
    location:
      item.hq ||
      shortJson.location ||
      (shortJson.city
        ? `${shortJson.city}${shortJson.country ? `, ${shortJson.country}` : ""}`
        : undefined),
    // These fields fall back to full_json when shortJson doesn't have them
    profitability_status:
      (shortJson.profitability_status || item.profitability)?.trim() || undefined,
    remote_policy_details:
      (shortJson.remote_policy_details || item.remote_policy)?.trim() || undefined,
    hiring_velocity: (shortJson.hiring_velocity || item.hiring_vel)?.trim() || undefined,
    // Always normalize focus_sectors to a proper string array
    focus_sectors: normalizeArrayField(shortJson.focus_sectors || item.sectors),
    overview_text: item.overview || shortJson.overview_text || undefined,
  };
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeArrayField(value: unknown): string[] {
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

function hasUsableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const text = String(value).trim().toLowerCase();
  return text !== "" && text !== "n/a" && text !== "na" && text !== "null" && text !== "undefined";
}

function applyListFilters(rows: CompanyListItem[], filters: CompanyListFilters): CompanyListItem[] {
  const q = normalizeString(filters.q);
  const sort = filters.sort ?? "name";
  const direction = (filters.ascending ?? true) ? 1 : -1;

  // Helper: trim-safe equality for filter comparisons
  // Handles whitespace differences between facet values (trimmed) and row data
  const eqTrim = (rowVal: string | undefined | null, filterVal: string) =>
    (rowVal ?? "").trim() === filterVal.trim();

  return rows
    .filter((row) => {
      // Always parse focus_sectors to ensure it's a proper string array
      const focusSectors = normalizeArrayField(row.focus_sectors).map((s) => s.trim());
      const matchesSearch =
        !q ||
        normalizeString(row.name).includes(q) ||
        normalizeString(row.short_name).includes(q) ||
        focusSectors.some((sector) => normalizeString(sector).includes(q));

      return (
        matchesSearch &&
        (!filters.category || eqTrim(row.category, filters.category)) &&
        (!filters.profitability || eqTrim(row.profitability_status, filters.profitability)) &&
        (!filters.remotePolicy ||
          eqTrim((row as any).remote_policy_details, filters.remotePolicy)) &&
        (!filters.hiringVelocity || eqTrim((row as any).hiring_velocity, filters.hiringVelocity)) &&
        (!filters.focusSector || focusSectors.includes(filters.focusSector.trim()))
      );
    })
    .sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (typeof av === "number" || typeof bv === "number") {
        return (
          (((av as number | undefined) ?? Number.NEGATIVE_INFINITY) -
            ((bv as number | undefined) ?? Number.NEGATIVE_INFINITY)) *
          direction
        );
      }
      return (
        String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    })
    .slice(0, filters.limit ?? rows.length);
}

function companyJsonToCompanyRow(item: { company_id: string; full_json: unknown }): CompanyRow {
  const data = item.full_json as Record<string, unknown>;

  // Parse array fields that might come as strings from JSON
  const parseArrayField = (value: unknown): string[] | null => {
    const arr = normalizeArrayField(value);
    return arr.length > 0 ? arr : null;
  };

  // Parse numeric fields that might come as strings from JSON
  const parseNumberField = (value: unknown): number | string | null => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.length > 0) {
      const num = parseFloat(value);
      // If it parses to a clean number, return as number.
      // If it has extra text (like "15%"), parseFloat gets the number part.
      // But if it starts with text or is just descriptive, return raw string.
      return isNaN(num) ? value : num;
    }
    return (value as string) || null;
  };

  return {
    id: String(item.company_id),
    ...data,
    focus_sectors: parseArrayField(data.focus_sectors) ?? undefined,
    operating_countries: parseArrayField(data.operating_countries) ?? undefined,
    office_locations: parseArrayField(data.office_locations) ?? undefined,
    top_customers: parseArrayField(data.top_customers) ?? undefined,
    key_competitors: parseArrayField(data.key_competitors) ?? undefined,
    key_investors: parseArrayField(data.key_investors) ?? undefined,
    tech_stack: parseArrayField(data.tech_stack) ?? undefined,
    technology_partners: parseArrayField(data.technology_partners) ?? undefined,
    awards_recognitions: parseArrayField(data.awards_recognitions) ?? undefined,
    market_share_percentage: parseNumberField(data.market_share_percentage) ?? undefined,
    yoy_growth_rate: parseNumberField(data.yoy_growth_rate) ?? undefined,
    diversity_inclusion_score: parseNumberField(data.diversity_inclusion_score) ?? undefined,
    runway_months: parseNumberField(data.runway_months) ?? undefined,
    burn_multiplier: parseNumberField(data.burn_multiplier) ?? undefined,
    tech_adoption_rating: parseNumberField(data.tech_adoption_rating) ?? undefined,
    website_rating: parseNumberField(data.website_rating) ?? undefined,
    glassdoor_rating: parseNumberField(data.glassdoor_rating) ?? undefined,
    indeed_rating: parseNumberField(data.indeed_rating) ?? undefined,
    google_rating: parseNumberField(data.google_rating) ?? undefined,
    brand_sentiment_score: parseNumberField(data.brand_sentiment_score) ?? undefined,
    // Ensure all 163 parameters are included via ...data spread above,
    // but these explicit mappings help with type/parsing consistency
  } as CompanyRow;
}

function companiesRowToCompanyRow(row: any): CompanyRow {
  return {
    ...row,
    id: String(row.company_id || row.id),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  } as CompanyRow;
}

async function enrichWithInnovX(company: CompanyRow): Promise<CompanyRow> {
  const { data, error } = await supabase
    .from("innovx_json")
    .select("json_data")
    .eq("company_id", company.id)
    .maybeSingle();

  if (error || !data) return company;

  const json = data.json_data as any;
  if (!json) return company;

  const master = json.innovx_master || {};
  const pillars = json.strategic_pillars || [];
  const projects = json.innovx_projects || [];
  const trends = json.industry_trends || [];
  const roadmap = json.innovation_roadmap || [];
  const landscape = json.competitive_landscape || [];

  // Aggregate technologies from projects and pillars
  const allTech = new Set<string>();
  projects.forEach((p: any) => {
    [
      ...(p.backend_technologies || []),
      ...(p.frontend_technologies || []),
      ...(p.ai_ml_technologies || []),
    ].forEach((t) => {
      if (t) allTech.add(t);
    });
  });
  pillars.forEach((p: any) => {
    (p.key_technologies || []).forEach((t: any) => {
      if (t) allTech.add(t);
    });
  });

  // Helper to stringify complex objects for ProseField/JsonField
  const safeStringify = (val: any) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    return JSON.stringify(val, null, 2);
  };

  return {
    ...company,
    // Overview
    overview_text: master.core_business_model || company.overview_text,
    category: master.industry || company.category,
    nature_of_company: master.sub_industry || company.nature_of_company,
    tam: master.target_market || company.tam,
    operating_countries: master.geographic_focus
      ? master.geographic_focus.split(",").map((s: string) => s.trim())
      : company.operating_countries,

    // Business & Market
    strategic_priorities:
      pillars.map((p: any) => p.pillar_name).join(", ") || company.strategic_priorities,
    key_challenges_needs:
      trends.map((t: any) => `${t.trend_name}: ${t.trend_description}`).join("\n") ||
      company.key_challenges_needs,
    future_projections:
      pillars.map((p: any) => `${p.pillar_name}: ${p.cto_vision_statement}`).join("\n") ||
      company.future_projections,
    key_competitors:
      landscape.map((c: any) => c.competitor_name || c.bet_name).filter(Boolean) ||
      company.key_competitors,
    unique_differentiators:
      projects
        .map((p: any) => p.differentiation_factor)
        .filter(Boolean)
        .join("\n") || company.unique_differentiators,
    competitive_advantages:
      landscape
        .map((c: any) => c.core_strength)
        .filter(Boolean)
        .join("\n") || company.competitive_advantages,

    // Culture
    work_culture_summary:
      pillars.map((p: any) => `${p.pillar_name}: ${p.pillar_description}`).join("\n") ||
      company.work_culture_summary,
    vision_statement: pillars[0]?.cto_vision_statement || company.vision_statement,
    mission_statement: pillars[0]?.pillar_description || company.mission_statement,

    // Tech & Innovation
    tech_stack: allTech.size > 0 ? Array.from(allTech) : company.tech_stack,
    product_pipeline:
      projects.map((p: any) => `${p.project_name}: ${p.problem_statement}`).join("\n") ||
      company.product_pipeline,
    innovation_roadmap:
      roadmap.map((r: any) => `${r.innovation_theme}: ${r.expected_outcome || ""}`).join("\n") ||
      company.innovation_roadmap,
    intellectual_property:
      safeStringify(json.intellectual_property) || company.intellectual_property,
    technology_partners:
      projects.flatMap((p: any) => p.integrations_apis || []).filter(Boolean) ||
      company.technology_partners,
    ai_ml_adoption_level:
      projects
        .flatMap((p: any) => p.ai_ml_technologies || [])
        .filter(Boolean)
        .join(", ") || company.ai_ml_adoption_level,
    cybersecurity_posture:
      projects
        .map((p: any) => p.security_compliance)
        .filter(Boolean)
        .join(", ") || company.cybersecurity_posture,

    // Leadership
    key_leaders: json.leadership_profiles || company.key_leaders,

    // Extra fields mapping to CompanyRow
    pain_points_addressed:
      projects.map((p: any) => p.problem_statement).join("\n") || company.pain_points_addressed,
    offerings_description: master.core_business_model || company.offerings_description,
    top_customers:
      projects.map((p: any) => p.target_users).filter(Boolean) || company.top_customers,
    preparation_strategy:
      safeStringify(json.preparation_strategy) || (company as any).preparation_strategy,
  };
}

async function enrichWithJobRoles(company: CompanyRow): Promise<CompanyRow> {
  const { data, error } = await supabase
    .from("job_role_details_json")
    .select("job_role_json")
    .eq("company_id", company.id)
    .maybeSingle();

  if (error || !data) return company;

  const json = data.job_role_json as any;
  if (!json) return company;

  const roles = json.job_role_details || [];
  if (roles.length > 0) {
    // Use first role's description if available, otherwise aggregate
    const job_description =
      roles[0]?.job_description ||
      roles.map((r: any) => `${r.role_title}: ${r.job_description}`).join("\n\n");
    return {
      ...company,
      job_description: job_description || company.job_description,
    };
  }

  return company;
}

function normalizedCompanyToListItem(row: CompanyRow): CompanyListItem {
  // Parse array fields in case they come as strings
  const parseArrayField = (value: unknown): string[] | undefined => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.length > 0) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  return {
    id: String(row.id),
    name: row.name,
    short_name: row.short_name ?? undefined,
    logo_url: (row as any).company_logo?.[0]?.logo_url || row.logo_url || undefined,
    category: row.category ?? undefined,
    employee_size: row.employee_size ?? undefined,
    focus_sectors: parseArrayField(row.focus_sectors) ?? undefined,
    hiring_velocity: row.hiring_velocity ?? undefined,
    profitability_status: row.profitability_status ?? undefined,
    remote_policy_details: row.remote_policy_details ?? undefined,
    location: (row as any).location ?? row.headquarters_address ?? undefined,
    yoy_growth_rate: row.yoy_growth_rate ?? undefined,
    brand_value: row.brand_value ?? undefined,
    website_url: (row as any).website_url ?? undefined,
  };
}

function normalizedCompanyToCompanyRow(row: CompanyRow): CompanyRow {
  return {
    ...row,
    id: String(row.id),
  } as CompanyRow;
}

export interface CompanyListFilters {
  q?: string;
  category?: string | null;
  focusSector?: string | null;
  employeeSize?: string | null;
  profitability?: string | null;
  remotePolicy?: string | null;
  hiringVelocity?: string | null;
  sort?: "name" | "employee_size" | "yoy_growth_rate" | "brand_value";
  ascending?: boolean;
  limit?: number;
}

export function useCompanies(filters: CompanyListFilters = {}) {
  return useQuery({
    queryKey: ["companies", filters],
    queryFn: async (): Promise<CompanyListItem[]> => {
      const source = await resolveCompanySource();

      if (source === "companies") {
        const { data, error } = await (supabase.from("companies") as any).select(
          "company_id, name, short_name, category, headquarters_address, website_url",
        );
        if (error) throw error;
        return applyListFilters(
          (data ?? []).map(
            (item: any) =>
              ({
                id: String(item.company_id),
                name: item.name ?? "Unknown",
                short_name: item.short_name ?? undefined,
                category: item.category ?? undefined,
                location: item.headquarters_address ?? undefined,
                website_url: item.website_url ?? undefined,
              }) as CompanyListItem,
          ),
          filters,
        );
      }

      if (source === "company_json") {
        const { data, error } = await supabase
          .from("company_json")
          .select(
            [
              "company_id",
              "short_json",
              "overview:full_json->overview_text",
              "hq:full_json->headquarters_address",
              "website_url:full_json->website_url",
              "profitability:full_json->profitability_status",
              "remote_policy:full_json->remote_policy_details",
              "hiring_vel:full_json->hiring_velocity",
              "sectors:full_json->focus_sectors",
            ].join(", "),
          );
        if (error) throw error;
        return applyListFilters(
          (data ?? []).map((item) => companyJsonToListItem(item)),
          filters,
        );
      }

      let query = supabase
        .from("company")
        .select(
          "id, name, short_name, logo_url, website_url, category, employee_size, focus_sectors, hiring_velocity, profitability_status, remote_policy_details, yoy_growth_rate, brand_value, company_logo(logo_url)",
        );

      if (filters.q && filters.q.trim()) {
        const term = `%${filters.q.trim()}%`;
        query = query.or(`name.ilike.${term},short_name.ilike.${term}`);
      }
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.employeeSize) query = query.eq("employee_size", filters.employeeSize);
      if (filters.profitability) query = query.eq("profitability_status", filters.profitability);
      if (filters.remotePolicy) query = query.eq("remote_policy_details", filters.remotePolicy);
      if (filters.hiringVelocity) query = query.eq("hiring_velocity", filters.hiringVelocity);
      if (filters.focusSector) query = query.contains("focus_sectors", [filters.focusSector]);

      const sort = filters.sort ?? "name";
      query = query.order(sort, {
        ascending: filters.ascending ?? true,
        nullsFirst: false,
      });
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((item) => normalizedCompanyToListItem(item as any));
    },
  });
}

async function fetchComponentData(companyId: string | number): Promise<Partial<CompanyRow>> {
  const idToQuery = Number(companyId);

  // Parallel fetch from component tables
  const [financials, culture, logistics] = await Promise.all([
    supabase
      .from("company_financials" as any)
      .select("*")
      .eq("company_id", idToQuery)
      .maybeSingle(),
    supabase
      .from("company_culture" as any)
      .select("*")
      .eq("company_id", idToQuery)
      .maybeSingle(),
    supabase
      .from("company_logistics" as any)
      .select("*")
      .eq("company_id", idToQuery)
      .maybeSingle(),
  ]);

  const result: Partial<CompanyRow> = {};

  if (financials.data) {
    const d = financials.data as any;
    Object.assign(result, {
      annual_revenue: d.annual_revenue,
      annual_profit: d.annual_profit,
      valuation: d.valuation,
      yoy_growth_rate: d.yoy_growth_rate,
      profitability_status: d.profitability_status,
      total_capital_raised: d.total_capital_raised,
      burn_rate: d.burn_rate,
      runway_months: d.runway_months,
      burn_multiplier: d.burn_multiplier,
      legal_issues: d.legal_issues,
    });
  }

  if (culture.data) {
    const d = culture.data as any;
    Object.assign(result, {
      employee_turnover: d.employee_turnover,
      avg_retention_tenure: d.avg_retention_tenure,
      layoff_history: d.layoff_history,
      manager_quality: d.manager_quality,
      psychological_safety: d.psychological_safety,
      mission_clarity: d.mission_clarity,
      burnout_risk: d.burnout_risk,
    });
  }

  if (logistics.data) {
    const d = logistics.data as any;
    Object.assign(result, {
      typical_hours: d.typical_hours,
      overtime_expectations: d.overtime_expectations,
      weekend_work: d.weekend_work,
      remote_policy_details: d.remote_policy_details,
      location_centrality: d.location_centrality,
      airport_commute_time: d.airport_commute_time,
      office_zone_type: d.office_zone_type,
    });
  }

  return result;
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["company", id],
    enabled: !!id,
    queryFn: async (): Promise<CompanyRow | null> => {
      if (!id) return null;
      const source = await resolveCompanySource();

      let company: CompanyRow | null = null;

      if (source === "companies") {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("company_id", Number(id))
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        company = companiesRowToCompanyRow(data);
      } else if (source === "company_json") {
        const { data, error } = await supabase
          .from("company_json")
          .select("company_id, full_json")
          .eq("company_id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        company = companyJsonToCompanyRow(data);
      } else {
        const { data, error } = await supabase
          .from("company")
          .select("*, company_logo(logo_url)")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        company = normalizedCompanyToCompanyRow(data as CompanyRow);
      }

      if (!company) return null;

      // Merge component data and intelligence
      const [components, jobRoles] = await Promise.all([
        fetchComponentData(id),
        enrichWithJobRoles(company),
      ]);

      company = { ...company, ...components, ...jobRoles };

      return enrichWithInnovX(company);
    },
  });
}

export async function fetchCompaniesByIds(ids: string[]): Promise<CompanyRow[]> {
  const source = await resolveCompanySource();

  let companies: CompanyRow[] = [];

  if (source === "companies") {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .in("company_id", ids.map(Number));
    if (error) throw error;
    companies = (data ?? []).map((item) => companiesRowToCompanyRow(item));
  } else if (source === "company_json") {
    const { data, error } = await supabase
      .from("company_json")
      .select("company_id, full_json")
      .in("company_id", ids);
    if (error) throw error;
    companies = (data ?? []).map((item) => companyJsonToCompanyRow(item));
  } else {
    const { data, error } = await supabase.from("company").select("*").in("id", ids);
    if (error) throw error;
    companies = (data ?? []).map((item) => normalizedCompanyToCompanyRow(item as CompanyRow));
  }

  // Fetch component data and enrich all
  return Promise.all(
    companies.map(async (c) => {
      const components = await fetchComponentData(c.id);
      const withRoles = await enrichWithJobRoles({ ...c, ...components });
      return enrichWithInnovX(withRoles);
    }),
  );
}

export function useCompaniesByIds(ids: string[]) {
  return useQuery({
    queryKey: ["companies-by-ids", ids],
    enabled: ids.length > 0,
    queryFn: async (): Promise<CompanyRow[]> => {
      return fetchCompaniesByIds(ids);
    },
  });
}

/** Aggregate stats for the home dashboard. */
export function useCompanyStats() {
  return useQuery({
    queryKey: ["company-stats"],
    queryFn: async () => {
      const source = await resolveCompanySource();

      if (source === "companies") {
        const { data, error } = await supabase.from("companies").select("category, employee_size");
        if (error) throw error;
        const rows = data ?? [];

        const tally = (key: string) => {
          const map = new Map<string, number>();
          for (const r of rows) {
            const v = (r as any)[key];
            if (!hasUsableValue(v)) continue;
            map.set(String(v), (map.get(String(v)) ?? 0) + 1);
          }
          return Array.from(map.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
        };

        return {
          total: rows.length,
          byCategory: tally("category"),
          byProfitability: [],
          byRemotePolicy: [],
          byHiringVelocity: [],
          byEmployeeSize: tally("employee_size"),
        };
      }

      if (source === "company_json") {
        const { data, error } = await supabase.from("company_json").select("short_json");
        if (error) throw error;
        const rows = data ?? [];

        const tally = <T extends string | null>(key: string) => {
          const map = new Map<string, number>();
          for (const r of rows) {
            const v = (r.short_json as Record<string, unknown>)[key] as T;
            if (!hasUsableValue(v)) continue;
            map.set(String(v), (map.get(String(v)) ?? 0) + 1);
          }
          return Array.from(map.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
        };

        return {
          total: rows.length,
          byCategory: tally("category"),
          byProfitability: tally("profitability_status"),
          byRemotePolicy: tally("remote_policy_details"),
          byHiringVelocity: tally("hiring_velocity"),
          byEmployeeSize: tally("employee_size"),
        };
      }

      const { data, error } = await supabase
        .from("company")
        .select(
          "category, profitability_status, remote_policy_details, hiring_velocity, employee_size",
        );
      if (error) throw error;
      const rows = (data ?? []) as CompanyRow[];

      const tally = <T extends string | null>(getter: (row: CompanyRow) => T) => {
        const map = new Map<string, number>();
        for (const r of rows) {
          const v = getter(r);
          if (!hasUsableValue(v)) continue;
          map.set(String(v), (map.get(String(v)) ?? 0) + 1);
        }
        return Array.from(map.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
      };

      return {
        total: rows.length,
        byCategory: tally((row) => row.category),
        byProfitability: tally((row) => row.profitability_status),
        byRemotePolicy: tally((row) => row.remote_policy_details),
        byHiringVelocity: tally((row) => row.hiring_velocity),
        byEmployeeSize: tally((row) => row.employee_size),
      };
    },
  });
}

/** Distinct value lists for filter dropdowns — derived from the same company list already loaded. */
export function useFilterFacets() {
  // Reuse the same data that powers the company cards — zero extra DB calls,
  // guaranteed to match exactly what is shown on screen.
  const companies = useCompanies({});

  const rows = companies.data ?? [];

  const uniqStrings = (getter: (r: CompanyListItem) => string | undefined): string[] => {
    const s = new Set<string>();
    for (const r of rows) {
      const v = getter(r);
      if (typeof v === "string" && v.trim()) s.add(v.trim());
    }
    return Array.from(s).sort();
  };

  const uniqArrays = (getter: (r: CompanyListItem) => string[] | undefined): string[] => {
    const s = new Set<string>();
    for (const r of rows) {
      const arr = getter(r) ?? [];
      for (const v of arr) {
        if (typeof v === "string" && v.trim()) s.add(v.trim());
      }
    }
    return Array.from(s).sort();
  };

  return {
    isLoading: companies.isLoading,
    error: companies.error,
    data:
      rows.length === 0
        ? undefined
        : {
            category: uniqStrings((r) => r.category),
            profitability_status: uniqStrings((r) => r.profitability_status),
            remote_policy_details: uniqStrings((r) => (r as any).remote_policy_details),
            hiring_velocity: uniqStrings((r) => (r as any).hiring_velocity),
            focus_sectors: uniqArrays((r) => r.focus_sectors),
          },
  };
}
