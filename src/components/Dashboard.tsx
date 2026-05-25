import {
  CalendarDays,
  CheckSquare,
  Expand,
  Heart,
  Home,
  ListTodo,
  PiggyBank,
  Quote,
  RefreshCw,
  Settings,
  ShoppingBasket,
  SunMedium,
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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#fff7ed_72%,#f8fafc_100%)] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-[1.5rem] border border-white/70 bg-white/60 px-4 py-3 shadow-glass backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between lg:px-6">
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
        <section className="grid auto-rows-fr gap-5 lg:grid-cols-12">
          <Panel id="calendar" className="lg:col-span-5" icon={<CalendarDays />} title="Calendrier" onExpand={setExpandedPanel}>
            <FamilyCalendar data={data} onDataChange={onDataChange} selectedMemberId={selectedMemberId} />
          </Panel>

          <Panel id="tasks" className="lg:col-span-4" icon={<CheckSquare />} title="Tâches" onExpand={setExpandedPanel}>
            <TaskBoard data={data} onDataChange={onDataChange} selectedMemberId={selectedMemberId} />
          </Panel>

          <Panel id="weather" className="lg:col-span-3" icon={<SunMedium />} title="Météo Gorcy" onExpand={setExpandedPanel}>
            <WeatherCard weather={data.weather} />
          </Panel>

          <Panel id="shopping" className="lg:col-span-4" icon={<ShoppingBasket />} title="Courses" onExpand={setExpandedPanel}>
            <ShoppingList data={data} onDataChange={onDataChange} />
          </Panel>

          <Panel id="budget" className="lg:col-span-4" icon={<PiggyBank />} title={selectedMemberIsChild ? "Récompenses" : "Budget"} onExpand={setExpandedPanel}>
            {selectedMemberIsChild && selectedMemberId ? (
              <RewardCounter data={data} memberId={selectedMemberId} />
            ) : (
              <BudgetCard data={data} onDataChange={onDataChange} />
            )}
          </Panel>

          <div className="grid gap-5 lg:col-span-4">
            <Panel id="quote" icon={<Quote />} title="Phrase du jour" onExpand={setExpandedPanel}>
              <PositiveQuote data={data} onDataChange={onDataChange} />
            </Panel>
            <Panel id="thanks" icon={<Heart />} title="Merci" onExpand={setExpandedPanel}>
              <DailyThanks data={data} onDataChange={onDataChange} />
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_38%,#fff7ed_100%)] pb-36 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
        <header className="sticky top-3 z-30 rounded-[1.5rem] border border-white/70 bg-white/80 p-3 shadow-glass backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <button onClick={onBackToChooser} className="icon-button h-11 w-11" title="Changer d'espace">
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
                <p className="truncate text-xl font-black text-slate-950">{memberName}</p>
                <p className="truncate text-xs font-bold text-slate-500">{syncStatus}</p>
              </div>
            </div>
            <button onClick={onOpenSettings} className="icon-button h-11 w-11" title="Options famille">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="rounded-[1.75rem] border border-white/70 bg-white/65 p-4 shadow-glass backdrop-blur-2xl">
          {renderPersonalTab(tab, data, onDataChange, memberId, isChild)}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-glass backdrop-blur-2xl">
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
        active ? "bg-slate-950 text-white" : "bg-white/70 text-slate-600"
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
      return isChild ? <RewardCounter data={data} memberId={memberId} /> : <BudgetCard data={data} onDataChange={onDataChange} />;
    case "weather":
      return <WeatherCard weather={data.weather} />;
    case "thanks":
      return <DailyThanks data={data} onDataChange={onDataChange} />;
    case "home":
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Aujourd'hui</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Mon espace</h1>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] bg-white/65 p-4">
              <h2 className="mb-3 text-lg font-black">Mes tâches</h2>
              <TaskBoard data={data} onDataChange={onDataChange} selectedMemberId={memberId} />
            </div>
            <div className="rounded-[1.5rem] bg-white/65 p-4">
              <h2 className="mb-3 text-lg font-black">Mon planning</h2>
              <FamilyCalendar data={data} onDataChange={onDataChange} selectedMemberId={memberId} />
            </div>
            <div className="rounded-[1.5rem] bg-white/65 p-4">
              <h2 className="mb-3 text-lg font-black">{isChild ? "Mon temps gagné" : "Budget famille"}</h2>
              {isChild ? <RewardCounter data={data} memberId={memberId} /> : <BudgetCard data={data} onDataChange={onDataChange} />}
            </div>
            {!isChild && (
              <div className="rounded-[1.5rem] bg-white/65 p-4">
                <h2 className="mb-3 text-lg font-black">Ma todo-list</h2>
                <ParentTodoList data={data} memberId={memberId} onDataChange={onDataChange} />
              </div>
            )}
          </div>
        </div>
      );
  }
}

function getHourlyEmoji(rain: number) {
  if (rain >= 65) return "🌧️";
  if (rain >= 30) return "🌦️";
  return "☀️";
}

function ForecastPill({ hour }: { hour: HourlyForecast }) {
  return (
    <span className="flex min-w-14 flex-col items-center rounded-2xl bg-white/85 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
      <span>{hour.time}</span>
      <span className="text-xl leading-5">{getHourlyEmoji(hour.rain)}</span>
    </span>
  );
}

function RewardCounter({ data, memberId }: { data: AppData; memberId: string }) {
  const member = data.familyMembers.find((item) => item.id === memberId);
  const minutes = data.tasks
    .filter((task) => task.personId === memberId && task.done)
    .reduce((total, task) => total + (task.rewardMinutes ?? 0), 0);

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
      className={`glass-panel cursor-pointer rounded-[1.75rem] p-5 ${className}`}
    >
      <button
        onClick={() => onExpand(id)}
        className="mb-4 flex w-full items-center gap-3 text-left"
        title={`Ouvrir ${title} en grand`}
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <h2 className="flex-1 text-xl font-bold text-slate-950">{title}</h2>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500">
          <Expand className="h-4 w-4" />
        </span>
      </button>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
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



