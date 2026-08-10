import { ImageIcon, RotateCcw, Trash2 } from "lucide-react";
import { permanentlyDeleteItemAction, restoreDeletedItemAction } from "@/app/actions";
import { getRecentlyDeletedData } from "@/lib/life-data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export const metadata = { title: "最近删除" };

export default async function RecentlyDeletedPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [items, flash] = await Promise.all([getRecentlyDeletedData(), searchParams]);
  return <main className="page-shell py-7 sm:py-10">
    <div className="mb-7"><p className="text-xs font-bold text-nailong-deep">RECENTLY DELETED</p><h1 className="mt-1 text-3xl font-black text-brown">最近删除</h1><p className="mt-2 text-sm text-muted">照片和足迹会在这里保留，管理员可以清理超过 30 天的内容。</p></div>
    <Flash {...flash} />
    {items.length ? <div className="grid gap-4 sm:grid-cols-2">{items.map((item) => <Card key={`${item.type}-${item.id}`}>
      <MediaImage src={item.signedUrl} alt={item.title} className="aspect-[4/3] w-full rounded-2xl" />
      <p className="mt-4 font-black text-brown">{item.title}</p>
      <p className="mt-1 text-xs text-muted">{item.type === "memory" ? "回忆照片" : "足迹"} · 原日期 {formatDate(item.originalDate)} · 删除于 {formatDate(item.deletedAt, true)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={restoreDeletedItemAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="type" value={item.type} /><SubmitButton pendingText="正在恢复…"><RotateCcw className="size-4" />恢复</SubmitButton></form>
        <form action={permanentlyDeleteItemAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="type" value={item.type} /><ConfirmSubmitButton message="永久删除后无法恢复，确定继续吗？" className="bg-stone-100 text-red-600 shadow-none"><Trash2 className="size-4" />永久删除</ConfirmSubmitButton></form>
      </div>
    </Card>)}</div> : <EmptyState icon={ImageIcon} title="最近删除里还没有内容" description="删除的照片和足迹会暂时放在这里，方便你恢复。" size="lg" />}
  </main>;
}
