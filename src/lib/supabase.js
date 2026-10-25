import { createSupabaseClient, validateSupabaseConfig } from "./supabaseConfig.js";

const config = {
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

export const supabaseConfigStatus = validateSupabaseConfig(config);
export const supabase = supabaseConfigStatus.configured ? createSupabaseClient(config) : null;
export const isSupabaseConfigured = Boolean(supabase);

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Online Mafia is temporarily unavailable.");
  }

  return supabase;
}
