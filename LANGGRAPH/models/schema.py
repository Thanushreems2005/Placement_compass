from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class CompanyOverview(BaseModel):
    name: str
    short_name: str | None = None
    logo_url: str | None = None
    category: str | None = None
    incorporation_year: int | str | None = None
    nature_of_company: str | None = None
    headquarters_address: str | None = None
    operating_countries: list[str] | str = Field(default_factory=list)
    office_count: int | str | None = None
    office_locations: list[str] | str = Field(default_factory=list)
    employee_size: int | str | None = None
    overview_text: str | None = None
    history_timeline: dict[str, Any] | str | None = None
    recent_news: list[str] | str | None = None
    company_maturity: str | None = None

class BusinessMarket(BaseModel):
    pain_points_addressed: str | None = None
    focus_sectors: list[str] | str = Field(default_factory=list)
    offerings_description: str | None = None
    top_customers: list[str] | str = Field(default_factory=list)
    core_value_proposition: str | None = None
    unique_differentiators: str | None = None
    competitive_advantages: str | None = None
    weaknesses_gaps: str | None = None
    key_challenges_needs: str | None = None
    key_competitors: list[str] | str = Field(default_factory=list)
    tam: float | str | None = None
    sam: float | str | None = None
    som: float | str | None = None
    market_share_percentage: float | str | None = None
    go_to_market_strategy: str | None = None
    strategic_priorities: str | None = None
    future_projections: str | None = None

class CulturePeopleWork(BaseModel):
    work_culture_summary: str | None = None
    hiring_velocity: float | str | None = None
    employee_turnover: int | str | None = None
    avg_retention_tenure: float | str | None = None
    manager_quality: float | str | None = None
    psychological_safety: float | str | None = None
    feedback_culture: float | str | None = None
    diversity_metrics: dict[str, Any] | str | None = None
    diversity_inclusion_score: float | str | None = None
    ethical_standards: str | float | int | None = None
    layoff_history: bool | str | None = None
    burnout_risk: float | str | None = None
    mission_clarity: float | str | None = None
    crisis_behavior: str | float | int | None = None

class LearningGrowth(BaseModel):
    training_spend: float | str | None = None
    onboarding_quality: float | str | None = None
    learning_culture: float | str | int | None = None
    exposure_quality: str | float | int | None = None
    mentorship_availability: float | str | int | None = None
    internal_mobility: float | str | int | None = None
    promotion_clarity: str | float | int | None = None
    tools_access: str | None = None
    role_clarity: str | None = None
    early_ownership: str | None = None
    work_impact: str | None = None
    execution_thinking_balance: str | None = None
    automation_level: float | str | int | None = None
    cross_functional_exposure: float | str | int | None = None
    exit_opportunities: list[str] | str = Field(default_factory=list)
    skill_relevance: float | str | int | None = None
    network_strength: float | str | int | None = None
    global_exposure: str | float | int | None = None
    external_recognition: list[str] | str = Field(default_factory=list)

class CompensationLifestyle(BaseModel):
    fixed_vs_variable_pay: str | None = None
    bonus_predictability: float | str | None = None
    esops_incentives: str | None = None
    family_health_insurance: str | None = None
    relocation_support: str | None = None
    lifestyle_benefits: list[str] | str = Field(default_factory=list)
    leave_policy: str | None = None
    health_support: str | None = None

class WorkLogistics(BaseModel):
    remote_policy_details: str | None = None
    typical_hours: str | None = None
    overtime_expectations: str | None = None
    weekend_work: str | None = None
    flexibility_level: float | str | None = None
    location_centrality: str | None = None
    public_transport_access: str | None = None
    cab_policy: str | None = None
    airport_commute_time: int | str | None = None
    office_zone_type: str | None = None
    area_safety: float | str | None = None
    safety_policies: list[str] | str = Field(default_factory=list)
    infrastructure_safety: str | None = None
    emergency_preparedness: str | None = None

