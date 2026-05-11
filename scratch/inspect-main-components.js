import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const tables = ["company_financials", "company_culture", "company_logistics"];
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
