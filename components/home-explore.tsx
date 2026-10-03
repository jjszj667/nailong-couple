import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { NailongCompanion } from "@/components/nailong-companion";

export function HomeExplore() {
  return <section className="home-explore" aria-label="收藏两个人的生活">
    <div className="section-heading"><div><p className="eyebrow">LITTLE THINGS, BIG LOVE</p><h2>把喜欢的日子，过成日常。</h2></div><span>记录 · 期待 · 一起出发</span></div>
    <div className="explore-grid">
      <Link href="/memories" className="explore-tile tone-mint"><div><span className="eyebrow">OUR MOMENTS</span><h3>这一刻，值得收藏。</h3><p>照片里的小事，也是生活里的大事。</p></div><NailongCompanion pose="camera" className="explore-character" /><span className="tile-link">翻翻回忆 <ArrowUpRight size={16} /></span></Link>
      <Link href="/wishes" className="explore-tile tone-rose"><div><span className="eyebrow">OUR WISHLIST</span><h3>下一份小期待。</h3><p>想吃、想去，和想一起做的事。</p></div><NailongCompanion pose="balloon" className="explore-character" /><span className="tile-link">写下愿望 <ArrowUpRight size={16} /></span></Link>
      <Link href="/places" className="explore-tile tone-lavender"><div><span className="eyebrow">GO TOGETHER</span><h3>和你，多走一点。</h3><p>把路过的风景，变成我们的足迹。</p></div><NailongCompanion pose="raincoat" className="explore-character" /><span className="tile-link">看看足迹 <ArrowUpRight size={16} /></span></Link>
    </div>
  </section>;
}
