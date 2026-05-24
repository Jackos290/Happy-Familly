import {
  CalendarDays,
  CheckSquare,
  Heart,
  PiggyBank,
  Quote,
  RefreshCw,
  ShoppingBasket,
  SunMedium,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AppData } from "../types";
import BudgetCard from "./BudgetCard";
import DailyThanks from "./DailyThanks";
import FamilyCalendar from "./FamilyCalendar";
import PositiveQuote from "./PositiveQuote";
import ShoppingList from "./ShoppingList";
import TaskBoard from "./TaskBoard";
import WeatherCard from "./WeatherCard";

type DashboardProps = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function Dashboard({ data, onDataChange }: DashboardProps) {
  const now = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#fff7ed_72%,#f8fafc_100%)] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/65 px-5 py-5 shadow-glass backdrop-blur-2xl md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Bien sûr Ludo
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950 sm:text-4xl">
              Bonjour la famille
            </h1>
            <p className="mt-2 text-lg capitalize text-slate-600">{now}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data.familyMembers.map((member) => (
              <span
                key={member.id}
                className={`rounded-full px-4 py-2 text-sm font-bold ${member.color}`}
              >
                {member.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              <RefreshCw className="h-4 w-4" />
              1 min
            </span>
          </div>
        </header>

        <section className="grid auto-rows-fr gap-5 lg:grid-cols-12">
          <Panel className="lg:col-span-5" icon={<CalendarDays />} title="Calendrier">
            <FamilyCalendar data={data} onDataChange={onDataChange} />
          </Panel>

          <Panel className="lg:col-span-4" icon={<CheckSquare />} title="Tâches">
            <TaskBoard data={data} onDataChange={onDataChange} />
          </Panel>

          <Panel className="lg:col-span-3" icon={<SunMedium />} title="Demain">
            <WeatherCard weather={data.weather} />
          </Panel>

          <Panel className="lg:col-span-4" icon={<ShoppingBasket />} title="Courses">
            <ShoppingList data={data} onDataChange={onDataChange} />
          </Panel>

          <Panel className="lg:col-span-4" icon={<PiggyBank />} title="Budget">
            <BudgetCard data={data} onDataChange={onDataChange} />
          </Panel>

          <div className="grid gap-5 lg:col-span-4">
            <Panel icon={<Quote />} title="Phrase du jour">
              <PositiveQuote data={data} onDataChange={onDataChange} />
            </Panel>
            <Panel icon={<Heart />} title="Merci">
              <DailyThanks data={data} onDataChange={onDataChange} />
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`glass-panel rounded-[1.75rem] p-5 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      </div>
      {children}
    </article>
  );
}
