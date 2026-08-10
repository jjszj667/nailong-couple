import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, Check, Clock3, Heart, MessageCircleHeart, NotebookPen, Sparkles, Utensils } from "lucide-react";
import { getUserOverview } from "@/lib/data";
import { getHomeLifeData } from "@/lib/life-data";
import { anniversaryYears, moodMeta } from "@/lib/life";
import { saveDailyNoteAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { MoodIcon } from "@/components/mood-icon";
import { MoodSelector } from "@/components/mood-selector";
import { SubmitButton } from "@/components/ui/submit-button";
import { getPublicImageUrl } from "@/lib/utils";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [data, life, flash] = await Promise.all([getUserOverview(), getHomeLifeData(), searchParams]);
  const balance = data.wallet?.available_balance ?? 0;
  const total = balance + (data.wallet?.frozen_balance ?? 0);
  const mood = life.mood ? moodMeta(life.mood.value) : null;

  return (
    <main className="page-shell py-5 sm:py-9">
      <Flash {...flash} />
      <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#f9d766] via-[#f6c84c] to-[#eeae32] p-6 shadow-[0_20px_45px_rgba(203,140,22,0.2)] sm:p-9">
        <div className="absolute -right-8 -top-12 size-52 rounded-full bg-white/20" />
        <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brown/65">你好，{data.profile.nickname}</p>
            <h1 className="mt-2 max-w-xl text-2xl font-black leading-tight tracking-tight text-brown sm:text-4xl">奶龙提醒你：今天有好好吃饭吗？</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3"><span className="rounded-full bg-white/55 px-4 py-2 text-sm font-bold text-brown">当前奶龙币 <strong className="ml-1 text-lg">{total}</strong></span><Link href="/checkin" className="pill-button bg-white">去签到 <Camera className="size-4" /></Link></div>
          </div>
          <Image src="/nailong/nailong-3d.png" alt="开心的奶龙" width={176} height={176} priority className="mx-auto size-36 object-contain drop-shadow-[0_16px_18px_rgba(119,72,8,0.2)] sm:size-44" />
        </div>
      </section>

      {data.announcement && <Card className="mt-4 flex items-start gap-3 border-amber-200 bg-amber-50/90 py-4"><Sparkles className="mt-0.5 size-5 shrink-0 text-orange" /><div><p className="text-xs font-bold text-nailong-deep">{data.announcement.title}</p><p className="mt-1 text-sm leading-6 text-brown">{data.announcement.content}</p></div></Card>}

      <section className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="relative overflow-hidden bg-brown text-white">
          <CalendarDays className="absolute -bottom-4 -right-3 size-28 text-white/5" />
          <p className="text-xs font-bold text-nailong">OUR DAYS</p>
          {life.relationshipDays ? <><h2 className="mt-2 text-2xl font-black">我们已经一起走过 {life.relationshipDays} 天啦</h2><p className="mt-2 text-sm text-white/65">{life.relationship?.title}的第 {life.relationshipDays} 天</p></> : <><h2 className="mt-2 text-xl font-black">我们的日子正在等一个开始日期</h2><p className="mt-2 text-sm text-white/65">管理员可以在设置中填写关系日期。</p></>}
        </Card>
        <Card>
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-nailong-deep">TODAY</p><h2 className="mt-1 text-xl font-black text-brown">今日签到</h2></div><Link href="/checkin" className="text-sm font-bold text-muted">去签到</Link></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[["午间", data.lunchDone, Utensils], ["晚间", data.dinnerDone, Clock3]].map(([label, done, Icon]) => {
              const MealIcon = Icon as typeof Utensils;
              return <div key={String(label)} className={`rounded-2xl p-4 ${done ? "bg-green-50" : "bg-amber-50"}`}><div className="flex items-center justify-between"><MealIcon className={`size-5 ${done ? "text-green-700" : "text-nailong-deep"}`} />{done ? <Check className="size-4 text-green-700" /> : <span className="text-xs text-muted">未完成</span>}</div><p className="mt-3 font-bold text-brown">{String(label)}签到</p></div>;
            })}
          </div>
          <p className="mt-3 text-sm text-muted">今日通过生活记录获得 <strong className="text-green-700">+{data.todayIncome}</strong> 奶龙币</p>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold text-nailong-deep">MOOD</p><h2 className="mt-1 text-xl font-black text-brown">我的心情</h2></div>{mood && <span className="flex items-center gap-2 rounded-full bg-amber-100 py-1 pl-1 pr-3 text-sm font-bold text-brown"><MoodIcon image={mood.image} label={mood.label} className="size-8" sizes="32px" />{mood.label}</span>}</div>
            {life.mood ? <div><div className="rounded-2xl bg-amber-50 p-4"><p className="font-bold text-brown">今天的心情：{mood?.label}</p>{life.mood.note && <p className="mt-2 text-sm leading-6 text-muted">{life.mood.note}</p>}{life.mood.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{life.mood.tags.map((tag) => <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs text-muted">{tag}</span>)}</div>}</div><details className="mt-4"><summary className="cursor-pointer text-sm font-bold text-nailong-deep">编辑今天的心情</summary><div className="mt-4"><MoodSelector date={data.today} mood={life.mood} /></div></details></div> : <MoodSelector date={data.today} />}
          </Card>

          {life.response && <Card className="border-rose-200 bg-rose-50/80"><div className="flex gap-3"><MessageCircleHeart className="mt-0.5 size-6 shrink-0 text-rose-500" /><div><p className="text-xs font-bold text-rose-500">他回应了你今天的心情 ❤️</p><p className="mt-2 text-lg font-bold text-brown">{life.response.content}</p>{life.response.coin_reward > 0 && <p className="mt-2 text-sm text-muted">还偷偷塞给你 <Coin value={life.response.coin_reward} className="text-sm" /></p>}</div></div></Card>}

          <Card>
            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-nailong-deep"><NotebookPen className="size-5" /></span><div><h2 className="font-black text-brown">今日一句</h2><p className="text-xs text-muted">今天最想留下的一句话</p></div></div>
            <form action={saveDailyNoteAction} className="mt-4"><input type="hidden" name="date" value={data.today} /><input type="hidden" name="return_to" value="/" /><textarea name="content" className="field min-h-24" maxLength={240} required defaultValue={life.note?.content ?? ""} placeholder="今天想留下什么？" /><SubmitButton className="mt-3" pendingText="正在保存…">{life.note ? "更新这句话" : "留在今天"}</SubmitButton></form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-white to-amber-50"><p className="text-xs font-bold text-nailong-deep">我们的日子</p>{life.upcoming ? <><h2 className="mt-2 text-xl font-black text-brown">{life.upcoming.daysAway === 0 ? `${life.upcoming.event.title}${anniversaryYears(life.upcoming.event, life.upcoming.occurrence) ? ` ${anniversaryYears(life.upcoming.event, life.upcoming.occurrence)} 周年` : ""}，就是今天 ❤️` : `距离${life.upcoming.event.title}${anniversaryYears(life.upcoming.event, life.upcoming.occurrence) ? ` ${anniversaryYears(life.upcoming.event, life.upcoming.occurrence)} 周年` : ""}还有 ${life.upcoming.daysAway} 天`}</h2><p className="mt-2 text-sm text-muted">点击日历看看这一天留下了什么。</p></> : <><h2 className="mt-2 text-xl font-black text-brown">还没有添加纪念日</h2><p className="mt-2 text-sm text-muted">把第一次见面、旅行和特别的一天收进日历吧。</p></>}<Link href="/calendar" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-nailong-deep">打开日历 <ArrowRight className="size-4" /></Link></Card>

          {life.wishes.length > 0 && <Card><div className="flex items-center justify-between"><h2 className="font-black text-brown">最近愿望</h2><Link href="/wishes" className="text-xs font-bold text-muted">全部</Link></div><div className="mt-3 space-y-2">{life.wishes.map((wish) => <div key={wish.id} className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3"><Heart className="size-4 text-orange" /><span className="text-sm font-semibold text-brown">{wish.title}</span></div>)}</div></Card>}

          <div><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black text-brown">推荐兑换</h2><Link href="/shop" className="text-sm font-bold text-muted">全部</Link></div><div className="grid gap-3">{data.products.slice(0, 3).map((product) => <Link href={`/shop/${product.id}`} key={product.id}><Card className="flex gap-3 p-3 transition hover:-translate-y-0.5"><MediaImage src={getPublicImageUrl("product-images", product.image_url)} alt={product.name} className="size-16 rounded-2xl" /><div className="min-w-0 flex-1"><p className="truncate font-bold text-brown">{product.name}</p><p className="mt-1 line-clamp-1 text-xs text-muted">{product.product_type === "mystery" ? product.mystery_hint : product.description}</p><Coin value={product.price} className="mt-2 text-sm" /></div></Card></Link>)}</div></div>

          <Card><div className="flex items-center gap-2"><Sparkles className="size-5 text-nailong-deep" /><h2 className="font-black text-brown">最近动态</h2></div><div className="mt-3 divide-y divide-line">{life.activities.slice(0, 2).map((item) => <div key={item.id} className="py-3"><p className="text-sm text-brown">{item.text}</p></div>)}{data.transactions.slice(0, 3).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><p className="min-w-0 truncate text-sm text-brown">{item.reason}</p><span className={`text-sm font-bold ${item.amount > 0 ? "text-green-700" : "text-muted"}`}>{item.amount > 0 ? "+" : ""}{item.amount}</span></div>)}</div>{data.transactions.length === 0 && life.activities.length === 0 && <p className="mt-3 text-sm text-muted">今天的小世界还很安静。</p>}</Card>
        </div>
      </section>
    </main>
  );
}
