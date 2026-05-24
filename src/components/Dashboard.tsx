import {
  CalendarDays,
  CheckSquare,
  Expand,
  Heart,
  Maximize2,
  PiggyBank,
  Quote,
  RefreshCw,
  Settings,
  ShieldCheck,
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
import PositiveQuote from "./PositiveQuote";
import ShoppingList from "./ShoppingList";
import TaskBoard from "./TaskBoard";
import WeatherCard from "./WeatherCard";

type DashboardProps = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  refreshKey: number;
  syncStatus: string;
};

type PanelId = "calendar" | "tasks" | "weather" | "shopping" | "budget" | "quote" | "thanks";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export default function Dashboard({ data, onDataChange, refreshKey, syncStatus }: DashboardProps) {
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [tabletModeActive, setTabletModeActive] = useState(false);
  const [tabletModeMessage, setTabletModeMessage] = useState("Prêt pour la tablette");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<PanelId | null>(null);
  const [nextHours, setNextHours] = useState<HourlyForecast[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const selectedMember = data.familyMembers.find((member) => member.id === selectedMemberId);

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

  async function activateTabletMode() {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    }

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
      void wakeLockRef.current?.release();
    };
  }, [tabletModeActive]);

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
  }, [selectedMemberId]);

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#fff7ed_72%,#f8fafc_100%)] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/60 px-5 py-4 shadow-glass backdrop-blur-2xl md:flex-row md:items-start md:justify-between md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Happy Familly
            </p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              Bonjour la famille
            </h1>
            <p className="mt-1 text-lg capitalize text-slate-600">{now}</p>
            {nextHours.length > 0 && (
              <div className="mt-3 flex max-w-3xl flex-wrap gap-2">
                {nextHours.map((hour) => (
                  <span
                    key={hour.time}
                    className="rounded-2xl bg-white/85 px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm"
                  >
                    {getHourlyEmoji(hour.rain)} {hour.time} · {hour.temperature}°C · pluie {hour.rain}%
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data.familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId((current) => (current === member.id ? null : member.id))}
                className={`inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-offset-2 transition ${
                  selectedMemberId === member.id ? "ring-4 ring-slate-950" : "ring-0 hover:ring-2 hover:ring-slate-200"
                }`}
                title={`Voir seulement ${member.name}`}
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
              onClick={activateTabletMode}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              {tabletModeActive ? <ShieldCheck className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              Mode tablette
            </button>
          </div>
        </header>
        <p className="sr-only" aria-live="polite">
          {tabletModeMessage}
        </p>
        {selectedMember && (
          <div className="flex items-center justify-between gap-3 rounded-3xl bg-slate-950 px-5 py-3 text-white shadow-glass">
            <p className="font-bold">Vue filtrée : {selectedMember.name}</p>
            <button
              onClick={() => setSelectedMemberId(null)}
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold transition hover:bg-white/25"
            >
              Tout le monde
            </button>
          </div>
        )}

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

          <Panel id="budget" className="lg:col-span-4" icon={<PiggyBank />} title="Budget" onExpand={setExpandedPanel}>
            <BudgetCard data={data} onDataChange={onDataChange} />
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

function getHourlyEmoji(rain: number) {
  if (rain >= 65) return "🌧️";
  if (rain >= 30) return "🌦️";
  return "☀️";
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
      return <BudgetCard data={data} onDataChange={onDataChange} />;
    case "quote":
      return <PositiveQuote data={data} onDataChange={onDataChange} />;
    case "thanks":
      return <DailyThanks data={data} onDataChange={onDataChange} />;
  }
}
