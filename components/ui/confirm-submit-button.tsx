"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AnimatedDialog, closeAnimatedDialog } from "@/components/ui/animated-dialog";
import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const { pending } = useFormStatus();
  return <><button ref={button} type="submit" disabled={pending} aria-busy={pending} className={cn("pill-button", pending && "button-pending", className)} onClick={(event) => {
    event.preventDefault();
    dialog.current?.showModal();
  }}>{pending ? "正在提交…" : children}</button><AnimatedDialog ref={dialog} aria-label="确认操作" className="m-auto w-[calc(100%_-_2rem)] max-w-md p-6 text-brown"><h2 className="text-xl font-black">再确认一下</h2><p className="mt-3 text-sm leading-7 text-muted">{message}</p><div className="mt-6 flex gap-3"><button type="button" className="pill-button flex-1 bg-stone-100" onClick={() => void closeAnimatedDialog(dialog.current)}>先不操作</button><button type="button" disabled={pending} className="pill-button flex-1" onClick={() => {
    if (confirming) return;
    setConfirming(true);
    void closeAnimatedDialog(dialog.current).then(() => {
      // Release the focus trap before native validation focuses the form.
      button.current?.form?.requestSubmit(button.current);
    }).finally(() => setConfirming(false));
  }}>确认继续</button></div></AnimatedDialog></>;
}
