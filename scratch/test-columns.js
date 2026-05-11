import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const columnsToTest = ["tech_stack", "annual_revenue", "employee_turnover", "culture_score"];
  for (const col of columnsToTest) {
    const { error } = await supabase.from("companies").select(col).limit(1);
    if (error) {
      console.log(`Column ${col} does NOT exist: ${error.message}`);
    } else {
      console.log(`Column ${col} EXISTS!`);
    }
  }
}

inspect();
