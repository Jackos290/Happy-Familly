import { LayoutDashboard, LockKeyhole, RefreshCw, Settings, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AppData, FamilyMember } from "../types";
import FamilySettings from "./FamilySettings";

export type AccessChoice =
  | { type: "dashboard" }
  | { type: "member"; memberId: string };

type Props = {
  data: AppData;
  syncStatus: string;
  onChoose: (choice: AccessChoice) => void;
  onDataChange: (data: AppData) => void;
};

export default function AccessChooser({ data, syncStatus, onChoose, onDataChange }: Props) {
  const children = data.familyMembers.slice(2);
  const parents = data.familyMembers.slice(0, 2);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function keepFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  return (
    <main onPointerDownCapture={keepFullscreen} className="min-h-screen bg-[#151229] px-5 py-6 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl flex-col justify-center gap-6">
        <div className="rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-6 shadow-glass backdrop-blur-2xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-serif text-lg font-black italic text-[#ffd38a]">Famille</p>
              <h1 className="mt-3 font-serif text-4xl font-black italic tracking-tight sm:text-6xl">Qui es-tu ?</h1>
              <p className="mt-2 text-sm font-bold text-white/65">Choisis ton profil pour commencer</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-[#3a3463] bg-[#17142c] px-4 py-2 text-sm font-semibold text-white/70 sm:inline-flex">
                <RefreshCw className="h-4 w-4" />
                {syncStatus}
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34305a] text-[#ffd38a]"
                title="Options famille"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {children.map((member) => (
              <ProfileCard
                key={member.id}
                member={member}
                label="Espace enfant"
                onClick={() => onChoose({ type: "member", memberId: member.id })}
              />
            ))}
            {parents.map((member) => (
              <ProfileCard
                key={member.id}
                member={member}
                label="Espace parent"
                parent
                onClick={() => onChoose({ type: "member", memberId: member.id })}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => onChoose({ type: "dashboard" })}
          className="mx-auto flex min-h-20 w-full max-w-4xl items-center rounded-[1.5rem] border border-[#3a3463] bg-[#211d3d] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffd38a]"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34305a] text-[#ffd38a]">
            <LayoutDashboard className="h-6 w-6" />
          </span>
          <span className="ml-4">
            <span className="block text-xl font-black">Dashboard salon</span>
            <span className="block text-sm font-semibold text-white/50">Vue complète pour la tablette.</span>
          </span>
        </button>
      </section>

      {settingsOpen && (
        <Modal title="Options famille" onClose={() => setSettingsOpen(false)}>
          <FamilySettings data={data} onDataChange={onDataChange} canEditPins />
        </Modal>
      )}
    </main>
  );
}

function ProfileCard({
  member,
  label,
  parent = false,
  onClick,
}: {
  member: FamilyMember;
  label: string;
  parent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative min-h-44 rounded-[1.5rem] border border-[#3a3463] bg-[#211d3d] p-5 text-center shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#83efb2]"
    >
      <span className="mx-auto inline-flex h-20 w-20 overflow-hidden rounded-full bg-[#34305a] shadow-sm">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${member.color}`}>
            {parent ? <LockKeyhole className="h-7 w-7" /> : <UserRound className="h-7 w-7" />}
          </span>
        )}
      </span>
      <span className="mt-5 block text-xl font-black">{member.name}</span>
      <span className="mt-1 block font-serif text-sm font-black italic text-[#ffd38a]">{label}</span>
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151229]/80 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[2rem] border border-[#3a3463] bg-[#1d1935] p-5 text-white shadow-glass">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34305a] text-white" title="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
