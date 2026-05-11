import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const { data: innovx } = await supabase.from("innovx_json").select("*").limit(20);
  if (innovx && innovx.length > 0) {
    for (const item of innovx) {
      const keys = Object.keys(item.json_data);
      if (keys.length > 10) {
        console.log(`Company ${item.name} has ${keys.length} keys in json_data`);
        console.log("Sample keys:", keys.slice(0, 163));
      }
    }
  }
}

inspect();
