"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const poses = {
  camera: { label: "举起相机眨眼的奶龙", message: "咔嚓！把今天的可爱留下来。" },
  gift: { label: "捧着礼物惊喜的奶龙", message: "这一份开心，专门留给你。" },
  calendar: { label: "抱着爱心日历的奶龙", message: "每一个特别的日子，我都记得。" },
  travel: { label: "背着小背包出发的奶龙", message: "下一站，也想和你一起去。" },
  journal: { label: "认真写日记的奶龙", message: "今天的故事，从一句话开始。" },
  celebrate: { label: "举起星星奖杯的奶龙", message: "为认真生活的你，颁个小奖！" },
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
  const order: NailongPose[] = [pose, ...(Object.keys(poses) as NailongPose[]).filter((item) => item !== pose)];
  const current = order[step % order.length];
  const art = <span key={current} className={cn("nailong-art", `nailong-${current}`, ["camera", "gift", "calendar", "travel", "journal", "celebrate"].includes(current) && "nailong-feature-art")} role={interactive ? undefined : "img"} aria-label={interactive ? undefined : poses[current].label} aria-hidden={interactive || undefined} />;
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

export function RouteCompanion({ className }: { className?: string }) {
  const pathname = usePathname();
  const section = pathname.split('/').filter(Boolean).filter((part) => part !== 'admin')[0];
  const routePoses: Record<string, NailongPose> = { checkin: 'meal', checkins: 'meal', moods: 'love', shop: 'gift', products: 'gift', orders: 'gift', mysteries: 'gift', wishes: 'love', calendar: 'calendar', memories: 'camera', storage: 'camera', story: 'journal', daily: 'journal', places: 'travel', achievements: 'celebrate', wallet: 'celebrate', profile: 'sleep', settings: 'sleep', announcements: 'journal', releases: 'wave' };
  return <NailongCompanion pose={routePoses[section] ?? 'wave'} className={className} />;
}
