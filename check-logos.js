import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function checkLogoTable() {
  console.log("Checking tables...");

  const tables = ["company_logo", "companies", "company"];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`${table} table error:`, error.message);
    } else {
      console.log(`${table} table exists, sample:`, data);
    }
  }
}

checkLogoTable();
