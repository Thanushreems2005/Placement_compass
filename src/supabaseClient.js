import { createClient } from "@supabase/supabase-js";

// ── Public anon keys — safe to embed in client-side code ──────────────────────
const FALLBACK_URL =  "https://jytithbexyzlnkjyufit.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY";

const SUPABASE_URL_1  = import.meta.env.VITE_SUPABASE_URL_1  || FALLBACK_URL;
const SUPABASE_ANON_KEY_1 = import.meta.env.VITE_SUPABASE_ANON_KEY_1 || FALLBACK_KEY;
const SUPABASE_URL_2  = import.meta.env.VITE_SUPABASE_URL_2  || FALLBACK_URL;
const SUPABASE_ANON_KEY_2 = import.meta.env.VITE_SUPABASE_ANON_KEY_2 || FALLBACK_KEY;

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
