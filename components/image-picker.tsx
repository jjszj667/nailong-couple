"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { compressImage, formatImageBytes, type ImagePurpose } from "@/lib/image-compression";

export function ImagePicker({ name = "image", label = "选择一张照片", required = false, purpose = "memory" }: { name?: string; label?: string; required?: boolean; purpose?: ImagePurpose }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

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
    <label className="group block cursor-pointer rounded-3xl border-2 border-dashed border-line bg-white/70 p-3 text-center transition hover:border-nailong-deep">
      {preview ? (
        <MediaImage src={preview} alt="待上传照片预览" className="aspect-[4/3] w-full rounded-2xl" />
      ) : (
        <span className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl bg-amber-50 text-muted">
          <ImagePlus className="size-10 text-nailong-deep" />
          <span className="font-medium">{label}</span>
          <span className="text-xs">JPG / PNG / WebP / HEIC，选择后自动转换压缩</span>
        </span>
      )}
      {status && <span className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-nailong-deep"><LoaderCircle className="size-4 animate-spin" />{status}</span>}
      {error && <span className="mt-3 block text-xs font-bold text-red-600">{error}</span>}
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        required={required}
        className="sr-only"
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (preview) URL.revokeObjectURL(preview);
          setPreview(null);
          setError(null);
          if (!file) return;
          input.value = "";
          setProcessing(true);
          setStatus("正在转换和优化照片…");
          try {
            const compressed = await compressImage(file, purpose);
            const transfer = new DataTransfer();
            transfer.items.add(compressed.file);
            input.files = transfer.files;
            setPreview(URL.createObjectURL(compressed.file));
            setProcessing(false);
            setStatus(`${formatImageBytes(compressed.originalBytes)} → ${formatImageBytes(compressed.compressedBytes)}`);
            window.setTimeout(() => setStatus(null), 1800);
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
