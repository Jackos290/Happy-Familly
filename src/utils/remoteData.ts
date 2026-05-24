import type { AppData } from "../types";
import { supabase } from "./supabase";

const APP_STATE_ID = "happy-familly-main";

type AppStateRow = {
  id: string;
  data: AppData;
  updated_at: string;
};

export async function loadRemoteAppData() {
  if (!supabase) {
    return { data: null, error: "Supabase non configuré" };
  }

  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", APP_STATE_ID)
    .maybeSingle<AppStateRow>();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data?.data ?? null, error: null };
}

export async function saveRemoteAppData(data: AppData) {
  if (!supabase) {
    return "Supabase non configuré";
  }

  const { error } = await supabase.from("app_state").upsert({
    id: APP_STATE_ID,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return error.message;
  }

  return null;
}

export function subscribeToRemoteAppData(onData: (data: AppData) => void) {
  const client = supabase;
  if (!client) return () => undefined;

  const channel = client
    .channel("happy-familly-app-state")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_state",
        filter: `id=eq.${APP_STATE_ID}`,
      },
      (payload) => {
        const row = payload.new as AppStateRow | null;
        if (row?.data) {
          onData(row.data);
        }
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
