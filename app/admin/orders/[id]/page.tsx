import { notFound } from "next/navigation";
import { processOrderAction } from "@/app/actions";
import { getAdminOrder } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AdminOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const { order, events } = await getAdminOrder(id);
  if (!order) notFound();
  return <div><div className="mb-5"><h2 className="text-xl font-black text-brown">订单详情</h2><p className="mt-1 text-sm text-muted">所有状态变化会记录到订单事件中。</p></div><Flash {...flash} /><Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-muted">兑换奖励</p><h3 className="mt-1 text-2xl font-black text-brown">{order.product_name_snapshot}</h3><Coin value={order.price_snapshot} className="mt-3 text-xl" /></div><StatusBadge status={order.status} /></div><div className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted">用户 ID</p><p className="mt-1 break-all font-mono text-xs text-brown">{order.user_id}</p></div><div><p className="text-xs text-muted">申请时间</p><p className="mt-1 text-brown">{formatDate(order.created_at, true)}</p></div></div>{order.status === "pending" && <form action={processOrderAction} className="mt-6"><input type="hidden" name="order_id" value={order.id} /><label className="block text-sm font-semibold text-brown">给她的留言（可选）<textarea className="field mt-2 min-h-24" name="note" maxLength={1000} placeholder="例如：周末带你去喝～" /></label><div className="mt-4 flex flex-wrap gap-3"><SubmitButton name="action" value="approve" pendingText="正在批准…">批准兑换</SubmitButton><SubmitButton name="action" value="reject" className="bg-stone-100 text-stone-700 shadow-none" pendingText="正在退回…">拒绝并退款</SubmitButton></div></form>}{order.status === "pending_fulfillment" && <form action={processOrderAction} className="mt-6"><input type="hidden" name="order_id" value={order.id} /><input type="hidden" name="action" value="complete" /><label className="block text-sm font-semibold text-brown">兑现留言（可选）<textarea className="field mt-2 min-h-20" name="note" maxLength={1000} /></label><SubmitButton className="mt-4" pendingText="正在完成…">标记为已兑现</SubmitButton></form>}</Card><div className="mt-6"><h3 className="mb-3 font-black text-brown">状态时间线</h3><Card className="space-y-4">{events.map((event) => <div key={event.id} className="flex gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-nailong-deep" /><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted">{event.from_status ?? "创建"}</span><span>→</span><StatusBadge status={event.to_status} /></div><p className="mt-1 text-xs text-muted">{formatDate(event.created_at, true)}{event.note ? ` · ${event.note}` : ""}</p></div></div>)}</Card></div></div>;
}
