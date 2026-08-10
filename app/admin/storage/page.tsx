import { AlertTriangle, Database, HardDrive, ScanSearch, Trash2 } from "lucide-react";
import { cleanupExpiredTrashAction, cleanupOrphanStorageAction, updateStorageWarningAction } from "@/app/actions";
import { getStorageAdminData } from "@/lib/storage-admin";
import { Card } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";

function size(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(0, Math.round(bytes / 1024))} KB`;
}

export default async function StoragePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [data, flash] = await Promise.all([getStorageAdminData(), searchParams]);
  const warning = data.totalSize >= data.warningMb * 1024 * 1024;
  return <div>
    <div className="mb-5"><h2 className="text-xl font-black text-brown">图片与存储</h2><p className="mt-1 text-sm text-muted">数据来自当前 Storage 实际文件和数据库引用；扫描本身不会删除任何内容。</p></div>
    <Flash {...flash} />
    {warning && <div className="mb-4 flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-brown"><AlertTriangle className="size-5 shrink-0 text-orange" />当前估算容量已达到提醒阈值，请先检查超大文件和孤立文件。</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card><Database className="size-5 text-nailong-deep" /><p className="mt-3 text-xs text-muted">全部文件</p><p className="mt-1 text-2xl font-black text-brown">{data.files.length}</p></Card>
      <Card><HardDrive className="size-5 text-nailong-deep" /><p className="mt-3 text-xs text-muted">估算容量</p><p className="mt-1 text-2xl font-black text-brown">{size(data.totalSize)}</p></Card>
      <Card><p className="text-xs text-muted">近 30 天新增</p><p className="mt-2 text-xl font-black text-brown">{data.recentCount} 个</p><p className="mt-1 text-xs text-muted">{size(data.recentSize)}</p></Card>
      <Card><p className="text-xs text-muted">平均文件大小</p><p className="mt-2 text-xl font-black text-brown">{size(data.averageSize)}</p></Card>
    </div>
    <Card className="mt-5"><h3 className="font-black text-brown">分类占用</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.bucketStats.map((item) => <div key={item.bucket} className="flex justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm"><span className="font-bold text-brown">{item.bucket}</span><span className="text-muted">{item.count} 个 · {size(item.size)}</span></div>)}</div></Card>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Card><h3 className="font-black text-brown">超出建议大小</h3>{data.oversized.length ? <div className="mt-3 max-h-80 space-y-2 overflow-auto">{data.oversized.map((item) => <div key={`${item.bucket}/${item.path}`} className="rounded-2xl bg-orange-50 p-3 text-xs"><p className="break-all font-bold text-brown">{item.path}</p><p className="mt-1 text-muted">{item.bucket} · {size(item.size)}</p></div>)}</div> : <EmptyState icon={HardDrive} title="没有超大文件" description="现有图片都在各自建议阈值内。" variant="technical" size="sm" />}</Card>
      <Card><h3 className="font-black text-brown">孤立文件扫描（试运行）</h3><p className="mt-1 text-xs leading-5 text-muted">只列出 Storage 中存在、但所有图片字段都没有引用的文件。回收站记录也算有效引用。</p>{data.orphans.length ? <><div className="mt-3 max-h-64 space-y-2 overflow-auto">{data.orphans.map((item) => <div key={`${item.bucket}/${item.path}`} className="rounded-2xl bg-stone-50 p-3 text-xs"><p className="break-all font-bold text-brown">{item.path}</p><p className="mt-1 text-muted">{item.bucket} · {size(item.size)}</p></div>)}</div><form action={cleanupOrphanStorageAction} className="mt-4"><input type="hidden" name="confirmation" value="DELETE_ORPHANS" /><ConfirmSubmitButton message={`将永久删除扫描出的 ${data.orphans.length} 个孤立文件，确定继续吗？`} className="bg-red-600 text-white"><Trash2 className="size-4" />确认清理孤立文件</ConfirmSubmitButton></form></> : <EmptyState icon={ScanSearch} title="没有发现孤立文件" description="Storage 文件与数据库引用一致。" variant="technical" size="sm" />}</Card>
    </div>
    <Card className="mt-5"><h3 className="font-black text-brown">维护操作</h3><div className="mt-4 flex flex-wrap items-end gap-4"><form action={updateStorageWarningAction} className="flex flex-wrap items-end gap-3"><label className="text-sm font-bold text-brown">容量提醒阈值（MB）<input name="warning_mb" type="number" min={50} max={100000} className="field mt-2 w-40" defaultValue={data.warningMb} /></label><SubmitButton pendingText="保存中…">保存阈值</SubmitButton></form><form action={cleanupExpiredTrashAction}><input type="hidden" name="confirmation" value="DELETE_EXPIRED_TRASH" /><ConfirmSubmitButton message="将永久删除回收站中超过 30 天的记录和照片，确定继续吗？" className="bg-stone-100 text-red-600 shadow-none"><Trash2 className="size-4" />清理 30 天前回收站</ConfirmSubmitButton></form></div></Card>
  </div>;
}
