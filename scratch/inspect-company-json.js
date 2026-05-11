import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const { data: companyJson } = await supabase.from("company_json").select("*").limit(1);
  if (companyJson && companyJson.length > 0) {
    const c = companyJson[0];
    console.log("Keys in full_json:", Object.keys(c.full_json).length);
    console.log("Sample keys in full_json:");
    Object.keys(c.full_json)
      .slice(0, 50)
      .forEach((k) => console.log(k));
  } else {
    console.log("No data in company_json table");
  }
}

inspect();
