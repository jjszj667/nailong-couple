import { notFound } from "next/navigation";
import { FeatureHero } from "@/components/feature-hero";
import { FeatureDock } from "@/components/feature-dock";
import { HomeExplore } from "@/components/home-explore";
import { NailongCompanion } from "@/components/nailong-companion";
import { PageMotion } from "@/components/page-motion";
import { DesignLab } from "@/components/motion/design-lab";
import { LifeStory } from "@/components/motion/life-story";
import { AppHeader } from "@/components/layout/app-header";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Profile } from "@/types/database";

const fixtureProfile: Profile = { id: "visual-fixture", nickname: "视觉预览", role: "user", avatar_url: null, created_at: "2026-10-03", updated_at: "2026-10-03" };

export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ viewport?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { viewport } = await searchParams;
  if (viewport === "mobile") return <div style={{ padding: 20 }}><p>手机视觉检查 · 390px</p><iframe title="390px 手机预览" src="/design-preview" style={{ width: 390, height: 850, border: "1px solid #ddd", marginTop: 12 }} /></div>;
  return <div className="app-world min-h-screen pb-28 md:pb-10"><AppHeader profile={fixtureProfile} /><FeatureDock today="2026-10-03" /><PageMotion><main className="page-shell home-page"><p className="mb-4 text-xs text-muted">奶娃 2.0 · 仅开发环境 · 组件验收，不含真实用户数据</p><section className="home-hero"><div className="relative grid items-center"><div><p className="text-sm text-muted">美好的一天，从这里开始</p><h1>生活的小事，<br /><span className="hero-accent">都是关于你。</span></h1><p className="hero-description">好好吃饭，认真感受。和你一起，把每一天过成值得收藏的一天。</p><a href="#mood" className="pill-button">记录今天的心情</a></div><NailongCompanion interactive className="hero-companion" /></div></section><HomeExplore /><LifeStory /><DesignLab /><div className="mt-8"><FeatureHero feature="places"><h1>和你一起，去看看。</h1></FeatureHero></div></main></PageMotion><MobileNav profile={fixtureProfile} /></div>;
}
