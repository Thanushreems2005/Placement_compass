import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function inspect() {
  const { data: companies, error } = await supabase.from("companies").select("*").limit(1);
  if (error) {
    console.log("Error querying companies in hkwessehtaonqaakzyvj:", error.message);
  } else if (companies && companies.length > 0) {
    console.log(
      "Companies found in hkwessehtaonqaakzyvj! Columns:",
      Object.keys(companies[0]).length,
    );
    console.log("Columns:", Object.keys(companies[0]));
  } else {
    console.log("Companies table is empty in hkwessehtaonqaakzyvj");
  }
}

inspect();
