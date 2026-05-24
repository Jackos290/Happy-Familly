import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, CalendarEvent } from "../types";
import { getSpecialEventsForDashboard, getSpecialEventsForRange } from "../utils/calendarSpecialDays";
import { createId } from "../utils/localStorage";
import MemberBadge from "./MemberBadge";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  expanded?: boolean;
  selectedMemberId?: string | null;
};

type CalendarView = "month" | "week" | "day";

export default function FamilyCalendar({ data, onDataChange, expanded = false, selectedMemberId = null }: Props) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("17:00");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [personId, setPersonId] = useState(selectedMemberId ?? data.familyMembers[0]?.id ?? "");
  const [view, setView] = useState<CalendarView>("month");
  const [cursorDate, setCursorDate] = useState(new Date());

  const dashboardEventsByDate = useMemo(() => {
    const events = uniqueEvents([...getSpecialEventsForDashboard(), ...data.calendarEvents]).filter((event) =>
      matchesSelectedMember(event, selectedMemberId),
    );

    return {
      today: events
        .filter((event) => getEventDateKey(event) === toDateKey(new Date()))
        .sort(compareEvents),
      tomorrow: events
        .filter((event) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return getEventDateKey(event) === toDateKey(tomorrow);
        })
        .sort(compareEvents),
    };
  }, [data.calendarEvents, selectedMemberId]);

  const range = getViewRange(cursorDate, view);
  const rangeEvents = useMemo(() => {
    const events = uniqueEvents([...getSpecialEventsForRange(range.start, range.end), ...data.calendarEvents]).filter((event) =>
      matchesSelectedMember(event, selectedMemberId),
    );

    return events
      .filter((event) => {
        const eventDate = getEventDateKey(event);
        return eventDate >= toDateKey(range.start) && eventDate <= toDateKey(range.end);
      })
      .sort(compareEvents);
  }, [data.calendarEvents, range.start, range.end, selectedMemberId]);

  useEffect(() => {
    if (selectedMemberId) {
      setPersonId(selectedMemberId);
    }
  }, [selectedMemberId]);

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
          date: date === toDateKey(new Date()) ? "today" : "tomorrow",
          dateISO: date,
          personId,
        },
      ],
    });
    setTitle("");
  }

  if (!expanded) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <EventColumn title="Aujourd'hui" events={dashboardEventsByDate.today} data={data} />
          <EventColumn title="Demain" events={dashboardEventsByDate.tomorrow} data={data} />
        </div>
        <CalendarForm
          title={title}
          time={time}
          date={date}
          personId={personId}
          data={data}
          onSubmit={addEvent}
          onTitleChange={setTitle}
          onTimeChange={setTime}
          onDateChange={setDate}
          onPersonChange={setPersonId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <ViewButton active={view === "month"} onClick={() => setView("month")}>Mois</ViewButton>
          <ViewButton active={view === "week"} onClick={() => setView("week")}>Semaine</ViewButton>
          <ViewButton active={view === "day"} onClick={() => setView("day")}>Journée</ViewButton>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-button" onClick={() => setCursorDate(moveCursor(cursorDate, view, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-56 text-center text-lg font-black text-slate-950">
            {formatRangeTitle(cursorDate, view)}
          </span>
          <button className="icon-button" onClick={() => setCursorDate(moveCursor(cursorDate, view, 1))}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <CalendarForm
        title={title}
        time={time}
        date={date}
        personId={personId}
        data={data}
        onSubmit={addEvent}
        onTitleChange={setTitle}
        onTimeChange={setTime}
        onDateChange={setDate}
        onPersonChange={setPersonId}
      />

      {view === "month" ? (
        <MonthGrid cursorDate={cursorDate} events={rangeEvents} data={data} />
      ) : view === "week" ? (
        <WeekGrid cursorDate={cursorDate} events={rangeEvents} data={data} />
      ) : (
        <AgendaList events={rangeEvents} data={data} />
      )}
    </div>
  );
}

