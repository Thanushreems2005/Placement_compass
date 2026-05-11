import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function findMissingLogos() {
  const { data: companies, error: cError } = await supabase
    .from("companies")
    .select("company_id, name, website_url");
  const { data: logos, error: lError } = await supabase.from("company_logo").select("company_id");

  if (cError || lError) {
    console.error("Error fetching data:", cError || lError);
    return;
  }

  const logoSet = new Set(logos.map((l) => l.company_id));
  const missing = companies.filter((c) => !logoSet.has(c.company_id));

  console.log(`Missing logos for ${missing.length} companies:`);
  missing.forEach((c) => {
    console.log(`- ${c.name} (ID: ${c.company_id}, Website: ${c.website_url})`);
  });
}

findMissingLogos();
