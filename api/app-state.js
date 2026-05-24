const SUPABASE_URL = "https://igszvnolnzswtdugqzdu.supabase.co";
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
        `${SUPABASE_URL}/rest/v1/app_state?id=eq.${APP_STATE_ID}&select=data`,
        {
          headers: supabaseHeaders(),
        },
      );
      const payload = await supabaseResponse.json();

      if (!supabaseResponse.ok) {
        response.status(supabaseResponse.status).json({ error: payload.message ?? payload });
        return;
      }

      response.status(200).json({ data: payload[0]?.data ?? null });
      return;
    }

    if (request.method === "POST") {
      const body = request.body;
      const appData = typeof body === "string" ? JSON.parse(body).data : body.data;
      const supabaseResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(),
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: APP_STATE_ID,
          data: appData,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!supabaseResponse.ok) {
        const payload = await supabaseResponse.text();
        response.status(supabaseResponse.status).json({ error: payload });
        return;
      }

      response.status(200).json({ ok: true });
      return;
    }

    response.status(405).json({ error: "Méthode non autorisée" });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}
