import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

// Manually defining some fields from company-constants.ts for verification
const EXPECTED_FIELDS = [
  "name",
  "short_name",
  "category",
  "incorporation_year",
  "nature_of_company",
  "employee_size",
  "office_count",
  "headquarters_address",
  "operating_countries",
  "office_locations",
  "overview_text",
  "history_timeline",
  "recent_news",
  "focus_sectors",
  "top_customers",
  "key_competitors",
  "tam",
  "sam",
  "som",
  "market_share_percentage",
  "pain_points_addressed",
  "offerings_description",
  "core_value_proposition",
  "unique_differentiators",
  "competitive_advantages",
  "weaknesses_gaps",
  "key_challenges_needs",
  "go_to_market_strategy",
  "strategic_priorities",
  "future_projections",
  "hiring_velocity",
  "employee_turnover",
  "avg_retention_tenure",
  "manager_quality",
  "psychological_safety",
  "feedback_culture",
  "diversity_inclusion_score",
  "ethical_standards",
  "layoff_history",
  "burnout_risk",
  "mission_clarity",
  "work_culture_summary",
  "diversity_metrics",
  "training_spend",
  "onboarding_quality",
  "learning_culture",
  "exposure_quality",
  "mentorship_availability",
  "internal_mobility",
  "promotion_clarity",
  "tools_access",
  "role_clarity",
  "early_ownership",
  "work_impact",
  "execution_thinking_balance",
  "automation_level",
  "cross_functional_exposure",
  "exit_opportunities",
  "skill_relevance",
  "network_strength",
  "global_exposure",
  "external_recognition",
  "fixed_vs_variable_pay",
  "bonus_predictability",
  "esops_incentives",
  "family_health_insurance",
  "relocation_support",
  "lifestyle_benefits",
  "leave_policy",
  "health_support",
  "remote_policy_details",
  "typical_hours",
  "overtime_expectations",
  "weekend_work",
  "flexibility_level",
  "location_centrality",
  "public_transport_access",
  "cab_policy",
  "airport_commute_time",
  "office_zone_type",
  "area_safety",
  "safety_policies",
  "infrastructure_safety",
  "emergency_preparedness",
  "annual_revenue",
  "annual_profit",
  "valuation",
  "yoy_growth_rate",
  "profitability_status",
  "total_capital_raised",
  "burn_rate",
  "runway_months",
  "burn_multiplier",
  "esg_ratings",
  "regulatory_status",
  "key_investors",
  "revenue_mix",
  "recent_funding_rounds",
  "legal_issues",
  "supply_chain_dependencies",
  "geopolitical_risks",
  "macro_risks",
  "ai_ml_adoption_level",
  "cybersecurity_posture",
  "tech_adoption_rating",
  "r_and_d_investment",
  "tech_stack",
  "technology_partners",
  "intellectual_property",
  "innovation_roadmap",
  "product_pipeline",
  "partnership_ecosystem",
  "ceo_name",
  "ceo_linkedin_url",
  "decision_maker_access",
  "warm_intro_pathways",
  "primary_contact_email",
  "primary_phone_number",
  "contact_person_name",
  "contact_person_title",
  "contact_person_email",
  "contact_person_phone",
  "key_leaders",
  "board_members",
  "website_url",
  "website_quality",
  "website_rating",
  "website_traffic_rank",
  "glassdoor_rating",
  "indeed_rating",
  "google_rating",
  "brand_sentiment_score",
  "event_participation",
  "brand_value",
  "linkedin_url",
  "twitter_handle",
  "facebook_url",
  "instagram_url",
  "social_media_followers",
  "customer_testimonials",
  "awards_recognitions",
  "marketing_video_url",
];

async function verifyAllParams() {
  const companyId = 118; // Coforge
  console.log(`--- Verification of all params for Company ${companyId} ---`);

  const { data } = await supabase
    .from("company_json")
    .select("full_json")
    .eq("company_id", companyId)
    .maybeSingle();
  const fullJson = data.full_json;

  let foundCount = 0;
  let missingFields = [];

  EXPECTED_FIELDS.forEach((field) => {
    if (fullJson.hasOwnProperty(field)) {
      foundCount++;
    } else {
      missingFields.push(field);
    }
  });

  console.log(`Found: ${foundCount} / ${EXPECTED_FIELDS.length}`);
  if (missingFields.length > 0) {
    console.log("Missing from full_json:", missingFields.join(", "));
  } else {
    console.log("All expected fields found in full_json!");
  }
}

verifyAllParams();
