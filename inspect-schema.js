import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function inspectSchema() {
  // Instead of querying information_schema (which might be blocked by PostgREST),
  // let's do a RPC call if it exists, or let's just query some common tables.
  const tablesToCheck = [
    "companies",
    "company_financials",
    "company_culture",
    "company_logistics",
    "company_technology",
    "company_leadership",
    "company_brand",
    "company_growth",
    "company", // original frontend table
  ];

  for (const table of tablesToCheck) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (data) {
      console.log(`\n--- TABLE: ${table} ---`);
      if (data.length > 0) {
        console.log("Columns:", Object.keys(data[0]).join(", "));
      } else {
        console.log("Table exists but is empty.");
      }
    }
  }
}

inspectSchema();
