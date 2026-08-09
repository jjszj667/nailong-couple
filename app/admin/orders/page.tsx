import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { getAdminOrders } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { StatusBadge } from "@/components/ui/status-badge";
import { Flash } from "@/components/ui/flash";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [orders, flash] = await Promise.all([getAdminOrders(), searchParams]);
  return <div><div className="mb-5"><h2 className="text-xl font-black text-brown">订单审核</h2><p className="mt-1 text-sm text-muted">批准会正式扣除冻结币和库存，拒绝会原路退回。</p></div><Flash error={flash.error} />{orders.length ? <div className="space-y-3">{orders.map((order) => <Link href={`/admin/orders/${order.id}`} key={order.id}><Card className="mb-3 flex items-center gap-4 p-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-nailong-deep"><ClipboardCheck className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold text-brown">{order.product_name_snapshot}</p><StatusBadge status={order.status} /></div><p className="mt-1 text-xs text-muted">{formatDate(order.created_at, true)}</p></div><Coin value={order.price_snapshot} className="hidden sm:flex" /><ArrowRight className="size-4 text-muted" /></Card></Link>)}</div> : <Card className="py-14 text-center text-sm text-muted">还没有兑换订单。</Card>}</div>;
}
