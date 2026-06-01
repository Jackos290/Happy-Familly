import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  CloudSun,
  Expand,
  Heart,
  Home,
  ListTodo,
  PiggyBank,
  RefreshCw,
  Settings,
  ShoppingBasket,
  SunMedium,
  TimerReset,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AppData, Weather } from "../types";
import { createId } from "../utils/localStorage";
import type { HourlyForecast } from "../utils/weather";
import { fetchGorcyForecast } from "../utils/weather";
import BudgetCard from "./BudgetCard";
import DailyThanks from "./DailyThanks";
import FamilyCalendar from "./FamilyCalendar";
import FamilySettings from "./FamilySettings";
import GoogleCalendarSync from "./GoogleCalendarSync";
import ParentTodoList from "./ParentTodoList";
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

type PanelId = "calendar" | "tasks" | "weather" | "shopping" | "budget" | "thanks";
type PersonalTab = "home" | "calendar" | "tasks" | "todo" | "shopping" | "budget" | "screenTime" | "weather" | "thanks";

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
  const [lockedPanel, setLockedPanel] = useState<PanelId | null>(null);
  const [nextHours, setNextHours] = useState<HourlyForecast[]>([]);
  const [salonWeather, setSalonWeather] = useState<Weather>(data.weather);
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

  function keepFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
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
        setSalonWeather(forecast.today);
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
  const canEditPins = accessMode === "member" && Boolean(selectedMember && !isChildMember(data, selectedMember.id));

  function openPanel(panel: PanelId) {
    if (accessMode === "dashboard" && selectedMember) {
      setLockedPanel(panel);
      return;
    }
    setExpandedPanel(panel);
  }

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
            <FamilySettings data={data} onDataChange={onDataChange} canEditPins={canEditPins} editableMemberId={selectedMember.id} canEditAll={canEditPins} />
          </Modal>
        )}
      </PersonalApp>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-[#151229] px-3 py-3 text-white sm:px-5">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-3">
        <header className="flex min-h-[5.25rem] shrink-0 items-center justify-between gap-3 overflow-hidden rounded-[1.4rem] border border-[#3a3463] bg-[#1d1935] px-4 py-3 shadow-glass backdrop-blur-2xl lg:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            <p className="shrink-0 font-serif text-xl font-black italic capitalize text-[#ffd38a]">{now}</p>
            {nextHours.length > 0 && (
              <div className="flex min-w-0 gap-2 overflow-hidden">
                {nextHours.map((hour) => <ForecastPill key={hour.time} hour={hour} />)}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
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
        <section className="grid min-h-0 flex-1 auto-rows-fr gap-3 overflow-hidden lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_minmax(0,0.62fr)]">
          <Panel id="calendar" className="lg:col-span-5" icon={<CalendarDays />} title="Calendrier" onExpand={openPanel}>
            <CalendarSummary data={data} selectedMemberId={selectedMemberId} />
          </Panel>

          <Panel id="tasks" className="lg:col-span-4" icon={<CheckSquare />} title="Tâches" onExpand={openPanel}>
            <TasksSummary data={data} selectedMemberId={selectedMemberId} />
          </Panel>

          <Panel id="weather" className="lg:col-span-3" icon={<SunMedium />} title="Météo Gorcy" onExpand={openPanel}>
            <WeatherSummary weather={salonWeather} />
          </Panel>

          <Panel id="shopping" className="lg:col-span-4" icon={<ShoppingBasket />} title="Courses" onExpand={openPanel}>
            <ShoppingSummary data={data} />
          </Panel>

          <Panel id="budget" className="lg:col-span-4" icon={<PiggyBank />} title={selectedMemberIsChild ? "Récompenses" : "Budget"} onExpand={openPanel}>
            {selectedMemberIsChild && selectedMemberId ? (
              <RewardSummary data={data} memberId={selectedMemberId} />
            ) : (
              <BudgetSummary data={data} />
            )}
          </Panel>

          <div className="grid min-h-0 gap-3 overflow-hidden lg:col-span-4">
            <Panel id="thanks" icon={<Heart />} title="Merci" onExpand={openPanel}>
              <ThanksSummary data={data} />
            </Panel>
          </div>
        </section>
      </div>

      {settingsOpen && (
        <Modal title="Options famille" onClose={() => setSettingsOpen(false)}>
          <FamilySettings data={data} onDataChange={onDataChange} canEditPins={canEditPins} />
        </Modal>
      )}

      {lockedPanel && selectedMember && (
        <PanelPinGate
          member={selectedMember}
          title={getPanelTitle(lockedPanel)}
          onCancel={() => setLockedPanel(null)}
          onUnlock={() => {
            setExpandedPanel(lockedPanel);
            setLockedPanel(null);
          }}
        />
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
    <div className="grid h-full min-h-0 grid-cols-2 items-stretch gap-3">
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
    <div className="flex min-h-0 flex-col justify-center overflow-auto rounded-3xl border border-[#3a3463] bg-[#17142c] p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">{title}</p>
      <div className="max-h-full space-y-2 overflow-auto pr-1">
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
    <div className="flex h-full min-h-0 flex-col justify-center gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="À faire" value={todoTasks.length} />
        <MetricPill label="Faites" value={doneTasks.length} />
      </div>
      <div className="grid min-h-0 max-h-[76%] grid-cols-2 gap-2 overflow-auto pr-1">
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

function WeatherSummary({ weather }: { weather: Weather }) {
  return (
    <div className="grid h-full min-h-0 content-center gap-3">
      <div className="rounded-3xl border border-[#3a3463] bg-[#211d3d] p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Aujourd'hui</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-5xl font-black text-white">{weather.temperature}°C</p>
          <CloudSun className="h-12 w-12 text-[#ffd38a]" />
        </div>
        <p className="mt-2 text-sm font-bold text-white/60">{weather.label ?? (weather.condition === "rain" ? "Pluie" : "Soleil")} · max {weather.maxTemperature ?? weather.temperature}°C · vent {weather.windKmh} km/h</p>
      </div>
      <div className="rounded-3xl border border-[#3a3463] bg-[#17142c] p-4 text-white">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffd38a]">Conseil enfants</p>
        <p className="mt-2 text-base font-black">{getClothingAdvice(weather.temperature, weather.condition)}</p>
      </div>
    </div>
  );
}

function ShoppingSummary({ data }: { data: AppData }) {
  const todo = data.shoppingItems.filter((item) => !item.checked);
  const done = data.shoppingItems.filter((item) => item.checked);

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricPill label="À acheter" value={todo.length} />
        <MetricPill label="Déjà pris" value={done.length} />
      </div>
      <div className="min-h-0 max-h-[68%] space-y-2 overflow-auto pr-1">
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
  const recurringTotal = (data.budget.recurringExpenses ?? []).reduce((total, expense) => total + expense.amount, 0);
  const spent = data.budget.expenses.reduce((total, expense) => total + expense.amount, 0) + recurringTotal;
  const incomeTotal = Object.values(data.budget.parentIncomes ?? {}).reduce((total, value) => total + value, 0) + (data.budget.jointAccountStart ?? 0);
  const total = incomeTotal || data.budget.monthlyTotal || 1;
  const percent = Math.min(100, Math.round((spent / total) * 100));
  const color = percent < 70 ? "bg-emerald-500" : percent < 90 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="flex h-full flex-col justify-center rounded-3xl border border-[#3a3463] bg-[#17142c] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Budget mensuel</p>
      <div className="mt-4 h-7 overflow-hidden rounded-full bg-[#34305a]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-right font-serif text-3xl font-black text-[#ffd38a]">{percent}%</p>
      <p className="text-right text-sm font-bold text-white/45">détails en ouvrant le bloc</p>
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

function ThanksSummary({ data }: { data: AppData }) {
  const children = data.familyMembers.filter((member) => isChildMember(data, member.id));

  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-2">
      {children.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {children.slice(0, 2).map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2">
              <AvatarBubble member={member} />
              <div className="min-w-0 text-right">
                <p className="truncate text-xs font-black text-white">{member.name}</p>
                <p className="font-serif text-lg font-black text-[#ffd38a]">{formatMinutesAsTime(getRewardMinutes(data, member.id))}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2 overflow-hidden">
        {data.thanksMessages.slice(0, 1).map((message) => (
          <div key={message.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-2">
            <p className="line-clamp-2 text-sm font-bold text-white/85">{message.text}</p>
            <p className="mt-1 text-xs font-black text-[#ffd38a]">{message.author}</p>
          </div>
        ))}
        {data.thanksMessages.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-3 py-3 text-sm font-bold text-white/45">Aucun merci pour l'instant</p>}
      </div>
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
  const isHome = tab === "home";

  return (
    <main className="min-h-screen bg-[#151229] pb-4 text-white">
      <div className={`mx-auto flex max-w-3xl flex-col gap-4 px-4 ${isHome ? "py-4" : "py-4"}`}>
        {!isHome && (
          <button
            onClick={() => onTabChange("home")}
            className="sticky top-3 z-30 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-glass backdrop-blur-2xl"
            title="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <section className={tab === "home" ? "" : "rounded-[1.75rem] border border-white/70 bg-white/90 p-4 text-slate-900 shadow-glass backdrop-blur-2xl"}>
          {renderPersonalTab(tab, data, onDataChange, memberId, isChild, memberName, onTabChange, onOpenSettings, onBackToChooser)}
        </section>
      </div>

      {children}
    </main>
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
  onOpenSettings: () => void,
  onBackToChooser?: () => void,
) {
  switch (tab) {
    case "calendar":
      return (
        <div className="space-y-4">
          {!isChild && <GoogleCalendarSync data={data} memberId={memberId} onDataChange={onDataChange} />}
          <FamilyCalendar data={data} onDataChange={onDataChange} selectedMemberId={null} expanded />
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
        <BudgetCard data={data} onDataChange={onDataChange} />
      );
    case "screenTime":
      return isChild ? (
        <ChildScreenTimePanel data={data} memberId={memberId} onDataChange={onDataChange} />
      ) : (
        <ParentScreenTimeManager data={data} onDataChange={onDataChange} />
      );
    case "weather":
      return <WeatherCard weather={data.weather} />;
    case "thanks":
      return <DailyThanks data={data} onDataChange={onDataChange} />;
    case "home":
      return <LauncherHome data={data} memberId={memberId} memberName={memberName} isChild={isChild} onTabChange={onTabChange} onOpenSettings={onOpenSettings} onBackToChooser={onBackToChooser} />;
  }
}

function LauncherHome({
  data,
  memberId,
  memberName,
  isChild,
  onTabChange,
  onOpenSettings,
  onBackToChooser,
}: {
  data: AppData;
  memberId: string;
  memberName: string;
  isChild: boolean;
  onTabChange: (tab: PersonalTab) => void;
  onOpenSettings: () => void;
  onBackToChooser?: () => void;
}) {
  const todoTasks = data.tasks.filter((task) => task.personId === memberId && !task.done);
  const calendarCount = data.calendarEvents.filter((event) => event.personId === memberId || !event.personId).length;
  const shoppingCount = data.shoppingItems.filter((item) => !item.checked).length;
  const thanksCount = data.thanksMessages.length;
  const minutes = getRewardMinutes(data, memberId);
  const [launcherWeather, setLauncherWeather] = useState<Weather>(data.weather);

  useEffect(() => {
    let mounted = true;
    fetchGorcyForecast()
      .then((forecast) => {
        if (mounted) setLauncherWeather(forecast.today);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);
  const tiles: Array<{
    label: string;
    tab: PersonalTab;
    icon: ReactNode;
    badge?: number | string;
    className: string;
  }> = [
    { label: "Courses", tab: "shopping", icon: <ShoppingBasket />, badge: shoppingCount, className: "from-[#272247] to-[#1d1935] border-[#4b4075]" },
    { label: "Calendrier", tab: "calendar", icon: <CalendarDays />, badge: calendarCount, className: "from-[#302957] to-[#211d3d] border-[#5f528a]" },
    { label: "Tâches", tab: "tasks", icon: <CheckSquare />, badge: todoTasks.length, className: "from-[#272247] to-[#1d1935] border-[#4b4075]" },
    { label: isChild ? "Temps" : "Budget", tab: "budget", icon: isChild ? <TimerReset /> : <PiggyBank />, badge: isChild ? `${minutes}m` : undefined, className: "from-[#342c5f] to-[#211d3d] border-[#6c5a98]" },
    ...(!isChild ? [{ label: "Temps", tab: "screenTime" as PersonalTab, icon: <TimerReset />, className: "from-[#272247] to-[#1d1935] border-[#4b4075]" }] : []),
    { label: isChild ? "Routines" : "Todo", tab: isChild ? "tasks" : "todo", icon: <ListTodo />, className: "from-[#272247] to-[#1d1935] border-[#4b4075]" },
    { label: "Météo", tab: "weather", icon: <SunMedium />, badge: `${launcherWeather.temperature}°`, className: "from-[#302957] to-[#211d3d] border-[#5f528a]" },
    { label: "Merci", tab: "thanks", icon: <Heart />, badge: thanksCount, className: "from-[#272247] to-[#1d1935] border-[#4b4075]" },
  ];

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-lg font-black italic text-[#ffd38a]">Famille</p>
            <h1 className="mt-2 text-4xl font-black leading-tight text-white">Bonjour {memberName}</h1>
          </div>
          {onBackToChooser && (
            <button onClick={onBackToChooser} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 text-sm font-black text-white">
              Changer
            </button>
          )}
        </div>
      </div>

      <section className="rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black text-white">Mes applications</h2>
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
            }}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#34305a] text-[#ffd38a]"
            title="Options"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <button
              key={`${tile.label}-${tile.tab}`}
              onClick={() => onTabChange(tile.tab)}
              className={`group relative min-h-40 overflow-hidden rounded-[1.5rem] border ${tile.className} bg-gradient-to-br text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:border-[#ffd38a]`}
            >
              <span className="pointer-events-none absolute -bottom-10 -right-8 h-36 w-36 rounded-full bg-white/10 transition group-hover:scale-110" />
              <span className="pointer-events-none absolute -top-16 left-8 h-32 w-32 rounded-full bg-[#ffd38a]/10 blur-xl" />
              <span className="absolute bottom-4 right-4 rounded-[1.25rem] bg-[#ffd38a]/10 p-3 text-[#ffd38a] [&_svg]:h-14 [&_svg]:w-14">
                {tile.icon}
              </span>
              <p className="absolute left-5 right-5 top-5 z-10 max-w-[8rem] text-2xl font-black leading-tight">{tile.label}</p>
              {tile.badge !== undefined && tile.badge !== 0 && (
                <span className="absolute left-4 bottom-4 z-10 min-w-9 rounded-full bg-[#ffd38a] px-3 py-1.5 text-center text-sm font-black text-[#151229]">
                  {tile.badge}
                </span>
              )}
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
  const [pendingReward, setPendingReward] = useState<{ label: string; minutes: number } | null>(null);
  const [funnyMessage, setFunnyMessage] = useState("");
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

  function confirmReward(label: string, rewardMinutes: number) {
    setPendingReward({ label, minutes: rewardMinutes });
  }

  function requestReward(label: string, rewardMinutes: number) {
    addScreenTimeRequest(label, rewardMinutes, "reward");
    setPendingReward(null);
    setFunnyMessage(getRandomKidMessage());
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
          {funnyMessage && (
            <div className="rounded-2xl border border-[#83efb2] bg-[#203c35] px-4 py-3 text-sm font-black text-[#83efb2]">
              {funnyMessage}
            </div>
          )}
          <RewardSection title="🔥 J'ai fait une tâche">
            {todoTasks.map((task) => (
              <RewardTile
                key={task.id}
                icon={guessTaskIcon(task.title)}
                title={task.title}
                minutes={`+${task.rewardMinutes ?? 0} min`}
                tone="green"
                onClick={() => confirmReward(task.title, task.rewardMinutes ?? 0)}
              />
            ))}
            {CHILD_TASK_TEMPLATES.map((task) => (
              <RewardTile
                key={`template-${task.title}`}
                icon={task.icon}
                title={task.title}
                minutes={task.minutesLabel}
                tone="green"
                onClick={() => confirmReward(task.title, task.minutes)}
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

      {pendingReward && (
        <ConfirmTaskModal
          label={pendingReward.label}
          minutes={pendingReward.minutes}
          onCancel={() => setPendingReward(null)}
          onConfirm={() => requestReward(pendingReward.label, pendingReward.minutes)}
        />
      )}
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

  function addBonus(childId: string, minutes: number) {
    onDataChange({
      ...data,
      screenTimeTransactions: [
        ...(data.screenTimeTransactions ?? []),
        {
          id: createId("screen-transaction"),
          childId,
          label: `Bonus parent ${minutes} min`,
          minutes,
          createdAt: new Date().toISOString(),
          type: "manual",
        },
      ],
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
              <div className="mt-3 grid grid-cols-3 gap-2">
                {PARENT_BONUS_BUTTONS.map((bonus) => (
                  <button
                    key={`${child.id}-${bonus.minutes}`}
                    type="button"
                    onClick={() => addBonus(child.id, bonus.minutes)}
                    className="rounded-xl bg-[#83efb2] px-2 py-2 text-xs font-black text-[#151229]"
                  >
                    +{bonus.label}
                  </button>
                ))}
              </div>
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

function ConfirmTaskModal({
  label,
  minutes,
  onCancel,
  onConfirm,
}: {
  label: string;
  minutes: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151229]/85 p-4 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-5 text-white shadow-glass">
        <button onClick={onCancel} className="ml-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#34305a]" title="Fermer">
          <X className="h-5 w-5" />
        </button>
        <p className="mt-2 font-serif text-xl font-black italic text-[#ffd38a]">Petite vérification</p>
        <h2 className="mt-2 text-2xl font-black">As-tu fait cette tâche correctement ?</h2>
        <p className="mt-3 rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 font-black">
          {label} · +{minutes} min
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="min-h-12 rounded-2xl border border-[#ff7b72] bg-[#3a243a] font-black text-[#ff7b72]">
            Pas encore
          </button>
          <button onClick={onConfirm} className="min-h-12 rounded-2xl bg-[#83efb2] font-black text-[#151229]">
            Oui !
          </button>
        </div>
      </section>
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

const PARENT_BONUS_BUTTONS = [
  { label: "30 min", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
];

const KID_SUCCESS_MESSAGES = [
  "Demande envoyée ! Les parents vont inspecter ça comme des experts du canapé.",
  "Bravo ! Une mission de plus dans la poche.",
  "Top ! Le comité parental va étudier ton exploit.",
  "Bien joué ! Même ton cartable est impressionné.",
  "Hop, demande envoyée. Ça sent le bonus mérité.",
  "Mission accomplie ! Tu peux faire une mini danse de victoire.",
  "Super boulot ! Les parents vont recevoir la preuve de ton courage.",
  "Ça part chez les parents. Suspense, tambours, confettis imaginaires.",
  "Bravo champion ! La demande file plus vite qu’une chaussette perdue.",
  "Très propre ! Les parents vont valider si tout brille.",
  "Demande envoyée. Ton futur temps d’écran croise les doigts.",
  "Waouh ! Même la table applaudit en silence.",
  "Bien joué ! Tu viens de gagner des points de sérieux.",
  "Mission envoyée au quartier général des parents.",
  "Nickel ! Le bonus est en route vers la validation.",
];

function getRandomKidMessage() {
  return KID_SUCCESS_MESSAGES[Math.floor(Math.random() * KID_SUCCESS_MESSAGES.length)];
}

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
      className={`flex min-h-0 cursor-pointer flex-col overflow-hidden rounded-[1.5rem] border border-[#3a3463] bg-[#1d1935] p-4 shadow-glass ${className}`}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onExpand(id);
        }}
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
      <div className="min-h-0 flex-1 overflow-auto pr-1" onClick={(event) => event.stopPropagation()}>{children}</div>
    </article>
  );
}

function PanelPinGate({
  member,
  title,
  onCancel,
  onUnlock,
}: {
  member: AppData["familyMembers"][number];
  title: string;
  onCancel: () => void;
  onUnlock: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const expectedPin = member.pinCode ?? "1234";

  function addDigit(digit: string) {
    setError("");
    setPin((current) => `${current}${digit}`.slice(0, 8));
  }

  function submitPin(nextPin = pin) {
    if (nextPin === expectedPin) {
      onUnlock();
      return;
    }
    setError("Code incorrect");
    setPin("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151229]/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-6 text-white shadow-glass">
        <div className="flex items-center gap-3">
          <AvatarBubble member={member} />
          <div>
            <p className="font-serif text-lg font-black italic text-[#ffd38a]">Code d'accès</p>
            <h2 className="text-2xl font-black">{title} · {member.name}</h2>
          </div>
        </div>
        <div className="mt-5 flex h-14 items-center justify-center rounded-2xl border border-[#3a3463] bg-[#17142c] text-3xl font-black tracking-[0.35em]">
          {pin ? "•".repeat(pin.length) : "----"}
        </div>
        {error && <p className="mt-3 text-sm font-black text-rose-300">{error}</p>}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button key={digit} type="button" onClick={() => addDigit(digit)} className="min-h-14 rounded-2xl bg-[#34305a] text-xl font-black">
              {digit}
            </button>
          ))}
          <button type="button" onClick={() => setPin((current) => current.slice(0, -1))} className="min-h-14 rounded-2xl bg-[#211d3d] text-2xl font-black" title="Supprimer le dernier chiffre">
            ⌫
          </button>
          <button type="button" onClick={() => addDigit("0")} className="min-h-14 rounded-2xl bg-[#34305a] text-xl font-black">
            0
          </button>
          <button type="button" onClick={() => submitPin()} className="min-h-14 rounded-2xl bg-[#ffd38a] text-lg font-black text-[#151229]">
            OK
          </button>
        </div>
        <button type="button" onClick={onCancel} className="mt-3 min-h-12 w-full rounded-2xl border border-[#3a3463] bg-[#211d3d] font-black text-white">
          Annuler
        </button>
      </section>
    </div>
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
    case "thanks":
      return <DailyThanks data={data} onDataChange={onDataChange} />;
  }
}



