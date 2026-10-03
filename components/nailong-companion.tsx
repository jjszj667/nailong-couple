"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { companionCanAnimate, mobileCompanionPoses, nextCompanionStep } from "@/lib/companion-motion";
import { NiwaMotif } from "@/components/ui/niwa-motif";

const poses = {
  dance: { label: "张开双手跳舞的奶龙", message: "快乐摇一摇，今天也要元气满满。" },
  balloon: { label: "举着爱心气球打招呼的奶龙", message: "把喜欢，轻轻送到你身边。" },
  raincoat: { label: "穿着小雨衣撑伞的奶龙", message: "晴天雨天，都想和你一起走。" },
  chef: { label: "戴厨师帽捧着饭碗的奶龙", message: "开饭啦，认真吃饭的人最可爱。" },
  gardener: { label: "抱着向日葵的园艺奶龙", message: "把日子种成花，慢慢等它盛开。" },
  stargaze: { label: "戴睡帽抱着星星的奶龙", message: "今天辛苦啦，给你一颗温柔的星星。" },
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

export function NailongCompanion({ pose = "wave", className, interactive = false, autoplay = false, priority = false }: {
  pose?: NailongPose;
  className?: string;
  interactive?: boolean;
  autoplay?: boolean;
  priority?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement & HTMLSpanElement>(null);
  const order: NailongPose[] = [pose, ...(Object.keys(poses) as NailongPose[]).filter((item) => item !== pose)];
  const cycle: NailongPose[] = autoplay ? [pose, ...mobileCompanionPoses.filter((item) => item !== pose)] : order;
  const current = cycle[step % cycle.length];
  const isNew = (mobileCompanionPoses as readonly string[]).includes(current);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      const awake = companionCanAnimate(visible, document.hidden, reduced.matches, paused);
      node.dataset.awake = String(awake);
      if (awake && autoplay && interactive) timer = setInterval(() => setStep(value => nextCompanionStep(value, cycle.length)), 6000);
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .15 });
    if (observer) observer.observe(node);
    else visible = true;
    sync();
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => { clearInterval(timer); observer?.disconnect(); document.removeEventListener("visibilitychange", sync); reduced.removeEventListener("change", sync); };
  }, [autoplay, interactive, paused, cycle.length]);
  const art = <span key={current} className={cn("nailong-art", `nailong-${current}`, isNew && "nailong-mobile-art", ["camera", "gift", "calendar", "travel", "journal", "celebrate"].includes(current) && "nailong-feature-art")} role={interactive ? undefined : "img"} aria-label={interactive ? undefined : poses[current].label} aria-hidden={interactive || undefined}>{isNew && <Image unoptimized src={`/nailong/mobile-v4/${current}.webp`} width={512} height={512} alt="" loading={priority ? "eager" : "lazy"} />}</span>;
  const accents = <span className="companion-accents" aria-hidden="true"><NiwaMotif className="companion-spark" /><Heart className="companion-heart" fill="currentColor" /><span className="companion-ground" /></span>;
  if (!interactive) return <span ref={root} data-awake="false" data-pose={current} className={cn("nailong-figure", className)}>{accents}{art}</span>;
  return (
    <div ref={root} data-awake="false" data-pose={current} className={cn("nailong-play", autoplay && "companion-autoplay", className)}>
      <button type="button" className="nailong-figure" onClick={() => setStep(value => nextCompanionStep(value, cycle.length))} aria-label={`${poses[current].label}，点击切换动作`}>
        {accents}{art}
      </button>
      <span className="nailong-caption">{step ? poses[current].message : "戳戳我，送你一点好心情"}</span>
      {autoplay && <button type="button" className="companion-pause" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "继续播放动作" : "暂停动作轮播"}</button>}
    </div>
  );
}

export function RouteCompanion({ className }: { className?: string }) {
  const pathname = usePathname();
  const section = pathname.split('/').filter(Boolean).filter((part) => part !== 'admin')[0];
  const routePoses: Record<string, NailongPose> = { checkin: 'chef', checkins: 'chef', moods: 'love', shop: 'gift', products: 'gift', orders: 'gift', mysteries: 'gift', wishes: 'balloon', calendar: 'calendar', memories: 'camera', storage: 'camera', story: 'journal', daily: 'journal', places: 'raincoat', achievements: 'gardener', wallet: 'dance', profile: 'stargaze', settings: 'stargaze', announcements: 'journal', releases: 'balloon' };
  return <NailongCompanion pose={routePoses[section] ?? 'wave'} className={className} />;
}
