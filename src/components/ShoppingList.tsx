import { Check, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function ShoppingList({ data, onDataChange }: Props) {
  const [label, setLabel] = useState("");

  function addItem(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;

    onDataChange({
      ...data,
      shoppingItems: [
        ...data.shoppingItems,
        { id: createId("shop"), label: label.trim(), checked: false },
      ],
    });
    setLabel("");
  }

  function toggleItem(id: string) {
    onDataChange({
      ...data,
      shoppingItems: data.shoppingItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    });
  }

  function deleteItem(id: string) {
    onDataChange({
      ...data,
      shoppingItems: data.shoppingItems.filter((item) => item.id !== id),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data.shoppingItems.map((item) => (
          <div key={item.id} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3">
            <button
              onClick={() => toggleItem(item.id)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                item.checked
                  ? "border-emerald-400 bg-emerald-500 text-white"
                  : "border-slate-200 bg-slate-50 text-transparent"
              }`}
              title="Cocher"
            >
              <Check className="h-4 w-4" />
            </button>
            <span className={`flex-1 font-semibold ${item.checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
              {item.label}
            </span>
            <button
              onClick={() => deleteItem(item.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={addItem} className="flex gap-3 rounded-3xl bg-white/50 p-3">
        <input
          className="field"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ajouter aux courses"
        />
        <button className="icon-button" title="Ajouter aux courses">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
