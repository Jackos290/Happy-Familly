const SUPABASE_URL = "https://igszvnolnzswtdagqzdu.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const APP_STATE_ID = "happy-familly-main";

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (!SUPABASE_ANON_KEY) {
    response.status(500).json({ error: "SUPABASE_ANON_KEY manquante dans Vercel" });
    return;
  }

  try {
    if (request.method === "GET") {
      const supabaseResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/app_state?id=eq.${APP_STATE_ID}&select=data,updated_at`,
        {
          headers: supabaseHeaders(),
        },
      );
      const payload = await supabaseResponse.json();

      if (!supabaseResponse.ok) {
        response.status(supabaseResponse.status).json({ error: payload.message ?? payload });
        return;
      }

      response.status(200).json({
        data: payload[0]?.data ?? null,
        updatedAt: payload[0]?.updated_at ?? null,
      });
      return;
    }

    if (request.method === "POST") {
      const body = request.body;
      const appData = typeof body === "string" ? JSON.parse(body).data : body.data;
      const updatedAt = new Date().toISOString();
      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(),
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: APP_STATE_ID,
          data: appData,
          updated_at: updatedAt,
        }),
      });

      if (!supabaseResponse.ok) {
        const payload = await supabaseResponse.text();
        response.status(supabaseResponse.status).json({ error: payload });
        return;
      }

      response.status(200).json({ ok: true, updatedAt });
      return;
    }

    response.status(405).json({ error: "Méthode non autorisée" });
  } catch (error) {
    const cause = error?.cause;
    response.status(500).json({
      error: error instanceof Error ? error.message : "Erreur inconnue",
      cause:
        cause && typeof cause === "object"
          ? {
              code: cause.code,
              errno: cause.errno,
              syscall: cause.syscall,
              hostname: cause.hostname,
              message: cause.message,
            }
          : cause,
      supabaseUrl: SUPABASE_URL,
    });
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}
