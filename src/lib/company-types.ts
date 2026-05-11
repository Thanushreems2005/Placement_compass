import type { Database } from "@/integrations/supabase/types";

export type CompanyRow = Omit<
  Database["public"]["Tables"]["company"]["Row"],
  | "brand_sentiment_score"
  | "burn_multiplier"
  | "tech_adoption_rating"
  | "website_rating"
  | "glassdoor_rating"
  | "indeed_rating"
  | "google_rating"
  | "diversity_inclusion_score"
  | "runway_months"
  | "yoy_growth_rate"
  | "market_share_percentage"
> & {
  preparation_strategy?: string | null;
  job_description?: string | null;
  vision_statement?: string | null;
  mission_statement?: string | null;
  industry_associations?: string | null;
  // Overrides to allow descriptive strings in numeric fields
  brand_sentiment_score?: number | string | null;
  burn_multiplier?: number | string | null;
  tech_adoption_rating?: number | string | null;
  website_rating?: number | string | null;
  glassdoor_rating?: number | string | null;
  indeed_rating?: number | string | null;
  google_rating?: number | string | null;
  diversity_inclusion_score?: number | string | null;
  runway_months?: number | string | null;
  yoy_growth_rate?: number | string | null;
  market_share_percentage?: number | string | null;
};

export type ShortJson = {
  name: string;
  short_name?: string;
  logo_url?: string;
  category?: string;
  employee_size?: string;
  focus_sectors?: string[];
  hiring_velocity?: string;
  profitability_status?: string;
  remote_policy_details?: string;
  yoy_growth_rate?: number | string;
  brand_value?: string;
  location?: string;
  city?: string;
  country?: string;
  overview_text?: string;
  website_url?: string;
};

/** Lightweight projection used by lists/cards — typed against the schema. */
export type CompanyListItem = {
  id: string;
} & ShortJson;

export const LIST_COLUMNS = "company_id,short_json";
