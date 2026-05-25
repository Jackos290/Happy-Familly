import { CalendarClock, RefreshCw, Save } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "../types";
import { loadGoogleCalendarEvents } from "../utils/googleCalendar";

type Props = {
  data: AppData;
  memberId: string;
  onDataChange: (data: AppData) => void;
};

export default function GoogleCalendarSync({ data, memberId, onDataChange }: Props) {
  const member = data.familyMembers.find((item) => item.id === memberId);
  const [url, setUrl] = useState(member?.googleCalendarUrl ?? "");
  const [status, setStatus] = useState("Ajoute le lien iCal privé Google Calendar.");
  const [loading, setLoading] = useState(false);

  function saveUrl(event: FormEvent) {
    event.preventDefault();
    onDataChange({
      ...data,
      familyMembers: data.familyMembers.map((item) =>
        item.id === memberId ? { ...item, googleCalendarUrl: url.trim() } : item,
      ),
    });
    setStatus("Lien enregistré.");
  }

  async function syncCalendar() {
    const calendarUrl = url.trim() || member?.googleCalendarUrl?.trim();
    if (!calendarUrl) {
      setStatus("Colle d'abord le lien iCal privé Google.");
      return;
    }

    setLoading(true);
    try {
      const googleEvents = await loadGoogleCalendarEvents(calendarUrl, memberId);
      const localEvents = (data.calendarEvents ?? []).filter(
        (event) => !(event.source === "google" && event.personId === memberId),
      );

      onDataChange({
        ...data,
        familyMembers: data.familyMembers.map((item) =>
          item.id === memberId ? { ...item, googleCalendarUrl: calendarUrl } : item,
        ),
        calendarEvents: [...localEvents, ...googleEvents],
      });
      setStatus(`${googleEvents.length} rendez-vous Google synchronisés.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-white/70 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-black text-slate-950">Google Calendar</h3>
          <p className="text-sm font-semibold text-slate-500">{status}</p>
        </div>
      </div>
      <form onSubmit={saveUrl} className="flex flex-wrap gap-2">
        <input
          className="field min-w-0 flex-[1_1_240px]"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Lien iCal privé Google Calendar"
        />
        <button className="icon-button shrink-0" title="Enregistrer le lien">
          <Save className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={syncCalendar}
          className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-slate-950 px-4 font-bold text-white"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync
        </button>
      </form>
    </section>
  );
}
