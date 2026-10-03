"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sceneForPath } from "@/lib/motion";

export function MotionEnvironment() {
  const node = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");
    let frame = 0;
    const visibility = () => { el.dataset.paused = String(document.hidden || reduced.matches); };
    const pointer = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || document.hidden || frame) return;
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--pointer-x", `${(event.clientX / innerWidth - .5) * 24}px`);
        el.style.setProperty("--pointer-y", `${(event.clientY / innerHeight - .5) * 20}px`);
        frame = 0;
      });
    };
    const mood = (event: Event) => {
      const color = (event as CustomEvent<string>).detail;
      if (/^#[\da-f]{6}$/i.test(color)) { el.style.setProperty("--environment-mood", color); el.style.setProperty("--environment-a", color); }
    };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", visibility);
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("niwa:mood", mood);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", visibility);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("niwa:mood", mood);
    };
  }, []);
  useEffect(() => { node.current?.style.removeProperty("--environment-mood"); node.current?.style.removeProperty("--environment-a"); }, [pathname]);
  return <div ref={node} className="motion-environment" data-scene={sceneForPath(pathname)} aria-hidden="true"><span className="ambient-orb orb-one" /><span className="ambient-orb orb-two" /><span className="ambient-grid" /><span className="ambient-spark spark-one" /><span className="ambient-spark spark-two" /></div>;
}
