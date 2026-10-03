"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, sceneForPath } from "@/lib/motion";

export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const node = root.current;
    if (!node || !window.IntersectionObserver) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");
    let frame = 0;
    let tilted: HTMLElement | null = null;
    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("motion-in-view", entry.isIntersecting);
        if (entry.isIntersecting && !reduced.matches) entry.target.classList.add("is-revealed");
      }
    }, { threshold: 0.08 });
    function discover() {
      node?.querySelectorAll<HTMLElement>(".soft-card, .explore-tile, .feature-hero, .home-hero, .story-step, .empty-state").forEach((el, index) => {
        if (observed.has(el)) return;
        observed.add(el);
        el.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * motion.stagger}ms`);
        el.dataset.motionVariant = el.matches(".feature-hero,.home-hero") ? "hero" : el.matches(".explore-tile") ? "explore" : el.matches(".empty-state") ? "empty" : "card";
        observer.observe(el);
      });
    }
    discover();
    const mutations = new MutationObserver(discover);
    mutations.observe(node, { childList: true, subtree: true });
    const reset = () => {
      if (tilted) { tilted.style.removeProperty("--tilt-x"); tilted.style.removeProperty("--tilt-y"); tilted = null; }
    };
    const pointer = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || frame) return;
      const el = (event.target as Element).closest<HTMLElement>(".home-hero,.explore-tile,.feature-hero");
      if (!el) { reset(); return; }
      if (tilted !== el) reset();
      tilted = el;
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        el.style.setProperty("--tilt-x", `${((event.clientY - box.top) / box.height - .5) * -3}deg`);
        el.style.setProperty("--tilt-y", `${((event.clientX - box.left) / box.width - .5) * 3}deg`);
        frame = 0;
      });
    };
    node.addEventListener("pointermove", pointer, { passive: true });
    node.addEventListener("pointerleave", reset);
    return () => { observer.disconnect(); mutations.disconnect(); cancelAnimationFrame(frame); reset(); node.removeEventListener("pointermove", pointer); node.removeEventListener("pointerleave", reset); };
  }, [pathname]);
  return <div ref={root} className="page-motion" data-scene={sceneForPath(pathname)}>{children}</div>;
}
