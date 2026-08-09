import { Award, CalendarDays, Coins, Flame, Gift, Heart, Sparkles, Star, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAchievementsData } from "@/lib/life-data";
import { Card } from "@/components/ui/card";

export const metadata = { title: "情侣成就" };

const icons: Record<string, LucideIcon> = { utensils: Utensils, flame: Flame, heart: Heart, coins: Coins, gift: Gift, calendar: CalendarDays, sparkles: Sparkles, star: Star, badge: Award };

export default async function AchievementsPage() {
  const data = await getAchievementsData();
  const unlocked = new Set(data.unlocked.map((item) => item.achievement_id));
  return <main className="page-shell py-6 sm:py-10"><div className="mb-6"><p className="text-xs font-bold text-nailong-deep">OUR BADGES</p><h1 className="mt-1 text-3xl font-black text-brown">奶龙徽章柜</h1><p className="mt-2 text-sm text-muted">成就是一起生活留下的纪念，不是新的任务清单。</p></div>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.definitions.map((definition) => { const Icon = icons[definition.icon] ?? Award; const done = unlocked.has(definition.id); const current = Math.min(data.progress[definition.metric] ?? 0, definition.target); const percent = Math.min(100, Math.round(current / definition.target * 100)); return <Card key={definition.id} className={`relative overflow-hidden ${done ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50" : "bg-stone-50 opacity-70 grayscale"}`}><div className={`flex size-14 items-center justify-center rounded-3xl ${done ? "bg-nailong text-brown shadow-md" : "bg-stone-200 text-stone-500"}`}><Icon className="size-7" /></div><h2 className="mt-4 text-lg font-black text-brown">{definition.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{definition.description}</p><div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted"><span>{done ? "已解锁" : "解锁进度"}</span><span>{current} / {definition.target}</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-200"><div className={`h-full rounded-full ${done ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-stone-400"}`} style={{ width: `${percent}%` }} /></div></div>{done && <Sparkles className="absolute right-5 top-5 size-5 text-orange" />}</Card>; })}</section>
  </main>;
}
