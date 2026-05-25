import { Camera, Check, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState, type ChangeEvent } from "react";
import type { AppData } from "../types";
import { createId } from "../utils/localStorage";

type Props = {
  data: AppData;
  onDataChange: (data: AppData) => void;
  expanded?: boolean;
};

type PhotoPreview = {
  src: string;
  label: string;
};

export default function ShoppingList({ data, onDataChange, expanded = false }: Props) {
  const [label, setLabel] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<PhotoPreview | null>(null);

  const shoppingGroups = useMemo(
    () => ({
      todo: data.shoppingItems.filter((item) => !item.checked),
      done: data.shoppingItems.filter((item) => item.checked),
    }),
    [data.shoppingItems],
  );

  function addItem(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;

    onDataChange({
      ...data,
      shoppingItems: [
        ...data.shoppingItems,
        { id: createId("shop"), label: label.trim(), checked: false },
      ],
    });
    setLabel("");
  }

  function setItemChecked(id: string, checked: boolean) {
    onDataChange({
      ...data,
      shoppingItems: data.shoppingItems.map((item) =>
        item.id === id ? { ...item, checked } : item,
      ),
    });
  }

  function deleteItem(id: string) {
    onDataChange({
      ...data,
      shoppingItems: data.shoppingItems.filter((item) => item.id !== id),
    });
  }

  function updatePhoto(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    void resizeImage(file, 720).then((photoUrl) => {
      onDataChange({
        ...data,
        shoppingItems: data.shoppingItems.map((item) =>
          item.id === id ? { ...item, photoUrl } : item,
        ),
      });
      event.target.value = "";
    });
  }

  return (
    <div className="space-y-4">
      {expanded ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ShoppingGroup
            title="À acheter"
            items={shoppingGroups.todo}
            targetChecked={true}
            onSetChecked={setItemChecked}
            onDelete={deleteItem}
            onPhoto={updatePhoto}
            onPreviewPhoto={setPreviewPhoto}
            expanded
          />
          <ShoppingGroup
            title="Déjà achetés"
            items={shoppingGroups.done}
            targetChecked={false}
            onSetChecked={setItemChecked}
            onDelete={deleteItem}
            onPhoto={updatePhoto}
            onPreviewPhoto={setPreviewPhoto}
            expanded
          />
        </div>
      ) : (
        <ShoppingGroup
          title=""
          items={data.shoppingItems.slice(0, 5)}
          targetChecked={true}
          onSetChecked={setItemChecked}
          onDelete={deleteItem}
          onPhoto={updatePhoto}
          onPreviewPhoto={setPreviewPhoto}
        />
      )}

      <form onSubmit={addItem} className="grid grid-cols-[minmax(0,1fr)_56px] gap-3 rounded-3xl bg-white/50 p-3">
        <input
          className="field"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ajouter aux courses"
        />
        <button className="icon-button" title="Ajouter aux courses">
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {previewPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white p-4 shadow-glass">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-slate-950">{previewPhoto.label}</h3>
              <button onClick={() => setPreviewPhoto(null)} className="icon-button" title="Fermer la photo">
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={previewPhoto.src}
              alt={previewPhoto.label}
              className="max-h-[76vh] w-full rounded-3xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingGroup({
  title,
  items,
  targetChecked,
  onSetChecked,
  onDelete,
  onPhoto,
  onPreviewPhoto,
  expanded = false,
}: {
  title: string;
  items: AppData["shoppingItems"];
  targetChecked: boolean;
  onSetChecked: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onPhoto: (id: string, event: ChangeEvent<HTMLInputElement>) => void;
  onPreviewPhoto: (photo: PhotoPreview) => void;
  expanded?: boolean;
}) {
  return (
    <div className="space-y-3">
      {title && <h3 className="text-lg font-black text-slate-950">{title}</h3>}
      {items.length === 0 && (
        <p className="rounded-2xl bg-white px-4 py-4 font-semibold text-slate-500">
          Rien ici pour le moment.
        </p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex min-h-16 items-center gap-3 rounded-2xl bg-white px-3 py-2">
          {(expanded || item.photoUrl) && (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              {item.photoUrl ? (
                <button
                  onClick={() => onPreviewPhoto({ src: item.photoUrl ?? "", label: item.label })}
                  className="h-full w-full"
                  title="Voir la photo en grand"
                >
                  <img src={item.photoUrl} alt={item.label} className="h-full w-full object-cover" />
                </button>
              ) : (
                <label className="flex h-full w-full cursor-pointer items-center justify-center text-slate-400">
                  <Camera className="h-5 w-5" />
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => onPhoto(item.id, event)}
                  />
                </label>
              )}
            </div>
          )}
          <button
            onClick={() => onSetChecked(item.id, targetChecked)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
              item.checked
                ? "border-emerald-400 bg-emerald-500 text-white"
                : "border-slate-200 bg-slate-50 text-transparent"
            }`}
            title={targetChecked ? "Marquer comme acheté" : "Remettre à acheter"}
          >
            <Check className="h-4 w-4" />
          </button>
          <span className={`flex-1 font-semibold ${item.checked ? "text-slate-400 line-through" : "text-slate-800"}`}>
            {item.label}
          </span>
          {expanded && item.photoUrl && (
            <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <Camera className="h-4 w-4" />
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => onPhoto(item.id, event)}
              />
            </label>
          )}
          <button
            onClick={() => onDelete(item.id)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
