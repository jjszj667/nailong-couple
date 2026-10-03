import type { ReactNode } from "react";
import { NailongCompanion, type NailongPose } from "@/components/nailong-companion";
import { NiwaMotif } from "@/components/ui/niwa-motif";

export const featureScenes = {
  checkin: { pose: "meal", tone: "honey", caption: "每一餐，都值得认真对待。" },
  shop: { pose: "gift", tone: "rose", caption: "把小小坚持，换成大大开心。" },
  orders: { pose: "gift", tone: "rose", caption: "期待的事情，正在慢慢发生。" },
  calendar: { pose: "calendar", tone: "lavender", caption: "普通的日期，也藏着我们的故事。" },
  memories: { pose: "camera", tone: "mint", caption: "按下快门，让这一刻留下来。" },
  story: { pose: "journal", tone: "lavender", caption: "一页一页，写成我们的故事。" },
  daily: { pose: "journal", tone: "lavender", caption: "今天，也有值得收藏的小事。" },
  wishes: { pose: "love", tone: "rose", caption: "你的小愿望，我都有认真听。" },
  places: { pose: "travel", tone: "mint", caption: "下一站，还想和你一起。" },
  wallet: { pose: "celebrate", tone: "honey", caption: "认真生活的每一点，都算数。" },
  achievements: { pose: "celebrate", tone: "honey", caption: "为一起走过的路，颁个小奖。" },
  profile: { pose: "sleep", tone: "mint", caption: "在这里，安心做自己。" },
  releases: { pose: "wave", tone: "lavender", caption: "小屋正在一点点变得更好。" },
} satisfies Record<string, { pose: NailongPose; tone: string; caption: string }>;
export type FeatureName = keyof typeof featureScenes;

export function FeatureHero({ feature, children }: { feature: FeatureName; children: ReactNode }) {
  const scene = featureScenes[feature];
  return <section className={`feature-hero tone-${scene.tone}`} data-feature={feature}>
    <div className="feature-hero-copy">{children}<span className="feature-caption">{scene.caption}</span></div>
    <div className="feature-hero-scene" aria-hidden="true"><span className="scene-orbit" /><NiwaMotif kind="orbit" className="scene-vector" /><NailongCompanion pose={scene.pose} className="feature-character" /><NiwaMotif className="scene-spark scene-spark-one" /><NiwaMotif className="scene-spark scene-spark-two" /></div>
  </section>;
}
