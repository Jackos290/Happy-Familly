export type FamilyMember = {
  id: string;
  name: string;
  color: string;
  photoUrl?: string;
  googleCalendarUrl?: string;
  pinCode?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: "today" | "tomorrow";
  dateISO?: string;
  dateEndISO?: string;
  time: string;
  personId?: string;
  source?: "manual" | "google";
  externalId?: string;
  recurrence?: "none" | "weekly";
  weekdays?: number[];
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
  accountId?: string;
  dateISO?: string;
  recurring?: boolean;
  type?: "expense" | "income";
};

export type FamilyBudget = {
  monthlyTotal: number;
  expenses: Expense[];
  parentIncomes?: Record<string, number>;
  jointAccountStart?: number;
  recurringExpenses?: Expense[];
};

export type ParentTodoItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ParentTodoSection = {
  id: string;
  title: string;
  personId: string;
  items: ParentTodoItem[];
};

export type ScreenTimeRequest = {
  id: string;
  childId: string;
  label: string;
  minutes: number;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  kind?: "reward" | "spend";
};

export type ScreenTimeTransaction = {
  id: string;
  childId: string;
  label: string;
  minutes: number;
  createdAt: string;
  type: "reward" | "spend" | "manual";
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
  parentTodoSections?: ParentTodoSection[];
  screenTimeRequests?: ScreenTimeRequest[];
  screenTimeTransactions?: ScreenTimeTransaction[];
};
