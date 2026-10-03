"use client";
import { addTransitionType, startTransition, useRef, ViewTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function CalendarMotion({ month, children, previousMonth, nextMonth, onMonthChange }: { month: string; children: ReactNode; previousMonth?: string; nextMonth?: string; onMonthChange?: (month: string) => void }) {
  const router = useRouter();
  const grid = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const selected = useRef<Element | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  function finishTouch(event: React.PointerEvent<HTMLDivElement>) {
    if (!touch.current || event.pointerType !== "touch") return;
    const dx = event.clientX - touch.current.x;
    const dy = event.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 65 || Math.abs(dy) > 40) return;
    const target = dx < 0 ? nextMonth : previousMonth;
    if (!target || !/^\d{4}-\d{2}$/.test(target)) return;
    swiped.current = true;
    if (onMonthChange) startTransition(() => { addTransitionType(dx < 0 ? "month-next" : "month-prev"); onMonthChange(target); });
    else router.push(`/calendar?month=${target}`, { scroll: false, transitionTypes: [dx < 0 ? "month-next" : "month-prev"] });
  }
  function select(element: Element | null) {
    const day = element?.closest<HTMLAnchorElement>("[data-calendar-day]");
    if (!day || !grid.current || !indicator.current) return;
    if (day === selected.current) { indicator.current.style.opacity = "1"; return; }
    selected.current = day;
    const box = day.getBoundingClientRect();
    const container = grid.current.getBoundingClientRect();
    const style = indicator.current.style;
    style.width = `${box.width}px`;
    style.height = `${box.height}px`;
    style.transform = `translate(${box.left - container.left}px,${box.top - container.top}px)`;
    style.opacity = "1";
  }
  return <ViewTransition key={month} name="calendar-month" share={{ "month-next": "niwa-month-next", "month-prev": "niwa-month-prev", default: "niwa-morph" }} default="none"><div ref={grid} className="calendar-motion" onPointerMove={(event) => { if (event.pointerType === "mouse") select(event.target as Element); }} onFocus={(event) => select(event.target)} onPointerDown={(event) => { swiped.current = false; select(event.target as Element); if (event.pointerType === "touch") touch.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={finishTouch} onPointerCancel={() => { touch.current = null; }} onClickCapture={(event) => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }} onPointerLeave={() => { if (indicator.current) indicator.current.style.opacity = "0"; }}><span ref={indicator} className="calendar-selection" aria-hidden="true" />{children}</div></ViewTransition>;
}
