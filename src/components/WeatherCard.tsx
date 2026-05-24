import { CloudRain, CloudSun, Sun, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import type { Weather } from "../types";
import { fetchGorcyForecast, getClothingAdvice } from "../utils/weather";

type Props = {
  weather: Weather;
};

export default function WeatherCard({ weather }: Props) {
  const [today, setToday] = useState<Weather>(weather);
  const [tomorrow, setTomorrow] = useState<Weather>(weather);
  const [status, setStatus] = useState("Météo de Gorcy");

  useEffect(() => {
    async function loadWeather() {
      try {
        const forecast = await fetchGorcyForecast();
        setToday(forecast.today);
        setTomorrow(forecast.tomorrow);
        setStatus("Vraie météo de Gorcy");
      } catch {
        setStatus("Météo de Gorcy indisponible, estimation affichée");
      }
    }

    void loadWeather();
  }, []);

  return (
    <div className="space-y-4">
      <WeatherSummary title="Aujourd'hui" weather={today} status={status} />
      <WeatherSummary title="Demain" weather={tomorrow} status="Prévoir la journée de demain" />
      <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-200">
          Habiller les enfants demain
        </p>
        <p className="mt-3 text-lg font-semibold leading-snug">{getClothingAdvice(tomorrow)}</p>
      </div>
    </div>
  );
}

function WeatherSummary({ title, weather, status }: { title: string; weather: Weather; status: string }) {
  const isRainy = weather.condition === "rain";

  return (
    <div className="rounded-[1.5rem] bg-white/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
            {title} · {status}
          </p>
          <p className="mt-2 text-5xl font-black text-slate-950">
            {weather.maxTemperature ?? weather.temperature}°C
          </p>
          <p className="mt-1 font-semibold text-slate-500">
            {weather.label ?? "Prévision"} · min {weather.minTemperature ?? weather.temperature}°C
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
    </div>
  );
}
