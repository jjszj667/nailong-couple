import Link from "next/link";
import { NailongCompanion } from "@/components/nailong-companion";
import { NiwaMotif } from "@/components/ui/niwa-motif";

export function LifeStory() {
  return <section className="story-scroll" aria-label="把日常攒成小幸福"><div className="story-scroll-visual"><NiwaMotif /><p className="eyebrow">SMALL DAYS. BIG FEELINGS.</p><NailongCompanion pose="love" /><h2 className="text-2xl font-black">小事，也值得认真。</h2><p className="mt-3 text-sm text-muted">慢慢往下看，日子会变得很丰富。</p></div><div className="story-scroll-copy"><article className="story-step"><strong>01 / 照顾好自己</strong><h3>好好吃饭，是每天的约定。</h3><p>留住一餐的照片，和自己的认真碰个杯。每一次准时签到，都让小快乐多一点。</p><Link href="/checkin" transitionTypes={["nav-forward"]} className="pill-button">记录这一餐</Link></article><article className="story-step"><strong>02 / 让心情被看见</strong><h3>快乐和不快乐，都可以说。</h3><p>不用把每一天都过得完美。在这里，任何一种感受都能被好好接住。</p><Link href="/#mood" className="pill-button">给心情一个位置</Link></article><article className="story-step"><strong>03 / 一起期待下一天</strong><h3>收藏日常，也收藏未来。</h3><p>照片、纪念日和心愿，拼成属于我们的生活。下一件想一起做的事，就从这里开始。</p><Link href="/calendar" transitionTypes={["nav-forward"]} className="pill-button">翻开我们的日历</Link></article></div></section>;
}
