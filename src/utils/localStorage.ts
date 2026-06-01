import { defaultData } from "../data/defaultData";
import type { AppData } from "../types";
import { getDailyQuote } from "./dailyQuote";

const STORAGE_KEY = "happy-familly:data:v3";
const OLD_STORAGE_KEYS = ["happy-familly:data:v2"];

export function loadAppData(): AppData {
  try {
    const rawData = window.localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      OLD_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      return removeSeedBudgetExpenses(defaultData);
    }

    return removeSeedBudgetExpenses({
      ...defaultData,
      ...JSON.parse(rawData),
      positiveQuote: getDailyQuote(),
    });
  } catch {
    return removeSeedBudgetExpenses(defaultData);
  }
}

export function removeSeedBudgetExpenses(data: AppData): AppData {
  const seedExpenseIds = new Set(["expense-1", "expense-2", "expense-3"]);
  return {
    ...data,
    budget: {
      ...data.budget,
      expenses: (data.budget.expenses ?? []).filter((expense) => !seedExpenseIds.has(expense.id)),
    },
  };
}

export function saveAppData(data: AppData) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyLocalData(data)));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function stripHeavyLocalData(data: AppData): AppData {
  return {
    ...data,
    familyMembers: (data.familyMembers ?? []).map(({ photoUrl: _photoUrl, ...member }) => member),
    shoppingItems: (data.shoppingItems ?? []).map(({ photoUrl: _photoUrl, ...item }) => item),
  };
}
