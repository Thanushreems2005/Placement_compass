import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function backfillLogos() {
  const { data: companies, error: cError } = await supabase
    .from("companies")
    .select("company_id, name, website_url");
  const { data: existingLogos, error: lError } = await supabase
    .from("company_logo")
    .select("company_id");

  if (cError || lError) {
    console.error("Error fetching data:", cError || lError);
    return;
  }

  const logoSet = new Set(existingLogos.map((l) => l.company_id));
  const missing = companies.filter((c) => !logoSet.has(c.company_id));

  console.log(`Attempting to backfill ${missing.length} logos...`);

  for (const company of missing) {
    if (!company.website_url || company.website_url === "NA" || company.website_url === "N/A")
      continue;

    // Extract domain
    let domain = company.website_url
      .replace(/https?:\/\//, "")
      .replace(/\/.*$/, "")
      .split("?")[0]
      .trim();
    if (!domain.includes(".")) continue; // Not a valid domain

    const logoUrl = `https://logo.clearbit.com/${domain}`;

    console.log(`Backfilling ${company.name}: ${logoUrl}`);

    const { error: iError } = await supabase.from("company_logo").insert({
      company_id: company.company_id,
      logo_url: logoUrl,
    });

    if (iError) {
      console.error(`Failed to insert logo for ${company.name}:`, iError.message);
      // If it's a permission error, we should stop
      if (iError.message.includes("permission") || iError.message.includes("row-level security")) {
        console.log("Permission denied. Cannot backfill via anon key.");
        break;
      }
    }
  }
}

backfillLogos();
