"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page-shell flex min-h-[70vh] items-center justify-center py-12 text-center">
      <div className="soft-card max-w-md p-8">
        <div className="text-5xl">🥛</div>
        <h1 className="mt-4 text-2xl font-black text-brown">奶龙刚刚走神了一下</h1>
        <p className="mt-2 text-sm leading-6 text-muted">页面没有顺利加载，可能是网络暂时不稳定。</p>
        <button onClick={reset} className="pill-button mt-6"><RotateCcw className="size-4" />重新加载</button>
      </div>
    </main>
  );
}
