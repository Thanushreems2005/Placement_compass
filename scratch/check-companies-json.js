import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const { data, error } = await supabase.from("companies_json").select("*").limit(1);
  if (error) {
    console.log("Error querying companies_json:", error.message);
  } else if (data && data.length > 0) {
    console.log("companies_json found! Keys in full_json:", Object.keys(data[0].full_json).length);
    console.log("Sample keys:", Object.keys(data[0].full_json).slice(0, 50));
  } else {
    console.log("companies_json is empty");
  }
}

inspect();
