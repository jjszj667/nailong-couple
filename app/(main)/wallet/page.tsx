import { ArrowDownLeft, ArrowUpRight, Snowflake, WalletCards } from "lucide-react";
import { getWalletData } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";

export const metadata = { title: "奶龙币钱包" };

export default async function WalletPage() {
  const { wallet, transactions } = await getWalletData();
  return (
    <main className="page-shell py-7 sm:py-10"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">Nailong wallet</p><h1 className="mt-1 text-3xl font-black text-brown">奶龙币钱包</h1><p className="mt-2 text-sm text-muted">每一枚奶龙币从哪里来、去了哪里，都清清楚楚。</p></div>
      <section className="grid gap-4 sm:grid-cols-3"><Card className="bg-brown text-white sm:col-span-3"><p className="text-sm text-white/65">总奶龙币</p><p className="mt-2 text-4xl font-black">{(wallet?.available_balance ?? 0) + (wallet?.frozen_balance ?? 0)}</p></Card><Card><p className="text-xs text-muted">可用余额</p><Coin value={wallet?.available_balance ?? 0} className="mt-2 text-2xl" /></Card><Card><p className="text-xs text-muted">冻结余额</p><p className="mt-2 flex items-center gap-2 text-2xl font-black text-brown"><Snowflake className="size-5 text-sky-500" />{wallet?.frozen_balance ?? 0}</p></Card><Card><p className="text-xs text-muted">钱包状态</p><p className="mt-2 flex items-center gap-2 font-bold text-green-700"><WalletCards className="size-5" />正常</p></Card></section>
      <section className="mt-8"><h2 className="mb-3 text-xl font-black text-brown">全部流水</h2>{transactions.length ? <Card className="divide-y divide-line p-2">{transactions.map((item) => { const income = item.direction === "income" || item.direction === "unfreeze"; return <div key={item.id} className="flex items-center gap-3 p-3 sm:p-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${income ? "bg-green-100 text-green-700" : "bg-amber-100 text-orange"}`}>{income ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-brown">{item.reason}</p><p className="mt-1 text-xs text-muted">{formatDate(item.created_at, true)} · 可用 {item.after_balance} / 冻结 {item.after_frozen_balance}</p></div><span className={`font-bold tabular-nums ${item.amount > 0 ? "text-green-700" : "text-brown"}`}>{item.amount > 0 ? "+" : ""}{item.amount}</span></div>; })}</Card> : <Card className="py-14 text-center text-sm text-muted">第一枚奶龙币正在等你通过签到获得。</Card>}</section>
    </main>
  );
}
