import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config/supabaseConfig";

const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const rawSupabaseUrl = envSupabaseUrl || SUPABASE_URL;
const supabaseAnonKey = envSupabaseAnonKey || SUPABASE_ANON_KEY;
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const supabaseDebugInfo = {
  urlHost: supabaseUrl ? new URL(supabaseUrl).host : "aucune URL",
};

export function getSupabaseConfigError() {
  if (!rawSupabaseUrl) return "VITE_SUPABASE_URL manquante";
  if (!supabaseAnonKey) return "VITE_SUPABASE_ANON_KEY manquante";
  if (!rawSupabaseUrl.startsWith("https://")) return "URL Supabase invalide: elle doit commencer par https://";
  if (!rawSupabaseUrl.includes(".supabase.co")) return "URL Supabase invalide: domaine attendu .supabase.co";
  return null;
}

export async function testSupabaseConnection() {
  const configError = getSupabaseConfigError();
  if (configError) return configError;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/app_state?select=id&limit=1`, {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return `${response.status} ${response.statusText}: ${text.slice(0, 140)}`;
    }

    return null;
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message}` : "Erreur réseau inconnue";
  }
}

function normalizeSupabaseUrl(url: string | undefined) {
  if (!url) return undefined;

  return url
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/+$/, "");
}
