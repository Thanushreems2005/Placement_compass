import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

// Mocking the enrichment logic to test it locally
function enrich(company, json) {
  const master = json.innovx_master || {};
  const pillars = json.strategic_pillars || [];
  const projects = json.innovx_projects || [];
  const trends = json.industry_trends || [];

  const allTech = new Set();
  projects.forEach((p) => {
    [
      ...(p.backend_technologies || []),
      ...(p.frontend_technologies || []),
      ...(p.ai_ml_technologies || []),
    ].forEach((t) => {
      if (t) allTech.add(t);
    });
  });

  return {
    ...company,
    tech_stack: Array.from(allTech),
    operating_countries: master.geographic_focus
      ? master.geographic_focus.split(",").map((s) => s.trim())
      : [],
    strategic_priorities: pillars.map((p) => p.pillar_name).join(", "),
    product_pipeline: projects.map((p) => `${p.project_name}: ${p.problem_statement}`).join("\n"),
  };
}

async function test() {
  const { data: innovx } = await supabase.from("innovx_json").select("*").limit(1);
  if (!innovx || innovx.length === 0) return;

  const company = { id: innovx[0].company_id, name: innovx[0].name };
  const enriched = enrich(company, innovx[0].json_data);

  console.log("Enriched Company:", JSON.stringify(enriched, null, 2));
}

test();
