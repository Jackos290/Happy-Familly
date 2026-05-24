export type FamilyMember = {
  id: string;
  name: string;
  color: string;
  photoUrl?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: "today" | "tomorrow";
  dateISO?: string;
  time: string;
  personId?: string;
};

export type Task = {
  id: string;
  title: string;
  personId: string;
  done: boolean;
  recurrence?: "none" | "daily" | "weekly";
  completedAt?: string;
  rewardMinutes?: number;
};

export type ShoppingItem = {
  id: string;
  label: string;
  checked: boolean;
  photoUrl?: string;
};

export type Weather = {
  temperature: number;
  condition: "sun" | "rain";
  windKmh: number;
  label?: string;
  minTemperature?: number;
  maxTemperature?: number;
};

export type ThanksMessage = {
  id: string;
  text: string;
  author: string;
};

export type Expense = {
  id: string;
  label: string;
  amount: number;
};

export type FamilyBudget = {
  monthlyTotal: number;
  expenses: Expense[];
};

export type AppData = {
  familyMembers: FamilyMember[];
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  weather: Weather;
  positiveQuote: string;
  thanksMessages: ThanksMessage[];
  budget: FamilyBudget;
};
