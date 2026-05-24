import type { AppData } from "../types";
import { supabase } from "./supabase";

const APP_STATE_ID = "happy-familly-main";

type AppStateRow = {
  id: string;
  data: AppData;
  updated_at: string;
};

export async function loadRemoteAppData() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("id", APP_STATE_ID)
    .maybeSingle<AppStateRow>();

  if (error) {
    console.warn("Supabase load failed", error.message);
    return null;
  }

  return data?.data ?? null;
}

export async function saveRemoteAppData(data: AppData) {
  if (!supabase) return;

  const { error } = await supabase.from("app_state").upsert({
    id: APP_STATE_ID,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("Supabase save failed", error.message);
  }
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
