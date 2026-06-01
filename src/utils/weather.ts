import type { Weather } from "../types";

const GORCY_LATITUDE = 49.533;
const GORCY_LONGITUDE = 5.683;

export type HourlyForecast = {
  time: string;
  temperature: number;
  rain: number;
  windKmh?: number;
  label?: string;
};

export type GorcyForecast = {
  today: Weather;
  tomorrow: Weather;
  nextHours: HourlyForecast[];
  todayHours: HourlyForecast[];
  tomorrowHours: HourlyForecast[];
};

export async function fetchGorcyForecast(): Promise<GorcyForecast> {
  const params = new URLSearchParams({
    latitude: String(GORCY_LATITUDE),
    longitude: String(GORCY_LONGITUDE),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
    timezone: "Europe/Paris",
    forecast_days: "2",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  const result = await response.json();

  return {
    today: mapDailyWeather(result, 0, true),
    tomorrow: mapDailyWeather(result, 1),
    nextHours: mapNextHours(result),
    todayHours: mapDayHours(result, 0),
    tomorrowHours: mapDayHours(result, 1),
  };
}

function mapDailyWeather(result: any, index: number, useCurrent = false): Weather {
  const weatherCode = useCurrent && result.current?.weather_code !== undefined
    ? Number(result.current.weather_code)
    : Number(result.daily.weather_code[index]);
  const minTemperature = Math.round(Number(result.daily.temperature_2m_min[index]));
  const maxTemperature = Math.round(Number(result.daily.temperature_2m_max[index]));
  const precipitation = Number(result.daily.precipitation_sum[index]);
  const currentTemperature = useCurrent && result.current?.temperature_2m !== undefined
    ? Math.round(Number(result.current.temperature_2m))
    : maxTemperature;
  const currentWind = useCurrent && result.current?.wind_speed_10m !== undefined
    ? Math.round(Number(result.current.wind_speed_10m))
    : Math.round(Number(result.daily.wind_speed_10m_max[index]));

  return {
    temperature: currentTemperature,
    minTemperature,
    maxTemperature,
    windKmh: currentWind,
    condition: (useCurrent ? isRainCode(weatherCode) : precipitation > 0.2 || isRainCode(weatherCode)) ? "rain" : "sun",
    label: getWeatherLabel(weatherCode),
  };
}

function mapNextHours(result: any): HourlyForecast[] {
  const now = new Date();
  const times: string[] = result.hourly?.time ?? [];
  const temperatures: number[] = result.hourly?.temperature_2m ?? [];
  const rain: number[] = result.hourly?.precipitation_probability ?? [];
  const wind: number[] = result.hourly?.wind_speed_10m ?? [];
  const codes: number[] = result.hourly?.weather_code ?? [];
  const startIndex = Math.max(
    0,
    times.findIndex((time) => new Date(time) >= now),
  );

  return times.slice(startIndex, startIndex + 4).map((time, index) => ({
    time: new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time)),
    temperature: Math.round(Number(temperatures[startIndex + index])),
    rain: Math.round(Number(rain[startIndex + index] ?? 0)),
    windKmh: Math.round(Number(wind[startIndex + index] ?? 0)),
    label: getWeatherLabel(Number(codes[startIndex + index] ?? 0)),
  }));
}

function mapDayHours(result: any, dayOffset: number): HourlyForecast[] {
  const times: string[] = result.hourly?.time ?? [];
  const temperatures: number[] = result.hourly?.temperature_2m ?? [];
  const rain: number[] = result.hourly?.precipitation_probability ?? [];
  const wind: number[] = result.hourly?.wind_speed_10m ?? [];
  const codes: number[] = result.hourly?.weather_code ?? [];
  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  const targetKey = toDateKey(target);
  const now = new Date();

  return times
    .map((time, index) => ({ time, index, date: new Date(time) }))
    .filter((item) => toDateKey(item.date) === targetKey)
    .filter((item) => item.date >= now || dayOffset > 0)
    .filter((item) => {
      const hour = item.date.getHours();
      return hour >= 6 && hour <= 22 && hour % 2 === 0;
    })
    .map(({ time, index }) => ({
      time: new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(time)),
      temperature: Math.round(Number(temperatures[index])),
      rain: Math.round(Number(rain[index] ?? 0)),
      windKmh: Math.round(Number(wind[index] ?? 0)),
      label: getWeatherLabel(Number(codes[index] ?? 0)),
    }));
}

export function isRainCode(code: number) {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}

export function getWeatherLabel(code: number) {
  if ([0, 1].includes(code)) return "Soleil";
  if ([2, 3, 45, 48].includes(code)) return "Nuageux";
  if (isRainCode(code)) return "Pluie";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neige";
  return "Prévision";
}

export function getClothingAdvice(weather: Weather) {
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

export function getDetailedClothingAdvice(weather: Weather, hours: HourlyForecast[] = []) {
  const min = Math.min(weather.minTemperature ?? weather.temperature, ...hours.map((hour) => hour.temperature));
  const max = Math.max(weather.maxTemperature ?? weather.temperature, ...hours.map((hour) => hour.temperature));
  const rainRisk = Math.max(weather.condition === "rain" ? 70 : 0, ...hours.map((hour) => hour.rain));
  const wind = Math.max(weather.windKmh, ...hours.map((hour) => hour.windKmh ?? 0));
  const morning = hours.filter((hour) => Number(hour.time.slice(0, 2)) <= 10);
  const morningMin = morning.length > 0 ? Math.min(...morning.map((hour) => hour.temperature)) : min;
  const pieces: string[] = [];

  if (rainRisk >= 65) {
    pieces.push("Veste imperméable obligatoire, capuche ou parapluie, chaussures qui ne prennent pas l'eau.");
  } else if (rainRisk >= 35) {
    pieces.push("Prévoir un k-way dans le sac: risque d'averse dans la journée.");
  }

  if (morningMin <= 5) {
    pieces.push("Le matin sera froid: manteau chaud, bonnet et chaussures chaudes.");
  } else if (morningMin <= 11) {
    pieces.push("Le départ peut être frais: veste chaude ou polaire conseillée.");
  } else if (morningMin <= 16) {
    pieces.push("Veste légère utile pour le matin.");
  }

  if (max >= 26) {
    pieces.push("L'après-midi peut être chaud: vêtements légers, gourde et casquette si sortie dehors.");
  } else if (max >= 21 && min <= 14) {
    pieces.push("Tenue en couches idéale: petite veste le matin, facile à retirer l'après-midi.");
  }

  if (wind >= 35) {
    pieces.push("Vent marqué: éviter les vêtements trop légers, prendre une veste qui coupe le vent.");
  }

  if (pieces.length === 0) {
    pieces.push("Temps doux: tenue confortable, veste légère suffisante.");
  }

  return pieces.join(" ");
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
