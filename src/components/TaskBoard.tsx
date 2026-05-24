import { Check, Plus, RotateCcw } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, Task } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  expanded?: boolean;
};

export default function TaskBoard({ data, onDataChange, expanded = false }: Props) {
  const [title, setTitle] = useState("");
  const [personId, setPersonId] = useState(data.familyMembers[0]?.id ?? "");
  const [recurrence, setRecurrence] = useState<Task["recurrence"]>("none");
  const [tab, setTab] = useState<"todo" | "done" | "recurring">("todo");

  const todoTasks = useMemo(() => data.tasks.filter((task) => !task.done), [data.tasks]);
  const doneTasks = useMemo(() => data.tasks.filter((task) => task.done), [data.tasks]);
  const recurringTasks = useMemo(
    () => data.tasks.filter((task) => task.recurrence && task.recurrence !== "none"),
    [data.tasks],
  );

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
          recurrence,
        },
      ],
    });
    setTitle("");
  }

  function updateTask(taskId: string, changes: Partial<Task>) {
    onDataChange({
      ...data,
      tasks: data.tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
    });
  }

  function toggleTask(taskId: string) {
    onDataChange({
      ...data,
      tasks: data.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              done: !task.done,
              completedAt: !task.done ? new Date().toISOString() : undefined,
            }
          : task,
      ),
    });
  }

  function reactivateTask(task: Task) {
    updateTask(task.id, { done: false, completedAt: undefined });
    setTab("todo");
  }

  if (!expanded) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {data.familyMembers.map((member) => {
            const memberTasks = data.tasks.filter((task) => task.personId === member.id && !task.done);
            return (
              <div key={member.id} className="rounded-3xl bg-white/50 p-3">
                <span className={`mb-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${member.color}`}>
                  {member.name}
                </span>
                <TaskList
                  data={data}
                  tasks={memberTasks.slice(0, 4)}
                  onToggle={toggleTask}
                  onUpdate={updateTask}
                  compact
                />
              </div>
            );
          })}
        </div>
        <TaskForm
          title={title}
          personId={personId}
          recurrence={recurrence}
          data={data}
          onTitleChange={setTitle}
          onPersonChange={setPersonId}
          onRecurrenceChange={setRecurrence}
          onSubmit={addTask}
        />
      </div>
    );
  }

  const visibleTasks = tab === "todo" ? todoTasks : tab === "done" ? doneTasks : recurringTasks;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "todo"} onClick={() => setTab("todo")}>
          À faire ({todoTasks.length})
        </TabButton>
        <TabButton active={tab === "done"} onClick={() => setTab("done")}>
          Déjà faites ({doneTasks.length})
        </TabButton>
        <TabButton active={tab === "recurring"} onClick={() => setTab("recurring")}>
          Récurrentes ({recurringTasks.length})
        </TabButton>
      </div>

      <TaskForm
        title={title}
        personId={personId}
        recurrence={recurrence}
        data={data}
        onTitleChange={setTitle}
        onPersonChange={setPersonId}
        onRecurrenceChange={setRecurrence}
        onSubmit={addTask}
      />

      <TaskList
        data={data}
        tasks={visibleTasks}
        onToggle={toggleTask}
        onUpdate={updateTask}
        onReactivate={reactivateTask}
        showDoneActions={tab === "done"}
        showRecurrence
      />
    </div>
  );
}

function TaskForm({
  title,
  personId,
  recurrence,
  data,
  onTitleChange,
  onPersonChange,
  onRecurrenceChange,
  onSubmit,
}: {
  title: string;
  personId: string;
  recurrence: Task["recurrence"];
  data: AppData;
  onTitleChange: (value: string) => void;
  onPersonChange: (value: string) => void;
  onRecurrenceChange: (value: Task["recurrence"]) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-3xl bg-white/50 p-3 md:grid-cols-[1fr_180px_170px_auto]">
      <input
        className="field"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Nouvelle tâche"
      />
      <select className="field" value={personId} onChange={(event) => onPersonChange(event.target.value)}>
        {data.familyMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <select
        className="field"
        value={recurrence}
        onChange={(event) => onRecurrenceChange(event.target.value as Task["recurrence"])}
      >
        <option value="none">Simple</option>
        <option value="daily">Tous les jours</option>
        <option value="weekly">Chaque semaine</option>
      </select>
      <button className="icon-button" title="Ajouter la tâche">
        <Plus className="h-5 w-5" />
      </button>
    </form>
  );
}

function TaskList({
  data,
  tasks,
  onToggle,
  onUpdate,
  onReactivate,
  compact = false,
  showDoneActions = false,
  showRecurrence = false,
}: {
  data: AppData;
  tasks: Task[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onReactivate?: (task: Task) => void;
  compact?: boolean;
  showDoneActions?: boolean;
  showRecurrence?: boolean;
}) {
  if (tasks.length === 0) {
    return <p className="rounded-2xl bg-white px-4 py-4 font-semibold text-slate-500">Aucune tâche ici.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="grid gap-2 rounded-2xl bg-white p-3 md:grid-cols-[1fr_180px_auto] md:items-center">
          <button
            onClick={() => onToggle(task.id)}
            className="flex min-h-12 items-center gap-3 text-left font-semibold text-slate-800"
          >
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                task.done ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-200 bg-slate-50 text-transparent"
              }`}
            >
              <Check className="h-4 w-4" />
            </span>
            <span className={task.done ? "text-slate-400 line-through" : ""}>{task.title}</span>
          </button>

          {!compact && (
            <select
              className="field min-h-11"
              value={task.personId}
              onChange={(event) => onUpdate(task.id, { personId: event.target.value })}
            >
              {data.familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-between gap-2">
            {showRecurrence && task.recurrence && task.recurrence !== "none" && (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                {task.recurrence === "daily" ? "Quotidienne" : "Hebdomadaire"}
              </span>
            )}
            {showDoneActions && onReactivate && (
              <button
                onClick={() => onReactivate(task)}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Réattribuer
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-11 rounded-2xl px-4 text-sm font-bold transition ${
        active ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
