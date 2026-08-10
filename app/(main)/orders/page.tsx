import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import { getOrders } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Coin } from "@/components/ui/coin";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Flash } from "@/components/ui/flash";

export const metadata = { title: "我的兑换" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [orders, flash] = await Promise.all([getOrders(), searchParams]);
  return (
    <main className="page-shell py-7 sm:py-10">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">
          My rewards
        </p>
        <h1 className="mt-1 text-3xl font-black text-brown">我的兑换</h1>
        <p className="mt-2 text-sm text-muted">
          每一次申请、确认和兑现都会留在这里。
        </p>
      </div>
      <Flash {...flash} />
      {orders.length ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link href={`/orders/${order.id}`} key={order.id}>
              <Card className="mb-3 flex items-center gap-4 p-4 transition hover:-translate-y-0.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-nailong-deep">
                  <ReceiptText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-bold text-brown">
                      {order.product_name_snapshot}
                    </h2>
                    <StatusBadge status={order.status} context="life" />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    申请于 {formatDate(order.created_at, true)}
                  </p>
                </div>
                <Coin value={order.price_snapshot} className="hidden sm:flex" />
                <ArrowRight className="size-4 shrink-0 text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="py-16 text-center">
          <ReceiptText className="mx-auto size-10 text-nailong-deep" />
          <h2 className="mt-4 font-bold text-brown">还没有兑换记录</h2>
          <p className="mt-1 text-sm text-muted">去看看有什么喜欢的奖励吧。</p>
          <Link href="/shop" className="pill-button mt-5">
            逛逛商城
          </Link>
        </Card>
      )}
    </main>
  );
}
