"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

export function MultiImagePicker() {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    },
    [previews],
  );

  return (
    <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-line bg-white/70 p-3 transition hover:border-nailong-deep">
      {previews.length ? (
        <span className="grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            // Blob previews are local-only and do not need Next image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={preview}
              src={preview}
              alt={`待上传照片 ${index + 1}`}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ))}
        </span>
      ) : (
        <span className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-amber-50 text-center text-muted">
          <ImagePlus className="size-9 text-nailong-deep" />
          <span className="font-bold text-brown">选择 1～9 张生活照片</span>
          <span className="text-xs">JPG / PNG / WebP，每张最大 5MB</span>
        </span>
      )}
      <input
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        required
        className="sr-only"
        onChange={(event) => {
          previews.forEach((preview) => URL.revokeObjectURL(preview));
          const files = Array.from(event.target.files ?? []).slice(0, 9);
          if ((event.target.files?.length ?? 0) > 9) {
            event.target.value = "";
            setPreviews([]);
            window.alert("每次最多选择 9 张照片。");
            return;
          }
          setPreviews(files.map((file) => URL.createObjectURL(file)));
        }}
      />
    </label>
  );
}
