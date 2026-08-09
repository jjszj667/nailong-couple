import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Snowflake } from "lucide-react";
import { notFound } from "next/navigation";
import { cancelOrderAction } from "@/app/actions";
import { getOrder } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const { order, transactions } = await getOrder(id);
  if (!order) notFound();
  return (
    <main className="page-shell max-w-3xl py-7 sm:py-10"><Link href="/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft className="size-4" />返回我的兑换</Link><Flash {...flash} />
      <Card className="overflow-hidden p-0"><div className="bg-gradient-to-br from-amber-100 to-amber-50 p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold text-nailong-deep">兑换详情</p><h1 className="mt-2 text-3xl font-black text-brown">{order.product_name_snapshot}</h1></div><StatusBadge status={order.status} /></div><Coin value={order.price_snapshot} className="mt-5 text-2xl" /></div><div className="space-y-4 p-6 sm:p-8"><div className="grid gap-4 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted">申请时间</p><p className="mt-1 font-semibold text-brown">{formatDate(order.created_at, true)}</p></div>{order.approved_at && <div><p className="text-xs text-muted">批准时间</p><p className="mt-1 font-semibold text-brown">{formatDate(order.approved_at, true)}</p></div>}{order.completed_at && <div><p className="text-xs text-muted">完成时间</p><p className="mt-1 font-semibold text-brown">{formatDate(order.completed_at, true)}</p></div>}</div>{order.admin_note && <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-nailong-deep">管理员留言</p><p className="mt-1 text-sm leading-6 text-brown">{order.admin_note}</p></div>}{order.status === "pending" && <form action={cancelOrderAction} className="pt-2"><input type="hidden" name="order_id" value={order.id} /><SubmitButton className="bg-stone-100 text-stone-700 shadow-none" pendingText="正在取消…">取消兑换</SubmitButton></form>}</div></Card>
      <div className="mt-7"><h2 className="mb-3 text-lg font-black text-brown">奶龙币记录</h2><Card className="divide-y divide-line p-2">{transactions.map((item) => <div key={item.id} className="flex items-center gap-3 p-3"><span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-nailong-deep">{item.direction === "freeze" ? <Snowflake className="size-4" /> : item.direction === "expense" ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}</span><div className="flex-1"><p className="text-sm font-semibold text-brown">{item.reason}</p><p className="text-xs text-muted">{formatDate(item.created_at, true)}</p></div><span className="text-sm font-bold tabular-nums">{item.amount > 0 ? "+" : ""}{item.amount}</span></div>)}</Card></div>
    </main>
  );
}
