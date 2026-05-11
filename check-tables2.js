import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://hkwessehtaonqaakzyvj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
);

async function checkAllTables() {
  // Using a trick: query a non-existent table and look at the schema definition, or better,
  // try to fetch from information_schema if we have permission.
  // Actually, we can fetch all tables using REST API reflection if we just do:
  // but let's query the API directly for swagger/openapi.json
  try {
    const res = await fetch("https://hkwessehtaonqaakzyvj.supabase.co/rest/v1/", {
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
      },
    });
    const swagger = await res.json();
    console.log("All accessible tables in public schema:");
    const paths = Object.keys(swagger.paths).filter((p) => !p.includes("/rpc/"));
    console.log(paths.join(", "));
  } catch (e) {
    console.error(e);
  }
}

checkAllTables();
