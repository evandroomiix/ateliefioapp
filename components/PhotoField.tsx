"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

type PhotoFieldProps = {
  currentUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemoveCurrent?: () => void;
  label?: string;
  hint?: string;
};

export function PhotoField({
  currentUrl,
  file,
  onFileChange,
  onRemoveCurrent,
  label = "Foto da amostra",
  hint = "Tire uma foto agora ou escolha da galeria.",
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const displayUrl = preview || currentUrl || null;

  const handleFile = (selected: File | null) => {
    setError("");
    if (!selected) {
      onFileChange(null);
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    if (selected.size > 12 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 12 MB.");
      return;
    }
    onFileChange(selected);
  };

  const remove = () => {
    onFileChange(null);
    onRemoveCurrent?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-stone-700">{label}</span>
        <span className="text-[11px] text-stone-400">JPG, PNG ou WEBP</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />

      <div className="relative overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-50">
        {displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Prévia da foto"
              className="h-40 w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-stone-950/70 to-transparent p-2.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm"
              >
                <Camera className="h-3.5 w-3.5" />
                Trocar
              </button>
              <button
                type="button"
                onClick={remove}
                className="rounded-xl bg-white/95 p-2 text-stone-600 shadow-sm hover:text-rose-600"
                aria-label="Remover foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-40 w-full flex-col items-center justify-center gap-2 text-stone-400 transition hover:bg-stone-100/70 hover:text-rose-500"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold">Adicionar foto</span>
            <span className="text-[11px]">A câmera será aberta no celular</span>
          </button>
        )}
      </div>
      {error ? <p className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p> : null}
      {!error ? <p className="mt-1.5 text-[11px] leading-snug text-stone-400">{hint}</p> : null}
    </div>
  );
}
