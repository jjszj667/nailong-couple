import { saveReleaseAction } from "@/app/actions";
import { getAdminReleases } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ReleaseAnnouncement } from "@/types/database";

const statuses = [
  ["draft", "草稿"], ["published", "已发布"],
  ["disabled", "已停用"], ["closed", "已关闭"],
] as const;

function ReleaseForm({ item }: { item?: ReleaseAnnouncement }) {
  return <form action={saveReleaseAction} className="mt-4 space-y-4">
    <input type="hidden" name="id" value={item?.id ?? ""} />
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-brown">版本标识
        <input name="version" className="field mt-2" defaultValue={item?.version ?? ""} maxLength={40} placeholder="例如 2.1.0" required />
      </label>
      <label className="block text-sm font-semibold text-brown">标题
        <input name="title" className="field mt-2" defaultValue={item?.title ?? ""} maxLength={120} required />
      </label>
    </div>
    <label className="block text-sm font-semibold text-brown">更新内容
      <textarea name="content" className="field mt-2 min-h-32" defaultValue={item?.content ?? ""} maxLength={5000} required />
    </label>
    <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
      <label className="block text-sm font-semibold text-brown">状态
        <select name="status" className="field mt-2" defaultValue={item?.status ?? "draft"}>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-brown">
        <input name="is_forced" type="checkbox" defaultChecked={item?.is_forced ?? false} /> 必须点击“我知道了”
      </label>
    </div>
    <p className="text-xs leading-5 text-muted">首次发布时自动记录发布日期；停用和关闭后不会向普通用户展示。已发布版本号不能修改；编辑同版本正文不会重复弹窗，需要新建版本才会再次提醒。</p>
    <SubmitButton pendingText="正在保存…">{item ? "保存修改" : "创建公告"}</SubmitButton>
  </form>;
}

export default async function AdminReleasesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [items, flash] = await Promise.all([getAdminReleases(), searchParams]);
  return <div>
    <h2 className="text-xl font-black text-brown">版本更新公告</h2>
    <p className="mt-1 text-sm text-muted">发布、编辑、停用或关闭版本公告；已发布内容会出现在更新日志。</p>
    <Flash {...flash} />
    <Card className="mt-5"><h3 className="font-black text-brown">创建新版本</h3><ReleaseForm /></Card>
    <div className="mt-6 space-y-4">
      {items.map((item) => <Card key={item.id}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black text-brown">v{item.version} · {item.title}</h3>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-nailong-deep">{statuses.find(([value]) => value === item.status)?.[1]}</span>
        </div>
        <p className="mt-2 text-xs text-muted">发布时间：{item.published_at ? new Date(item.published_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "尚未发布"}</p>
        <details className="mt-3"><summary className="cursor-pointer text-sm font-bold text-nailong-deep">编辑与状态管理</summary><ReleaseForm item={item} /></details>
      </Card>)}
    </div>
  </div>;
}
