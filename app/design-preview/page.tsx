import { notFound } from "next/navigation";
import { FeatureHero } from "@/components/feature-hero";
import { FeatureDock } from "@/components/feature-dock";
import { HomeExplore } from "@/components/home-explore";
import { MoodSelector } from "@/components/mood-selector";
import { NailongCompanion } from "@/components/nailong-companion";
import { ImagePicker } from "@/components/image-picker";
import { Card } from "@/components/ui/card";
import { PageMotion } from "@/components/page-motion";

export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ viewport?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { viewport } = await searchParams;
  if (viewport === "mobile") return <div style={{ padding: 20 }}><p>手机视觉检查 · 390px</p><iframe title="390px 手机预览" src="/design-preview" style={{ width: 390, height: 850, border: "1px solid #ddd", marginTop: 12 }} /></div>;
  return <><FeatureDock today="2026-09-27" /><PageMotion><main className="page-shell home-page"><p className="mb-4 text-xs text-muted">仅开发环境 · 组件视觉验收，不含真实用户数据</p><section className="home-hero"><div className="relative grid items-center"><div><p className="text-sm text-muted">美好的一天，从这里开始</p><h1>生活的小事，<br /><span className="hero-accent">都是关于你。</span></h1><p className="hero-description">好好吃饭，认真感受。和你一起，把每一天过成值得收藏的一天。</p><a href="#mood" className="pill-button">记录今天的心情</a></div><NailongCompanion interactive className="hero-companion" /></div></section><HomeExplore /><div id="mood" className="grid gap-6 lg:grid-cols-2"><Card><h2 className="mb-4 text-xl font-bold">今天，感觉怎么样？</h2><MoodSelector date="2026-09-27" /></Card><div className="space-y-6"><FeatureHero feature="calendar"><p className="eyebrow">OUR TIME</p><h1>我们的日历</h1><p>把每个特别的日子，都好好记住。</p></FeatureHero><Card><h2 className="mb-4 font-bold">记录一餐小幸福</h2><ImagePicker /></Card></div></div><div className="mt-8"><FeatureHero feature="shop"><p className="eyebrow">A LITTLE REWARD</p><h1>认真生活，值得奖励。</h1><p>喜欢的东西，慢慢攒到手。</p></FeatureHero><FeatureHero feature="places"><h1>和你一起，去看看。</h1></FeatureHero></div></main></PageMotion></>;
}
