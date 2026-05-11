import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  console.log("--- COMPANIES TABLE ---");
  const { data: companies } = await supabase.from("companies").select("*").limit(1);
  console.log(JSON.stringify(companies, null, 2));

  console.log("\n--- COMPANY TABLE ---");
  const { data: company } = await supabase.from("company").select("*").limit(1);
  console.log(JSON.stringify(company, null, 2));

  console.log("\n--- COMPANY_JSON TABLE ---");
  const { data: companyJson } = await supabase.from("company_json").select("*").limit(1);
  console.log(JSON.stringify(companyJson, null, 2));

  console.log("\n--- INNOVX_JSON TABLE ---");
  const { data: innovxJson } = await supabase.from("innovx_json").select("*").limit(1);
  console.log(JSON.stringify(innovxJson, null, 2));
}

inspect();
