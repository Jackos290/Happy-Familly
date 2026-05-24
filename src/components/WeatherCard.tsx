import { CloudRain, Sun, Wind } from "lucide-react";
import type { Weather } from "../types";

type Props = {
  weather: Weather;
};

export default function WeatherCard({ weather }: Props) {
  const advice = getClothingAdvice(weather);
  const isRainy = weather.condition === "rain";

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] bg-white/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              Météo simulée
            </p>
            <p className="mt-2 text-5xl font-black text-slate-950">
              {weather.temperature}°C
            </p>
          </div>
          <div className={`inline-flex h-20 w-20 items-center justify-center rounded-[1.5rem] ${isRainy ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-600"}`}>
            {isRainy ? <CloudRain className="h-10 w-10" /> : <Sun className="h-10 w-10" />}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700">
          <Wind className="h-5 w-5 text-slate-400" />
          Vent {weather.windKmh} km/h
        </div>
      </div>

      <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-sky-200">
          Habiller les enfants
        </p>
        <p className="mt-3 text-lg font-semibold leading-snug">{advice}</p>
      </div>
    </div>
  );
}

function getClothingAdvice(weather: Weather) {
  if (weather.condition === "rain") {
    return "Prévoir veste imperméable et chaussures adaptées.";
  }

  if (weather.temperature <= 10) {
    return "Prévoir manteau, bonnet et chaussures chaudes.";
  }

  return "Veste légère suffisante.";
}
