import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function verify() {
  console.log("--- Verifying Data Source Priority ---");
  // Check company_json
  const { data: jsonData } = await supabase.from("company_json").select("company_id").limit(1);
  console.log("company_json has data:", !!jsonData && jsonData.length > 0);

  console.log("\n--- Fetching Company 80 (Epifi) via company_json logic ---");
  const { data, error } = await supabase
    .from("company_json")
    .select("company_id, full_json")
    .eq("company_id", 80)
    .maybeSingle();

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  const fullJson = data.full_json;
  const keys = Object.keys(fullJson);
  console.log("Total parameters in full_json:", keys.length);

  // Check for some known-missing parameters
  const sampleParams = [
    "annual_revenue",
    "valuation",
    "burn_rate",
    "leave_policy",
    "typical_hours",
    "overtime_expectations",
    "tech_stack",
  ];

  console.log("\nSample Parameter Values:");
  sampleParams.forEach((p) => {
    console.log(`- ${p}: ${fullJson[p]}`);
  });

  const nonNullCount = keys.filter((k) => fullJson[k] !== null && fullJson[k] !== "").length;
  console.log("\nNon-null parameters count:", nonNullCount);
}

verify();
