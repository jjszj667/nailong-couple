"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { compressImage, formatImageBytes } from "@/lib/image-compression";

export function MultiImagePicker() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    },
    [previews],
  );

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form || !processing) return;
    const block = (event: SubmitEvent) => {
      event.preventDefault();
      window.alert("照片还在处理中，请稍等一下。");
    };
    form.addEventListener("submit", block);
    return () => form.removeEventListener("submit", block);
  }, [processing]);

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
          <span className="text-xs">JPG / PNG / WebP，选择后逐张自动压缩</span>
        </span>
      )}
      {status && <span className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-nailong-deep"><LoaderCircle className="size-4 animate-spin" />{status}</span>}
      {error && <span className="mt-3 block text-center text-xs font-bold text-red-600">{error}</span>}
      <input
        ref={inputRef}
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        required
        className="sr-only"
        onChange={async (event) => {
          const input = event.currentTarget;
          previews.forEach((preview) => URL.revokeObjectURL(preview));
          const files = Array.from(input.files ?? []).slice(0, 9);
          if ((input.files?.length ?? 0) > 9) {
            input.value = "";
            setPreviews([]);
            window.alert("每次最多选择 9 张照片。");
            return;
          }
          input.value = "";
          setPreviews([]);
          setError(null);
          setProcessing(true);
          setStatus(`正在处理 1/${files.length}…`);
          try {
            const compressed = [];
            for (let index = 0; index < files.length; index += 1) {
              setStatus(`正在处理 ${index + 1}/${files.length}…`);
              compressed.push(await compressImage(files[index], "memory"));
            }
            const transfer = new DataTransfer();
            compressed.forEach((item) => transfer.items.add(item.file));
            input.files = transfer.files;
            setPreviews(compressed.map((item) => URL.createObjectURL(item.file)));
            setProcessing(false);
            const before = compressed.reduce((sum, item) => sum + item.originalBytes, 0);
            const after = compressed.reduce((sum, item) => sum + item.compressedBytes, 0);
            setStatus(`处理完成：${formatImageBytes(before)} → ${formatImageBytes(after)}`);
            window.setTimeout(() => setStatus(null), 2200);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "图片处理失败，请重试。");
            setProcessing(false);
            setStatus(null);
          }
        }}
      />
    </label>
  );
}
