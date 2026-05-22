import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
  const tables = [
    "company_financials",
    "company_culture",
    "company_logistics",
    "company_json",
    "companies",
    "company",
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("count").limit(1);
    if (error) {
      console.log(`Table ${table} does NOT exist or error: ${error.message}`);
    } else {
      console.log(`Table ${table} exists.`);
    }
  }
}

checkTables();
