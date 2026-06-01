import type { AppData } from "../types";

export type RemoteLoadResult = {
  data: AppData | null;
  updatedAt: string | null;
  error: string | null;
};

export type RemoteSaveResult = {
  updatedAt: string | null;
  error: string | null;
};

export async function loadRemoteAppData(): Promise<RemoteLoadResult> {
  try {
    const response = await fetch("/api/app-state", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      return { data: null, updatedAt: null, error: formatApiError(payload) };
    }

    return {
      data: (payload.data as AppData | null) ?? null,
      updatedAt: (payload.updatedAt as string | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      updatedAt: null,
      error: error instanceof Error ? error.message : "Erreur réseau inconnue",
    };
  }
}

export async function saveRemoteAppData(data: AppData): Promise<RemoteSaveResult> {
  try {
    const response = await fetch("/api/app-state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: prepareRemoteData(data) }),
    });
    const payload = await response.json();

    if (!response.ok) {
      return { updatedAt: null, error: formatApiError(payload) };
    }

    return {
      updatedAt: (payload.updatedAt as string | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      updatedAt: null,
      error: error instanceof Error ? error.message : "Erreur réseau inconnue",
    };
  }
}

function prepareRemoteData(data: AppData): AppData {
  return {
    ...data,
    familyMembers: data.familyMembers ?? [],
    shoppingItems: data.shoppingItems ?? [],
  };
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
