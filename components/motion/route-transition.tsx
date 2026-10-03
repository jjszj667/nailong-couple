"use client";
import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <ViewTransition key={pathname} enter={{ "nav-forward": "niwa-forward", "nav-back": "niwa-back", default: "niwa-enter" }} exit={{ "nav-forward": "niwa-forward", "nav-back": "niwa-back", default: "niwa-exit" }} default="none"><div className="route-content">{children}</div></ViewTransition>;
}
export function SharedVisual({ name, children }: { name: string; children: ReactNode }) {
  return <ViewTransition name={name} share="niwa-morph" default="none"><div className="shared-visual">{children}</div></ViewTransition>;
}
