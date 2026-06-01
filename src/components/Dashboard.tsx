import {
  CalendarDays,
  CheckSquare,
  CheckCircle2,
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
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#fff7ed_72%,#f8fafc_100%)] px-3 py-3 text-slate-900 sm:px-5">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3">
        <header className="flex shrink-0 flex-col gap-3 rounded-[1.4rem] border border-white/70 bg-white/70 px-4 py-3 shadow-glass backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-36 text-lg font-black capitalize text-slate-800">{now}</p>
            {nextHours.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nextHours.map((hour) => <ForecastPill key={hour.time} hour={hour} />)}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onBackToChooser && (
              <button onClick={onBackToChooser} className="icon-button" title="Changer d'espace">
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
                className={`inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-offset-2 transition ${
                  selectedMemberId === member.id ? "ring-4 ring-slate-950" : "ring-0 hover:ring-2 hover:ring-slate-200"
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
              className="icon-button"
              title="Options famille"
            >
              <Settings className="h-5 w-5" />
            </button>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              <RefreshCw className="h-4 w-4" />
              {syncStatus}
            </span>
            <button
              onClick={toggleTabletMode}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-xl text-white transition hover:bg-slate-700"
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
    <div className="min-h-0 rounded-3xl bg-white/50 p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm font-bold text-slate-500">{empty}</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white/75 px-3 py-2 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-black text-slate-950">{item.title}</p>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-800">{item.time}</span>
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
            <div key={member.id} className="min-h-0 rounded-3xl bg-white/50 p-3">
              <MemberMini data={data} memberId={member.id} />
              <div className="mt-2 space-y-1.5">
                {memberTasks.length === 0 ? (
                  <p className="text-xs font-bold text-slate-500">Aucune tâche</p>
                ) : (
                  memberTasks.map((task) => (
                    <p key={task.id} className="line-clamp-2 rounded-2xl bg-white/70 px-3 py-2 text-sm font-bold text-slate-800">
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
      <div className="rounded-3xl bg-white/60 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Aujourd'hui</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-5xl font-black text-slate-950">{data.weather.temperature}°C</p>
          <CloudSun className="h-12 w-12 text-amber-500" />
        </div>
        <p className="mt-2 text-sm font-bold text-slate-600">{data.weather.label ?? (data.weather.condition === "rain" ? "Pluie" : "Soleil")} · vent {data.weather.windKmh} km/h</p>
      </div>
      <div className="rounded-3xl bg-slate-950 p-4 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">Conseil enfants</p>
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
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white/70 px-3 py-2">
            {item.photoUrl ? <img src={item.photoUrl} alt={item.label} className="h-9 w-9 rounded-xl object-cover" /> : <ShoppingBasket className="h-5 w-5 text-slate-400" />}
            <span className="line-clamp-1 text-sm font-black text-slate-800">{item.label}</span>
          </div>
        ))}
        {todo.length === 0 && <p className="rounded-2xl bg-white/60 px-3 py-3 text-sm font-bold text-slate-500">Liste vide</p>}
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
    <div className="h-full rounded-3xl bg-white/50 p-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <MetricPill label="Budget" value={`${data.budget.monthlyTotal}€`} />
        <MetricPill label="Dépensé" value={`${spent}€`} />
        <MetricPill label="Reste" value={`${remaining}€`} />
      </div>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-right text-sm font-black text-slate-600">{percent}% utilisé</p>
    </div>
  );
}

function RewardSummary({ data, memberId }: { data: AppData; memberId: string }) {
  const minutes = getRewardMinutes(data, memberId);
  const remainingTasks = data.tasks.filter((task) => task.personId === memberId && !task.done);

  return (
    <div className="grid h-full min-h-0 gap-3">
      <div className="rounded-3xl bg-amber-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Temps écran gagné</p>
        <p className="mt-2 text-5xl font-black text-slate-950">{minutes} min</p>
      </div>
      <div className="rounded-3xl bg-white/60 p-4">
        <p className="text-sm font-black text-slate-700">{remainingTasks.length} tâche(s) pour gagner du temps</p>
      </div>
    </div>
  );
}

function QuoteSummary({ data }: { data: AppData }) {
  return <p className="line-clamp-3 rounded-3xl bg-white/50 p-4 text-xl font-black leading-tight text-slate-950">{data.positiveQuote}</p>;
}

function ThanksSummary({ data }: { data: AppData }) {
  return (
    <div className="space-y-2">
      {data.thanksMessages.slice(0, 2).map((message) => (
        <div key={message.id} className="rounded-2xl bg-white/60 px-3 py-2">
          <p className="line-clamp-2 text-sm font-bold text-slate-800">{message.text}</p>
          <p className="mt-1 text-xs font-black text-rose-500">{message.author}</p>
        </div>
      ))}
      {data.thanksMessages.length === 0 && <p className="rounded-2xl bg-white/60 px-3 py-3 text-sm font-bold text-slate-500">Aucun merci pour l'instant</p>}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white/75 px-3 py-2 text-center shadow-sm">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function MemberMini({ data, memberId }: { data: AppData; memberId: string }) {
  const member = data.familyMembers.find((item) => item.id === memberId);
  if (!member) return null;

  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-xs font-black text-slate-800 shadow-sm">
      <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white">
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
    <main className="min-h-screen bg-[#0d3028] pb-28 text-white">
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#123c33]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-glass backdrop-blur-2xl">
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
        active ? "bg-white text-[#0d3028]" : "bg-white/10 text-white/60"
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
      return isChild ? <ChildScreenTimePanel data={data} memberId={memberId} onDataChange={onDataChange} /> : <BudgetCard data={data} onDataChange={onDataChange} />;
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
    { label: "Courses", tab: "shopping", icon: <ShoppingBasket />, badge: shoppingCount, className: "from-emerald-200 to-cyan-100" },
    { label: "Calendrier", tab: "calendar", icon: <CalendarDays />, badge: calendarCount, className: "from-amber-200 to-yellow-100" },
    { label: "Tâches", tab: "tasks", icon: <CheckSquare />, badge: todoTasks.length, className: "from-teal-200 to-emerald-100" },
    { label: isChild ? "Temps" : "Budget", tab: "budget", icon: isChild ? <TimerReset /> : <PiggyBank />, badge: isChild ? `${minutes}m` : undefined, className: "from-rose-200 to-orange-100" },
    { label: isChild ? "Routines" : "Todo", tab: isChild ? "tasks" : "todo", icon: <ListTodo />, className: "from-sky-200 to-cyan-100" },
    { label: "Météo", tab: "weather", icon: <SunMedium />, badge: `${data.weather.temperature}°`, className: "from-yellow-200 to-orange-100" },
    { label: "Merci", tab: "thanks", icon: <Heart />, badge: thanksCount, className: "from-pink-200 to-rose-100" },
  ];

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-100/70">Happy Family</p>
        <h1 className="mt-2 text-4xl font-black leading-tight text-white">Bonjour {memberName}</h1>
        <button
          onClick={() => onTabChange("home")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-lg font-bold text-white"
        >
          <Home className="h-5 w-5" />
          Happy Family
        </button>
      </div>

      <section className="rounded-[2rem] bg-white/10 p-4 backdrop-blur-xl">
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
              className={`relative min-h-36 overflow-hidden rounded-[1.4rem] bg-gradient-to-br ${tile.className} p-4 text-left text-slate-950 shadow-lg`}
            >
              <p className="relative z-10 text-2xl font-black leading-tight">{tile.label}</p>
              {tile.badge !== undefined && tile.badge !== 0 && (
                <span className="absolute left-4 bottom-4 z-10 rounded-full bg-white/50 px-3 py-1.5 text-sm font-black">
                  {tile.badge}
                </span>
              )}
              <span className="absolute -bottom-3 -right-3 rounded-full bg-white/30 p-8 text-slate-900/75 [&_svg]:h-16 [&_svg]:w-16">
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
  const minutes = getRewardMinutes(data, memberId);
  const todoTasks = data.tasks.filter((task) => task.personId === memberId && !task.done);
  const doneTasks = data.tasks.filter((task) => task.personId === memberId && task.done);

  function reactivateTask(taskId: string) {
    onDataChange({
      ...data,
      tasks: data.tasks.map((task) => task.id === taskId ? { ...task, done: false, completedAt: undefined } : task),
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] bg-[#123c33] p-5 text-white">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-100/70">Temps écran</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-6xl font-black">{minutes}</p>
            <p className="text-lg font-bold text-emerald-100/80">minutes disponibles</p>
          </div>
          <TimerReset className="h-14 w-14 text-amber-300" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-white/70 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
            <CheckSquare className="h-5 w-5" />
            À faire pour gagner du temps
          </h2>
          <div className="space-y-2">
            {todoTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                <p className="font-black text-slate-950">{task.title}</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">+{task.rewardMinutes ?? 0} min</p>
              </div>
            ))}
            {todoTasks.length === 0 && <p className="text-sm font-bold text-slate-500">Plus rien à faire pour le moment.</p>}
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
            <CheckCircle2 className="h-5 w-5" />
            Déjà gagnées
          </h2>
          <div className="space-y-2">
            {doneTasks.slice(0, 6).map((task) => (
              <button
                key={task.id}
                onClick={() => reactivateTask(task.id)}
                className="w-full rounded-2xl bg-emerald-50 px-3 py-3 text-left shadow-sm"
              >
                <p className="font-black text-slate-950">{task.title}</p>
                <p className="mt-1 text-sm font-bold text-emerald-700">+{task.rewardMinutes ?? 0} min · cliquer pour remettre à faire</p>
              </button>
            ))}
            {doneTasks.length === 0 && <p className="text-sm font-bold text-slate-500">Aucune tâche validée.</p>}
          </div>
        </div>
      </div>

      <TaskBoard data={data} onDataChange={onDataChange} selectedMemberId={memberId} expanded />
    </div>
  );
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRewardMinutes(data: AppData, memberId: string) {
  return data.tasks
    .filter((task) => task.personId === memberId && task.done)
    .reduce((total, task) => total + (task.rewardMinutes ?? 0), 0);
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
    <span className="flex min-w-14 flex-col items-center rounded-2xl bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
      <span>{hour.time}</span>
      <span className="text-xl leading-5">{getHourlyEmoji(hour.rain)}</span>
    </span>
  );
}

function RewardCounter({ data, memberId }: { data: AppData; memberId: string }) {
  const member = data.familyMembers.find((item) => item.id === memberId);
  const minutes = getRewardMinutes(data, memberId);

  return (
    <div className="rounded-3xl bg-white/50 p-5">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Temps gagné</p>
      <p className="mt-3 text-5xl font-black text-slate-950">{minutes}</p>
      <p className="mt-1 text-lg font-bold text-slate-600">minutes</p>
      <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
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
      className={`glass-panel min-h-0 cursor-pointer rounded-[1.5rem] p-4 ${className}`}
    >
      <button
        onClick={() => onExpand(id)}
        className="mb-3 flex w-full items-center gap-3 text-left"
        title={`Ouvrir ${title} en grand`}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <h2 className="flex-1 text-lg font-black text-slate-950">{title}</h2>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section className={`max-h-[92vh] w-full overflow-auto rounded-[2rem] bg-slate-50 p-5 shadow-glass ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <button onClick={onClose} className="icon-button" title="Fermer">
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



