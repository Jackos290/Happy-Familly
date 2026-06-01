import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, Task } from "../types";
import { createId } from "../utils/localStorage";
import MemberBadge from "./MemberBadge";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  expanded?: boolean;
  selectedMemberId?: string | null;
};

export default function TaskBoard({ data, onDataChange, expanded = false, selectedMemberId = null }: Props) {
  const [title, setTitle] = useState("");
  const [personId, setPersonId] = useState(selectedMemberId ?? data.familyMembers[0]?.id ?? "");
  const [recurrence, setRecurrence] = useState<Task["recurrence"]>("none");
  const [rewardMinutes, setRewardMinutes] = useState(10);
  const [tab, setTab] = useState<"todo" | "done" | "recurring">("todo");
  const members = data.familyMembers ?? [];
  const tasks = data.tasks ?? [];
  const effectivePersonId = selectedMemberId ?? personId ?? members[0]?.id ?? "";

  const filteredTasks = useMemo(
    () => tasks.filter((task) => !selectedMemberId || task.personId === selectedMemberId),
    [tasks, selectedMemberId],
  );
  const visibleMembers = selectedMemberId
    ? members.filter((member) => member.id === selectedMemberId)
    : members;
  const effectiveMemberIndex = members.findIndex((member) => member.id === effectivePersonId);
  const effectiveMemberIsChild = effectiveMemberIndex >= 2 || effectivePersonId.includes("enfant");

  const todoTasks = useMemo(() => filteredTasks.filter((task) => !task.done), [filteredTasks]);
  const doneTasks = useMemo(() => filteredTasks.filter((task) => task.done), [filteredTasks]);
  const recurringTasks = useMemo(
    () => filteredTasks.filter((task) => task.recurrence && task.recurrence !== "none"),
    [filteredTasks],
  );

  useEffect(() => {
    if (selectedMemberId) {
      setPersonId(selectedMemberId);
      return;
    }

    if (!members.some((member) => member.id === personId)) {
      setPersonId(members[0]?.id ?? "");
    }
  }, [members, personId, selectedMemberId]);

  useEffect(() => {
    setRewardMinutes(effectiveMemberIsChild ? 10 : 0);
  }, [effectiveMemberIsChild, effectivePersonId]);

  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !effectivePersonId) return;

    onDataChange({
      ...data,
      tasks: [
        ...tasks,
        {
          id: createId("task"),
          title: title.trim(),
          personId: effectivePersonId,
          done: false,
          recurrence,
          rewardMinutes: Number.isFinite(rewardMinutes) ? rewardMinutes : 0,
        },
      ],
    });
    setTitle("");
  }

  function updateTask(taskId: string, changes: Partial<Task>) {
    onDataChange({
      ...data,
      tasks: tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
    });
  }

  function toggleTask(taskId: string) {
    onDataChange({
      ...data,
      tasks: tasks.map((task) =>
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

  function deleteTask(taskId: string) {
    onDataChange({
      ...data,
      tasks: tasks.filter((task) => task.id !== taskId),
    });
  }

  if (!expanded) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleMembers.map((member) => {
            const memberTasks = tasks.filter((task) => task.personId === member.id && !task.done);
            return (
              <div key={member.id} className="rounded-3xl bg-white/50 p-3">
                <MemberBadge member={member} className="mb-3" />
                <TaskList
                  data={data}
                  tasks={memberTasks.slice(0, 4)}
                  onToggle={toggleTask}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  compact
                />
              </div>
            );
          })}
        </div>
        <TaskForm
          title={title}
          personId={effectivePersonId}
          recurrence={recurrence}
          rewardMinutes={rewardMinutes}
          data={data}
          onTitleChange={setTitle}
          onPersonChange={setPersonId}
          onRecurrenceChange={setRecurrence}
          onRewardMinutesChange={setRewardMinutes}
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
        personId={effectivePersonId}
        recurrence={recurrence}
        rewardMinutes={rewardMinutes}
        data={data}
        onTitleChange={setTitle}
        onPersonChange={setPersonId}
        onRecurrenceChange={setRecurrence}
        onRewardMinutesChange={setRewardMinutes}
        onSubmit={addTask}
      />

      <TaskList
        data={data}
        tasks={visibleTasks}
        onToggle={toggleTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
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
  rewardMinutes,
  data,
  onTitleChange,
  onPersonChange,
  onRecurrenceChange,
  onRewardMinutesChange,
  onSubmit,
}: {
  title: string;
  personId: string;
  recurrence: Task["recurrence"];
  rewardMinutes: number;
  data: AppData;
  onTitleChange: (value: string) => void;
  onPersonChange: (value: string) => void;
  onRecurrenceChange: (value: Task["recurrence"]) => void;
  onRewardMinutesChange: (value: number) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3 rounded-3xl bg-white/50 p-3">
      <input
        className="field min-w-0 flex-[1_1_220px]"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Nouvelle tâche"
      />
      <MemberSelect data={data} value={personId} onChange={onPersonChange} />
      <select
        className="field min-w-32 flex-[1_1_140px]"
        value={recurrence}
        onChange={(event) => onRecurrenceChange(event.target.value as Task["recurrence"])}
      >
        <option value="none">Simple</option>
        <option value="daily">Tous les jours</option>
        <option value="weekly">Chaque semaine</option>
      </select>
      <input
        className="field w-24 shrink-0"
        type="number"
        min="0"
        step="5"
        value={rewardMinutes}
        onChange={(event) => onRewardMinutesChange(Number(event.target.value))}
        title="Minutes gagnées"
      />
      <button className="icon-button shrink-0" title="Ajouter la tâche">
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
  onDelete,
  onReactivate,
  compact = false,
  showDoneActions = false,
  showRecurrence = false,
}: {
  data: AppData;
  tasks: Task[];
  onToggle: (id: string) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onDelete: (id: string) => void;
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
            <MemberSelect data={data} value={task.personId} onChange={(value) => onUpdate(task.id, { personId: value })} />
          )}

          <div className="flex items-center justify-between gap-2">
            {(task.rewardMinutes ?? 0) > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                +{task.rewardMinutes} min
              </span>
            )}
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
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-rose-50 px-3 text-rose-700 transition hover:bg-rose-100"
              title="Supprimer la tâche"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberSelect({
  data,
  value,
  onChange,
}: {
  data: AppData;
  value: string;
  onChange: (value: string) => void;
}) {
  const members = data.familyMembers ?? [];
  const selectedValue = members.some((item) => item.id === value) ? value : members[0]?.id ?? "";
  const member = members.find((item) => item.id === selectedValue);

  return (
    <div className="flex min-w-0 flex-[1_1_160px] items-center gap-2">
      <MemberBadge member={member} size="sm" />
      <select className="field min-h-11 flex-1" value={selectedValue} onChange={(event) => onChange(event.target.value)}>
        {members.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
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
