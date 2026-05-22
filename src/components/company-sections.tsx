/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Section component definitions for the Company Detail page.
 * Every field maps 1:1 to a `public.company` column. No fabrication, no derived data.
 */
import {
  Briefcase,
  Building2,
  Cpu,
  GraduationCap,
  Heart,
  LineChart,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Field, ProseField, TagsField } from "@/components/Field";
import { FieldGrid, SectionCard } from "@/components/SectionCard";
import { fmtCompact, fmtNumber, fmtPercent, fmtRating } from "@/lib/format";
import type { CompanyRow } from "@/lib/company-types";

export const SECTIONS = [
  { id: "overview", title: "Company Overview", icon: Building2 },
  { id: "business", title: "Business & Market", icon: Briefcase },
  { id: "culture", title: "Culture, People & Work", icon: Users },
  { id: "growth", title: "Learning, Growth & Career Signal", icon: GraduationCap },
  { id: "comp", title: "Compensation & Lifestyle", icon: Wallet },
  { id: "logistics", title: "Work Logistics & Safety", icon: ShieldCheck },
  { id: "financials", title: "Financials, Risk & Stability", icon: LineChart },
  { id: "tech", title: "Technology & Innovation", icon: Cpu },
  { id: "leadership", title: "Leadership & Contacts", icon: Heart },
  { id: "brand", title: "Brand & Digital Presence", icon: Megaphone },
] as const;

export function Section1Overview({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="overview"
      number={1}
      title="Company Overview"
      icon={<Building2 className="h-4 w-4" />}
    >
      <FieldGrid>
        <Field label="Name" value={c.name} />
        <Field label="Short name" value={c.short_name} />
        <Field label="Category" value={c.category} />
        <Field label="Incorporation year" value={c.incorporation_year ?? undefined} />
        <Field label="Nature of company" value={c.nature_of_company} />
        <Field label="Employee size" value={c.employee_size} />
        <Field label="Office count" value={c.office_count ?? undefined} />
        <Field label="Headquarters" value={c.headquarters_address} span={2} />
        <TagsField label="Operating countries" values={c.operating_countries} />
        <TagsField label="Office locations" values={c.office_locations} />
      </FieldGrid>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProseField label="Overview" value={c.overview_text} />
        <JsonField label="History timeline" value={c.history_timeline} />
        <JsonField label="Recent news" value={c.recent_news} />
      </div>
    </SectionCard>
  );
}

export function Section2Business({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="business"
      number={2}
      title="Business & Market"
      icon={<Briefcase className="h-4 w-4" />}
    >
      <FieldGrid>
        <TagsField label="Focus sectors" values={c.focus_sectors} />
        <TagsField label="Top customers" values={c.top_customers} />
        <TagsField label="Key competitors" values={c.key_competitors} />
        <Field label="TAM" value={c.tam} />
        <Field label="SAM" value={c.sam} />
        <Field label="SOM" value={c.som} />
        <Field label="Market share" value={fmtPercent(c.market_share_percentage)} />
      </FieldGrid>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProseField label="Pain points addressed" value={c.pain_points_addressed} />
        <ProseField label="Offerings" value={c.offerings_description} />
        <ProseField label="Core value proposition" value={c.core_value_proposition} />
        <ProseField label="Unique differentiators" value={c.unique_differentiators} />
        <ProseField label="Competitive advantages" value={c.competitive_advantages} />
        <ProseField label="Weaknesses / gaps" value={c.weaknesses_gaps} />
        <ProseField label="Key challenges & needs" value={c.key_challenges_needs} />
        <ProseField label="Go-to-market strategy" value={c.go_to_market_strategy} />
        <ProseField label="Strategic priorities" value={c.strategic_priorities} />
        <ProseField label="Future projections" value={c.future_projections} />
      </div>
    </SectionCard>
  );
}

export function Section3Culture({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="culture"
      number={3}
      title="Culture, People & Work"
      icon={<Users className="h-4 w-4" />}
    >
      <FieldGrid>
        <Field label="Hiring velocity" value={c.hiring_velocity} />
        <Field label="Employee turnover" value={c.employee_turnover} />
        <Field label="Avg retention tenure" value={c.avg_retention_tenure} />
        <Field label="Manager quality" value={c.manager_quality} />
        <Field label="Psychological safety" value={c.psychological_safety} />
        <Field label="Feedback culture" value={c.feedback_culture} />
        <Field label="D&I score" value={fmtRating(c.diversity_inclusion_score)} />
        <Field label="Ethical standards" value={c.ethical_standards} />
        <Field label="Layoff history" value={c.layoff_history} />
        <Field label="Burnout risk" value={c.burnout_risk} />
        <Field label="Mission clarity" value={c.mission_clarity} />
      </FieldGrid>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProseField label="Work culture summary" value={c.work_culture_summary} />
        <JsonField label="Diversity metrics" value={c.diversity_metrics} />
      </div>
    </SectionCard>
  );
}

