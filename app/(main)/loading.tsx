import { NailongCompanion } from "@/components/nailong-companion";

export default function Loading() {
  return (
    <main className="page-shell py-8" aria-busy="true" aria-label="正在打开小屋">
      <div className="mb-6 flex items-center justify-center gap-3"><NailongCompanion pose="meal" className="size-20" /><p className="text-sm text-muted" role="status">奶龙正在整理今天的小日常…</p></div>
      <div className="mb-6 h-36 animate-pulse rounded-[2rem] bg-amber-100/70" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-36 animate-pulse rounded-[1.75rem] bg-white/80" />)}
      </div>
    </main>
  );
}
