import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, CalendarEvent } from "../types";
import { getSpecialEventsForDashboard, getSpecialEventsForRange } from "../utils/calendarSpecialDays";
import { createId } from "../utils/localStorage";
import MemberBadge from "./MemberBadge";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  expanded?: boolean;
};

type CalendarView = "month" | "week" | "day";

export default function FamilyCalendar({ data, onDataChange, expanded = false }: Props) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("17:00");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [personId, setPersonId] = useState(data.familyMembers[0]?.id ?? "");
  const [view, setView] = useState<CalendarView>("month");
  const [cursorDate, setCursorDate] = useState(new Date());

  const dashboardEventsByDate = useMemo(() => {
    const events = [...getSpecialEventsForDashboard(), ...data.calendarEvents];

    return {
      today: events
        .filter((event) => getEventDateKey(event) === toDateKey(new Date()))
        .sort((a, b) => a.time.localeCompare(b.time)),
      tomorrow: events
        .filter((event) => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return getEventDateKey(event) === toDateKey(tomorrow);
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    };
  }, [data.calendarEvents]);

  const range = getViewRange(cursorDate, view);
  const rangeEvents = useMemo(() => {
    const events = [...getSpecialEventsForRange(range.start, range.end), ...data.calendarEvents];
    return events
      .filter((event) => {
        const eventDate = getEventDateKey(event);
        return eventDate >= toDateKey(range.start) && eventDate <= toDateKey(range.end);
      })
      .sort((a, b) => `${getEventDateKey(a)} ${a.time}`.localeCompare(`${getEventDateKey(b)} ${b.time}`));
  }, [data.calendarEvents, range.start, range.end]);

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
        return (
          <div key={key} className={`min-h-32 rounded-2xl bg-white p-3 ${isCurrentMonth ? "" : "opacity-45"}`}>
            <p className="mb-2 text-sm font-black text-slate-800">{day.getDate()}</p>
            <div className="space-y-1">
              {dayEvents.slice(0, 4).map((event) => (
                <EventPill key={event.id} event={event} data={data} />
              ))}
            </div>
          </div>
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
        <div key={event.id} className="rounded-2xl bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-slate-950">{event.title}</p>
              <p className="text-sm font-semibold text-slate-500">{formatDateLabel(getEventDateKey(event))}</p>
            </div>
            <time className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{event.time}</time>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventColumn({ title, events, data }: { title: string; events: CalendarEvent[]; data: AppData }) {
  return (
    <div className="rounded-3xl bg-white/50 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-slate-900">{event.title}</p>
              <time className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{event.time}</time>
            </div>
            <EventMember event={event} data={data} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EventPill({ event, data }: { event: CalendarEvent; data: AppData }) {
  return (
    <div className="truncate rounded-xl bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
      {event.time !== "Toute la journée" && `${event.time} · `}
      {event.title}
      <EventMember event={event} data={data} small />
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

function getEventDateKey(event: CalendarEvent) {
  if (event.dateISO) return event.dateISO;
  const date = new Date();
  if (event.date === "tomorrow") date.setDate(date.getDate() + 1);
  return toDateKey(date);
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
