import Link from "next/link";
import { Camera, ClipboardCheck, Coins, Flame, Snowflake, Utensils } from "lucide-react";
import { getAdminDashboard } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { MediaImage } from "@/components/ui/media-image";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "管理后台" };

export default async function AdminPage() {
  const data = await getAdminDashboard();
  const stats = [
    [Coins, "可用奶龙币", data.wallet?.available_balance ?? 0], [Snowflake, "冻结奶龙币", data.wallet?.frozen_balance ?? 0], [Flame, "当前连续签到", `${data.streak} 天`], [Camera, "本月完整签到", `${data.monthCompleteDays} 天`], [Utensils, "累计午饭 / 晚饭", `${data.lunchCount} / ${data.dinnerCount}`], [Coins, "累计发放 / 消费", `${data.totalGranted} / ${data.totalSpent}`], [ClipboardCheck, "累计兑换", data.orderCount], [ClipboardCheck, "待审核订单", data.pendingOrders],
  ] as const;
  return (
    <div><div className="mb-5"><h2 className="text-xl font-black text-brown">今天也把小世界照顾好</h2><p className="mt-1 text-sm text-muted">{data.user ? `当前普通用户：${data.user.nickname}` : "还没有创建普通用户账号，请按 README 完成初始化。"}</p></div>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(([Icon, label, value]) => <Card key={label} className="p-4"><Icon className="size-5 text-nailong-deep" /><p className="mt-3 text-xs text-muted">{label}</p><p className="mt-1 text-xl font-black text-brown">{value}</p></Card>)}</section>
      <section className="mt-7 grid gap-6 xl:grid-cols-2"><div><div className="mb-3 flex items-center justify-between"><h2 className="font-black text-brown">最近签到</h2><Link href="/admin/checkins" className="text-xs font-semibold text-muted">全部记录</Link></div><Card className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">{data.recentCheckins.length ? data.recentCheckins.map((item) => <div key={item.id}><MediaImage src={item.signed_url} alt="签到照片" className="aspect-square w-full rounded-2xl" /><div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted">{formatDate(item.checkin_date)}</span><StatusBadge status={item.type} /></div></div>) : <p className="col-span-full p-5 text-center text-sm text-muted">还没有签到记录。</p>}</Card></div>
        <div><div className="mb-3 flex items-center justify-between"><h2 className="font-black text-brown">最近订单</h2><Link href="/admin/orders" className="text-xs font-semibold text-muted">全部订单</Link></div><Card className="divide-y divide-line p-2">{data.recentOrders.length ? data.recentOrders.map((order) => <Link href={`/admin/orders/${order.id}`} key={order.id} className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-amber-50"><div><p className="text-sm font-semibold text-brown">{order.product_name_snapshot}</p><Coin value={order.price_snapshot} className="mt-1 text-xs" /></div><StatusBadge status={order.status} /></Link>) : <p className="p-5 text-center text-sm text-muted">还没有兑换订单。</p>}</Card></div></section>
    </div>
  );
}