function CalendarForm({
  title,
  time,
  date,
  personId,
  data,
  onSubmit,
  onTitleChange,
  onTimeChange,
  onDateChange,
  onPersonChange,
}: {
  title: string;
  time: string;
  date: string;
  personId: string;
  data: AppData;
  onSubmit: (event: FormEvent) => void;
  onTitleChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPersonChange: (value: string) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-3xl bg-white/50 p-3 md:grid-cols-[1fr_160px_130px_180px_auto]">
      <input className="field" value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Ajouter un événement ou rendez-vous" />
      <input className="field" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      <input className="field" type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} />
      <MemberSelect data={data} value={personId} onChange={onPersonChange} />
      <button className="icon-button" title="Ajouter l'événement">
        <Plus className="h-5 w-5" />
      </button>
    </form>
  );
}

function MonthGrid({ cursorDate, events, data }: { cursorDate: Date; events: CalendarEvent[]; data: AppData }) {
  const days = getMonthGridDays(cursorDate);
  return (
    <div className="grid grid-cols-7 gap-2">
      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
        <div key={day} className="px-2 text-sm font-black text-slate-500">{day}</div>
      ))}
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = events.filter((event) => getEventDateKey(event) === key);
        const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
        const isToday = key === toDateKey(new Date());
        return (
          <div
            key={key}
            className={`min-h-32 rounded-2xl border p-3 ${
              isToday ? "border-slate-950 bg-white" : "border-white/80 bg-white/70"
            } ${isCurrentMonth ? "" : "opacity-45"}`}
          >
            <p className="mb-2 text-sm font-black text-slate-800">{day.getDate()}</p>
            <div className="space-y-1">
              {dayEvents.slice(0, 4).map((event) => (
                <EventPill key={getEventIdentity(event)} event={event} data={data} />
              ))}
              {dayEvents.length > 4 && (
                <p className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                  +{dayEvents.length - 4}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({ cursorDate, events, data }: { cursorDate: Date; events: CalendarEvent[]; data: AppData }) {
  const { start } = getViewRange(cursorDate, "week");
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = atNoon(start);
    day.setDate(start.getDate() + index);
    return day;
  });

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = events.filter((event) => getEventDateKey(event) === key);
        const isToday = key === toDateKey(new Date());

        return (
          <section
            key={key}
            className={`min-h-72 rounded-3xl border p-3 ${
              isToday ? "border-slate-950 bg-white" : "border-white/80 bg-white/65"
            }`}
          >
            <div className="mb-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day)}
              </p>
              <p className="text-2xl font-black text-slate-950">{day.getDate()}</p>
            </div>
            <div className="space-y-2">
              {dayEvents.length === 0 ? (
                <p className="rounded-2xl bg-white/70 px-3 py-3 text-sm font-semibold text-slate-400">
                  Rien
                </p>
              ) : (
                dayEvents.map((event) => <EventCard key={getEventIdentity(event)} event={event} data={data} compact />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AgendaList({ events, data }: { events: CalendarEvent[]; data: AppData }) {
  if (events.length === 0) {
    return <p className="rounded-2xl bg-white px-4 py-4 font-semibold text-slate-500">Aucun événement sur cette période.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard key={getEventIdentity(event)} event={event} data={data} showDate />
      ))}
    </div>
  );
}

function EventColumn({ title, events, data }: { title: string; events: CalendarEvent[]; data: AppData }) {
  return (
    <div className="rounded-3xl bg-white/50 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="space-y-3">
        {events.map((event) => <EventCard key={getEventIdentity(event)} event={event} data={data} />)}
      </div>
    </div>
  );
}

function EventPill({ event, data }: { event: CalendarEvent; data: AppData }) {
  const color = getEventColor(event, data);

  return (
    <div className={`truncate rounded-xl border px-2 py-1 text-xs font-bold ${color}`}>
      {event.time !== "Toute la journée" && `${event.time} · `}
      {event.title}
      <EventMember event={event} data={data} small />
    </div>
  );
}

function EventCard({
  event,
  data,
  compact = false,
  showDate = false,
}: {
  event: CalendarEvent;
  data: AppData;
  compact?: boolean;
  showDate?: boolean;
}) {
  const color = getEventColor(event, data);

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${color}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`${compact ? "text-sm" : "text-base"} font-black text-slate-950`}>{event.title}</p>
          {showDate && (
            <p className="mt-1 text-sm font-semibold text-slate-600">{formatDateLabel(getEventDateKey(event))}</p>
          )}
        </div>
        <time className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-slate-800">{event.time}</time>
      </div>
      <EventMember event={event} data={data} />
    </div>
  );
}

function EventMember({ event, data, small = false }: { event: CalendarEvent; data: AppData; small?: boolean }) {
  const member = data.familyMembers.find((item) => item.id === event.personId);
  return <MemberBadge member={member} size={small ? "sm" : "md"} className={small ? "ml-2" : "mt-2"} />;
}

function MemberSelect({
  data,
  value,
  onChange,
}: {
  data: AppData;
  value: string;
  onChange: (value: string) => void;
}) {
  const member = data.familyMembers.find((item) => item.id === value);

  return (
    <div className="flex items-center gap-2">
      <MemberBadge member={member} size="sm" />
      <select className="field min-h-11 flex-1" value={value} onChange={(event) => onChange(event.target.value)}>
        {data.familyMembers.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </div>
  );
}

function ViewButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`min-h-11 rounded-2xl px-4 text-sm font-bold ${active ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}>
      {children}
    </button>
  );
}

function uniqueEvents(events: CalendarEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    const identity = getEventIdentity(event);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function getEventIdentity(event: CalendarEvent) {
  return [
    getEventDateKey(event),
    event.time,
    event.title.trim().toLowerCase(),
    event.personId ?? "special",
  ].join("|");
}

function getEventColor(event: CalendarEvent, data: AppData) {
  const memberIndex = data.familyMembers.findIndex((member) => member.id === event.personId);
  const colors = [
    "border-sky-200 bg-sky-50 text-sky-950",
    "border-rose-200 bg-rose-50 text-rose-950",
    "border-emerald-200 bg-emerald-50 text-emerald-950",
    "border-violet-200 bg-violet-50 text-violet-950",
  ];

  if (memberIndex >= 0) return colors[memberIndex % colors.length];
  if (event.title.includes("(FR)")) return "border-blue-200 bg-blue-50 text-blue-950";
  if (event.title.includes("(LU)")) return "border-amber-200 bg-amber-50 text-amber-950";
  return "border-slate-200 bg-slate-50 text-slate-950";
}

function getEventDateKey(event: CalendarEvent) {
  if (event.dateISO) return event.dateISO;
  const date = new Date();
  if (event.date === "tomorrow") date.setDate(date.getDate() + 1);
  return toDateKey(date);
}

function matchesSelectedMember(event: CalendarEvent, selectedMemberId: string | null) {
  return !selectedMemberId || event.personId === selectedMemberId;
}

function compareEvents(a: CalendarEvent, b: CalendarEvent) {
  return `${getEventDateKey(a)} ${a.time}`.localeCompare(`${getEventDateKey(b)} ${b.time}`);
}

function getViewRange(date: Date, view: CalendarView) {
  if (view === "day") {
    return { start: atNoon(date), end: atNoon(date) };
  }
  if (view === "week") {
    const start = atNoon(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = atNoon(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1, 12),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 12),
  };
}

function moveCursor(date: Date, view: CalendarView, direction: number) {
  const next = atNoon(date);
  if (view === "day") next.setDate(next.getDate() + direction);
  if (view === "week") next.setDate(next.getDate() + direction * 7);
  if (view === "month") next.setMonth(next.getMonth() + direction);
  return next;
}

function getMonthGridDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = atNoon(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

function formatRangeTitle(date: Date, view: CalendarView) {
  if (view === "day") return formatDateLabel(toDateKey(date));
  if (view === "week") {
    const { start, end } = getViewRange(date, "week");
    return `${formatDateLabel(toDateKey(start))} - ${formatDateLabel(toDateKey(end))}`;
  }
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${dateKey}T12:00:00`));
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function atNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}
