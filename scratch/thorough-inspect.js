import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  console.log("--- TABLE LIST ---");
  // We can't list tables directly via anon key easily unless there's an RPC.
  // But we can try to query some common names.
  const tables = [
    "companies",
    "company",
    "company_json",
    "companies_json",
    "innovx_json",
    "job_role_details_json",
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        console.log(`Table ${table}: Error ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`Table ${table}: Found data. Columns: ${Object.keys(data[0]).length}`);
        if (table === "companies") {
          console.log("Columns in companies:", Object.keys(data[0]));
        }
      } else {
        console.log(`Table ${table}: No data`);
      }
    } catch (e) {
      console.log(`Table ${table}: Exception ${e.message}`);
    }
  }
}

inspect();
