"use client";
import { useEffect, useRef } from "react";
import { interpolateNumber, motion } from "@/lib/motion";

export function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function run(from: number) {
      const start = performance.now();
      function tick(now: number) {
        if (!el) return;
        const progress = (now - start) / motion.cinematic;
        el.textContent = interpolateNumber(from, value, progress).toLocaleString("zh-CN");
        if (progress < 1 && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick);
        else el.textContent = value.toLocaleString("zh-CN");
      }
      frame = requestAnimationFrame(tick);
    }
    if (!reduced.matches) {
      if (previous.current !== value) run(previous.current);
      else if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { observer?.disconnect(); run(0); }
        });
        observer.observe(el);
      }
    }
    previous.current = value;
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [value]);
  return <span className={`animated-number ${className}`} aria-label={value.toLocaleString("zh-CN")}><span className="number-measure" aria-hidden="true">{value.toLocaleString("zh-CN")}</span><span ref={node} aria-hidden="true">{value.toLocaleString("zh-CN")}</span></span>;
}
