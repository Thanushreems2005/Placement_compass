-- SRM Placement Intelligence: company table with all 163 fields.
-- Public read-only intelligence data; no auth required for reads.

CREATE TABLE IF NOT EXISTS public.company (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- SECTION 1: Company Overview
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  category TEXT,
  incorporation_year INTEGER,
  nature_of_company TEXT,
  headquarters_address TEXT,
  operating_countries TEXT[],
  office_count INTEGER,
  office_locations TEXT[],
  employee_size TEXT,
  overview_text TEXT,
  history_timeline JSONB,
  recent_news JSONB,

  -- SECTION 2: Business & Market
  pain_points_addressed TEXT,
  focus_sectors TEXT[],
  offerings_description TEXT,
  top_customers TEXT[],
  core_value_proposition TEXT,
  unique_differentiators TEXT,
  competitive_advantages TEXT,
  weaknesses_gaps TEXT,
  key_challenges_needs TEXT,
  key_competitors TEXT[],
  tam TEXT,
  sam TEXT,
  som TEXT,
  market_share_percentage NUMERIC,
  go_to_market_strategy TEXT,
  strategic_priorities TEXT,
  future_projections TEXT,

  -- SECTION 3: Culture, People & Work
  work_culture_summary TEXT,
  hiring_velocity TEXT,
  employee_turnover TEXT,
  avg_retention_tenure TEXT,
  manager_quality TEXT,
  psychological_safety TEXT,
  feedback_culture TEXT,
  diversity_metrics JSONB,
  diversity_inclusion_score NUMERIC,
  ethical_standards TEXT,
  layoff_history TEXT,
  burnout_risk TEXT,
  mission_clarity TEXT,

  -- SECTION 4: Learning, Growth & Career Signal
  training_spend TEXT,
  onboarding_quality TEXT,
  learning_culture TEXT,
  exposure_quality TEXT,
  mentorship_availability TEXT,
  internal_mobility TEXT,
  promotion_clarity TEXT,
  tools_access TEXT,
  role_clarity TEXT,
  early_ownership TEXT,
  work_impact TEXT,
  execution_thinking_balance TEXT,
  automation_level TEXT,
  cross_functional_exposure TEXT,
  exit_opportunities TEXT,
  skill_relevance TEXT,
  network_strength TEXT,
  global_exposure TEXT,
  external_recognition TEXT,

  -- SECTION 5: Compensation & Lifestyle
  fixed_vs_variable_pay TEXT,
  bonus_predictability TEXT,
  esops_incentives TEXT,
  family_health_insurance TEXT,
  relocation_support TEXT,
  lifestyle_benefits TEXT,
  leave_policy TEXT,
  health_support TEXT,

  -- SECTION 6: Work Logistics & Safety
  remote_policy_details TEXT,
  typical_hours TEXT,
  overtime_expectations TEXT,
  weekend_work TEXT,
  flexibility_level TEXT,
  location_centrality TEXT,
  public_transport_access TEXT,
  cab_policy TEXT,
  airport_commute_time TEXT,
  office_zone_type TEXT,
  area_safety TEXT,
  safety_policies TEXT,
  infrastructure_safety TEXT,
  emergency_preparedness TEXT,

  -- SECTION 7: Financials, Risk & Stability
  annual_revenue TEXT,
  annual_profit TEXT,
  revenue_mix JSONB,
  valuation TEXT,
  yoy_growth_rate NUMERIC,
  profitability_status TEXT,
  key_investors TEXT[],
  recent_funding_rounds JSONB,
  total_capital_raised TEXT,
  burn_rate TEXT,
  runway_months INTEGER,
  burn_multiplier NUMERIC,
  esg_ratings TEXT,
  regulatory_status TEXT,
  legal_issues TEXT,
  supply_chain_dependencies TEXT,
  geopolitical_risks TEXT,
  macro_risks TEXT,

  -- SECTION 8: Technology & Innovation
  tech_stack TEXT[],
  technology_partners TEXT[],
  intellectual_property TEXT,
  r_and_d_investment TEXT,
  ai_ml_adoption_level TEXT,
  cybersecurity_posture TEXT,
  innovation_roadmap TEXT,
  product_pipeline TEXT,
  tech_adoption_rating NUMERIC,
  partnership_ecosystem TEXT,

  -- SECTION 9: Leadership & Contacts
  ceo_name TEXT,
  ceo_linkedin_url TEXT,
  key_leaders JSONB,
  board_members JSONB,
  warm_intro_pathways TEXT,
  decision_maker_access TEXT,
  primary_contact_email TEXT,
  primary_phone_number TEXT,
  contact_person_name TEXT,
  contact_person_title TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,

  -- SECTION 10: Brand & Digital Presence
  website_url TEXT,
  website_quality TEXT,
  website_rating NUMERIC,
  website_traffic_rank TEXT,
  social_media_followers JSONB,
  glassdoor_rating NUMERIC,
  indeed_rating NUMERIC,
  google_rating NUMERIC,
  linkedin_url TEXT,
  twitter_handle TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  marketing_video_url TEXT,
  customer_testimonials JSONB,
  awards_recognitions TEXT[],
  brand_sentiment_score NUMERIC,
  event_participation TEXT,

  -- Extra signal fields referenced in spec
  brand_value TEXT
);

-- Indexes for common filters/sorts
CREATE INDEX idx_company_category ON public.company(category);
CREATE INDEX idx_company_employee_size ON public.company(employee_size);
CREATE INDEX idx_company_profitability ON public.company(profitability_status);
CREATE INDEX idx_company_hiring_velocity ON public.company(hiring_velocity);
CREATE INDEX idx_company_name ON public.company(name);
CREATE INDEX idx_company_focus_sectors ON public.company USING GIN(focus_sectors);
CREATE INDEX idx_company_tech_stack ON public.company USING GIN(tech_stack);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_company_updated_at
  BEFORE UPDATE ON public.company
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: public read (placement intelligence is read-only reference data
-- consumed by students/faculty). No write policies => writes blocked
-- through anon/authenticated; admin loads happen via service role.
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company intelligence"
  ON public.company
  FOR SELECT
  USING (true);
