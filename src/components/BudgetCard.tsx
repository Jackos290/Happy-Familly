import { Minus, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AppData, Expense } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function BudgetCard({ data, onDataChange }: Props) {
  const parents = data.familyMembers.slice(0, 2);
  const parentIncomes = data.budget.parentIncomes ?? {};
  const jointAccountStart = data.budget.jointAccountStart ?? 0;
  const recurringExpenses = data.budget.recurringExpenses ?? [];
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dateISO, setDateISO] = useState(toISODate(new Date()));
  const [recurring, setRecurring] = useState(false);
  const [movementLabel, setMovementLabel] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDateISO, setMovementDateISO] = useState(toISODate(new Date()));

  const budget = useMemo(() => {
    const income = parents.reduce((total, parent) => total + (parentIncomes[parent.id] ?? 0), 0) + jointAccountStart;
    const expenseTotal = data.budget.expenses.reduce((total, expense) => total + expense.amount, 0);
    const recurringTotal = recurringExpenses.reduce((total, expense) => total + expense.amount, 0);
    const total = income > 0 ? income : data.budget.monthlyTotal;
    const spent = expenseTotal + recurringTotal;
    const percent = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
    const remaining = total - spent;
    const color = percent < 70 ? "bg-emerald-500" : percent <= 90 ? "bg-orange-500" : "bg-rose-600";

    return { income, total, spent, recurringTotal, percent, remaining, color };
  }, [data.budget.expenses, data.budget.monthlyTotal, jointAccountStart, parentIncomes, parents, recurringExpenses]);

  function updateParentIncome(parentId: string, value: string) {
    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        monthlyTotal: calculateMonthlyTotal({ ...parentIncomes, [parentId]: Number(value) || 0 }, jointAccountStart),
        parentIncomes: {
          ...parentIncomes,
          [parentId]: Number(value) || 0,
        },
      },
    });
  }

  function updateJointAccount(value: string) {
    const nextJoint = Number(value) || 0;
    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        monthlyTotal: calculateMonthlyTotal(parentIncomes, nextJoint),
        jointAccountStart: nextJoint,
      },
    });
  }

  function addExpense(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!label.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    const expense: Expense = { id: createId("expense"), label: label.trim(), amount: parsedAmount, dateISO, recurring };
    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        expenses: recurring ? data.budget.expenses : [...data.budget.expenses, expense],
        recurringExpenses: recurring ? [...recurringExpenses, expense] : recurringExpenses,
      },
    });
    setLabel("");
    setAmount("");
    setDateISO(toISODate(new Date()));
    setRecurring(false);
  }

  function addMovement(type: "add" | "remove") {
    const parsedAmount = Number(movementAmount);
    if (!movementLabel.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;
    const signedAmount = type === "add" ? -parsedAmount : parsedAmount;
    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        expenses: [
          ...data.budget.expenses,
          {
            id: createId("movement"),
            label: movementLabel.trim(),
            amount: signedAmount,
            dateISO: movementDateISO,
            type: type === "add" ? "income" : "expense",
          },
        ],
      },
    });
    setMovementLabel("");
    setMovementAmount("");
    setMovementDateISO(toISODate(new Date()));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-[#3a3463] bg-[#211d3d] p-5 text-white">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Départ" value={euros.format(budget.total)} />
          <Metric label="Dépensé" value={euros.format(budget.spent)} />
          <Metric label="Reste" value={euros.format(budget.remaining)} />
        </div>
        <div className="mt-5 h-5 overflow-hidden rounded-full bg-[#34305a]">
          <div className={`h-full rounded-full transition-all ${budget.color}`} style={{ width: `${budget.percent}%` }} />
        </div>
        <p className="mt-2 text-right text-sm font-bold text-white/55">{Math.round(budget.percent)}% utilisé</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {parents.map((parent) => (
          <label key={parent.id} className="rounded-2xl border border-[#3a3463] bg-[#17142c] p-3 text-white">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Salaire {parent.name}</span>
            <input
              className="field mt-2"
              type="number"
              value={parentIncomes[parent.id] ?? 0}
              onChange={(event) => updateParentIncome(parent.id, event.target.value)}
            />
          </label>
        ))}
        <label className="rounded-2xl border border-[#3a3463] bg-[#17142c] p-3 text-white">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Compte joint</span>
          <input className="field mt-2" type="number" value={jointAccountStart} onChange={(event) => updateJointAccount(event.target.value)} />
        </label>
      </div>

      <form onSubmit={addExpense} className="grid grid-cols-1 gap-3 rounded-3xl border border-[#3a3463] bg-[#17142c] p-3 xl:grid-cols-[minmax(0,1fr)_110px_150px_160px_56px]">
        <input className="field" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nouvelle dépense" />
        <input className="field" type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="€" />
        <input className="field" type="date" value={dateISO} onChange={(event) => setDateISO(event.target.value)} aria-label="Date de débit" />
        <label className="flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 font-bold text-slate-700">
          <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
          Tous les mois
        </label>
        <button className="icon-button justify-self-end" title="Ajouter la dépense">
          <Plus className="h-5 w-5" />
        </button>
      </form>

      <div className="grid gap-3 rounded-3xl border border-[#3a3463] bg-[#17142c] p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_auto_auto]">
        <input className="field" value={movementLabel} onChange={(event) => setMovementLabel(event.target.value)} placeholder="Mouvement d'argent" />
        <input className="field" type="number" min="0" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="€" />
        <input className="field" type="date" value={movementDateISO} onChange={(event) => setMovementDateISO(event.target.value)} aria-label="Date du mouvement" />
        <button type="button" onClick={() => addMovement("add")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 font-black text-[#151229]">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
        <button type="button" onClick={() => addMovement("remove")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-400 px-4 font-black text-[#151229]">
          <Minus className="h-4 w-4" /> Retirer
        </button>
      </div>

      <ExpenseList title="Dépenses du mois" expenses={data.budget.expenses} />
      <ExpenseList title="Dépenses récurrentes" expenses={recurringExpenses} />
    </div>
  );
}

function calculateMonthlyTotal(parentIncomes: Record<string, number>, jointAccountStart: number) {
  return Object.values(parentIncomes).reduce((total, value) => total + value, 0) + jointAccountStart;
}

function ExpenseList({ title, expenses }: { title: string; expenses: Expense[] }) {
  return (
    <div>
      <h3 className="mb-2 font-black text-white">{title}</h3>
      <div className="max-h-36 space-y-2 overflow-auto pr-1">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-white/80">{expense.label}</span>
              {expense.dateISO && <span className="block text-xs font-bold text-white/45">Débit le {formatDate(expense.dateISO)}</span>}
            </span>
            <span className={`shrink-0 font-bold ${expense.amount < 0 ? "text-emerald-300" : "text-white"}`}>{euros.format(expense.amount)}</span>
          </div>
        ))}
        {expenses.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 font-bold text-white/45">Rien ici.</p>}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}
