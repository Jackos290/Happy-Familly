import type { AppData } from "../types";

export async function loadRemoteAppData() {
  try {
    const response = await fetch("/api/app-state");
    const payload = await response.json();

    if (!response.ok) {
      return { data: null, error: payload.error ?? "Erreur API Vercel" };
    }

    return { data: (payload.data as AppData | null) ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Erreur réseau inconnue",
    };
  }
}

export async function saveRemoteAppData(data: AppData) {
  try {
    const response = await fetch("/api/app-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });
    const payload = await response.json();

    if (!response.ok) {
      return payload.error ?? "Erreur API Vercel";
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Erreur réseau inconnue";
  }
}

export function subscribeToRemoteAppData() {
  return () => undefined;
}
