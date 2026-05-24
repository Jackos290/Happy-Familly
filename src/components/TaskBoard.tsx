import { Check, Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function TaskBoard({ data, onDataChange }: Props) {
  const [title, setTitle] = useState("");
  const [personId, setPersonId] = useState(data.familyMembers[0]?.id ?? "");

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    onDataChange({
      ...data,
      tasks: [
        ...data.tasks,
        {
          id: createId("task"),
          title: title.trim(),
          personId,
          done: false,
        },
      ],
    });
    setTitle("");
  }

  function toggleTask(taskId: string) {
    onDataChange({
      ...data,
      tasks: data.tasks.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task,
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.familyMembers.map((member) => {
          const memberTasks = data.tasks.filter((task) => task.personId === member.id);
          return (
            <div key={member.id} className="rounded-3xl bg-white/55 p-3">
              <span className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${member.color}`}>
                {member.name}
              </span>
              <div className="space-y-2">
                {memberTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white px-3 text-left font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        task.done
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : "border-slate-200 bg-slate-50 text-transparent"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                    <span className={task.done ? "text-slate-400 line-through" : ""}>
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={addTask} className="grid gap-3 rounded-3xl bg-white/55 p-3 sm:grid-cols-[1fr_180px_auto]">
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nouvelle tâche"
        />
        <select
          className="field"
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
        >
          {data.familyMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <button className="icon-button" title="Ajouter la tâche">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
