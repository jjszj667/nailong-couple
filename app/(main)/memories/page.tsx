import { Camera, Search } from "lucide-react";
import { getMemoriesData } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { StatusBadge } from "@/components/ui/status-badge";

export const metadata = { title: "吃饭照片墙" };

export default async function MemoriesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const memories = await getMemoriesData(date);
  return (
    <main className="page-shell py-7 sm:py-10"><div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">Our memories</p><h1 className="mt-1 text-3xl font-black text-brown">吃饭照片墙</h1><p className="mt-2 text-sm text-muted">好好吃过的每一顿饭，都值得被记住。</p></div><form className="flex gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input className="field pl-9" type="date" name="date" defaultValue={date} /></label><button className="pill-button px-4">查看</button></form></div>
      {memories.length ? <section className="columns-1 gap-4 sm:columns-2 lg:columns-3">{memories.map((item) => <figure key={item.id} className="soft-card mb-4 break-inside-avoid overflow-hidden p-2"><a href={item.signed_url || "#"} target="_blank" rel="noreferrer"><MediaImage src={item.signed_url} alt={`${item.checkin_date} ${item.type === "lunch" ? "午饭" : "晚饭"}照片`} className="max-h-[32rem] w-full rounded-[1.35rem]" /></a><figcaption className="flex items-center justify-between gap-3 p-3"><div><p className="font-semibold text-brown">{formatDate(item.checkin_date)}</p><p className="mt-0.5 text-xs text-muted">这一餐获得 +{item.reward_amount} 奶龙币</p></div><StatusBadge status={item.type} /></figcaption></figure>)}</section> : <Card className="py-16 text-center"><Camera className="mx-auto size-10 text-nailong-deep" /><h2 className="mt-4 font-bold text-brown">第一顿饭还在等你记录哦～</h2><p className="mt-1 text-sm text-muted">完成签到后，照片会出现在这里。</p></Card>}
    </main>
  );
}
