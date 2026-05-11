import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL_1 = import.meta.env.VITE_SUPABASE_URL_1;
const SUPABASE_ANON_KEY_1 = import.meta.env.VITE_SUPABASE_ANON_KEY_1;
const SUPABASE_URL_2 = import.meta.env.VITE_SUPABASE_URL_2;
const SUPABASE_ANON_KEY_2 = import.meta.env.VITE_SUPABASE_ANON_KEY_2;

function assertEnv(variableName, value) {
  if (!value) {
    throw new Error(
      `Missing environment variable ${variableName}. Add it to your .env file and restart npm run dev.`,
    );
  }
}

assertEnv("VITE_SUPABASE_URL_1", SUPABASE_URL_1);
assertEnv("VITE_SUPABASE_ANON_KEY_1", SUPABASE_ANON_KEY_1);
assertEnv("VITE_SUPABASE_URL_2", SUPABASE_URL_2);
assertEnv("VITE_SUPABASE_ANON_KEY_2", SUPABASE_ANON_KEY_2);

const authOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
};

export const supabase1 = createClient(SUPABASE_URL_1, SUPABASE_ANON_KEY_1, authOptions);
export const supabase2 = createClient(SUPABASE_URL_2, SUPABASE_ANON_KEY_2, authOptions);

export function logSupabaseConfig() {
  console.log("Supabase client 1 URL:", SUPABASE_URL_1);
  console.log("Supabase client 2 URL:", SUPABASE_URL_2);
}
