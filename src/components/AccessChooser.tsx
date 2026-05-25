import { LayoutDashboard, RefreshCw, UserRound } from "lucide-react";
import type { AppData } from "../types";

export type AccessChoice =
  | { type: "dashboard" }
  | { type: "member"; memberId: string };

type Props = {
  data: AppData;
  syncStatus: string;
  onChoose: (choice: AccessChoice) => void;
};

export default function AccessChooser({ data, syncStatus, onChoose }: Props) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#fff7ed_72%,#f8fafc_100%)] px-5 py-6 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-center gap-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-glass backdrop-blur-2xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-700">Happy Familly</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Qui utilise l'application ?</h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              <RefreshCw className="h-4 w-4" />
              {syncStatus}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => onChoose({ type: "dashboard" })}
              className="min-h-44 rounded-[1.5rem] bg-slate-950 p-5 text-left text-white shadow-glass transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
                <LayoutDashboard className="h-7 w-7" />
              </span>
              <span className="mt-6 block text-2xl font-black">Dashboard salon</span>
              <span className="mt-2 block text-sm font-semibold text-slate-300">Vue complète pour la tablette.</span>
            </button>

            {data.familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => onChoose({ type: "member", memberId: member.id })}
                className="min-h-44 rounded-[1.5rem] border border-white/80 bg-white/75 p-5 text-left shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
              >
                <span className="inline-flex h-16 w-16 overflow-hidden rounded-full bg-slate-100 shadow-sm">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className={`flex h-full w-full items-center justify-center ${member.color}`}>
                      <UserRound className="h-7 w-7" />
                    </span>
                  )}
                </span>
                <span className="mt-5 block text-2xl font-black">{member.name}</span>
                <span className="mt-2 block text-sm font-semibold text-slate-500">Tâches, rendez-vous et suivi personnel.</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
