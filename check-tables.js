import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function checkTables() {
  const tables = [
    "companies",
    "company_financials",
    "company_culture",
    "company_technology",
    "company_logistics",
    "company_leadership",
    "company_brand",
    "company_growth",
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Table ${table} error:`, error.message);
    } else {
      console.log(`Table ${table} EXISTS. Columns:`, Object.keys(data[0] || {}).join(", "));
    }
  }
}

checkTables();
