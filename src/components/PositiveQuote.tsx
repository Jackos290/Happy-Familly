import type { AppData } from "../types";
import { getDailyQuote } from "../utils/dailyQuote";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function PositiveQuote({ data, onDataChange }: Props) {
  const quote = data.positiveQuote || getDailyQuote();

  function refreshDailyQuote() {
    onDataChange({
      ...data,
      positiveQuote: getDailyQuote(),
    });
  }

  return (
    <div className="space-y-4">
      <blockquote className="rounded-[1.5rem] bg-white/60 p-5 text-2xl font-bold leading-tight text-slate-950">
        “{quote}”
      </blockquote>
      <button
        onClick={refreshDailyQuote}
        className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-700"
      >
        Phrase automatique du jour
      </button>
    </div>
  );
}
