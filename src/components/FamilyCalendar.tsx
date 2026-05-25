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
  const members = data.familyMembers ?? [];
  const calendarEvents = data.calendarEvents ?? [];
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("17:00");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [personId, setPersonId] = useState(selectedMemberId ?? members[0]?.id ?? "");
  const [view, setView] = useState<CalendarView>("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPersonId, setEditPersonId] = useState("");

  const dashboardEventsByDate = useMemo(() => {
    const events = uniqueEvents([...getSpecialEventsForDashboard(), ...calendarEvents]).filter((event) =>
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
  }, [calendarEvents, selectedMemberId]);

  const range = getViewRange(cursorDate, view);
  const rangeEvents = useMemo(() => {
    const events = uniqueEvents([...getSpecialEventsForRange(range.start, range.end), ...calendarEvents]).filter((event) =>
      matchesSelectedMember(event, selectedMemberId),
    );

    return events
      .filter((event) => {
        const eventDate = getEventDateKey(event);
        return eventDate >= toDateKey(range.start) && eventDate <= toDateKey(range.end);
      })
      .sort(compareEvents);
  }, [calendarEvents, range.start, range.end, selectedMemberId]);

  useEffect(() => {
    if (selectedMemberId) {
      setPersonId(selectedMemberId);
      return;
    }

    if (!members.some((member) => member.id === personId)) {
      setPersonId(members[0]?.id ?? "");
    }
  }, [members, personId, selectedMemberId]);

  function addEvent(event: FormEvent) {
    event.preventDefault();
    const safeDate = normalizeDateKey(date);
    const safePersonId = selectedMemberId ?? personId ?? members[0]?.id ?? "";
    if (!title.trim() || !safePersonId) return;

    onDataChange({
      ...data,
      calendarEvents: [
        ...calendarEvents,
        {
          id: createId("event"),
          title: title.trim(),
          time,
          date: getRelativeDateLabel(safeDate),
          dateISO: safeDate,
          personId: safePersonId,
          source: "manual",
        },
      ],
    });
    setTitle("");
  }

  function openEvent(event: CalendarEvent) {
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditDate(getEventDateKey(event));
    setEditTime(event.time === "Toute la journée" ? "08:00" : event.time);
    setEditPersonId(event.personId ?? members[0]?.id ?? "");
  }

  function saveSelectedEvent(event: FormEvent) {
    event.preventDefault();
    if (!selectedEvent || !isEditableEvent(selectedEvent, data)) return;

    const safeEditDate = normalizeDateKey(editDate);
    onDataChange({
      ...data,
      calendarEvents: calendarEvents.map((item) =>
        item.id === selectedEvent.id
          ? {
              ...item,
              title: editTitle.trim() || item.title,
              date: getRelativeDateLabel(safeEditDate),
              dateISO: safeEditDate,
              time: editTime,
              personId: editPersonId || item.personId,
            }
          : item,
      ),
    });
    setSelectedEvent(null);
  }

  function deleteSelectedEvent() {
    if (!selectedEvent || !isEditableEvent(selectedEvent, data)) return;

    onDataChange({
      ...data,
      calendarEvents: calendarEvents.filter((item) => item.id !== selectedEvent.id),
    });
    setSelectedEvent(null);
  }

  if (!expanded) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <EventColumn title="Aujourd'hui" events={dashboardEventsByDate.today} data={data} onOpen={openEvent} />
          <EventColumn title="Demain" events={dashboardEventsByDate.tomorrow} data={data} onOpen={openEvent} />
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
        {selectedEvent && (
          <EventDetail
            event={selectedEvent}
            data={data}
            editable={isEditableEvent(selectedEvent, data)}
            title={editTitle}
            date={editDate}
            time={editTime}
            personId={editPersonId}
            onTitleChange={setEditTitle}
            onDateChange={setEditDate}
            onTimeChange={setEditTime}
            onPersonChange={setEditPersonId}
            onSave={saveSelectedEvent}
            onDelete={deleteSelectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
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
        <MonthGrid cursorDate={cursorDate} events={rangeEvents} data={data} onOpen={openEvent} />
      ) : view === "week" ? (
        <WeekGrid cursorDate={cursorDate} events={rangeEvents} data={data} onOpen={openEvent} />
      ) : (
        <AgendaList events={rangeEvents} data={data} onOpen={openEvent} />
      )}

      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          data={data}
          editable={isEditableEvent(selectedEvent, data)}
          title={editTitle}
          date={editDate}
          time={editTime}
          personId={editPersonId}
          onTitleChange={setEditTitle}
          onDateChange={setEditDate}
          onTimeChange={setEditTime}
          onPersonChange={setEditPersonId}
          onSave={saveSelectedEvent}
          onDelete={deleteSelectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
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
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/50 p-3">
      <input className="field min-w-0 flex-[1_1_260px]" value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Ajouter un événement ou rendez-vous" />
      <input className="field min-w-36 flex-[1_1_150px]" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      <input className="field min-w-32 flex-[1_1_130px]" type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} />
      <MemberSelect data={data} value={personId} onChange={onPersonChange} />
      <button className="icon-button shrink-0" title="Ajouter l'événement">
        <Plus className="h-5 w-5" />
      </button>
    </form>
  );
}

function MonthGrid({
  cursorDate,
  events,
  data,
  onOpen,
}: {
  cursorDate: Date;
  events: CalendarEvent[];
  data: AppData;
  onOpen: (event: CalendarEvent) => void;
}) {
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
                <EventPill key={getEventIdentity(event)} event={event} data={data} onOpen={onOpen} />
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

function WeekGrid({
  cursorDate,
  events,
  data,
  onOpen,
}: {
  cursorDate: Date;
  events: CalendarEvent[];
  data: AppData;
  onOpen: (event: CalendarEvent) => void;
}) {
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
                dayEvents.map((event) => <EventCard key={getEventIdentity(event)} event={event} data={data} onOpen={onOpen} compact />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AgendaList({ events, data, onOpen }: { events: CalendarEvent[]; data: AppData; onOpen: (event: CalendarEvent) => void }) {
  if (events.length === 0) {
    return <p className="rounded-2xl bg-white px-4 py-4 font-semibold text-slate-500">Aucun événement sur cette période.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard key={getEventIdentity(event)} event={event} data={data} onOpen={onOpen} showDate />
      ))}
    </div>
  );
}

function EventColumn({
  title,
  events,
  data,
  onOpen,
}: {
  title: string;
  events: CalendarEvent[];
  data: AppData;
  onOpen: (event: CalendarEvent) => void;
}) {
  return (
    <div className="rounded-3xl bg-white/50 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="space-y-3">
        {events.map((event) => <EventCard key={getEventIdentity(event)} event={event} data={data} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

function EventPill({ event, data, onOpen }: { event: CalendarEvent; data: AppData; onOpen: (event: CalendarEvent) => void }) {
  const color = getEventColor(event, data);

  return (
    <button onClick={() => onOpen(event)} className={`w-full truncate rounded-xl border px-2 py-1 text-left text-xs font-bold ${color}`}>
      {event.time !== "Toute la journée" && `${event.time} · `}
      {event.title}
      <EventMember event={event} data={data} small />
    </button>
  );
}

function EventCard({
  event,
  data,
  compact = false,
  showDate = false,
  onOpen,
}: {
  event: CalendarEvent;
  data: AppData;
  compact?: boolean;
  showDate?: boolean;
  onOpen: (event: CalendarEvent) => void;
}) {
  const color = getEventColor(event, data);

  return (
    <button onClick={() => onOpen(event)} className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm ${color}`}>
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
    </button>
  );
}

function EventMember({ event, data, small = false }: { event: CalendarEvent; data: AppData; small?: boolean }) {
  const member = data.familyMembers.find((item) => item.id === event.personId);
  return <MemberBadge member={member} size={small ? "sm" : "md"} className={small ? "ml-2" : "mt-2"} />;
}

function EventDetail({
  event,
  data,
  editable,
  title,
  date,
  time,
  personId,
  onTitleChange,
  onDateChange,
  onTimeChange,
  onPersonChange,
  onSave,
  onDelete,
  onClose,
}: {
  event: CalendarEvent;
  data: AppData;
  editable: boolean;
  title: string;
  date: string;
  time: string;
  personId: string;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onPersonChange: (value: string) => void;
  onSave: (event: FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-5 shadow-glass">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Rendez-vous</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{event.title}</h3>
          </div>
          <button onClick={onClose} className="icon-button" title="Fermer">×</button>
        </div>

        {editable ? (
          <form onSubmit={onSave} className="space-y-3">
            <input className="field" value={title} onChange={(item) => onTitleChange(item.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" type="date" value={date} onChange={(item) => onDateChange(item.target.value)} />
              <input className="field" type="time" value={time} onChange={(item) => onTimeChange(item.target.value)} />
            </div>
            <MemberSelect data={data} value={personId} onChange={onPersonChange} />
            <div className="flex flex-wrap justify-between gap-3 pt-2">
              <button type="button" onClick={onDelete} className="rounded-2xl bg-rose-50 px-5 py-3 font-bold text-rose-700">
                Supprimer
              </button>
              <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-700">{formatDateLabel(getEventDateKey(event))}</p>
            <p className="rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-700">{event.time}</p>
            <EventMember event={event} data={data} />
          </div>
        )}
      </section>
    </div>
  );
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
  const members = data.familyMembers ?? [];
  const selectedValue = members.some((item) => item.id === value) ? value : members[0]?.id ?? "";
  const member = members.find((item) => item.id === selectedValue);

  return (
    <div className="flex min-w-0 flex-[1_1_160px] items-center gap-2">
      <MemberBadge member={member} size="sm" />
      <select className="field min-h-11 flex-1" value={selectedValue} onChange={(event) => onChange(event.target.value)}>
        {members.map((item) => (
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

function isEditableEvent(event: CalendarEvent, data: AppData) {
  return data.calendarEvents.some((item) => item.id === event.id);
}

function getEventDateKey(event: CalendarEvent) {
  if (event.dateISO) return normalizeDateKey(event.dateISO);
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
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${normalizeDateKey(dateKey)}T12:00:00`));
}

function toDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function atNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function normalizeDateKey(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(date.getTime())) return value;
  }

  return toDateKey(new Date());
}

function getRelativeDateLabel(dateKey: string): CalendarEvent["date"] {
  const today = toDateKey(new Date());
  return dateKey === today ? "today" : "tomorrow";
}
