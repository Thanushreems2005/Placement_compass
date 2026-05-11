import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const { data: companies } = await supabase.from("company").select("*").limit(1);
  if (companies && companies.length > 0) {
    const c = companies[0];
    console.log("Keys in company table:", Object.keys(c).length);
    console.log("Sample keys and values:");
    Object.entries(c)
      .slice(0, 20)
      .forEach(([k, v]) => console.log(`${k}: ${v}`));

    // Check if most are null
    const nonNullCount = Object.values(c).filter((v) => v !== null).length;
    console.log("Non-null count:", nonNullCount);
  } else {
    console.log("No data in company table");
  }
}

inspect();
