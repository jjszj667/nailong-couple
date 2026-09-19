import { Sparkles } from "lucide-react";
import { getPublishedReleases } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "更新日志" };

export default async function ReleasesPage() {
  const releases = await getPublishedReleases();
  return <main className="page-shell max-w-4xl py-7 sm:py-10">
    <p className="text-xs font-bold text-nailong-deep">WHAT IS NEW</p>
    <h1 className="mt-1 text-3xl font-black text-brown">更新日志</h1>
    <p className="mt-2 text-sm text-muted">小屋里的每一次新变化，都记在这里。</p>
    <div className="mt-7 space-y-4">
      {releases.length ? releases.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-nailong-deep">v{item.version}</span>
            <time className="text-xs text-muted">{item.published_at ? new Date(item.published_at).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) : ""}</time>
          </div>
          <h2 className="mt-3 text-lg font-black text-brown">{item.title}</h2>
          <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted">{item.content}</p>
          <details className="mt-3 text-sm text-brown">
            <summary className="cursor-pointer font-bold text-nailong-deep">查看完整更新内容</summary>
            <p className="mt-3 whitespace-pre-wrap break-words leading-7">{item.content}</p>
          </details>
        </Card>
      )) : <EmptyState icon={Sparkles} title="暂时没有更新日志" description="新版本发布后会出现在这里。" />}
    </div>
  </main>;
}
