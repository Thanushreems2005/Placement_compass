import { createClient } from "@supabase/supabase-js";

const projects = [
  {
    name: "jytithbexyzlnkjyufit",
    url: "https://jytithbexyzlnkjyufit.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY",
  },
  {
    name: "hkwessehtaonqaakzyvj",
    url: "https://hkwessehtaonqaakzyvj.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
  },
];

async function inspect() {
  for (const p of projects) {
    console.log(`--- Project: ${p.name} ---`);
    const supabase = createClient(p.url, p.key);
    const { data, error } = await supabase.from("company").select("*").limit(1);
    if (error) {
      console.log(`Table company error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`Table company FOUND! Columns: ${Object.keys(data[0]).length}`);
      console.log("Sample keys:", Object.keys(data[0]).slice(0, 173));
    } else {
      console.log("Table company is EMPTY");
    }
  }
}

inspect();
