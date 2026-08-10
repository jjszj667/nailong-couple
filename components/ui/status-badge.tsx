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
  preparing: "偷偷准备中",
  ready: "可以揭晓",
  revealed: "已揭晓",
  normal: "普通商品",
  mystery: "惊喜箱",
};

const lifeLabels: Record<string, string> = {
  pending: "等待确认",
  approved: "已经确认",
  rejected: "这次没能实现",
  pending_fulfillment: "准备兑现中",
  completed: "已经实现",
  cancelled: "已经取消",
  active: "可以兑换",
  inactive: "暂时休息",
  sold_out: "已经兑完",
  preparing: "偷偷准备中",
  ready: "可以揭晓",
  revealed: "已揭晓",
};

export function StatusBadge({
  status,
  context = "admin",
}: {
  status: string;
  context?: "admin" | "life";
}) {
  const positive = ["completed", "active", "approved"].includes(status);
  const quiet = ["cancelled", "inactive", "rejected", "sold_out"].includes(
    status,
  );
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        positive && "bg-green-100 text-green-800",
        quiet && "bg-stone-100 text-stone-600",
        !positive && !quiet && "bg-amber-100 text-amber-800",
      )}
    >
      {(context === "life" ? lifeLabels[status] : labels[status]) ??
        labels[status] ??
        status}
    </span>
  );
}
