"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText = "正在送出…",
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={cn("pill-button", className)}
    >
      {pending ? <><LoaderCircle className="size-4 animate-spin" />{pendingText}</> : children}
    </button>
  );
}
