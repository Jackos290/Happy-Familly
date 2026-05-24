import { Camera, UserRound } from "lucide-react";
import type { ChangeEvent } from "react";
import type { AppData, FamilyMember } from "../types";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
};

export default function FamilySettings({ data, onDataChange }: Props) {
  function updateMember(memberId: string, changes: Partial<FamilyMember>) {
    onDataChange({
      ...data,
      familyMembers: data.familyMembers.map((member) =>
        member.id === memberId ? { ...member, ...changes } : member,
      ),
    });
  }

  function updatePhoto(memberId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    void resizeImage(file, 512).then((photoUrl) => {
      updateMember(memberId, { photoUrl });
      event.target.value = "";
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.familyMembers.map((member) => (
        <div key={member.id} className="rounded-3xl bg-white/60 p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-3xl bg-slate-100">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <UserRound className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <input
                className="field"
                value={member.name}
                onChange={(event) => updateMember(member.id, { name: event.target.value })}
                aria-label={`Prenom de ${member.name}`}
              />
            </div>
          </div>

          <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-700">
            <Camera className="h-4 w-4" />
            Photo
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => updatePhoto(member.id, event)}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function resizeImage(file: File, maxSize: number) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Impossible de lire la photo"));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("Impossible de charger la photo"));
      image.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Impossible de préparer la photo"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}