class FinancialsStability(BaseModel):
    annual_revenue: float | str | None = None
    annual_profit: float | str | None = None
    revenue_mix: dict[str, Any] | str | None = None
    valuation: float | str | None = None
    yoy_growth_rate: float | str | None = None
    profitability_status: str | None = None
    key_investors: list[str] | str = Field(default_factory=list)
    recent_funding_rounds: list[dict[str, Any]] | str = Field(default_factory=list)
    total_capital_raised: int | str | None = None
    burn_rate: float | str | None = None
    runway_months: int | str | None = None
    burn_multiplier: float | str | None = None
    esg_ratings: dict[str, Any] | str | None = None
    regulatory_status: str | None = None
    legal_issues: list[str] | str = Field(default_factory=list)
    supply_chain_dependencies: list[str] | str = Field(default_factory=list)
    geopolitical_risks: list[str] | str = Field(default_factory=list)
    macro_risks: list[str] | str = Field(default_factory=list)
    cac: int | str | None = None
    clv: int | str | None = None
    ltv: int | str | None = None
    cac_ltv_ratio: float | str | None = None
    churn_rate: float | str | None = None
    net_revenue_retention: float | str | None = None
    gross_revenue_retention: float | str | None = None
    payback_period: float | str | None = None
    rd_investment_percentage: float | str | None = None
    revenue_per_employee: float | str | None = None
    profit_per_employee: float | str | None = None

class TechInnovation(BaseModel):
    tech_stack: list[str] | str = Field(default_factory=list)
    technology_partners: list[str] | str = Field(default_factory=list)
    intellectual_property: dict[str, Any] | list[str] | str | int | float | None = None
    r_and_d_investment: str | float | None = None
    ai_ml_adoption_level: str | None = None
    cybersecurity_posture: str | None = None
    innovation_roadmap: list[str] | str = Field(default_factory=list)
    product_pipeline: list[str] | str = Field(default_factory=list)
    tech_adoption_rating: float | str | None = None
    partnership_ecosystem: list[str] | str = Field(default_factory=list)

class LeadershipContacts(BaseModel):
    ceo_name: str | None = None
    ceo_linkedin_url: str | None = None
    key_leaders: list[Any] | str = Field(default_factory=list)
    board_members: list[Any] | str = Field(default_factory=list)
    warm_intro_pathways: list[Any] | str = Field(default_factory=list)
    decision_maker_access: float | str | None = None
    primary_contact_email: str | None = None
    primary_phone_number: str | None = None
    contact_person_name: str | None = None
    contact_person_title: str | None = None
    contact_person_email: str | None = None
    contact_person_phone: str | None = None

class BrandDigital(BaseModel):
    website_url: str | None = None
    website_quality: float | str | None = None
    website_rating: float | str | None = None
    website_traffic_rank: int | str | None = None
    social_media_followers: dict[str, Any] | str | None = None
    glassdoor_rating: float | str | None = None
    indeed_rating: float | str | None = None
    google_rating: float | str | None = None
    linkedin_url: str | None = None
    twitter_handle: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    marketing_video_url: str | None = None
    customer_testimonials: list[Any] | str = Field(default_factory=list)
    awards_recognitions: list[str] | str = Field(default_factory=list)
    brand_sentiment_score: float | str | None = None
    event_participation: list[str] | str = Field(default_factory=list)
    brand_value: float | str | None = None
    nps: int | str | None = None
    sales_motion: str | None = None
    customer_acquisition_channels: list[str] | str = Field(default_factory=list)
    sales_cycle_length: float | str | None = None
    average_deal_size: float | str | None = None
    headcount_growth_rate: float | str | None = None
    market_share_status: str | None = None

class CompanyIntelligenceSchema(BaseModel):
    overview: CompanyOverview
    business_market: BusinessMarket
    culture_people_work: CulturePeopleWork
    learning_growth: LearningGrowth
    compensation_lifestyle: CompensationLifestyle
    work_logistics: WorkLogistics
    financials_stability: FinancialsStability
    tech_innovation: TechInnovation
    leadership_contacts: LeadershipContacts
    brand_digital: BrandDigital
    
    confidence_score: float = Field(default=0.8, ge=0.0, le=1.0)
    extraction_timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    def flatten(self) -> Dict[str, Any]:
        flat = {}
        sections = [
            self.overview, self.business_market, self.culture_people_work,
            self.learning_growth, self.compensation_lifestyle, self.work_logistics,
            self.financials_stability, self.tech_innovation, self.leadership_contacts,
            self.brand_digital
        ]
        for section in sections:
            if hasattr(section, "dict"):
                flat.update(section.dict())
            elif isinstance(section, dict):
                flat.update(section)
        return flat
