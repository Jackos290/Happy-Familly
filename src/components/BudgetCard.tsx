import { Minus, Plus, Trash2 } from "lucide-react";
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

const EXPENSE_CATEGORIES = [
  { id: "food", label: "Alimentation" },
  { id: "home", label: "Maison" },
  { id: "children", label: "Enfants" },
  { id: "car", label: "Voiture" },
  { id: "transport", label: "Transport" },
  { id: "health", label: "Santé" },
  { id: "leisure", label: "Loisirs" },
  { id: "bills", label: "Factures" },
  { id: "shopping", label: "Achats" },
  { id: "savings", label: "Epargne" },
  { id: "other", label: "Autre" },
];

export default function BudgetCard({ data, onDataChange }: Props) {
  const parents = data.familyMembers.slice(0, 2);
  const parentIncomes = data.budget.parentIncomes ?? {};
  const jointAccountStart = data.budget.jointAccountStart ?? 0;
  const recurringExpenses = data.budget.recurringExpenses ?? [];
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dateISO, setDateISO] = useState(toISODate(new Date()));
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState("joint");
  const [categoryId, setCategoryId] = useState("food");
  const [recurring, setRecurring] = useState(false);
  const [movementLabel, setMovementLabel] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDateISO, setMovementDateISO] = useState(toISODate(new Date()));
  const [movementAccountId, setMovementAccountId] = useState("joint");
  const [movementCategoryId, setMovementCategoryId] = useState("other");

  const budget = useMemo(() => {
    const income = parents.reduce((total, parent) => total + (parentIncomes[parent.id] ?? 0), 0) + jointAccountStart;
    const expenseTotal = data.budget.expenses.reduce((total, expense) => total + expense.amount, 0);
    const recurringTotal = recurringExpenses.reduce((total, expense) => total + expense.amount, 0);
    const total = income > 0 ? income : data.budget.monthlyTotal;
    const spent = expenseTotal + recurringTotal;
    const percent = total > 0 ? Math.max(0, Math.min((spent / total) * 100, 100)) : 0;
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

    const signedAmount = transactionType === "income" ? -parsedAmount : parsedAmount;
    const expense: Expense = { id: createId("expense"), label: label.trim(), amount: signedAmount, accountId, categoryId: transactionType === "income" ? "income" : categoryId, dateISO, recurring, type: transactionType };
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
    setTransactionType("expense");
    setAccountId("joint");
    setCategoryId("food");
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
            accountId: movementAccountId,
            categoryId: type === "add" ? "income" : movementCategoryId,
            dateISO: movementDateISO,
            type: type === "add" ? "income" : "expense",
          },
        ],
      },
    });
    setMovementLabel("");
    setMovementAmount("");
    setMovementDateISO(toISODate(new Date()));
    setMovementAccountId("joint");
    setMovementCategoryId("other");
  }

  function deleteExpense(expenseId: string, list: "monthly" | "recurring") {
    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        expenses: list === "monthly" ? data.budget.expenses.filter((expense) => expense.id !== expenseId) : data.budget.expenses,
        recurringExpenses: list === "recurring" ? recurringExpenses.filter((expense) => expense.id !== expenseId) : recurringExpenses,
      },
    });
  }

  function updateExpense(expenseId: string, list: "monthly" | "recurring", changes: Partial<Expense>) {
    onDataChange({
      ...data,
      budget: {
        ...data.budget,
        expenses: list === "monthly" ? data.budget.expenses.map((expense) => (expense.id === expenseId ? { ...expense, ...changes } : expense)) : data.budget.expenses,
        recurringExpenses: list === "recurring" ? recurringExpenses.map((expense) => (expense.id === expenseId ? { ...expense, ...changes } : expense)) : recurringExpenses,
      },
    });
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

      <form onSubmit={addExpense} className="grid grid-cols-1 gap-3 rounded-3xl border border-[#3a3463] bg-[#17142c] p-3 xl:grid-cols-[160px_150px_150px_minmax(0,1fr)_110px_150px_160px_56px]">
        <select className="field" value={transactionType} onChange={(event) => setTransactionType(event.target.value as "expense" | "income")}>
          <option value="expense">Nouvelle dépense</option>
          <option value="income">Nouvelle rentrée</option>
        </select>
        <AccountSelect parents={parents} value={accountId} onChange={setAccountId} />
        <CategorySelect value={transactionType === "income" ? "income" : categoryId} onChange={setCategoryId} disabled={transactionType === "income"} />
        <input className="field" value={label} onChange={(event) => setLabel(event.target.value)} placeholder={transactionType === "income" ? "Nom de la rentrée" : "Nom de la dépense"} />
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

      <div className="grid gap-3 rounded-3xl border border-[#3a3463] bg-[#17142c] p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_150px_150px_auto_auto]">
        <input className="field" value={movementLabel} onChange={(event) => setMovementLabel(event.target.value)} placeholder="Mouvement d'argent" />
        <input className="field" type="number" min="0" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="€" />
        <input className="field" type="date" value={movementDateISO} onChange={(event) => setMovementDateISO(event.target.value)} aria-label="Date du mouvement" />
        <AccountSelect parents={parents} value={movementAccountId} onChange={setMovementAccountId} />
        <CategorySelect value={movementCategoryId} onChange={setMovementCategoryId} />
        <button type="button" onClick={() => addMovement("add")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 font-black text-[#151229]">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
        <button type="button" onClick={() => addMovement("remove")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-rose-400 px-4 font-black text-[#151229]">
          <Minus className="h-4 w-4" /> Retirer
        </button>
      </div>

      <CategoryStats expenses={[...data.budget.expenses, ...recurringExpenses]} />

      <ExpenseList title="Dépenses du mois" expenses={data.budget.expenses} parents={parents} onDelete={(id) => deleteExpense(id, "monthly")} />
      <RecurringExpenseList
        title="Dépenses récurrentes"
        expenses={recurringExpenses}
        parents={parents}
        onUpdate={(id, changes) => updateExpense(id, "recurring", changes)}
        onDelete={(id) => deleteExpense(id, "recurring")}
      />
    </div>
  );
}

function calculateMonthlyTotal(parentIncomes: Record<string, number>, jointAccountStart: number) {
  return Object.values(parentIncomes).reduce((total, value) => total + value, 0) + jointAccountStart;
}

function AccountSelect({ parents, value, onChange }: { parents: AppData["familyMembers"]; value: string; onChange: (value: string) => void }) {
  return (
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Compte">
      {parents.map((parent) => (
        <option key={parent.id} value={parent.id}>
          {parent.name}
        </option>
      ))}
      <option value="joint">Compte joint</option>
    </select>
  );
}

function CategorySelect({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <select className="field" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-label="Catégorie">
      {disabled && <option value="income">Rentrée</option>}
      {!disabled && EXPENSE_CATEGORIES.map((category) => (
        <option key={category.id} value={category.id}>
          {category.label}
        </option>
      ))}
    </select>
  );
}

function CategoryStats({ expenses }: { expenses: Expense[] }) {
  const stats = EXPENSE_CATEGORIES.map((category) => ({
    ...category,
    total: expenses
      .filter((expense) => expense.amount > 0)
      .filter((expense) => (expense.categoryId ?? "other") === category.id)
      .reduce((total, expense) => total + expense.amount, 0),
  })).filter((category) => category.total > 0);
  const max = Math.max(...stats.map((category) => category.total), 1);

  return (
    <section className="rounded-3xl border border-[#3a3463] bg-[#17142c] p-4 text-white">
      <h3 className="font-black">Stats par catégorie</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {stats.map((category) => (
          <div key={category.id} className="rounded-2xl border border-[#3a3463] bg-[#211d3d] p-3">
            <div className="flex items-center justify-between gap-3 text-sm font-black">
              <span>{category.label}</span>
              <span className="text-[#ffd38a]">{euros.format(category.total)}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#34305a]">
              <div className="h-full rounded-full bg-[#ffd38a]" style={{ width: `${Math.max(8, (category.total / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {stats.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 font-bold text-white/45">Pas encore de dépense catégorisée.</p>}
      </div>
    </section>
  );
}

function RecurringExpenseList({
  title,
  expenses,
  parents,
  onUpdate,
  onDelete,
}: {
  title: string;
  expenses: Expense[];
  parents: AppData["familyMembers"];
  onUpdate: (id: string, changes: Partial<Expense>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-black text-white">{title}</h3>
      <div className="max-h-56 space-y-2 overflow-auto pr-1">
        {expenses.map((expense) => (
          <div key={expense.id} className="grid gap-2 rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 md:grid-cols-[minmax(0,1fr)_110px_140px_140px_130px_auto] md:items-center">
            <input className="field" value={expense.label} onChange={(event) => onUpdate(expense.id, { label: event.target.value })} aria-label="Nom de la dépense récurrente" />
            <input
              className="field"
              type="number"
              min="0"
              value={Math.abs(expense.amount)}
              onChange={(event) => onUpdate(expense.id, { amount: Math.max(0, Number(event.target.value) || 0) })}
              aria-label="Montant"
            />
            <AccountSelect parents={parents} value={expense.accountId ?? "joint"} onChange={(value) => onUpdate(expense.id, { accountId: value })} />
            <CategorySelect value={expense.categoryId ?? "other"} onChange={(value) => onUpdate(expense.id, { categoryId: value })} />
            <input className="field" type="date" value={expense.dateISO ?? ""} onChange={(event) => onUpdate(expense.id, { dateISO: event.target.value })} aria-label="Date de débit" />
            <button
              type="button"
              onClick={() => onDelete(expense.id)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200 transition hover:bg-rose-500/25"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {expenses.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 font-bold text-white/45">Rien ici.</p>}
      </div>
    </div>
  );
}

function ExpenseList({ title, expenses, parents, onDelete }: { title: string; expenses: Expense[]; parents: AppData["familyMembers"]; onDelete: (id: string) => void }) {
  return (
    <div>
      <h3 className="mb-2 font-black text-white">{title}</h3>
      <div className="max-h-36 space-y-2 overflow-auto pr-1">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-white/80">{expense.label}</span>
              <span className="block text-xs font-bold text-white/45">{getAccountLabel(expense.accountId, parents)}</span>
              {expense.amount > 0 && <span className="block text-xs font-bold text-white/45">{getCategoryLabel(expense.categoryId)}</span>}
              {expense.dateISO && <span className="block text-xs font-bold text-white/45">Débit le {formatDate(expense.dateISO)}</span>}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`font-bold ${expense.amount < 0 ? "text-emerald-300" : "text-white"}`}>{euros.format(expense.amount)}</span>
              <button
                type="button"
                onClick={() => onDelete(expense.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-200 transition hover:bg-rose-500/25"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {expenses.length === 0 && <p className="rounded-2xl border border-[#3a3463] bg-[#211d3d] px-4 py-3 font-bold text-white/45">Rien ici.</p>}
      </div>
    </div>
  );
}

function getAccountLabel(accountId: string | undefined, parents: AppData["familyMembers"]) {
  if (!accountId || accountId === "joint") return "Compte joint";
  return parents.find((parent) => parent.id === accountId)?.name ?? "Compte joint";
}

function getCategoryLabel(categoryId: string | undefined) {
  if (categoryId === "income") return "Rentrée";
  return EXPENSE_CATEGORIES.find((category) => category.id === categoryId)?.label ?? "Autre";
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