export function Section4Growth({ c }: { c: CompanyRow }) {
  const fields: Array<[string, string | null]> = [
    ["Training spend", c.training_spend],
    ["Onboarding quality", c.onboarding_quality],
    ["Learning culture", c.learning_culture],
    ["Exposure quality", c.exposure_quality],
    ["Mentorship availability", c.mentorship_availability],
    ["Internal mobility", c.internal_mobility],
    ["Promotion clarity", c.promotion_clarity],
    ["Tools access", c.tools_access],
    ["Role clarity", c.role_clarity],
    ["Early ownership", c.early_ownership],
    ["Work impact", c.work_impact],
    ["Execution / thinking balance", c.execution_thinking_balance],
    ["Automation level", c.automation_level],
    ["Cross-functional exposure", c.cross_functional_exposure],
    ["Exit opportunities", c.exit_opportunities],
    ["Skill relevance", c.skill_relevance],
    ["Network strength", c.network_strength],
    ["Global exposure", c.global_exposure],
    ["External recognition", c.external_recognition],
  ];
  return (
    <SectionCard
      id="growth"
      number={4}
      title="Learning, Growth & Career Signal"
      icon={<GraduationCap className="h-4 w-4" />}
    >
      <FieldGrid>
        {fields.map(([k, v]) => (
          <Field key={k} label={k} value={v} />
        ))}
      </FieldGrid>
    </SectionCard>
  );
}

export function Section5Comp({ c }: { c: CompanyRow }) {
  const fields: Array<[string, string | null]> = [
    ["Fixed vs variable pay", c.fixed_vs_variable_pay],
    ["Bonus predictability", c.bonus_predictability],
    ["ESOPs / incentives", c.esops_incentives],
    ["Family health insurance", c.family_health_insurance],
    ["Relocation support", c.relocation_support],
    ["Lifestyle benefits", c.lifestyle_benefits],
    ["Leave policy", c.leave_policy],
    ["Health support", c.health_support],
  ];
  return (
    <SectionCard
      id="comp"
      number={5}
      title="Compensation & Lifestyle"
      icon={<Wallet className="h-4 w-4" />}
    >
      <FieldGrid>
        {fields.map(([k, v]) => (
          <Field key={k} label={k} value={v} />
        ))}
      </FieldGrid>
    </SectionCard>
  );
}

export function Section6Logistics({ c }: { c: CompanyRow }) {
  const fields: Array<[string, string | null]> = [
    ["Remote policy", c.remote_policy_details],
    ["Typical hours", c.typical_hours],
    ["Overtime expectations", c.overtime_expectations],
    ["Weekend work", c.weekend_work],
    ["Flexibility level", c.flexibility_level],
    ["Location centrality", c.location_centrality],
    ["Public transport access", c.public_transport_access],
    ["Cab policy", c.cab_policy],
    ["Airport commute time", c.airport_commute_time],
    ["Office zone type", c.office_zone_type],
    ["Area safety", c.area_safety],
    ["Safety policies", c.safety_policies],
    ["Infrastructure safety", c.infrastructure_safety],
    ["Emergency preparedness", c.emergency_preparedness],
  ];
  return (
    <SectionCard
      id="logistics"
      number={6}
      title="Work Logistics & Safety"
      icon={<ShieldCheck className="h-4 w-4" />}
    >
      <FieldGrid>
        {fields.map(([k, v]) => (
          <Field key={k} label={k} value={v} />
        ))}
      </FieldGrid>
    </SectionCard>
  );
}

export function Section7Financials({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="financials"
      number={7}
      title="Financials, Risk & Stability"
      icon={<LineChart className="h-4 w-4" />}
    >
      <FieldGrid>
        <Field label="Annual revenue" value={c.annual_revenue} />
        <Field label="Annual profit" value={c.annual_profit} />
        <Field label="Valuation" value={c.valuation} />
        <Field label="YoY growth" value={fmtPercent(c.yoy_growth_rate)} />
        <Field label="Profitability" value={c.profitability_status} />
        <Field label="Total capital raised" value={c.total_capital_raised} />
        <Field label="Burn rate" value={c.burn_rate} />
        <Field label="Runway (months)" value={fmtNumber(c.runway_months)} />
        <Field label="Burn multiplier" value={fmtRating(c.burn_multiplier)} />
        <Field label="ESG ratings" value={c.esg_ratings} />
        <Field label="Regulatory status" value={c.regulatory_status} />
        <TagsField label="Key investors" values={c.key_investors} />
      </FieldGrid>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JsonField label="Revenue mix" value={c.revenue_mix} />
        <JsonField label="Recent funding rounds" value={c.recent_funding_rounds} />
        <ProseField label="Legal issues" value={c.legal_issues} />
        <ProseField label="Supply chain dependencies" value={c.supply_chain_dependencies} />
        <ProseField label="Geopolitical risks" value={c.geopolitical_risks} />
        <ProseField label="Macro risks" value={c.macro_risks} />
      </div>
    </SectionCard>
  );
}

