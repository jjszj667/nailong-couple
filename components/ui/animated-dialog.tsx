"use client";
import type { ComponentPropsWithRef } from "react";
import { motion } from "@/lib/motion";
import { cn } from "@/lib/utils";

export async function closeAnimatedDialog(dialog: HTMLDialogElement | null) {
  if (!dialog?.open || dialog.dataset.closing === "true") return;
  dialog.dataset.closing = "true";
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) await new Promise<void>((resolve) => setTimeout(resolve, motion.fast));
  dialog.close();
  delete dialog.dataset.closing;
}
export function AnimatedDialog({ className, children, onCancel, onClick, ...props }: ComponentPropsWithRef<"dialog">) {
  return <dialog {...props} className={cn("niwa-dialog", className)} onCancel={(event) => {
    onCancel?.(event);
    if (!event.defaultPrevented) { event.preventDefault(); void closeAnimatedDialog(event.currentTarget); }
  }} onClick={(event) => {
    onClick?.(event);
    if (event.target === event.currentTarget && !event.defaultPrevented) {
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) void closeAnimatedDialog(event.currentTarget);
    }
  }}>{children}</dialog>;
}
