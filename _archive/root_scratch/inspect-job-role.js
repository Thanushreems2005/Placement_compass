import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://jytithbexyzlnkjyufit.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
);

async function inspect() {
  const { data: jobRole } = await supabase.from("job_role_details_json").select("*").limit(1);
  if (jobRole && jobRole.length > 0) {
    console.log("Job Role keys:", Object.keys(jobRole[0]));
    console.log("Job Role JSON keys:", Object.keys(jobRole[0].job_role_json));
  }
}

inspect();
