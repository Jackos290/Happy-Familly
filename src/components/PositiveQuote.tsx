import { Save } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppData } from "../types";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function PositiveQuote({ data, onDataChange }: Props) {
  const [quote, setQuote] = useState(data.positiveQuote);

  function saveQuote(event: FormEvent) {
    event.preventDefault();
    if (!quote.trim()) return;

    onDataChange({
      ...data,
      positiveQuote: quote.trim(),
    });
  }

  return (
    <div className="space-y-4">
      <blockquote className="rounded-[1.5rem] bg-white/60 p-5 text-2xl font-bold leading-tight text-slate-950">
        â€œ{data.positiveQuote}â€
      </blockquote>
      <form onSubmit={saveQuote} className="flex gap-3">
        <input
          className="field"
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          placeholder="Nouvelle phrase positive"
        />
        <button className="icon-button" title="Enregistrer">
          <Save className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
