import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Camera, Check, Clock3, Coins, Snowflake, Sparkles, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getUserOverview } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaImage } from "@/components/ui/media-image";
import { formatDate, getPublicImageUrl } from "@/lib/utils";

export default async function HomePage() {
  const data = await getUserOverview();
  const total = (data.wallet?.available_balance ?? 0) + (data.wallet?.frozen_balance ?? 0);
  const closest = data.products.filter((item) => item.status === "active" && item.stock > 0).sort((a, b) => a.price - b.price).find((item) => item.price > (data.wallet?.available_balance ?? 0));
  const meals: { label: string; done: boolean; icon: LucideIcon }[] = [
    { label: "午饭", done: data.lunchDone, icon: Utensils },
    { label: "晚饭", done: data.dinnerDone, icon: Clock3 },
  ];

  return (
    <main className="page-shell py-6 sm:py-9">
      <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#f9d766] via-[#f6c84c] to-[#eeae32] p-6 shadow-[0_20px_45px_rgba(203,140,22,0.2)] sm:p-9">
        <div className="absolute -right-8 -top-12 size-52 rounded-full bg-white/20" />
        <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brown/65">你好，{data.profile.nickname}</p>
            <h1 className="mt-2 max-w-xl text-2xl font-black leading-tight tracking-tight text-brown sm:text-4xl">奶龙提醒你：今天有好好吃饭吗？</h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/checkin" className="pill-button bg-white">去签到 <Camera className="size-4" /></Link>
              <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-brown/15 bg-white/45 px-5 font-bold text-brown">看看奖励 <ArrowRight className="size-4" /></Link>
            </div>
          </div>
          <Image src="/nailong/nailong-placeholder.svg" alt="自制奶龙风格占位形象" width={152} height={152} priority className="floaty hidden rounded-[2.6rem] shadow-lg sm:block" />
        </div>
      </section>

      {data.announcement && (
        <Card className="mt-5 flex items-start gap-3 border-amber-200 bg-amber-50/90 py-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-orange" />
          <div><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">{data.announcement.title}</p><p className="mt-1 text-sm leading-6 text-brown">{data.announcement.content}</p></div>
        </Card>
      )}

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-brown text-white sm:col-span-2"><p className="text-sm text-white/70">当前奶龙币</p><div className="mt-2 text-4xl font-black tabular-nums">{total}</div><div className="mt-5 flex gap-5 text-xs text-white/70"><span className="flex items-center gap-1"><Coins className="size-3.5" />可用 {data.wallet?.available_balance ?? 0}</span><span className="flex items-center gap-1"><Snowflake className="size-3.5" />冻结 {data.wallet?.frozen_balance ?? 0}</span></div></Card>
        <Card><p className="text-sm text-muted">当前连续签到</p><p className="mt-2 text-3xl font-black text-brown">{data.streak}<span className="ml-1 text-sm font-medium text-muted">天</span></p><p className="mt-4 text-xs text-muted">本月完整 {data.monthCompleteDays} 天</p></Card>
        <Card><p className="text-sm text-muted">今日收获</p><p className="mt-2 text-3xl font-black text-nailong-deep">+{data.todayIncome}</p><p className="mt-4 text-xs text-muted">两餐都完成还有额外奖励</p></Card>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-bold text-nailong-deep">TODAY</p><h2 className="text-xl font-black text-brown">今天的两顿饭</h2></div><Link href="/checkin" className="text-sm font-semibold text-muted">去记录</Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {meals.map(({ label, done, icon: Icon }) => (
              <Card key={label} className={done ? "border-green-200 bg-green-50/80" : "border-amber-200 bg-amber-50/70"}>
                <div className="flex items-center justify-between"><span className={`flex size-11 items-center justify-center rounded-2xl ${done ? "bg-green-600 text-white" : "bg-white text-nailong-deep"}`}><Icon className="size-5" /></span>{done ? <Check className="size-5 text-green-700" /> : <span className="text-xs font-bold text-amber-700">等待打卡</span>}</div>
                <p className="mt-4 text-lg font-black text-brown">{label}</p><p className="mt-1 text-sm text-muted">{done ? "已经好好吃过啦" : "拍张照片记录这一餐"}</p>
              </Card>
            ))}
          </div>
          <div className="mt-7 mb-3 flex items-end justify-between"><h2 className="text-xl font-black text-brown">为你推荐</h2><Link href="/shop" className="text-sm font-semibold text-muted">全部奖励</Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.products.map((product) => <Link href={`/shop/${product.id}`} key={product.id}><Card className="group flex gap-4 p-4 transition hover:-translate-y-0.5"><MediaImage src={getPublicImageUrl("product-images", product.image_url)} alt={product.name} className="size-20 rounded-2xl" /><div className="min-w-0 flex-1"><p className="truncate font-bold text-brown">{product.name}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{product.description}</p><Coin value={product.price} className="mt-2 text-sm" /></div></Card></Link>)}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-white to-amber-50"><p className="text-xs font-bold text-nailong-deep">下一个小目标</p><h2 className="mt-2 text-lg font-black text-brown">{closest ? `距离「${closest.name}」还差 ${closest.price - (data.wallet?.available_balance ?? 0)} 奶龙币` : "已经可以兑换喜欢的奖励啦！"}</h2><p className="mt-2 text-sm leading-6 text-muted">{closest ? "继续保持最近的吃饭节奏，很快就能遇见它。" : "去商城挑一件今天最想要的吧。"}</p></Card>
          <div><div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-black text-brown">最近兑换</h2><Link href="/orders" className="text-sm font-semibold text-muted">全部</Link></div><Card className="divide-y divide-line p-2">{data.orders.length ? data.orders.map((order) => <Link href={`/orders/${order.id}`} key={order.id} className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-amber-50"><div><p className="font-semibold text-brown">{order.product_name_snapshot}</p><p className="mt-1 text-xs text-muted">{formatDate(order.created_at, true)}</p></div><StatusBadge status={order.status} /></Link>) : <p className="p-5 text-center text-sm text-muted">还没有兑换记录，去看看有什么喜欢的吧。</p>}</Card></div>
          <div><div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-black text-brown">最近奶龙币</h2><Link href="/wallet" className="text-sm font-semibold text-muted">全部流水</Link></div><Card className="divide-y divide-line p-2">{data.transactions.length ? data.transactions.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-brown">{item.reason}</p><p className="mt-1 text-xs text-muted">{formatDate(item.created_at, true)}</p></div><span className={`font-bold tabular-nums ${item.amount > 0 ? "text-green-700" : "text-brown"}`}>{item.amount > 0 ? "+" : ""}{item.amount}</span></div>) : <p className="p-5 text-center text-sm text-muted">第一枚奶龙币正在等你获得。</p>}</Card></div>
        </div>
      </section>
    </main>
  );
}
