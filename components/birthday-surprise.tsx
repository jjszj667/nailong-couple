"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CakeSlice, Heart, Sparkles } from "lucide-react";
import { NailongCompanion } from "@/components/nailong-companion";
import { BIRTHDAY_START, BIRTHDAY_END, isBirthdayWeek } from "@/lib/birthday";

export function BirthdaySurprise({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const [active, setActive] = useState(false);
  const [wished, setWished] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(timer);
      const now = Date.now();
      setActive(isBirthdayWeek(now));
      const boundary = now < BIRTHDAY_START ? BIRTHDAY_START : BIRTHDAY_END;
      if (now < boundary) timer = setTimeout(sync, Math.min(boundary - now, 60_000));
    };
    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  if (!active) return children;
  return (
    <section className={`birthday-surprise ${compact ? "birthday-compact" : ""}`} aria-label="生日特别祝福">
      <div className="birthday-stars" aria-hidden="true">✦ · ✧ · ✦</div>
      <div className="birthday-copy">
        <p className="birthday-eyebrow"><Heart size={14} fill="currentColor" /> OCT. 01 · FOR YOU</p>
        <h1>生日快乐，<br /><span>我的宝贝。</span></h1>
        <p className="birthday-note">愿你新的一岁，眼里有光，心里有甜。<br />每一个平凡的明天，都想陪你一起过。</p>
        <button type="button" className="birthday-wish" onClick={() => setWished(true)} disabled={wished}>
          {wished ? <Sparkles size={18} /> : <CakeSlice size={18} />}
          {wished ? "愿你的小愿望，都慢慢实现" : "闭上眼睛，许个愿吧"}
        </button>
        <p className="birthday-response" role="status">{wished ? "蜡烛吹灭啦，新的快乐正在向你赶来。♡" : "这一周，把偏爱都给你。"}</p>
      </div>
      <div className={`birthday-art ${wished ? "birthday-wished" : ""}`} aria-hidden="true">
        <NailongCompanion pose="balloon" priority className="birthday-companion" />
        <div className="birthday-cake"><span className="birthday-candle"><i /></span><span className="birthday-icing" /><span className="birthday-cake-heart">♥</span></div>
        <span className="birthday-art-star">✧</span><span className="birthday-art-heart">♡</span>
      </div>
    </section>
  );
}
