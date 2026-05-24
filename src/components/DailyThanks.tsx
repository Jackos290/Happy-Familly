import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function DailyThanks({ data, onDataChange }: Props) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(data.familyMembers[0]?.name ?? "Famille");

  function addThanks(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    onDataChange({
      ...data,
      thanksMessages: [
        {
          id: createId("thanks"),
          text: text.trim(),
          author,
        },
        ...data.thanksMessages,
      ],
    });
    setText("");
  }

  return (
    <div className="space-y-4">
      <div className="max-h-52 space-y-3 overflow-auto pr-1">
        {data.thanksMessages.map((message) => (
          <div key={message.id} className="rounded-2xl bg-white px-4 py-3">
            <p className="font-semibold text-slate-800">{message.text}</p>
            <p className="mt-2 text-sm font-bold text-rose-600">{message.author}</p>
          </div>
        ))}
      </div>
      <form onSubmit={addThanks} className="grid gap-3 rounded-3xl bg-white/50 p-3 sm:grid-cols-[1fr_145px_auto]">
        <input
          className="field"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Moment apprécié"
        />
        <select
          className="field"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
        >
          {data.familyMembers.map((member) => (
            <option key={member.id} value={member.name}>
              {member.name}
            </option>
          ))}
        </select>
        <button className="icon-button" title="Ajouter un merci">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
