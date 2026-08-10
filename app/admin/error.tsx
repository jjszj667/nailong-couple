"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <EmptyState icon={AlertTriangle} title="管理数据加载失败" description="请检查网络或 Supabase 状态后重试；本页没有执行任何删除操作。" variant="technical" size="lg" action={<button onClick={reset} className="pill-button"><RotateCcw className="size-4" />重新加载</button>} />;
}
