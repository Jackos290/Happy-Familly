import type { CalendarEvent } from "../types";

type SpecialDay = {
  date: string;
  title: string;
  country: "FR" | "LU" | "École";
};

export function getSpecialEventsForDashboard(date = new Date()): CalendarEvent[] {
  const today = toDateKey(date);
  const tomorrowDate = new Date(date);
  tomorrowDate.setDate(date.getDate() + 1);
  const tomorrow = toDateKey(tomorrowDate);

  return getSpecialDays(date.getFullYear(), date.getFullYear() + 1)
    .filter((day) => day.date === today || day.date === tomorrow)
    .map((day) => ({
      id: `special-${day.country}-${day.date}-${day.title}`,
      title: `${day.title} (${day.country})`,
      date: day.date === today ? "today" : "tomorrow",
      dateISO: day.date,
      time: "Toute la journée",
    }));
}

export function getSpecialEventsForRange(start: Date, end: Date): CalendarEvent[] {
  return getSpecialDays(start.getFullYear(), end.getFullYear())
    .filter((day) => day.date >= toDateKey(start) && day.date <= toDateKey(end))
    .map((day) => ({
      id: `special-${day.country}-${day.date}-${day.title}`,
      title: `${day.title} (${day.country})`,
      date: isTomorrow(day.date) ? "tomorrow" : "today",
      dateISO: day.date,
      time: "Toute la journée",
    }));
}

function getSpecialDays(...years: number[]): SpecialDay[] {
  return years.flatMap((year) => [
    ...getFranceHolidays(year),
    ...getLuxembourgHolidays(year),
    ...getSchoolHolidaysZoneB(year),
  ]);
}

function getFranceHolidays(year: number): SpecialDay[] {
  const easter = getEasterDate(year);
  return [
    fixed(year, 1, 1, "Jour de l'An", "FR"),
    relative(easter, 1, "Lundi de Pâques", "FR"),
    fixed(year, 5, 1, "Fête du Travail", "FR"),
    fixed(year, 5, 8, "Victoire 1945", "FR"),
    relative(easter, 39, "Ascension", "FR"),
    relative(easter, 50, "Lundi de Pentecôte", "FR"),
    fixed(year, 7, 14, "Fête nationale", "FR"),
    fixed(year, 8, 15, "Assomption", "FR"),
    fixed(year, 11, 1, "Toussaint", "FR"),
    fixed(year, 11, 11, "Armistice 1918", "FR"),
    fixed(year, 12, 25, "Noël", "FR"),
  ];
}

function getLuxembourgHolidays(year: number): SpecialDay[] {
  const easter = getEasterDate(year);
  return [
    fixed(year, 1, 1, "Jour de l'An", "LU"),
    relative(easter, 1, "Lundi de Pâques", "LU"),
    fixed(year, 5, 1, "Fête du Travail", "LU"),
    fixed(year, 5, 9, "Journée de l'Europe", "LU"),
    relative(easter, 39, "Ascension", "LU"),
    relative(easter, 50, "Lundi de Pentecôte", "LU"),
    fixed(year, 6, 23, "Fête nationale Luxembourg", "LU"),
    fixed(year, 8, 15, "Assomption", "LU"),
    fixed(year, 11, 1, "Toussaint", "LU"),
    fixed(year, 12, 25, "Noël", "LU"),
    fixed(year, 12, 26, "Saint Étienne", "LU"),
  ];
}

function getSchoolHolidaysZoneB(year: number): SpecialDay[] {
  const ranges: Array<[string, string, string]> = [
    ["2026-02-14", "2026-03-02", "Vacances d'hiver Zone B"],
    ["2026-04-11", "2026-04-27", "Vacances de printemps Zone B"],
    ["2026-05-15", "2026-05-15", "Pont de l'Ascension école"],
    ["2026-07-04", "2026-09-01", "Vacances d'été"],
    ["2026-10-17", "2026-11-02", "Vacances de Toussaint Zone B"],
    ["2026-12-19", "2027-01-04", "Vacances de Noël"],
    ["2027-02-20", "2027-03-08", "Vacances d'hiver Zone B"],
    ["2027-04-10", "2027-04-26", "Vacances de printemps Zone B"],
    ["2027-07-06", "2027-09-01", "Vacances d'été"],
  ];

  return ranges
    .filter(([start]) => Number(start.slice(0, 4)) === year || Number(start.slice(0, 4)) === year - 1)
    .flatMap(([start, end, title]) => expandRange(start, end, title));
}

function expandRange(start: string, end: string, title: string): SpecialDay[] {
  const days: SpecialDay[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);

  while (cursor <= last) {
    days.push({ date: toDateKey(cursor), title, country: "École" });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function fixed(year: number, month: number, day: number, title: string, country: SpecialDay["country"]) {
  return { date: toDateKey(new Date(year, month - 1, day)), title, country };
}

function relative(date: Date, offset: number, title: string, country: SpecialDay["country"]) {
  const result = new Date(date);
  result.setDate(date.getDate() + offset);
  return { date: toDateKey(result), title, country };
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isTomorrow(dateKey: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateKey === toDateKey(tomorrow);
}

function getEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}
