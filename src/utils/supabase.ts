import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export function getSupabaseConfigError() {
  if (!rawSupabaseUrl) return "VITE_SUPABASE_URL manquante";
  if (!supabaseAnonKey) return "VITE_SUPABASE_ANON_KEY manquante";
  if (!rawSupabaseUrl.startsWith("https://")) return "URL Supabase invalide: elle doit commencer par https://";
  if (!rawSupabaseUrl.includes(".supabase.co")) return "URL Supabase invalide: domaine attendu .supabase.co";
  return null;
}

function normalizeSupabaseUrl(url: string | undefined) {
  if (!url) return undefined;

  return url
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/+$/, "");
}
