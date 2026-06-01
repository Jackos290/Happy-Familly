import {
  CalendarDays,
  CheckSquare,
  CloudSun,
  Expand,
  Gift,
  Heart,
  Home,
  ListTodo,
  PiggyBank,
  Quote,
  RefreshCw,
  Settings,
  ShoppingBasket,
  SunMedium,
  TimerReset,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";
import type { HourlyForecast } from "../utils/weather";
import { fetchGorcyForecast } from "../utils/weather";
import BudgetCard from "./BudgetCard";
import DailyThanks from "./DailyThanks";
import FamilyCalendar from "./FamilyCalendar";
import FamilySettings from "./FamilySettings";
import GoogleCalendarSync from "./GoogleCalendarSync";
import ParentTodoList from "./ParentTodoList";
import PositiveQuote from "./PositiveQuote";
import ShoppingList from "./ShoppingList";
import TaskBoard from "./TaskBoard";
import WeatherCard from "./WeatherCard";

type DashboardProps = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  refreshKey: number;
  syncStatus: string;
  accessMode?: "dashboard" | "member";
  initialMemberId?: string | null;
  onBackToChooser?: () => void;
};

type PanelId = "calendar" | "tasks" | "weather" | "shopping" | "budget" | "quote" | "thanks";
type PersonalTab = "home" | "calendar" | "tasks" | "todo" | "shopping" | "budget" | "weather" | "thanks";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export default function Dashboard({
  data,
  onDataChange,
  refreshKey,
  syncStatus,
  accessMode = "dashboard",
  initialMemberId = null,
  onBackToChooser,
}: DashboardProps) {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [tabletModeActive, setTabletModeActive] = useState(false);
  const [tabletModeMessage, setTabletModeMessage] = useState("Prêt pour la tablette");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<PanelId | null>(null);
  const [nextHours, setNextHours] = useState<HourlyForecast[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId);
  const [personalTab, setPersonalTab] = useState<PersonalTab>("home");

  const selectedMemberIsChild = Boolean(selectedMemberId && isChildMember(data, selectedMemberId));

  const now = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  async function requestWakeLock() {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) {
      setTabletModeMessage("Anti-veille non disponible sur ce navigateur");
      return;
    }

    try {
      wakeLockRef.current = await wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
      setTabletModeMessage("Plein écran et anti-veille actifs");
    } catch {
      setTabletModeMessage("Anti-veille refusé par le navigateur");
    }
  }

  async function releaseWakeLock() {
    const currentWakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    await currentWakeLock?.release().catch(() => undefined);
  }

  async function toggleTabletMode() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      await releaseWakeLock();
      setTabletModeActive(false);
      setTabletModeMessage("Mode tablette désactivé");
      return;
    }

    await document.documentElement.requestFullscreen().catch(() => undefined);
    setTabletModeActive(true);
    await requestWakeLock();
  }

  useEffect(() => {
    function handleVisibilityChange() {
      if (tabletModeActive && document.visibilityState === "visible" && !wakeLockRef.current) {
        void requestWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseWakeLock();
    };
  }, [tabletModeActive]);

  useEffect(() => {
    function handleFullscreenChange() {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setTabletModeActive(fullscreenActive);
      if (!fullscreenActive) {
        void releaseWakeLock();
        setTabletModeMessage("Mode tablette désactivé");
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    async function loadHeaderForecast() {
      try {
        const forecast = await fetchGorcyForecast();
        setNextHours(forecast.nextHours);
      } catch {
        setNextHours([]);
      }
    }

    void loadHeaderForecast();
  }, [refreshKey]);

  useEffect(() => {
    setSelectedMemberId(initialMemberId);
  }, [initialMemberId]);

  useEffect(() => {
    if (accessMode === "member") return;
    if (!selectedMemberId) return;

    let timeout = window.setTimeout(() => {
      setSelectedMemberId(null);
    }, 60_000);

    function resetFilterTimeout() {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        setSelectedMemberId(null);
      }, 60_000);
    }

    window.addEventListener("pointerdown", resetFilterTimeout);
    window.addEventListener("keydown", resetFilterTimeout);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pointerdown", resetFilterTimeout);
      window.removeEventListener("keydown", resetFilterTimeout);
    };
  }, [accessMode, selectedMemberId]);

  const selectedMember = selectedMemberId
    ? data.familyMembers.find((member) => member.id === selectedMemberId)
    : null;
  const headerMembers = accessMode === "member" && selectedMember ? [selectedMember] : data.familyMembers;

  if (accessMode === "member" && selectedMember) {
    return (
      <PersonalApp
        data={data}
        onDataChange={onDataChange}
        syncStatus={syncStatus}
        memberId={selectedMember.id}
        memberName={selectedMember.name}
        memberPhotoUrl={selectedMember.photoUrl}
        memberColor={selectedMember.color}
        tab={personalTab}
        onTabChange={setPersonalTab}
        onBackToChooser={onBackToChooser}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        {settingsOpen && (
          <Modal title="Options famille" onClose={() => setSettingsOpen(false)}>
            <FamilySettings data={data} onDataChange={onDataChange} />
          </Modal>
        )}
      </PersonalApp>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#151229] px-3 py-3 text-white sm:px-5">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3">
        <header className="flex shrink-0 flex-col gap-3 rounded-[1.4rem] border border-[#3a3463] bg-[#1d1935] px-4 py-3 shadow-glass backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-36 font-serif text-xl font-black italic capitalize text-[#ffd38a]">{now}</p>
            {nextHours.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextHours.map((hour) => <ForecastPill key={hour.time} hour={hour} />)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onBackToChooser && (
              <button onClick={onBackToChooser} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34305a] text-white" title="Changer d'espace">
                <Home className="h-5 w-5" />
              </button>
            )}
            {headerMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  if (accessMode === "member") return;
                  setSelectedMemberId((current) => (current === member.id ? null : member.id));
                }}
                className={`inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#34305a] shadow-sm ring-offset-2 ring-offset-[#151229] transition ${
                  selectedMemberId === member.id ? "ring-4 ring-[#83efb2]" : "ring-0 hover:ring-2 hover:ring-[#ffd38a]"
                }`}
                title={accessMode === "member" ? member.name : `Voir seulement ${member.name}`}
              >
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  <span className={`flex h-full w-full items-center justify-center text-sm font-black ${member.color}`}>
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34305a] text-white"
              title="Options famille"
            >
              <Settings className="h-5 w-5" />
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#3a3463] bg-[#17142c] px-4 py-2 text-sm font-semibold text-white/70">
              <RefreshCw className="h-4 w-4" />
              {syncStatus}
            </span>
            <button
              onClick={toggleTabletMode}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd38a] text-xl text-[#151229] transition hover:bg-[#ffe1a8]"
              title={tabletModeActive ? "Quitter le mode tablette" : "Mode tablette"}
            >
              {tabletModeActive ? "✅" : "📱"}
            </button>
          </div>
        </header>
        <p className="sr-only" aria-live="polite">
          {tabletModeMessage}
        </p>
        <section className="grid min-h-0 flex-1 auto-rows-fr gap-3 overflow-hidden lg:grid-cols-12">
          <Panel id="calendar" className="lg:col-span-5" icon={<CalendarDays />} title="Calendrier" onExpand={setExpandedPanel}>
            <CalendarSummary data={data} selectedMemberId={selectedMemberId} />
          </Panel>

          <Panel id="tasks" className="lg:col-span-4" icon={<CheckSquare />} title="Tâches" onExpand={setExpandedPanel}>
            <TasksSummary data={data} selectedMemberId={selectedMemberId} />
          </Panel>

          <Panel id="weather" className="lg:col-span-3" icon={<SunMedium />} title="Météo Gorcy" onExpand={setExpandedPanel}>
            <WeatherSummary data={data} />
          </Panel>

          <Panel id="shopping" className="lg:col-span-4" icon={<ShoppingBasket />} title="Courses" onExpand={setExpandedPanel}>
            <ShoppingSummary data={data} />
          </Panel>

          <Panel id="budget" className="lg:col-span-4" icon={<PiggyBank />} title={selectedMemberIsChild ? "Récompenses" : "Budget"} onExpand={setExpandedPanel}>
            {selectedMemberIsChild && selectedMemberId ? (
              <RewardSummary data={data} memberId={selectedMemberId} />
            ) : (
              <BudgetSummary data={data} />
            )}
          </Panel>

          <div className="grid min-h-0 gap-3 lg:col-span-4">
            <Panel id="quote" icon={<Quote />} title="Phrase du jour" onExpand={setExpandedPanel}>
              <QuoteSummary data={data} />
            </Panel>
            <Panel id="thanks" icon={<Heart />} title="Merci" onExpand={setExpandedPanel}>
              <ThanksSummary data={data} />
            </Panel>
          </div>
        </section>
      </div>

      {settingsOpen && (
        <Modal title="Options famille" onClose={() => setSettingsOpen(false)}>
          <FamilySettings data={data} onDataChange={onDataChange} />
        </Modal>
      )}

      {expandedPanel && (
        <Modal title={getPanelTitle(expandedPanel)} onClose={() => setExpandedPanel(null)} wide>
          {renderExpandedPanel(expandedPanel, data, onDataChange, selectedMemberId)}
        </Modal>
      )}
    </main>
  );
}

