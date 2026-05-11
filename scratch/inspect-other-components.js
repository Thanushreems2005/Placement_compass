import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function inspect() {
  const tables = [
    "company_financials",
    "company_culture",
    "company_logistics",
    "company_technology",
    "company_leadership",
    "company_brand",
    "company_growth",
    "company_hiring_velocity",
    "company_hiring_process",
  ];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`Table ${table} error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`Table ${table} FOUND! Columns:`, Object.keys(data[0]));
    } else {
      console.log(`Table ${table} is EMPTY`);
    }
  }
}

inspect();
