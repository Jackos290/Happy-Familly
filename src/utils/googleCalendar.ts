import type { CalendarEvent } from "../types";
import { createId } from "./localStorage";

type GoogleCalendarApiEvent = {
  externalId: string;
  title: string;
  dateISO: string;
  time: string;
};

export async function loadGoogleCalendarEvents(url: string, personId: string): Promise<CalendarEvent[]> {
  const response = await fetch("/api/google-calendar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? "Synchronisation Google impossible");
  }

  return ((payload.events ?? []) as GoogleCalendarApiEvent[]).map((event) => ({
    id: `google-${personId}-${event.externalId || createId("event")}`.replace(/[^a-zA-Z0-9-_]/g, "-"),
    externalId: event.externalId,
    source: "google",
    title: event.title,
    date: isToday(event.dateISO) ? "today" : "tomorrow",
    dateISO: event.dateISO,
    time: event.time,
    personId,
  }));
}

function isToday(dateISO: string) {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateISO === key;
}
