import { AnimatedNumber } from "@/components/motion/animated-number";
import { NailongCompanion } from "@/components/nailong-companion";
import { NiwaMotif } from "@/components/ui/niwa-motif";
export function AnniversaryMoment({ title, days, today = false }: { title: string; days: number; today?: boolean }) {
  return <section className="anniversary-card" data-special-day={today}><NiwaMotif className="absolute right-6 top-5 size-6 text-rose-400" /><p className="eyebrow">{today ? "TODAY IS OUR DAY" : "EVERY DAY WITH YOU"}</p><h2 className="mt-3 text-xl font-black">{title}</h2><div className="anniversary-number mt-4"><AnimatedNumber value={Math.abs(days)} /><span className="ml-2 text-lg">天</span></div><p className="mt-2 text-sm text-muted">{today ? "今天，把这个日子过得特别一点。" : days < 0 ? "距离下一个特别的日子" : "把一起走过的每一天，好好收藏。"}</p><NailongCompanion pose="love" className="anniversary-art" /></section>;
}
