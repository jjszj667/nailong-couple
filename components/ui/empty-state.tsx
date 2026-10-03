import { RouteCompanion } from "@/components/nailong-companion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NiwaMotif } from "@/components/ui/niwa-motif";

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  variant = "warm",
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: "warm" | "technical" | "quiet";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "empty-state flex flex-col items-center justify-center rounded-[1.75rem] border text-center",
        variant === "warm" && "border-amber-200 bg-amber-50/70",
        variant === "technical" && "border-stone-200 bg-stone-50",
        variant === "quiet" && "border-dashed border-line bg-white/50",
        size === "sm" ? "px-4 py-8" : size === "lg" ? "px-6 py-16" : "px-5 py-12",
        className,
      )}
      role="status"
    >
      <div className="empty-illustration"><NiwaMotif kind="orbit" className="empty-orbit" />{illustration ?? <RouteCompanion className="size-28" />}{Icon && <span className="empty-symbol"><Icon className="size-5" aria-hidden="true" /></span>}<NiwaMotif className="empty-spark" /></div>
      <h2 className="mt-4 font-black text-brown">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>}
      {(action || secondaryAction) && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}{secondaryAction}</div>}
    </div>
  );
}
