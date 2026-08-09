import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  pending: "等待审核",
  approved: "已批准",
  rejected: "未通过",
  pending_fulfillment: "等待兑现",
  completed: "已完成",
  cancelled: "已取消",
  active: "已上架",
  inactive: "已下架",
  sold_out: "已兑完",
  lunch: "午间",
  dinner: "晚间",
};

export function StatusBadge({ status }: { status: string }) {
  const positive = ["completed", "active", "approved"].includes(status);
  const quiet = ["cancelled", "inactive", "rejected", "sold_out"].includes(status);
  return (
    <span className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
      positive && "bg-green-100 text-green-800",
      quiet && "bg-stone-100 text-stone-600",
      !positive && !quiet && "bg-amber-100 text-amber-800",
    )}>
      {labels[status] ?? status}
    </span>
  );
}
