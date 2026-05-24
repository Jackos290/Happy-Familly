import { Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AppData, CalendarEvent } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function FamilyCalendar({ data, onDataChange }: Props) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("17:00");
  const [date, setDate] = useState<CalendarEvent["date"]>("today");
  const [personId, setPersonId] = useState(data.familyMembers[0]?.id ?? "");

  const eventsByDate = useMemo(
    () => ({
      today: data.calendarEvents
        .filter((event) => event.date === "today")
        .sort((a, b) => a.time.localeCompare(b.time)),
      tomorrow: data.calendarEvents
        .filter((event) => event.date === "tomorrow")
        .sort((a, b) => a.time.localeCompare(b.time)),
    }),
    [data.calendarEvents],
  );

  function addEvent(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    onDataChange({
      ...data,
      calendarEvents: [
        ...data.calendarEvents,
        {
          id: createId("event"),
          title: title.trim(),
          time,
          date,
          personId,
        },
      ],
    });
    setTitle("");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <EventColumn title="Aujourd'hui" events={eventsByDate.today} data={data} />
        <EventColumn title="Demain" events={eventsByDate.tomorrow} data={data} />
      </div>

      <form onSubmit={addEvent} className="grid gap-3 rounded-3xl bg-white/55 p-3">
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ajouter un événement"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1.3fr_auto]">
          <input
            className="field"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
          <select
            className="field"
            value={date}
            onChange={(event) => setDate(event.target.value as CalendarEvent["date"])}
          >
            <option value="today">Aujourd'hui</option>
            <option value="tomorrow">Demain</option>
          </select>
          <select
            className="field"
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
          >
            {data.familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <button className="icon-button" title="Ajouter l'événement">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function EventColumn({
  title,
  events,
  data,
}: {
  title: string;
  events: CalendarEvent[];
  data: AppData;
}) {
  return (
    <div className="rounded-3xl bg-white/55 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h3>
      <div className="space-y-3">
        {events.map((event) => {
          const member = data.familyMembers.find((item) => item.id === event.personId);
          return (
            <div key={event.id} className="rounded-2xl bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-slate-900">{event.title}</p>
                <time className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
                  {event.time}
                </time>
              </div>
              {member && (
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${member.color}`}>
                  {member.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
