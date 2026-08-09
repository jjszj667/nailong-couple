import Link from "next/link";
import { Footprints, MapPin } from "lucide-react";
import { getPlacesData } from "@/lib/life-data";
import { Card } from "@/components/ui/card";

export default async function AdminPlacesPage() {
  const places = await getPlacesData();
  return <div><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-brown">足迹管理</h2><p className="mt-1 text-sm text-muted">查看地点时间轴；新增和编辑复用前台足迹页。</p></div><Link href="/places" className="pill-button"><Footprints className="size-4" />打开足迹页</Link></div><div className="space-y-3">{places.length ? places.map((place) => <Card key={place.id} className="flex items-start gap-3 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-nailong-deep"><MapPin className="size-5" /></span><div><p className="text-xs font-bold text-nailong-deep">{place.visit_date} · {place.place_name}</p><h3 className="mt-1 font-black text-brown">{place.title}</h3><p className="mt-1 text-sm text-muted">{place.description}</p></div></Card>) : <Card className="py-14 text-center text-sm text-muted">还没有足迹。</Card>}</div></div>;
}
