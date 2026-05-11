import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function dump() {
  const { data } = await supabase.from("innovx_json").select("*").limit(1);
  if (data && data.length > 0) {
    fs.writeFileSync("scratch/innovx_sample.json", JSON.stringify(data[0], null, 2));
    console.log("Dumped to scratch/innovx_sample.json");
  } else {
    console.log("No data in innovx_json");
  }
}

dump();
