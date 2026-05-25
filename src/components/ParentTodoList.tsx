import { Check, FolderPlus, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { AppData, ParentTodoItem, ParentTodoSection } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  memberId: string;
  onDataChange: (data: AppData) => void;
};

export default function ParentTodoList({ data, memberId, onDataChange }: Props) {
  const [sectionTitle, setSectionTitle] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const sections = useMemo(
    () => (data.parentTodoSections ?? []).filter((section) => section.personId === memberId),
    [data.parentTodoSections, memberId],
  );
  const doneItems = sections.flatMap((section) =>
    section.items
      .filter((item) => item.done)
      .map((item) => ({ ...item, sectionId: section.id, sectionTitle: section.title })),
  );

  function saveSections(nextSections: ParentTodoSection[]) {
    const others = (data.parentTodoSections ?? []).filter((section) => section.personId !== memberId);
    onDataChange({
      ...data,
      parentTodoSections: [...others, ...nextSections],
    });
  }

  function addSection(event: FormEvent) {
    event.preventDefault();
    if (!sectionTitle.trim()) return;

    saveSections([
      ...sections,
      {
        id: createId("todo-section"),
        title: sectionTitle.trim(),
        personId: memberId,
        items: [],
      },
    ]);
    setSectionTitle("");
  }

  function addItem(sectionId: string) {
    const text = drafts[sectionId]?.trim();
    if (!text) return;

    saveSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [...section.items, { id: createId("todo-item"), text, done: false }],
            }
          : section,
      ),
    );
    setDrafts((current) => ({ ...current, [sectionId]: "" }));
  }

  function toggleItem(sectionId: string, itemId: string) {
    saveSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)),
            }
          : section,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addSection} className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/60 p-3">
        <input
          className="field min-w-0 flex-[1_1_220px]"
          value={sectionTitle}
          onChange={(event) => setSectionTitle(event.target.value)}
          placeholder="Nouvelle section"
        />
        <button className="icon-button shrink-0" title="Ajouter une section">
          <FolderPlus className="h-5 w-5" />
        </button>
      </form>

      {sections.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-4 font-semibold text-slate-500">
          Ajoute une section pour organiser tes listes.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.id} className="rounded-[1.5rem] bg-white/70 p-4">
            <h3 className="text-lg font-black text-slate-950">{section.title}</h3>
            <div className="mt-3 space-y-2">
              {section.items.filter((item) => !item.done).length === 0 ? (
                <p className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-400">Rien à faire ici.</p>
              ) : (
                section.items
                  .filter((item) => !item.done)
                  .map((item) => (
                    <TodoItem key={item.id} item={item} onToggle={() => toggleItem(section.id, item.id)} />
                  ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className="field min-w-0 flex-1"
                value={drafts[section.id] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [section.id]: event.target.value }))}
                placeholder="Nouvelle ligne"
              />
              <button type="button" onClick={() => addItem(section.id)} className="icon-button shrink-0" title="Ajouter">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </section>
        ))
      )}

      {doneItems.length > 0 && (
        <section className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
          <h3 className="text-lg font-black">Fait</h3>
          <div className="mt-3 space-y-2">
            {doneItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.sectionId, item.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/10 px-3 py-3 text-left font-bold"
                title="Remettre à faire"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-white line-through">{item.text}</span>
                  <span className="text-xs text-slate-300">{item.sectionTitle}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TodoItem({ item, onToggle }: { item: ParentTodoItem; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left font-bold">
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
          item.done ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-200 bg-slate-50 text-transparent"
        }`}
      >
        <Check className="h-4 w-4" />
      </span>
      <span className={item.done ? "text-slate-400 line-through" : "text-slate-800"}>{item.text}</span>
    </button>
  );
}
