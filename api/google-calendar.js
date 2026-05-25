export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const url = String(body?.url ?? "");

    if (!url.startsWith("https://")) {
      response.status(400).json({ error: "Lien Google Calendar invalide" });
      return;
    }

    const calendarResponse = await fetch(url);
    const text = await calendarResponse.text();

    if (!calendarResponse.ok) {
      response.status(calendarResponse.status).json({ error: "Calendrier Google inaccessible" });
      return;
    }

    response.status(200).json({ events: parseIcsEvents(text) });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Erreur inconnue" });
  }
}

function parseIcsEvents(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const today = atStartOfDay(new Date());
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 90);

  return blocks
    .map(parseEventBlock)
    .filter(Boolean)
    .filter((event) => {
      const date = new Date(`${event.dateISO}T12:00:00`);
      return date >= today && date <= limit;
    })
    .slice(0, 80);
}

function parseEventBlock(block) {
  const summary = readField(block, "SUMMARY") || "Rendez-vous Google";
  const start = readField(block, "DTSTART");
  const uid = readField(block, "UID") || `${summary}-${start}`;

  if (!start) return null;

  const parsed = parseIcsDate(start);
  if (!parsed) return null;

  return {
    externalId: uid,
    title: cleanText(summary),
    dateISO: parsed.dateISO,
    time: parsed.time,
  };
}

function readField(block, name) {
  const line = block.split(/\r?\n/).find((item) => item.startsWith(`${name}`));
  if (!line) return "";
  return line.slice(line.indexOf(":") + 1).trim();
}

function parseIcsDate(value) {
  if (/^\d{8}$/.test(value)) {
    return {
      dateISO: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      time: "Toute la journée",
    };
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return null;

  return {
    dateISO: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
  };
}

function cleanText(value) {
  return value.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ");
}

function atStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
