import { defaultData } from "../data/defaultData";
import type { AppData } from "../types";
import { getDailyQuote } from "./dailyQuote";

const STORAGE_KEY = "happy-familly:data:v2";

export function loadAppData(): AppData {
  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return defaultData;
    }

    return {
      ...defaultData,
      ...JSON.parse(rawData),
      positiveQuote: getDailyQuote(),
    };
  } catch {
    return defaultData;
  }
}

export function saveAppData(data: AppData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
