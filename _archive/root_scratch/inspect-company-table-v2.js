import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function inspectCompany() {
  const { data, error, count } = await supabase
    .from("company")
    .select("*", { count: "exact" })
    .limit(1);
  if (error) {
    console.error('Error querying "company" table:', error.message);
  } else {
    console.log('Table "company" has', count, "rows.");
    if (data && data.length > 0) {
      console.log("Sample row columns:", Object.keys(data[0]).length);
      console.log("Columns:", Object.keys(data[0]));
      // Check for nulls in some of the 163 parameters
      const sample = data[0];
      const nullFields = Object.keys(sample).filter((k) => sample[k] === null);
      console.log("Null fields count:", nullFields.length);
    }
  }

  const { data: jsonRecords, error: jsonError } = await supabase
    .from("company_json")
    .select("company_id")
    .limit(5);
  console.log("company_json records:", jsonRecords?.length || 0);

  const { data: innovxRecords, error: innovxError } = await supabase
    .from("innovx_json")
    .select("company_id")
    .limit(5);
  console.log("innovx_json records:", innovxRecords?.length || 0);
}

inspectCompany();
