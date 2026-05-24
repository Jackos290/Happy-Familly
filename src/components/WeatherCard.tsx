import { CloudRain, CloudSun, Sun, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import type { Weather } from "../types";

type Props = {
  weather: Weather;
};

const GORCY_LATITUDE = 49.533;
const GORCY_LONGITUDE = 5.683;

export default function WeatherCard({ weather }: Props) {
  const [forecast, setForecast] = useState<Weather>(weather);
  const [status, setStatus] = useState("Météo de Gorcy");
  const advice = getClothingAdvice(forecast);
  const isRainy = forecast.condition === "rain";

  useEffect(() => {
    async function loadWeather() {
      try {
        const params = new URLSearchParams({
          latitude: String(GORCY_LATITUDE),
          longitude: String(GORCY_LONGITUDE),
          daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
          timezone: "Europe/Paris",
          forecast_days: "2",
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        const result = await response.json();
        const index = result.daily?.time?.[1] ? 1 : 0;
        const weatherCode = Number(result.daily.weather_code[index]);
        const minTemperature = Math.round(Number(result.daily.temperature_2m_min[index]));
        const maxTemperature = Math.round(Number(result.daily.temperature_2m_max[index]));
        const precipitation = Number(result.daily.precipitation_sum[index]);
        const windKmh = Math.round(Number(result.daily.wind_speed_10m_max[index]));

        setForecast({
          temperature: maxTemperature,
          minTemperature,
          maxTemperature,
          windKmh,
          condition: precipitation > 0.2 || isRainCode(weatherCode) ? "rain" : "sun",
          label: getWeatherLabel(weatherCode),
        });
        setStatus("Vraie météo de Gorcy pour demain");
      } catch {
        setStatus("Météo de Gorcy indisponible, estimation affichée");
      }
    }

    void loadWeather();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] bg-white/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              {status}
            </p>
            <p className="mt-2 text-5xl font-black text-slate-950">
              {forecast.maxTemperature ?? forecast.temperature}°C
            </p>
            <p className="mt-1 font-semibold text-slate-500">
              {forecast.label ?? "Prévision"} · min {forecast.minTemperature ?? forecast.temperature}°C
            </p>
          </div>
          <div className={`inline-flex h-20 w-20 items-center justify-center rounded-[1.5rem] ${isRainy ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-600"}`}>
            {isRainy ? <CloudRain className="h-10 w-10" /> : forecast.label === "Nuageux" ? <CloudSun className="h-10 w-10" /> : <Sun className="h-10 w-10" />}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-700">
          <Wind className="h-5 w-5 text-slate-400" />
          Vent {forecast.windKmh} km/h
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

function isRainCode(code: number) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

function getWeatherLabel(code: number) {
  if ([0, 1].includes(code)) return "Soleil";
  if ([2, 3, 45, 48].includes(code)) return "Nuageux";
  if (isRainCode(code)) return "Pluie";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neige";
  return "Prévision";
}

function getClothingAdvice(weather: Weather) {
  if (weather.condition === "rain") {
    return "Prévoir veste imperméable et chaussures adaptées.";
  }

  if ((weather.minTemperature ?? weather.temperature) <= 5) {
    return "Prévoir manteau, bonnet et chaussures chaudes.";
  }

  if ((weather.maxTemperature ?? weather.temperature) <= 14) {
    return "Prévoir une veste chaude pour le matin.";
  }

  return "Veste légère suffisante.";
}
