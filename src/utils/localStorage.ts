import { defaultData } from "../data/defaultData";
import type { AppData } from "../types";

const STORAGE_KEY = "bien-sur-ludo:data:v1";

export function loadAppData(): AppData {
  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return defaultData;
    }

    return {
      ...defaultData,
      ...JSON.parse(rawData),
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
