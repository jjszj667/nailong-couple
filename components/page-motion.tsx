"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function PageMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const node = root.current;
    if (!node || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    const targets = node.querySelectorAll(".soft-card, .explore-tile, .feature-hero");
    // Only animate: content remains readable if JS or the observer fails.
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname]);
  return <div ref={root} className="page-motion" key={pathname}>{children}</div>;
}
