import { Plus } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";
import MemberBadge from "./MemberBadge";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function DailyThanks({ data, onDataChange }: Props) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(data.familyMembers[0]?.id ?? "");

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
            <MemberBadge member={findMember(data, message.author)} size="sm" className="mt-2" />
          </div>
        ))}
      </div>
      <form onSubmit={addThanks} className="grid gap-3 rounded-3xl bg-white/50 p-3 sm:grid-cols-[1fr_220px_auto]">
        <input
          className="field"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Moment apprécié"
        />
        <div className="flex items-center gap-2">
          <MemberBadge member={findMember(data, author)} size="sm" />
          <select
            className="field min-h-11 flex-1"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          >
            {data.familyMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <button className="icon-button" title="Ajouter un merci">
          <Plus className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

function findMember(data: AppData, author: string) {
  return data.familyMembers.find((member) => member.id === author || member.name === author);
}
