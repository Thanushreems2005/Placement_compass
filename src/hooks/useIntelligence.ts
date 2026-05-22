import { useQuery } from "@tanstack/react-query";
import { fetchIntelligence } from "@/services/intelligenceService";
import type { IntelligenceResponse, IntelligenceSection } from "@/types/canonicalIntelligence.types";
import { SECTIONS_ORDER, SECTION_LABELS } from "@/types/canonicalIntelligence.types";

/** Raw intelligence query hook */
export function useIntelligence(companyName: string | null) {
  return useQuery<IntelligenceResponse, Error>({
    queryKey: ["intelligence", companyName],
    queryFn: () => fetchIntelligence(companyName!),
    enabled: !!companyName && companyName.trim().length > 1,
    staleTime: 5 * 60 * 1000,       // 5 min — intelligence is stable
    gcTime: 30 * 60 * 1000,          // 30 min gc
    retry: 1,
    retryDelay: 2000,
  });
}

/** Returns intelligence data grouped into sections for rendering */
export function useIntelligenceSections(data: IntelligenceResponse | undefined): IntelligenceSection[] {
  if (!data) return [];

  const sectionGroups: Record<string, IntelligenceSection> = {};

  // Initialize sections in order
  for (const sectionId of SECTIONS_ORDER) {
    const meta = (SECTION_LABELS as Record<string, { label: string; emoji: string }>)[sectionId] ?? {
      label: sectionId,
      emoji: "📋",
    };
    sectionGroups[sectionId] = {
      id: sectionId,
      label: meta.label,
      emoji: meta.emoji,
      fields: [],
    };
  }

  // Bucket each field into its section
  for (const [fieldKey, sectionId] of Object.entries(data.section_map)) {
    const section = sectionGroups[sectionId];
    if (!section) continue;
    section.fields.push({
      key: fieldKey,
      value: data.parameters[fieldKey] ?? null,
      provenance: data.provenance[fieldKey] ?? null,
    });
  }

  return SECTIONS_ORDER.map((id) => sectionGroups[id]).filter(
    (s) => s && s.fields.length > 0,
  );
}

// Re-export for convenience
export { SECTION_LABELS } from "@/types/canonicalIntelligence.types";
