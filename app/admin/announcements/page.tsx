import { saveAnnouncementAction, toggleAnnouncementAction } from "@/app/actions";
import { getAdminAnnouncements } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [items, flash] = await Promise.all([getAdminAnnouncements(), searchParams]);
  return <div><div className="mb-5"><h2 className="text-xl font-black text-brown">首页留言</h2><p className="mt-1 text-sm text-muted">最新一条有效留言会显示在普通用户首页。</p></div><Flash {...flash} /><Card><h3 className="font-black text-brown">发布新纸条</h3><form action={saveAnnouncementAction} className="mt-4 space-y-4"><label className="block text-sm font-semibold text-brown">标题<input name="title" className="field mt-2" maxLength={80} placeholder="奶龙的小纸条" required /></label><label className="block text-sm font-semibold text-brown">内容<textarea name="content" className="field mt-2 min-h-28" maxLength={1000} placeholder="今天也要好好吃饭哦～" required /></label><SubmitButton pendingText="正在发布…">发布留言</SubmitButton></form></Card><div className="mt-6 space-y-3">{items.map((item) => <Card key={item.id} className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex items-center gap-2"><h3 className="font-bold text-brown">{item.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.is_active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600"}`}>{item.is_active ? "展示中" : "已停用"}</span></div><p className="mt-2 text-sm leading-6 text-muted">{item.content}</p><p className="mt-2 text-xs text-muted">{formatDate(item.created_at, true)}</p></div><form action={toggleAnnouncementAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="active" value={String(!item.is_active)} /><SubmitButton className="bg-stone-100 text-stone-700 shadow-none" pendingText="…">{item.is_active ? "停用" : "重新启用"}</SubmitButton></form></Card>)}</div></div>;
}
