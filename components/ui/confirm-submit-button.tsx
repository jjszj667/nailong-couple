"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  return <button type="submit" className={cn("pill-button", className)} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
