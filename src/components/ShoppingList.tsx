import { Camera, Check, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState, type ChangeEvent } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  expanded?: boolean;
};

export default function ShoppingList({ data, onDataChange, expanded = false }: Props) {
  const [label, setLabel] = useState("");

  const shoppingGroups = useMemo(
    () => ({
      todo: data.shoppingItems.filter((item) => !item.checked),
      done: data.shoppingItems.filter((item) => item.checked),
    }),
    [data.shoppingItems],
  );

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

  function updatePhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onDataChange({
        ...data,
        shoppingItems: data.shoppingItems.map((item) =>
          item.id === id ? { ...item, photoUrl: String(reader.result) } : item,
        ),
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {expanded ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ShoppingGroup
            title="À acheter"
            items={shoppingGroups.todo}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onPhoto={updatePhoto}
            expanded
          />
          <ShoppingGroup
            title="Déjà achetés"
            items={shoppingGroups.done}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onPhoto={updatePhoto}
            expanded
          />
        </div>
      ) : (
        <ShoppingGroup
          title=""
          items={data.shoppingItems.slice(0, 5)}
          onToggle={toggleItem}
          onDelete={deleteItem}
          onPhoto={updatePhoto}
        />
      )}

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

function ShoppingGroup({
  title,
  items,
  onToggle,
  onDelete,
  onPhoto,
  expanded = false,
}: {
  title: string;
  items: AppData["shoppingItems"];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPhoto: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
  expanded?: boolean;
}) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-lg font-black text-slate-950">{title}</h3>}
      {items.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-4 font-semibold text-slate-500">
          Rien ici pour le moment.
        </p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-3 py-2">
          {expanded && (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.label} className="h-full w-full object-cover" />
              ) : (
                <label className="flex h-full w-full cursor-pointer items-center justify-center text-slate-400">
                  <Camera className="h-5 w-5" />
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => onPhoto(item.id, event)}
                  />
                </label>
              )}
            </div>
          )}
          <button
            onClick={() => onToggle(item.id)}
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
          {expanded && item.photoUrl && (
            <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <Camera className="h-4 w-4" />
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => onPhoto(item.id, event)}
              />
            </label>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
