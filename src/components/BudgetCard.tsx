import { Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AppData } from "../types";
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
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const budget = useMemo(() => {
    const spent = data.budget.expenses.reduce((total, expense) => total + expense.amount, 0);
    const percent = Math.min((spent / data.budget.monthlyTotal) * 100, 100);
    const remaining = data.budget.monthlyTotal - spent;
    const color =
      percent < 70 ? "bg-emerald-500" : percent <= 90 ? "bg-orange-500" : "bg-rose-600";

    return { spent, percent, remaining, color };
  }, [data.budget]);

  function addExpense(event: FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!label.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        expenses: [
          ...data.budget.expenses,
          { id: createId("expense"), label: label.trim(), amount: parsedAmount },
        ],
      },
    });
    setLabel("");
    setAmount("");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] bg-white/60 p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Budget" value={euros.format(data.budget.monthlyTotal)} />
          <Metric label="DÃ©pensÃ©" value={euros.format(budget.spent)} />
          <Metric label="Reste" value={euros.format(budget.remaining)} />
        </div>
        <div className="mt-5 h-5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${budget.color}`}
            style={{ width: `${budget.percent}%` }}
          />
        </div>
        <p className="mt-2 text-right text-sm font-bold text-slate-500">
          {Math.round(budget.percent)}% utilisÃ©
        </p>
      </div>

      <div className="max-h-36 space-y-2 overflow-auto pr-1">
        {data.budget.expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
            <span className="font-semibold text-slate-800">{expense.label}</span>
            <span className="font-bold text-slate-950">{euros.format(expense.amount)}</span>
          </div>
        ))}
      </div>

      <form onSubmit={addExpense} className="grid gap-3 rounded-3xl bg-white/50 p-3 sm:grid-cols-[1fr_120px_auto]">
        <input
          className="field"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nouvelle dÃ©pense"
        />
        <input
          className="field"
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="â‚¬"
        />
        <button className="icon-button" title="Ajouter la dÃ©pense">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
