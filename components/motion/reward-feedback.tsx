"use client";
import { useEffect, useRef } from "react";
import { NailongCompanion } from "@/components/nailong-companion";
import { NiwaMotif } from "@/components/ui/niwa-motif";
import { AnimatedNumber } from "@/components/motion/animated-number";

export function RewardFeedback({ kind, amount, receipt }: { kind: "normal" | "makeup" | "redeem" | "mood"; amount?: number; receipt?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const flight = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = stage.current;
    const layer = flight.current;
    if (!root || !layer) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let replay = false;
    if (receipt) {
      try {
        replay = Boolean(sessionStorage.getItem(`niwa-feedback:${receipt}`));
        sessionStorage.setItem(`niwa-feedback:${receipt}`, "seen");
      } catch { /* Presentation must work with storage blocked. */ }
    }
    if (reduced.matches || replay || !amount || amount <= 0) { layer.classList.add("finished"); return; }
    const origin = root.getBoundingClientRect();
    const target = document.querySelector<HTMLElement>("[data-wallet-target]")?.getBoundingClientRect();
    const destination = target ?? root.querySelector(".reward-target")?.getBoundingClientRect();
    if (!destination) return;
    const x = origin.left + Math.min(70, origin.width / 4);
    const y = origin.top + origin.height / 2;
    layer.querySelectorAll<SVGElement>("svg").forEach((coin, index) => {
      coin.style.left = `${x + index * 6}px`;
      coin.style.top = `${y}px`;
      coin.style.setProperty("--flight-x", `${destination.left + destination.width / 2 - x}px`);
      coin.style.setProperty("--flight-y", `${destination.top + destination.height / 2 - y}px`);
    });
    const timer = setTimeout(() => layer.classList.add("finished"), 1500);
    return () => clearTimeout(timer);
  }, [receipt, amount]);
  const title = kind === "makeup" ? "这一餐，补上啦。" : kind === "redeem" ? "快乐已经在路上。" : kind === "mood" ? "这一刻的你，被好好收藏。" : "好好吃饭，值得奖励！";
  return <div ref={stage} className="feedback-stage" data-kind={kind}><NailongCompanion pose={kind === "makeup" ? "chef" : kind === "mood" ? "balloon" : "dance"} className="feedback-character" /><div className="feedback-copy"><h2>{title}</h2><p>{kind === "makeup" ? "补签不计为有效签到，也不会撤回已经发生的扣币。" : kind === "redeem" ? "奶龙币已保留，等管理员确认后再完成兑换。" : "每一点认真，都让今天更闪亮。"}</p></div>{amount !== undefined && <span className="reward-target"><NiwaMotif kind="coin" />+<AnimatedNumber value={amount} /><span className="text-xs">枚</span></span>}<div ref={flight} className="reward-flight" aria-hidden="true">{Array.from({ length: kind === "makeup" ? 2 : 5 }, (_, index) => <NiwaMotif key={index} kind="coin" />)}</div></div>;
}
