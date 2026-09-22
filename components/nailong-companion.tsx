"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const poses = {
  wave: { label: "挥手打招呼的奶龙", message: "今天的小快乐，也要好好收藏。" },
  love: { label: "抱着爱心的奶龙", message: "给你一个抱抱，今天也辛苦啦。" },
  meal: { label: "捧着饭碗的奶龙", message: "好好吃饭，是照顾自己的第一步。" },
  sleep: { label: "闭眼休息的奶龙", message: "慢一点也没关系，我陪着你。" },
};
export type NailongPose = keyof typeof poses;

export function NailongCompanion({ pose = "wave", className, interactive = false }: {
  pose?: NailongPose;
  className?: string;
  interactive?: boolean;
}) {
  const [step, setStep] = useState(0);
  const order: NailongPose[] = [pose, ...(["wave", "love", "meal", "sleep"] as const).filter((item) => item !== pose)];
  const current = order[step % order.length];
  const art = <span key={current} className={cn("nailong-art", `nailong-${current}`)} role={interactive ? undefined : "img"} aria-label={interactive ? undefined : poses[current].label} aria-hidden={interactive || undefined} />;
  if (!interactive) return <span className={cn("nailong-figure", className)}>{art}</span>;
  return (
    <div className={cn("nailong-play", className)}>
      <button type="button" className="nailong-figure" onClick={() => setStep((value) => value + 1)} aria-label={`${poses[current].label}，点击切换动作`}>
        {art}
      </button>
      <span className="nailong-caption" aria-live="polite">{step ? poses[current].message : "戳戳我，送你一点好心情"}</span>
    </div>
  );
}

export function PageCompanion() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  const pose: NailongPose = pathname.startsWith("/checkin") ? "meal" : /\/(wishes|story|memories|calendar)/.test(pathname) ? "love" : pathname.startsWith("/profile") ? "sleep" : "wave";
  return (
    <aside className="page-shell companion-strip" aria-label="奶龙的小陪伴">
      <NailongCompanion pose={pose} className="size-20" />
      <div><p className="text-xs font-bold tracking-wider text-nailong-deep">奶龙陪你 · 慢慢记录</p><p className="mt-1 text-sm text-muted">{poses[pose].message}</p></div>
      <span aria-hidden="true" className="ml-auto hidden text-2xl text-nailong-deep sm:block">✦</span>
    </aside>
  );
}
