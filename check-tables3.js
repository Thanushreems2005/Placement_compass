import { createClient } from "@supabase/supabase-js";

async function checkAllTables() {
  try {
    const res = await fetch("https://hkwessehtaonqaakzyvj.supabase.co/rest/v1/", {
      headers: {
        apikey:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
      },
    });
    const swagger = await res.json();
    console.log("All accessible tables in public schema:");
    if (swagger.paths) {
      const paths = Object.keys(swagger.paths).filter((p) => !p.includes("/rpc/"));
      console.log(paths.join(", "));
    } else {
      console.log("No paths found:", swagger);
    }
  } catch (e) {
    console.error(e);
  }
}

checkAllTables();
