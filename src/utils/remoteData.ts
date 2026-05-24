import type { AppData } from "../types";

export async function loadRemoteAppData() {
  try {
    const response = await fetch("/api/app-state");
    const payload = await response.json();

    if (!response.ok) {
      return { data: null, error: formatApiError(payload) };
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
      return formatApiError(payload);
    }

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Erreur réseau inconnue";
  }
}

export function subscribeToRemoteAppData() {
  return () => undefined;
}

function formatApiError(payload: any) {
  const parts = [payload?.error ?? "Erreur API Vercel"];

  if (payload?.cause?.code) {
    parts.push(`code=${payload.cause.code}`);
  }

  if (payload?.cause?.hostname) {
    parts.push(`host=${payload.cause.hostname}`);
  }

  if (payload?.cause?.message) {
    parts.push(payload.cause.message);
  }

  if (payload?.supabaseUrl) {
    parts.push(`url=${payload.supabaseUrl}`);
  }

  return parts.join(" | ");
}
