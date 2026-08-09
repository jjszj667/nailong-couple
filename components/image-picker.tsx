"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";

export function ImagePicker({ name = "image", label = "选择一张照片", required = false }: { name?: string; label?: string; required?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <label className="group block cursor-pointer rounded-3xl border-2 border-dashed border-line bg-white/70 p-3 text-center transition hover:border-nailong-deep">
      {preview ? (
        <MediaImage src={preview} alt="待上传照片预览" className="aspect-[4/3] w-full rounded-2xl" />
      ) : (
        <span className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-amber-50 text-muted">
          <ImagePlus className="size-10 text-nailong-deep" />
          <span className="font-medium">{label}</span>
          <span className="text-xs">JPG / PNG / WebP，最大 5MB</span>
        </span>
      )}
      <input
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (preview) URL.revokeObjectURL(preview);
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
    </label>
  );
}
