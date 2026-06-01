import { CloudRain, CloudSun, Sun, Umbrella, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import type { Weather } from "../types";
import type { HourlyForecast } from "../utils/weather";
import { fetchGorcyForecast, getDetailedClothingAdvice } from "../utils/weather";

type Props = {
  weather: Weather;
};

export default function WeatherCard({ weather }: Props) {
  const [today, setToday] = useState<Weather>(weather);
  const [tomorrow, setTomorrow] = useState<Weather>(weather);
  const [todayHours, setTodayHours] = useState<HourlyForecast[]>([]);
  const [tomorrowHours, setTomorrowHours] = useState<HourlyForecast[]>([]);
  const [status, setStatus] = useState("Météo de Gorcy");

  useEffect(() => {
    async function loadWeather() {
      try {
        const forecast = await fetchGorcyForecast();
        setToday(forecast.today);
        setTomorrow(forecast.tomorrow);
        setTodayHours(forecast.todayHours);
        setTomorrowHours(forecast.tomorrowHours);
        setStatus("Vraie météo de Gorcy");
      } catch {
        setStatus("Météo de Gorcy indisponible, estimation affichée");
      }
    }

    void loadWeather();
  }, []);

  return (
    <div className="space-y-4">
      <WeatherSummary title="Aujourd'hui" weather={today} status={status} hours={todayHours} />
      <WeatherSummary title="Demain" weather={tomorrow} status="Prévoir la journée de demain" hours={tomorrowHours} />
      <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-200">
          Habiller les enfants demain
        </p>
        <p className="mt-3 text-lg font-semibold leading-snug">{getDetailedClothingAdvice(tomorrow, tomorrowHours)}</p>
      </div>
    </div>
  );
}

function WeatherSummary({ title, weather, status, hours }: { title: string; weather: Weather; status: string; hours: HourlyForecast[] }) {
  const isRainy = weather.condition === "rain";
  const displayTemperature = title === "Aujourd'hui" ? weather.temperature : weather.maxTemperature ?? weather.temperature;

  return (
    <div className="rounded-[1.5rem] bg-white/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            {title} · {status}
          </p>
          <p className="mt-2 text-5xl font-black text-slate-950">
            {displayTemperature}°C
          </p>
          <p className="mt-1 font-semibold text-slate-500">
            {weather.label ?? "Prévision"} · min {weather.minTemperature ?? weather.temperature}°C · max {weather.maxTemperature ?? weather.temperature}°C
          </p>
        </div>
        <div className={`inline-flex h-20 w-20 items-center justify-center rounded-[1.5rem] ${isRainy ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-600"}`}>
          {isRainy ? <CloudRain className="h-10 w-10" /> : weather.label === "Nuageux" ? <CloudSun className="h-10 w-10" /> : <Sun className="h-10 w-10" />}
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700">
        <Wind className="h-5 w-5 text-slate-400" />
        Vent {weather.windKmh} km/h
      </div>
      <HourlyStrip hours={hours} />
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-slate-700">
        <Umbrella className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <p className="text-sm font-bold leading-snug">{getDetailedClothingAdvice(weather, hours)}</p>
      </div>
    </div>
  );
}

function HourlyStrip({ hours }: { hours: HourlyForecast[] }) {
  if (hours.length === 0) {
    return <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-400">Prévisions horaires indisponibles.</p>;
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {hours.map((hour) => (
        <div key={hour.time} className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
          <p className="text-xs font-black text-slate-500">{hour.time}</p>
          <p className="mt-1 text-2xl">{getHourlyEmoji(hour)}</p>
          <p className="text-sm font-black text-slate-950">{hour.temperature}°C</p>
          <p className="text-xs font-bold text-slate-500">pluie {hour.rain}%</p>
        </div>
      ))}
    </div>
  );
}

function getHourlyEmoji(hour: HourlyForecast) {
  if (hour.rain >= 65) return "🌧️";
  if (hour.rain >= 35) return "🌦️";
  if (hour.label === "Nuageux") return "⛅";
  return "☀️";
}
