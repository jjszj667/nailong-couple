"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookHeart, CalendarDays, Camera, Coins, Gift, Heart, MapPin, NotebookPen, Sparkles, Trophy, UserRound, Utensils } from "lucide-react";

const items = [
  ["/checkin", "好好吃饭", Utensils], ["/#mood", "此刻心情", Heart],
  ["/memories", "回忆相册", Camera], ["/calendar", "我们的日历", CalendarDays],
  ["/wishes", "愿望清单", Sparkles], ["/shop", "快乐商店", Gift],
  ["/story", "我们的故事", BookHeart], ["/places", "一起去过", MapPin],
  ["/daily/today", "奶龙日报", NotebookPen], ["/achievements", "成就收藏", Trophy],
  ["/wallet", "奶龙币", Coins], ["/profile", "我的小屋", UserRound],
] as const;

export function FeatureDock({ admin = false, today }: { admin?: boolean; today: string }) {
  const pathname = usePathname();
  return <nav className="feature-dock page-shell" aria-label="小屋所有功能">{items.filter(([href]) => !admin || (href !== "/shop" && href !== "/wallet")).map(([href, label, Icon]) => <Link key={href} href={href === "/daily/today" ? `/daily/${today}` : href} aria-current={pathname === href || (href === "/daily/today" && pathname.startsWith("/daily/")) ? "page" : undefined}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></Link>)}</nav>;
}
