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
  time: string;
  personId?: string;
};

export type Task = {
  id: string;
  title: string;
  personId: string;
  done: boolean;
};

export type ShoppingItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type Weather = {
  temperature: number;
  condition: "sun" | "rain";
  windKmh: number;
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
