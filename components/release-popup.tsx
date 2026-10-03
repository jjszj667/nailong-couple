"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { acknowledgeReleaseAction } from "@/app/actions";
import type { ReleaseAnnouncement } from "@/types/database";
import { AnimatedDialog, closeAnimatedDialog } from "@/components/ui/animated-dialog";
import { NailongCompanion } from "@/components/nailong-companion";

export function ReleasePopup({ release, userId }: { release: ReleaseAnnouncement | null; userId: string }) {
  const [open, setOpen] = useState(Boolean(release));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (release && open && !dialog.current?.open) dialog.current?.showModal();
  }, [release, open]);

  useEffect(() => {
    if (!release) return;
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("couple-release-read");
    channel.onmessage = (event) => {
      if (event.data?.releaseId === release.id && event.data?.userId === userId) {
        void closeAnimatedDialog(dialog.current).then(() => setOpen(false));
      }
    };
    return () => channel.close();
  }, [release, userId]);

  if (!release || !open) return null;
  function acknowledge() {
    if (!release || pending) return;
    startTransition(async () => {
      try {
        const available = await acknowledgeReleaseAction(release.id);
        if (available && typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel("couple-release-read");
          channel.postMessage({ releaseId: release.id, userId });
          channel.close();
        }
        await closeAnimatedDialog(dialog.current);
        setOpen(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "保存已读状态失败，请重试。");
      }
    });
  }

  return (
    <AnimatedDialog ref={dialog} aria-labelledby="release-title" onCancel={(event) => {
      event.preventDefault();
      if (!release.is_forced) acknowledge();
    }} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
        event.preventDefault();
        if (!release.is_forced) acknowledge();
      }
    }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg p-5 text-brown sm:p-7">
        {!release.is_forced && (
          <button type="button" aria-label="关闭更新公告" onClick={acknowledge}
            disabled={pending} className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-amber-50">
            <X className="size-5" />
          </button>
        )}
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-nailong-deep">
          <Sparkles className="size-4" /> 版本 {release.version}
        </span>
        <NailongCompanion pose="wave" className="mx-auto mt-4 size-24" />
        <h2 id="release-title" className="mt-4 pr-8 text-2xl font-black text-brown">{release.title}</h2>
        <p className="mt-2 text-xs text-muted">{release.published_at ? new Date(release.published_at).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) : ""}</p>
        <div className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-brown">{release.content}</div>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={acknowledge} disabled={pending}
          className="mt-6 min-h-11 w-full rounded-2xl bg-nailong px-5 py-3 font-bold text-brown disabled:opacity-60">
          {pending ? "正在保存…" : "我知道了"}
        </button>
    </AnimatedDialog>
  );
}
