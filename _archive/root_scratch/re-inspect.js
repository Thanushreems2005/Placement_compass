import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  // Try to find ANY table that might have the data.
  // We'll check 'companies' again and see if we can find a row with more data.
  const { data: companies, error } = await supabase.from("companies").select("*").limit(10);
  if (companies && companies.length > 0) {
    companies.forEach((c, i) => {
      console.log(`Row ${i} keys:`, Object.keys(c).length);
    });
  }

  // Check 'innovx_json' again.
  const { data: innovx } = await supabase.from("innovx_json").select("*").limit(1);
  if (innovx && innovx.length > 0) {
    console.log("InnovX keys:", Object.keys(innovx[0].json_data));
  }
}

inspect();
