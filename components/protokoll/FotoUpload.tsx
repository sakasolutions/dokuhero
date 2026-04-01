"use client";

import { useCallback, useRef } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";

const MAX_PHOTOS = 10;
const MAX_EDGE = 1200;
const JPEG_QUALITY = 0.8;

async function compressImageFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > MAX_EDGE || h > MAX_EDGE) {
      const r = Math.min(MAX_EDGE / w, MAX_EDGE / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas nicht verfügbar");
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) {
      throw new Error("Kompression fehlgeschlagen");
    }
    return base64;
  } finally {
    bitmap.close();
  }
}

export interface FotoUploadProps {
  value: string[];
  onChange: (base64Jpeg: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function FotoUpload({
  value,
  onChange,
  maxPhotos = MAX_PHOTOS,
  disabled = false,
}: FotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const next = [...value];
      for (let i = 0; i < files.length; i++) {
        if (next.length >= maxPhotos) break;
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        try {
          const b64 = await compressImageFile(file);
          next.push(b64);
        } catch (e) {
          console.error("Bild konnte nicht verarbeitet werden:", e);
        }
      }
      onChange(next.slice(0, maxPhotos));
    },
    [value, onChange, maxPhotos]
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled || value.length >= maxPhotos}
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex min-h-12 min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Foto mit Kamera aufnehmen"
        >
          <Camera className="h-6 w-6 shrink-0" />
          Kamera
        </button>
        <button
          type="button"
          disabled={disabled || value.length >= maxPhotos}
          onClick={() => galleryInputRef.current?.click()}
          className="inline-flex min-h-12 min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Foto aus Galerie wählen"
        >
          <ImagePlus className="h-6 w-6 shrink-0" />
          Galerie
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        multiple
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        multiple
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-sm text-slate-600">
        {value.length} / {maxPhotos} Fotos · max. 1200px, JPEG 80&nbsp;%
      </p>

      <div className="grid grid-cols-3 gap-2">
        {value.map((b64, index) => (
          <div
            key={`${index}-${b64.slice(0, 20)}`}
            className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${b64}`}
              alt={`Foto ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={disabled}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
              aria-label={`Foto ${index + 1} entfernen`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
