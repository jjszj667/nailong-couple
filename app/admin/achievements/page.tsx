import Link from "next/link";
import { Trophy } from "lucide-react";
import { getAdminDashboard } from "@/lib/data";
import { getAchievementsData } from "@/lib/life-data";
import { Card } from "@/components/ui/card";

export default async function AdminAchievementsPage() {
  const dashboard = await getAdminDashboard();
  const data = dashboard.user ? await getAchievementsData(dashboard.user.id) : null;
  const unlocked = new Set(data?.unlocked.map((item) => item.achievement_id) ?? []);
  return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-brown">成就查看</h2><p className="mt-1 text-sm text-muted">徽章由真实记录计算并在数据库中防重复解锁。</p></div><Link href="/achievements" className="pill-button"><Trophy className="size-4" />查看徽章柜</Link></div>{data ? <div className="grid gap-3 sm:grid-cols-2">{data.definitions.map((definition) => <Card key={definition.id} className={`p-4 ${unlocked.has(definition.id) ? "border-amber-300 bg-amber-50" : "opacity-65"}`}><div className="flex items-center justify-between"><h3 className="font-black text-brown">{definition.title}</h3><span className="text-xs font-bold text-muted">{Math.min(data.progress[definition.metric] ?? 0, definition.target)} / {definition.target}</span></div><p className="mt-1 text-sm text-muted">{definition.description}</p></Card>)}</div> : <Card className="py-14 text-center text-sm text-muted">还没有普通用户。</Card>}</div>;
}
