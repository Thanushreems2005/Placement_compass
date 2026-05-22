/** Canonical intelligence response from GET /api/v1/companies/search/{name} */

export type ProvenanceLabel =
  | "REAL_EXTRACTED"
  | "CACHE_VERIFIED"
  | "CACHE_VERIFIED_RECENT"
  | "VALIDATED_CONSENSUS"
  | "INFERRED_INTELLIGENCE"
  | "DERIVED_INTELLIGENCE"
  | "FAILED"
  | "NULL"
  | "UNVERIFIED";

export interface FieldProvenance {
  provenance: ProvenanceLabel;
  confidence: number; // 0.0 – 1.0
  provider: string;
  source_url?: string | null;
  timestamp?: string | null;
}

export interface IntelligenceQuality {
  completeness_score: number;
  quality_score: number;
  provenance_counts: Record<string, number>;
  total_fields: number;
  populated_fields: number;
  null_fields: number;
}

export interface IntelligenceBasicInfo {
  id: number | null;
  name: string | null;
  short_name: string | null;
  logo_url: string | null;
  website_url: string | null;
  category: string | null;
}

export interface IntelligenceMeta {
  company_name: string;
  record_updated_at: string | null;
  source: string | null;
}

/** The full flat 163-parameter map — any field may be null */
export type IntelligenceParameters = Record<string, unknown>;

/** Maps each field_name → section name */
export type SectionMap = Record<string, string>;

export interface IntelligenceResponse {
  basic_info: IntelligenceBasicInfo;
  parameters: IntelligenceParameters;
  provenance: Record<string, FieldProvenance>;
  section_map: SectionMap;
  quality: IntelligenceQuality;
  meta: IntelligenceMeta;
}

/** Grouped view of a section and its fields */
export interface IntelligenceSection {
  id: string;
  label: string;
  emoji: string;
  fields: Array<{
    key: string;
    value: unknown;
    provenance: FieldProvenance | null;
  }>;
}

export const SECTION_LABELS: Record<string, { label: string; emoji: string }> = {
  overview:               { label: "Overview",                emoji: "🏢" },
  business_market:        { label: "Business & Market",        emoji: "📊" },
  culture_people_work:    { label: "Culture & People",         emoji: "🌱" },
  learning_growth:        { label: "Learning & Growth",        emoji: "🎓" },
  compensation_lifestyle: { label: "Compensation",             emoji: "💰" },
  work_logistics:         { label: "Work Logistics",           emoji: "📍" },
  financials_stability:   { label: "Financial Stability",      emoji: "📈" },
  tech_innovation:        { label: "Technology & Innovation",  emoji: "⚡" },
  leadership_contacts:    { label: "Leadership & Contacts",    emoji: "👤" },
  brand_digital:          { label: "Brand & Digital",          emoji: "🌐" },
};

export const SECTIONS_ORDER = Object.keys(SECTION_LABELS);