export function Section8Tech({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="tech"
      number={8}
      title="Technology & Innovation"
      icon={<Cpu className="h-4 w-4" />}
    >
      <FieldGrid>
        <Field label="AI/ML adoption level" value={c.ai_ml_adoption_level} />
        <Field label="Cybersecurity posture" value={c.cybersecurity_posture} />
        <Field label="Tech adoption rating" value={fmtRating(c.tech_adoption_rating)} />
        <Field label="R&D investment" value={c.r_and_d_investment} />
      </FieldGrid>
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TagsField label="Tech stack" values={c.tech_stack} />
        <TagsField label="Technology partners" values={c.technology_partners} />
        <ProseField label="Intellectual property" value={c.intellectual_property} />
        <ProseField label="Innovation roadmap" value={c.innovation_roadmap} />
        <ProseField label="Product pipeline" value={c.product_pipeline} />
        <ProseField label="Partnership ecosystem" value={c.partnership_ecosystem} />
      </div>
    </SectionCard>
  );
}

export function Section9Leadership({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="leadership"
      number={9}
      title="Leadership & Contacts"
      icon={<Heart className="h-4 w-4" />}
    >
      <FieldGrid>
        <Field label="CEO" value={c.ceo_name} />
        <Field label="CEO LinkedIn">
          {c.ceo_linkedin_url ? (
            <a
              className="text-accent hover:underline"
              href={c.ceo_linkedin_url}
              target="_blank"
              rel="noreferrer"
            >
              View profile
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Decision-maker access" value={c.decision_maker_access} />
        <Field label="Warm intro pathways" value={c.warm_intro_pathways} span={2} />
        <Field label="Primary contact email" value={c.primary_contact_email} mono />
        <Field label="Primary phone" value={c.primary_phone_number} mono />
        <Field label="Contact name" value={c.contact_person_name} />
        <Field label="Contact title" value={c.contact_person_title} />
        <Field label="Contact email" value={c.contact_person_email} mono />
        <Field label="Contact phone" value={c.contact_person_phone} mono />
      </FieldGrid>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JsonField label="Key leaders" value={c.key_leaders} />
        <JsonField label="Board members" value={c.board_members} />
      </div>
    </SectionCard>
  );
}

export function Section10Brand({ c }: { c: CompanyRow }) {
  return (
    <SectionCard
      id="brand"
      number={10}
      title="Brand & Digital Presence"
      icon={<Megaphone className="h-4 w-4" />}
    >
      <FieldGrid>
        <Field label="Website">
          {c.website_url ? (
            <a
              className="text-accent hover:underline"
              href={c.website_url}
              target="_blank"
              rel="noreferrer"
            >
              {c.website_url}
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Website quality" value={c.website_quality} />
        <Field label="Website rating" value={fmtRating(c.website_rating)} />
        <Field label="Traffic rank" value={c.website_traffic_rank} />
        <Field label="Glassdoor" value={fmtRating(c.glassdoor_rating)} />
        <Field label="Indeed" value={fmtRating(c.indeed_rating)} />
        <Field label="Google" value={fmtRating(c.google_rating)} />
        <Field label="Brand sentiment" value={fmtRating(c.brand_sentiment_score)} />
        <Field label="Event participation" value={c.event_participation} />
        <Field label="Brand value" value={c.brand_value} />
        <Field label="LinkedIn">
          {c.linkedin_url ? (
            <a
              className="text-accent hover:underline"
              href={c.linkedin_url}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Twitter" value={c.twitter_handle} mono />
        <Field label="Facebook">
          {c.facebook_url ? (
            <a
              className="text-accent hover:underline"
              href={c.facebook_url}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          ) : (
            "—"
          )}
        </Field>
        <Field label="Instagram">
          {c.instagram_url ? (
            <a
              className="text-accent hover:underline"
              href={c.instagram_url}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          ) : (
            "—"
          )}
        </Field>
      </FieldGrid>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Field label="Social media followers" value={fmtCompact(c.social_media_followers as any)} />
        <JsonField label="Customer testimonials" value={c.customer_testimonials} />
        <TagsField label="Awards & recognitions" values={c.awards_recognitions} />
        <Field label="Marketing video">
          {c.marketing_video_url ? (
            <a
              className="text-accent hover:underline"
              href={c.marketing_video_url}
              target="_blank"
              rel="noreferrer"
            >
              Watch
            </a>
          ) : (
            "—"
          )}
        </Field>
      </div>
    </SectionCard>
  );
}

function JsonField({ label, value }: { label: string; value: unknown }) {
  const empty =
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && value !== null && Object.keys(value as object).length === 0);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      {empty ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : typeof value === "string" ? (
        <p className="text-sm text-foreground">{value}</p>
      ) : (
        <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-[12px] leading-relaxed text-foreground/90">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