function CalendarSummary({ data, selectedMemberId }: { data: AppData; selectedMemberId: string | null }) {
  const todayISO = toISODate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = toISODate(tomorrow);
  const events = data.calendarEvents.filter((event) => {
    const matchesMember = !selectedMemberId || event.personId === selectedMemberId || !event.personId;
    const eventDate = event.dateISO ?? event.date;
    return matchesMember && (eventDate === todayISO || eventDate === tomorrowISO || event.date === "today" || event.date === "tomorrow");
  });
  const todayEvents = events.filter((event) => (event.dateISO ? event.dateISO === todayISO : event.date === "today")).slice(0, 3);
  const tomorrowEvents = events.filter((event) => (event.dateISO ? event.dateISO === tomorrowISO : event.date === "tomorrow")).slice(0, 3);

  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-3">
      <SummaryColumn title="Aujourd'hui" items={todayEvents} data={data} empty="Rien prévu" />
      <SummaryColumn title="Demain" items={tomorrowEvents} data={data} empty="Rien prévu" />
    </div>
  );
}

function SummaryColumn({
  title,
  items,
  data,
  empty,
}: {
  title: string;
  items: { id: string; title: string; time: string; personId?: string }[];
  data: AppData;
  empty: string;
}) {
  return (
    <div className="min-h-0 rounded-3xl border border-[#3a3463] bg-[#17142c] p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">{title}</p>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm font-bold text-white/45">{empty}</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-black text-white">{item.title}</p>
              <span className="shrink-0 rounded-full bg-[#34305a] px-2 py-1 text-xs font-black text-[#ffd38a]">{item.time}</span>
            </div>
            {item.personId && <MemberMini data={data} memberId={item.personId} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksSummary({ data, selectedMemberId }: { data: AppData; selectedMemberId: string | null }) {
  const members = selectedMemberId
    ? data.familyMembers.filter((member) => member.id === selectedMemberId)
    : data.familyMembers;
  const todoTasks = data.tasks.filter((task) => !task.done && (!selectedMemberId || task.personId === selectedMemberId));
  const doneTasks = data.tasks.filter((task) => task.done && (!selectedMemberId || task.personId === selectedMemberId));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="À faire" value={todoTasks.length} />
        <MetricPill label="Faites" value={doneTasks.length} />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
        {members.slice(0, 4).map((member) => {
          const memberTasks = data.tasks.filter((task) => task.personId === member.id && !task.done).slice(0, 2);
          return (
            <div key={member.id} className="min-h-0 rounded-3xl border border-[#3a3463] bg-[#17142c] p-3">
              <MemberMini data={data} memberId={member.id} />
              <div className="mt-2 space-y-1.5">
                {memberTasks.length === 0 ? (
                  <p className="text-xs font-bold text-white/45">Aucune tâche</p>
                ) : (
                  memberTasks.map((task) => (
                    <p key={task.id} className="line-clamp-2 rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2 text-sm font-bold text-white/85">
                      {task.title}
                    </p>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeatherSummary({ data }: { data: AppData }) {
  return (
    <div className="grid h-full min-h-0 gap-3">
      <div className="rounded-3xl border border-[#3a3463] bg-[#211d3d] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Aujourd'hui</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-5xl font-black text-white">{data.weather.temperature}°C</p>
          <CloudSun className="h-12 w-12 text-[#ffd38a]" />
        </div>
        <p className="mt-2 text-sm font-bold text-white/60">{data.weather.label ?? (data.weather.condition === "rain" ? "Pluie" : "Soleil")} · vent {data.weather.windKmh} km/h</p>
      </div>
      <div className="rounded-3xl border border-[#3a3463] bg-[#17142c] p-4 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd38a]">Conseil enfants</p>
        <p className="mt-2 text-base font-black">{getClothingAdvice(data.weather.temperature, data.weather.condition)}</p>
      </div>
    </div>
  );
}

function ShoppingSummary({ data }: { data: AppData }) {
  const todo = data.shoppingItems.filter((item) => !item.checked);
  const done = data.shoppingItems.filter((item) => item.checked);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="À acheter" value={todo.length} />
        <MetricPill label="Déjà pris" value={done.length} />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        {todo.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2">
            {item.photoUrl ? <img src={item.photoUrl} alt={item.label} className="h-9 w-9 rounded-xl object-cover" /> : <ShoppingBasket className="h-5 w-5 text-[#ffd38a]" />}
            <span className="line-clamp-1 text-sm font-black text-white">{item.label}</span>
          </div>
        ))}
        {todo.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-3 text-sm font-bold text-white/45">Liste vide</p>}
      </div>
    </div>
  );
}

function BudgetSummary({ data }: { data: AppData }) {
  const spent = data.budget.expenses.reduce((total, expense) => total + expense.amount, 0);
  const total = data.budget.monthlyTotal || 1;
  const percent = Math.min(100, Math.round((spent / total) * 100));
  const remaining = Math.max(0, data.budget.monthlyTotal - spent);
  const color = percent < 70 ? "bg-emerald-500" : percent < 90 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="h-full rounded-3xl border border-[#3a3463] bg-[#17142c] p-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <MetricPill label="Budget" value={`${data.budget.monthlyTotal}€`} />
        <MetricPill label="Dépensé" value={`${spent}€`} />
        <MetricPill label="Reste" value={`${remaining}€`} />
      </div>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-[#34305a]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-right text-sm font-black text-white/60">{percent}% utilisé</p>
    </div>
  );
}

function RewardSummary({ data, memberId }: { data: AppData; memberId: string }) {
  const minutes = getRewardMinutes(data, memberId);
  const remainingTasks = data.tasks.filter((task) => task.personId === memberId && !task.done);

  return (
    <div className="grid h-full min-h-0 gap-3">
      <div className="rounded-3xl border border-[#3a3463] bg-[#211d3d] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd38a]">Temps écran gagné</p>
        <p className="mt-2 font-serif text-5xl font-black text-[#ffd38a]">{minutes} min</p>
      </div>
      <div className="rounded-3xl border border-[#3a3463] bg-[#17142c] p-4">
        <p className="text-sm font-black text-white/70">{remainingTasks.length} tâche(s) pour gagner du temps</p>
      </div>
    </div>
  );
}

function QuoteSummary({ data }: { data: AppData }) {
  return <p className="line-clamp-3 rounded-3xl border border-[#3a3463] bg-[#17142c] p-4 text-xl font-black leading-tight text-white">{data.positiveQuote}</p>;
}

function ThanksSummary({ data }: { data: AppData }) {
  return (
    <div className="space-y-2">
      {data.thanksMessages.slice(0, 2).map((message) => (
        <div key={message.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2">
          <p className="line-clamp-2 text-sm font-bold text-white/85">{message.text}</p>
          <p className="mt-1 text-xs font-black text-[#ffd38a]">{message.author}</p>
        </div>
      ))}
      {data.thanksMessages.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-3 text-sm font-bold text-white/45">Aucun merci pour l'instant</p>}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2 text-center shadow-sm">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function MemberMini({ data, memberId }: { data: AppData; memberId: string }) {
  const member = data.familyMembers.find((item) => item.id === memberId);
  if (!member) return null;

  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#3a3463] bg-[#211d3d] px-2 py-1 text-xs font-black text-white shadow-sm">
      <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-[#34305a]">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center text-[0.65rem] ${member.color}`}>
            {member.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className="truncate">{member.name}</span>
    </span>
  );
}

function PersonalApp({
  data,
  onDataChange,
  syncStatus,
  memberId,
  memberName,
  memberPhotoUrl,
  memberColor,
  tab,
  onTabChange,
  onBackToChooser,
  onOpenSettings,
  children,
}: {
  data: AppData;
  onDataChange: (data: AppData) => void;
  syncStatus: string;
  memberId: string;
  memberName: string;
  memberPhotoUrl?: string;
  memberColor: string;
  tab: PersonalTab;
  onTabChange: (tab: PersonalTab) => void;
  onBackToChooser?: () => void;
  onOpenSettings: () => void;
  children?: ReactNode;
}) {
  const isChild = isChildMember(data, memberId);

  return (
    <main className="min-h-screen bg-[#151229] pb-28 text-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
        <header className="sticky top-3 z-30 rounded-[1.5rem] border border-white/10 bg-white/10 p-3 shadow-glass backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <button onClick={onBackToChooser} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white" title="Changer d'espace">
              <Home className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="inline-flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-sm">
                {memberPhotoUrl ? (
                  <img src={memberPhotoUrl} alt={memberName} className="h-full w-full object-cover" />
                ) : (
                  <span className={`flex h-full w-full items-center justify-center text-sm font-black ${memberColor}`}>
                    {memberName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-black text-white">{memberName}</p>
                <p className="truncate text-xs font-bold text-emerald-100/75">{syncStatus}</p>
              </div>
            </div>
            <button onClick={onOpenSettings} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white" title="Options famille">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className={tab === "home" ? "" : "rounded-[1.75rem] border border-white/70 bg-white/90 p-4 text-slate-900 shadow-glass backdrop-blur-2xl"}>
          {renderPersonalTab(tab, data, onDataChange, memberId, isChild, memberName, onTabChange)}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#151229]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-glass backdrop-blur-2xl">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1.5">
          <PersonalNavButton active={tab === "home"} icon={<Home />} label="Accueil" onClick={() => onTabChange("home")} />
          <PersonalNavButton active={tab === "calendar"} icon={<CalendarDays />} label="Agenda" onClick={() => onTabChange("calendar")} />
          <PersonalNavButton active={tab === "tasks"} icon={<CheckSquare />} label="Tâches" onClick={() => onTabChange("tasks")} />
          {!isChild && <PersonalNavButton active={tab === "todo"} icon={<ListTodo />} label="Todo" onClick={() => onTabChange("todo")} />}
          <PersonalNavButton active={tab === "shopping"} icon={<ShoppingBasket />} label="Courses" onClick={() => onTabChange("shopping")} />
          <PersonalNavButton active={tab === "budget"} icon={<PiggyBank />} label={isChild ? "Temps" : "Budget"} onClick={() => onTabChange("budget")} />
          <PersonalNavButton active={tab === "weather"} icon={<SunMedium />} label="Météo" onClick={() => onTabChange("weather")} />
          <PersonalNavButton active={tab === "thanks"} icon={<Heart />} label="Merci" onClick={() => onTabChange("thanks")} />
        </div>
      </nav>

      {children}
    </main>
  );
}

function PersonalNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[0.68rem] font-black transition [&_svg]:h-5 [&_svg]:w-5 ${
        active ? "bg-[#3b3269] text-white" : "bg-white/10 text-white/60"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function renderPersonalTab(
  tab: PersonalTab,
  data: AppData,
  onDataChange: (data: AppData) => void,
  memberId: string,
  isChild: boolean,
  memberName: string,
  onTabChange: (tab: PersonalTab) => void,
) {
  switch (tab) {
    case "calendar":
      return (
        <div className="space-y-4">
          {!isChild && <GoogleCalendarSync data={data} memberId={memberId} onDataChange={onDataChange} />}
          <FamilyCalendar data={data} onDataChange={onDataChange} selectedMemberId={memberId} expanded />
        </div>
      );
    case "tasks":
      return <TaskBoard data={data} onDataChange={onDataChange} selectedMemberId={memberId} expanded />;
    case "todo":
      return <ParentTodoList data={data} memberId={memberId} onDataChange={onDataChange} />;
    case "shopping":
      return <ShoppingList data={data} onDataChange={onDataChange} expanded />;
    case "budget":
      return isChild ? (
        <ChildScreenTimePanel data={data} memberId={memberId} onDataChange={onDataChange} />
      ) : (
        <div className="space-y-4">
          <ParentScreenTimeManager data={data} onDataChange={onDataChange} />
          <BudgetCard data={data} onDataChange={onDataChange} />
        </div>
      );
    case "weather":
      return <WeatherCard weather={data.weather} />;
    case "thanks":
      return <DailyThanks data={data} onDataChange={onDataChange} />;
    case "home":
      return <LauncherHome data={data} memberId={memberId} memberName={memberName} isChild={isChild} onTabChange={onTabChange} />;
  }
}

function LauncherHome({
  data,
  memberId,
  memberName,
  isChild,
  onTabChange,
}: {
  data: AppData;
  memberId: string;
  memberName: string;
  isChild: boolean;
  onTabChange: (tab: PersonalTab) => void;
}) {
  const todoTasks = data.tasks.filter((task) => task.personId === memberId && !task.done);
  const calendarCount = data.calendarEvents.filter((event) => event.personId === memberId || !event.personId).length;
  const shoppingCount = data.shoppingItems.filter((item) => !item.checked).length;
  const thanksCount = data.thanksMessages.length;
  const minutes = getRewardMinutes(data, memberId);
  const tiles: Array<{
    label: string;
    tab: PersonalTab;
    icon: ReactNode;
    badge?: number | string;
    className: string;
  }> = [
    { label: "Courses", tab: "shopping", icon: <ShoppingBasket />, badge: shoppingCount, className: "bg-[#211d3d] border-[#3a3463]" },
    { label: "Calendrier", tab: "calendar", icon: <CalendarDays />, badge: calendarCount, className: "bg-[#241f43] border-[#4b4075]" },
    { label: "Tâches", tab: "tasks", icon: <CheckSquare />, badge: todoTasks.length, className: "bg-[#211d3d] border-[#3a3463]" },
    { label: isChild ? "Temps" : "Budget", tab: "budget", icon: isChild ? <TimerReset /> : <PiggyBank />, badge: isChild ? `${minutes}m` : undefined, className: "bg-[#2d2851] border-[#5f528a]" },
    { label: isChild ? "Routines" : "Todo", tab: isChild ? "tasks" : "todo", icon: <ListTodo />, className: "bg-[#211d3d] border-[#3a3463]" },
    { label: "Météo", tab: "weather", icon: <SunMedium />, badge: `${data.weather.temperature}°`, className: "bg-[#241f43] border-[#4b4075]" },
    { label: "Merci", tab: "thanks", icon: <Heart />, badge: thanksCount, className: "bg-[#211d3d] border-[#3a3463]" },
  ];

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <p className="font-serif text-lg font-black italic text-[#ffd38a]">Famille</p>
        <h1 className="mt-2 text-4xl font-black leading-tight text-white">Bonjour {memberName}</h1>
        <button
          onClick={() => onTabChange("home")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2d2851] px-4 py-2 text-lg font-bold text-white"
        >
          <Home className="h-5 w-5" />
          Happy Family
        </button>
      </div>

      <section className="rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">Mes applications</h2>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <Gift className="h-5 w-5" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <button
              key={`${tile.label}-${tile.tab}`}
              onClick={() => onTabChange(tile.tab)}
              className={`relative min-h-36 overflow-hidden rounded-[1.4rem] border ${tile.className} p-4 text-left text-white shadow-lg`}
            >
              <p className="relative z-10 text-2xl font-black leading-tight">{tile.label}</p>
              {tile.badge !== undefined && tile.badge !== 0 && (
                <span className="absolute left-4 bottom-4 z-10 rounded-full bg-[#ffd38a] px-3 py-1.5 text-sm font-black text-[#151229]">
                  {tile.badge}
                </span>
              )}
              <span className="absolute -bottom-3 -right-3 rounded-full bg-white/10 p-8 text-[#ffd38a] [&_svg]:h-16 [&_svg]:w-16">
                {tile.icon}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChildScreenTimePanel({
  data,
  memberId,
  onDataChange,
}: {
  data: AppData;
  memberId: string;
  onDataChange: (data: AppData) => void;
}) {
  const [tab, setTab] = useState<"request" | "history" | "profile">("request");
  const member = data.familyMembers.find((item) => item.id === memberId);
  const minutes = getRewardMinutes(data, memberId);
  const todoTasks = data.tasks.filter((task) => task.personId === memberId && !task.done);
  const doneTasks = data.tasks.filter((task) => task.personId === memberId && task.done);
  const requests = (data.screenTimeRequests ?? []).filter((request) => request.childId === memberId);
  const transactions = (data.screenTimeTransactions ?? []).filter((transaction) => transaction.childId === memberId);

  function reactivateTask(taskId: string) {
    onDataChange({
      ...data,
      tasks: data.tasks.map((task) => task.id === taskId ? { ...task, done: false, completedAt: undefined } : task),
    });
  }

  function requestSpend(button: SpendButton) {
    addScreenTimeRequest(button.label, button.minutes, "spend");
  }

  function requestReward(label: string, rewardMinutes: number) {
    addScreenTimeRequest(label, rewardMinutes, "reward");
  }

  function addScreenTimeRequest(label: string, requestMinutes: number, kind: "reward" | "spend") {
    onDataChange({
      ...data,
      screenTimeRequests: [
        ...(data.screenTimeRequests ?? []),
        {
          id: createId("screen-request"),
          childId: memberId,
          label,
          minutes: requestMinutes,
          createdAt: new Date().toISOString(),
          status: "pending",
          kind,
        },
      ],
    });
  }

  return (
    <div className="-m-4 min-h-[70vh] space-y-5 rounded-[1.75rem] bg-[#151229] p-4 text-white">
      <div className="flex items-center gap-3">
        <AvatarBubble member={member} size="lg" />
        <div>
          <p className="text-xs font-bold text-white/45">Coucou</p>
          <p className="text-lg font-black">{member?.name ?? "Enfant"}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-[#3a3463] bg-[#2b2548] p-5 text-center shadow-glass">
        <AvatarBubble member={member} size="xl" centered />
        <p className="mt-4 text-xs font-bold text-white/55">tu peux jouer pendant</p>
        <p className="font-serif text-6xl font-black text-[#ffd38a]">{formatMinutesAsTime(minutes)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-full border border-[#3a3463] bg-[#17142c] p-1">
        <ScreenTab active={tab === "request"} onClick={() => setTab("request")}>⭐ Demander</ScreenTab>
        <ScreenTab active={tab === "history"} onClick={() => setTab("history")}>📜 Historique</ScreenTab>
        <ScreenTab active={tab === "profile"} onClick={() => setTab("profile")}>😍 Profil</ScreenTab>
      </div>

      {tab === "request" && (
        <div className="space-y-6">
          <RewardSection title="🔥 J'ai fait une tâche">
            {todoTasks.map((task) => (
              <RewardTile
                key={task.id}
                icon={guessTaskIcon(task.title)}
                title={task.title}
                minutes={`+${task.rewardMinutes ?? 0} min`}
                tone="green"
                onClick={() => requestReward(task.title, task.rewardMinutes ?? 0)}
              />
            ))}
            {CHILD_TASK_TEMPLATES.map((task) => (
              <RewardTile
                key={`template-${task.title}`}
                icon={task.icon}
                title={task.title}
                minutes={task.minutesLabel}
                tone="green"
                onClick={() => requestReward(task.title, task.minutes)}
              />
            ))}
          </RewardSection>

          <RewardSection title="🌈 J'ai bien travaillé">
            {DEFAULT_REWARDS.work.map((reward) => (
              <RewardTile
                key={reward.title}
                {...reward}
                tone="amber"
                onClick={() => requestReward(reward.title, reward.requestMinutes)}
              />
            ))}
          </RewardSection>

          <RewardSection title="🎁 Bonus">
            {DEFAULT_REWARDS.bonus.map((reward) => (
              <RewardTile
                key={reward.title}
                {...reward}
                tone="red"
                onClick={() => requestReward(reward.title, reward.requestMinutes)}
              />
            ))}
          </RewardSection>

          <RewardSection title="🎮 Utiliser mon temps">
            <div className="grid grid-cols-3 gap-2 sm:col-span-2">
              {SPEND_BUTTONS.map((button) => (
                <button
                  key={button.label}
                  onClick={() => requestSpend(button)}
                  className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-4 text-center font-black text-white"
                >
                  <span className="block text-lg">{button.icon}</span>
                  <span className="mt-1 block text-sm">{button.label}</span>
                </button>
              ))}
            </div>
            <p className="col-span-full text-center text-xs font-bold text-white/35">
              Les parents doivent valider la demande avant que le temps soit déduit.
            </p>
          </RewardSection>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          <ScreenListTitle icon="📨" title={`Demandes en attente (${requests.filter((request) => request.status === "pending").length})`} />
          {requests.length === 0 && <EmptyScreenTile text="Aucune demande pour le moment." />}
          {requests.map((request) => (
            <ScreenRequestHistoryItem key={request.id} request={request} />
          ))}
          <ScreenListTitle icon="✅" title="Temps gagné" />
          {doneTasks.map((task) => (
            <button key={task.id} onClick={() => reactivateTask(task.id)} className="w-full rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4 text-left">
              <p className="font-black">{task.title}</p>
              <p className="font-serif text-xl font-black text-[#83efb2]">+{task.rewardMinutes ?? 0} min</p>
            </button>
          ))}
          {transactions.map((transaction) => (
            <div key={transaction.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4">
              <p className="font-black">{transaction.label}</p>
              <p className={`font-serif text-xl font-black ${transaction.minutes >= 0 ? "text-[#83efb2]" : "text-[#ff7b72]"}`}>
                {transaction.minutes > 0 ? "+" : ""}{transaction.minutes} min
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "profile" && (
        <div className="space-y-4 rounded-3xl border border-[#3a3463] bg-[#211d3d] p-4">
          <ScreenListTitle icon="🔐" title="Profil enfant" />
          <div className="rounded-2xl bg-[#312b57] p-4">
            <AvatarBubble member={member} size="xl" />
            <p className="mt-3 font-black">Photo de profil</p>
            <p className="text-xs font-bold text-white/45">La photo se règle dans les options famille.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-[#3a3463] bg-[#17142c] p-4">
              <p className="text-xs font-bold text-white/45">Solde actuel</p>
              <p className="font-serif text-3xl font-black text-[#ffd38a]">{formatMinutesAsTime(minutes)}</p>
            </div>
            <div className="rounded-2xl border border-[#3a3463] bg-[#17142c] p-4">
              <p className="text-xs font-bold text-white/45">Tâches à faire</p>
              <p className="text-3xl font-black text-white">{todoTasks.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-[#3a3463] bg-[#17142c] p-4">
        <ScreenListTitle icon="🧩" title="Gestion des tâches enfant" />
        <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-slate-900">
          <TaskBoard data={data} onDataChange={onDataChange} selectedMemberId={memberId} expanded />
        </div>
      </div>
    </div>
  );
}

function ParentScreenTimeManager({ data, onDataChange }: { data: AppData; onDataChange: (data: AppData) => void }) {
  const [tab, setTab] = useState<"requests" | "rewards" | "spends" | "family">("requests");
  const children = data.familyMembers.filter((member) => isChildMember(data, member.id));
  const requests = data.screenTimeRequests ?? [];
  const pendingRequests = requests.filter((request) => request.status === "pending");

  function updateRequest(requestId: string, status: "approved" | "rejected") {
    const request = requests.find((item) => item.id === requestId);
    const requestKind = request?.kind ?? "spend";
    const transactionMinutes = request ? (requestKind === "spend" ? -request.minutes : request.minutes) : 0;
    onDataChange({
      ...data,
      screenTimeRequests: requests.map((item) => (item.id === requestId ? { ...item, status } : item)),
      screenTimeTransactions: status === "approved" && request
        ? [
            ...(data.screenTimeTransactions ?? []),
            {
              id: createId("screen-transaction"),
              childId: request.childId,
              label: request.label,
              minutes: transactionMinutes,
              createdAt: new Date().toISOString(),
              type: requestKind,
            },
          ]
        : data.screenTimeTransactions,
    });
  }

  return (
    <div className="-m-1 space-y-4 rounded-[1.75rem] bg-[#151229] p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#34305a] text-[#ffd38a]">
            <LockKeyIcon />
          </span>
          <div>
            <p className="text-xs font-bold text-white/45">Espace</p>
            <p className="text-lg font-black">Parent</p>
          </div>
        </div>
        <p className="rounded-full border border-[#3a3463] px-3 py-1 text-xs font-black text-white/55">
          {pendingRequests.length} demande(s)
        </p>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-full border border-[#3a3463] bg-[#17142c] p-1">
        <ScreenTab active={tab === "requests"} onClick={() => setTab("requests")}>🔔 Demandes</ScreenTab>
        <ScreenTab active={tab === "rewards"} onClick={() => setTab("rewards")}>⚙️ Récompenses</ScreenTab>
        <ScreenTab active={tab === "spends"} onClick={() => setTab("spends")}>🎮 Dépenses</ScreenTab>
        <ScreenTab active={tab === "family"} onClick={() => setTab("family")}>👨‍👩‍👧‍👦 Famille</ScreenTab>
      </div>

      {tab === "requests" && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-white/60">{pendingRequests.length} demande(s) en attente</p>
          {pendingRequests.length === 0 && <EmptyScreenTile text="Aucune demande à valider." />}
          {pendingRequests.map((request) => {
            const child = data.familyMembers.find((member) => member.id === request.childId);
            const requestKind = request.kind ?? "spend";
            return (
              <div key={request.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4">
                <div className="flex items-center gap-3">
                  <AvatarBubble member={child} size="lg" />
                  <div>
                    <p className="font-black">{child?.name ?? "Enfant"} 😎</p>
                    <p className="text-xs font-bold text-white/45">
                      Demande de {requestKind === "reward" ? "récompense" : "dépense"} · {formatShortDate(request.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#312b57] px-3 py-3">
                  <p className="font-black">{request.label}</p>
                  <p className={`font-serif text-xl font-black ${requestKind === "reward" ? "text-[#83efb2]" : "text-[#ff7b72]"}`}>
                    {requestKind === "reward" ? "+" : "-"}{request.minutes} min
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => updateRequest(request.id, "rejected")} className="rounded-xl border border-[#ff7b72] bg-[#3a243a] px-3 py-3 text-sm font-black text-[#ff7b72]">
                    Examiner
                  </button>
                  <button onClick={() => updateRequest(request.id, "approved")} className="rounded-xl bg-[#83efb2] px-3 py-3 text-sm font-black text-[#151229]">
                    ✓ Valider direct
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "rewards" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map((child) => (
            <div key={child.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4">
              <AvatarBubble member={child} size="lg" />
              <p className="mt-2 font-black">{child.name}</p>
              <p className="font-serif text-3xl font-black text-[#ffd38a]">{formatMinutesAsTime(getRewardMinutes(data, child.id))}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "spends" && (
        <div className="grid grid-cols-3 gap-2">
          {SPEND_BUTTONS.map((button) => (
            <div key={button.label} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4 text-center font-black">
              <span className="block text-lg">{button.icon}</span>
              {button.label}
            </div>
          ))}
        </div>
      )}

      {tab === "family" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {children.map((child) => (
            <div key={child.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4">
              <AvatarBubble member={child} size="lg" />
              <p className="mt-2 font-black">{child.name}</p>
              <p className="text-sm font-bold text-white/45">{data.tasks.filter((task) => task.personId === child.id && !task.done).length} tâche(s) à faire</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScreenRequestHistoryItem({ request }: { request: NonNullable<AppData["screenTimeRequests"]>[number] }) {
  const requestKind = request.kind ?? "spend";
  return (
    <div className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black">{request.label}</p>
          <p className="text-xs font-bold text-white/45">{formatShortDate(request.createdAt)} · {request.status}</p>
        </div>
        <p className={`font-serif text-xl font-black ${requestKind === "spend" ? "text-[#ff7b72]" : "text-[#83efb2]"}`}>
          {requestKind === "spend" ? "-" : "+"}{request.minutes} min
        </p>
      </div>
    </div>
  );
}

function LockKeyIcon() {
  return <span className="text-lg">🔐</span>;
}

type SpendButton = {
  label: string;
  minutes: number;
  icon: string;
};

const SPEND_BUTTONS: SpendButton[] = [
  { label: "5 min", minutes: 5, icon: "⏱️" },
  { label: "15 min", minutes: 15, icon: "🧮" },
  { label: "30 min", minutes: 30, icon: "📺" },
  { label: "45 min", minutes: 45, icon: "📺" },
  { label: "1 heure", minutes: 60, icon: "🎮" },
  { label: "2 heures", minutes: 120, icon: "🎮" },
];

const CHILD_TASK_TEMPLATES = [
  { icon: "🛏️", title: "Faire son lit", minutes: 5, minutesLabel: "+5 min" },
  { icon: "🍽️", title: "Débarrasser la table", minutes: 10, minutesLabel: "+10 min" },
  { icon: "🧹", title: "Ranger sa chambre", minutes: 15, minutesLabel: "+15 min" },
  { icon: "🪥", title: "Brosser les dents", minutes: 5, minutesLabel: "+5 min" },
  { icon: "🍽️", title: "Mettre la table", minutes: 10, minutesLabel: "+10 min" },
  { icon: "⭐", title: "Ranger la salle de jeux", minutes: 10, minutesLabel: "+10 min" },
  { icon: "🧦", title: "Plier les chaussettes", minutes: 20, minutesLabel: "+20 min" },
  { icon: "👕", title: "Mettre son pyjama", minutes: 5, minutesLabel: "+5 min" },
  { icon: "⭐", title: "Fermer ses volets", minutes: 15, minutesLabel: "+15 min" },
  { icon: "⭐", title: "Autre", minutes: 10, minutesLabel: "0-600 min" },
];

const DEFAULT_REWARDS = {
  work: [
    { icon: "📚", title: "Bonne note à l'école", minutes: "+15-30 min", requestMinutes: 20 },
    { icon: "⭐", title: "Bonus", minutes: "+30-40 min", requestMinutes: 30 },
    { icon: "🎒", title: "Faire son sac", minutes: "+10 min", requestMinutes: 10 },
    { icon: "⏰", title: "Se lever tout seul", minutes: "+10 min", requestMinutes: 10 },
    { icon: "📝", title: "Faire tous les devoirs d'un jour", minutes: "+20 min", requestMinutes: 20 },
  ],
  bonus: [
    { icon: "⚽", title: "Entraînement sport", minutes: "+30-180 min", requestMinutes: 60 },
    { icon: "⭐", title: "Bon match", minutes: "+30-180 min", requestMinutes: 60 },
    { icon: "⭐", title: "Séance de sport", minutes: "+5-60 min", requestMinutes: 30 },
  ],
};

function ScreenTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-10 rounded-full px-3 text-xs font-black transition ${
        active ? "bg-[#3b3269] text-white" : "text-white/65"
      }`}
    >
      {children}
    </button>
  );
}

function RewardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-lg font-black italic text-white">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function RewardTile({
  icon,
  title,
  minutes,
  tone,
  onClick,
}: {
  icon: string;
  title: string;
  minutes: string;
  tone: "green" | "amber" | "red";
  onClick?: () => void;
}) {
  const color = tone === "green" ? "text-[#83efb2]" : tone === "amber" ? "text-[#ffd38a]" : "text-[#ff7b72]";
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-24 rounded-2xl border border-[#3a3463] bg-[#211d3d] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#83efb2]"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#34305a] text-lg">{icon}</span>
      <p className="mt-2 line-clamp-2 text-sm font-black text-white">{title}</p>
      <p className={`font-serif text-xl font-black italic ${color}`}>{minutes}</p>
    </button>
  );
}

function EmptyScreenTile({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#4a436f] bg-[#17142c] p-5 text-center text-sm font-bold text-white/45">
      {text}
    </div>
  );
}

function ScreenListTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-serif text-lg font-black italic text-white">
      <span>{icon}</span>
      {title}
    </h2>
  );
}

function AvatarBubble({
  member,
  size = "md",
  centered = false,
}: {
  member?: AppData["familyMembers"][number];
  size?: "md" | "lg" | "xl";
  centered?: boolean;
}) {
  const sizeClass = size === "xl" ? "h-20 w-20" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <span className={`inline-flex ${sizeClass} overflow-hidden rounded-full bg-[#34305a] shadow-sm ${centered ? "mx-auto" : ""}`}>
      {member?.photoUrl ? (
        <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
      ) : (
        <span className={`flex h-full w-full items-center justify-center text-sm font-black ${member?.color ?? "text-white"}`}>
          {member?.name.slice(0, 1).toUpperCase() ?? "?"}
        </span>
      )}
    </span>
  );
}

function formatMinutesAsTime(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  return `${hours}h${String(remaining).padStart(2, "0")}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

function guessTaskIcon(title: string) {
  const value = title.toLowerCase();
  if (value.includes("lit")) return "🛏️";
  if (value.includes("table")) return "🍽️";
  if (value.includes("dent")) return "🪥";
  if (value.includes("sac") || value.includes("cartable")) return "🎒";
  if (value.includes("chambre")) return "🧹";
  if (value.includes("pyjama")) return "👕";
  if (value.includes("chauss")) return "🧦";
  return "⭐";
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRewardMinutes(data: AppData, memberId: string) {
  const taskMinutes = data.tasks
    .filter((task) => task.personId === memberId && task.done)
    .reduce((total, task) => total + (task.rewardMinutes ?? 0), 0);
  const transactionMinutes = (data.screenTimeTransactions ?? [])
    .filter((transaction) => transaction.childId === memberId)
    .reduce((total, transaction) => total + transaction.minutes, 0);
  return Math.max(0, taskMinutes + transactionMinutes);
}

function getClothingAdvice(temperature: number, condition: "sun" | "rain") {
  if (condition === "rain") return "Veste imperméable et chaussures adaptées.";
  if (temperature <= 8) return "Manteau, bonnet et chaussures chaudes.";
  if (temperature <= 16) return "Veste chaude conseillée.";
  return "Veste légère suffisante.";
}

function getHourlyEmoji(rain: number) {
  if (rain >= 65) return "🌧️";
  if (rain >= 30) return "🌦️";
  return "☀️";
}

function ForecastPill({ hour }: { hour: HourlyForecast }) {
  return (
    <span className="flex min-w-14 flex-col items-center rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-1.5 text-xs font-black text-white shadow-sm">
      <span>{hour.time}</span>
      <span className="text-xl leading-5">{getHourlyEmoji(hour.rain)}</span>
    </span>
  );
}

function RewardCounter({ data, memberId }: { data: AppData; memberId: string }) {
  const member = data.familyMembers.find((item) => item.id === memberId);
  const minutes = getRewardMinutes(data, memberId);

  return (
    <div className="rounded-3xl border border-[#3a3463] bg-[#17142c] p-5 text-white">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ffd38a]">Temps gagné</p>
      <p className="mt-3 font-serif text-5xl font-black text-[#ffd38a]">{minutes}</p>
      <p className="mt-1 text-lg font-bold text-white/60">minutes</p>
      <p className="mt-4 rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 text-sm font-bold text-white/75">
        {member?.name ?? "Enfant"} gagne du temps quand ses tâches sont validées.
      </p>
    </div>
  );
}

function isChildMember(data: AppData, memberId: string) {
  const memberIndex = data.familyMembers.findIndex((member) => member.id === memberId);
  if (memberIndex >= 0) {
    const member = data.familyMembers[memberIndex];
    const value = `${member.id} ${member.name}`.toLowerCase();
    if (value.includes("papa") || value.includes("maman") || value.includes("parent")) return false;
    if (value.includes("enfant")) return true;
    return memberIndex >= 2;
  }

  const value = memberId.toLowerCase();
  return value.includes("enfant");
}

function Panel({
  id,
  title,
  icon,
  children,
  onExpand,
  className = "",
}: {
  id: PanelId;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onExpand: (panel: PanelId) => void;
  className?: string;
}) {
  return (
    <article
      onClick={() => onExpand(id)}
      className={`min-h-0 cursor-pointer rounded-[1.5rem] border border-[#3a3463] bg-[#1d1935] p-4 shadow-glass ${className}`}
    >
      <button
        onClick={() => onExpand(id)}
        className="mb-3 flex w-full items-center gap-3 text-left"
        title={`Ouvrir ${title} en grand`}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#34305a] text-[#ffd38a] [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <h2 className="flex-1 text-lg font-black text-white">{title}</h2>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#17142c] text-white/55">
          <Expand className="h-4 w-4" />
        </span>
      </button>
      <div className="min-h-0 overflow-hidden" onClick={(event) => event.stopPropagation()}>{children}</div>
    </article>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151229]/75 p-4 backdrop-blur-sm">
      <section className={`max-h-[92vh] w-full overflow-auto rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-5 text-white shadow-glass ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34305a] text-white" title="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function getPanelTitle(panel: PanelId) {
  const titles: Record<PanelId, string> = {
    calendar: "Calendrier",
    tasks: "Tâches",
    weather: "Météo de Gorcy",
    shopping: "Courses",
    budget: "Budget",
    quote: "Phrase du jour",
    thanks: "Merci",
  };
  return titles[panel];
}

function renderExpandedPanel(
  panel: PanelId,
  data: AppData,
  onDataChange: (data: AppData) => void,
  selectedMemberId: string | null,
) {
  switch (panel) {
    case "calendar":
      return <FamilyCalendar data={data} onDataChange={onDataChange} selectedMemberId={selectedMemberId} expanded />;
    case "tasks":
      return <TaskBoard data={data} onDataChange={onDataChange} selectedMemberId={selectedMemberId} expanded />;
    case "weather":
      return <WeatherCard weather={data.weather} />;
    case "shopping":
      return <ShoppingList data={data} onDataChange={onDataChange} expanded />;
    case "budget":
      if (selectedMemberId) {
        const member = data.familyMembers.find((item) => item.id === selectedMemberId);
        if (member && isChildMember(data, member.id)) {
          return <RewardCounter data={data} memberId={selectedMemberId} />;
        }
      }
      return <BudgetCard data={data} onDataChange={onDataChange} />;
    case "quote":
      return <PositiveQuote data={data} onDataChange={onDataChange} />;
    case "thanks":
      return <DailyThanks data={data} onDataChange={onDataChange} />;
  }
}



