import type { AppData, FamilyMember } from "../types";
import { getDailyQuote } from "../utils/dailyQuote";

export const familyMembers: FamilyMember[] = [
  { id: "papa", name: "Papa", color: "bg-sky-100 text-sky-800", pinCode: "1234" },
  { id: "maman", name: "Maman", color: "bg-rose-100 text-rose-800", pinCode: "1234" },
  { id: "enfant-1", name: "Enfant 1", color: "bg-emerald-100 text-emerald-800", pinCode: "1234" },
  { id: "enfant-2", name: "Enfant 2", color: "bg-violet-100 text-violet-800", pinCode: "1234" },
];

export const defaultData: AppData = {
  familyMembers,
  calendarEvents: [
    {
      id: "event-1",
      title: "École et garderie",
      date: "today",
      time: "08:20",
      personId: "enfant-1",
    },
    {
      id: "event-2",
      title: "Courses rapides",
      date: "today",
      time: "18:00",
      personId: "papa",
    },
    {
      id: "event-3",
      title: "Piscine",
      date: "tomorrow",
      time: "17:30",
      personId: "enfant-2",
    },
  ],
  tasks: [
    { id: "task-1", title: "Préparer les cartables", personId: "enfant-1", done: false },
    { id: "task-2", title: "Sortir la poubelle", personId: "papa", done: false },
    { id: "task-3", title: "Signer le cahier", personId: "maman", done: true },
  ],
  shoppingItems: [
    { id: "shop-1", label: "Lait", checked: false },
    { id: "shop-2", label: "Fruits pour le goûter", checked: false },
    { id: "shop-3", label: "Pain", checked: true },
  ],
  weather: {
    temperature: 9,
    condition: "rain",
    windKmh: 24,
    label: "Pluie",
  },
  positiveQuote: getDailyQuote(),
  thanksMessages: [
    {
      id: "thanks-1",
      text: "Merci pour le dessin laissé sur la table ce matin.",
      author: "Maman",
    },
  ],
  budget: {
    monthlyTotal: 3200,
    parentIncomes: {
      papa: 0,
      maman: 0,
    },
    jointAccountStart: 0,
    expenses: [
      { id: "expense-1", label: "Alimentation", amount: 460 },
      { id: "expense-2", label: "Activités enfants", amount: 120 },
      { id: "expense-3", label: "Transport", amount: 180 },
    ],
    recurringExpenses: [],
  },
  parentTodoSections: [
    {
      id: "parent-section-1",
      title: "Maison",
      personId: "papa",
      items: [
        { id: "parent-todo-1", text: "Vérifier les papiers école", done: false },
      ],
    },
  ],
  screenTimeRequests: [],
  screenTimeTransactions: [],
};
