import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jytithbexyzlnkjyufit.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
  const { data, error } = await supabase
    .from("company_json")
    .select("company_id, website:full_json->website_url")
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

dump();
