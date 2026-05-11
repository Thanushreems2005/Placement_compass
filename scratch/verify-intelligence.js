import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function verify() {
  const companyId = 80; // Epifi
  console.log(`--- Fetching Intelligence for Company ${companyId} ---`);

  // 1. Fetch from company_json (Base)
  const { data: baseData } = await supabase
    .from("company_json")
    .select("full_json")
    .eq("company_id", companyId)
    .maybeSingle();
  const base = baseData.full_json;

  // 2. Fetch from job_role_details_json
  const { data: roleData } = await supabase
    .from("job_role_details_json")
    .select("job_role_json")
    .eq("company_id", companyId)
    .maybeSingle();
  const roles = roleData?.job_role_json?.job_role_details || [];
  const job_description =
    roles[0]?.job_description ||
    roles.map((r) => `${r.role_title}: ${r.job_description}`).join("\n\n");

  // 3. Fetch from innovx_json
  const { data: innovData } = await supabase
    .from("innovx_json")
    .select("json_data")
    .eq("company_id", companyId)
    .maybeSingle();
  const innovx = innovData?.json_data;

  console.log("\n--- Enrichment Results ---");
  console.log("Base Parameters Count:", Object.keys(base).length);
  console.log("Job Description Length:", job_description?.length || 0);
  console.log("Job Description Snippet:", job_description?.substring(0, 100) + "...");
  console.log("InnovX Data Available:", !!innovx);

  if (innovx) {
    const master = innovx.innovx_master || {};
    console.log("- InnovX Master Industry:", master.industry);
    console.log("- InnovX Projects Count:", (innovx.innovx_projects || []).length);
  }

  const combined = { ...base, job_description };
  console.log("\nTotal Integrated Parameters:", Object.keys(combined).length);
}

verify();
