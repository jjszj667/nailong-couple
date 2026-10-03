"use client";
import { useState } from "react";
import { CalendarToolbar } from "@/components/calendar-toolbar";
import { CalendarMotion } from "@/components/motion/calendar-motion";
import { FeatureHero } from "@/components/feature-hero";
import { NailongCompanion } from "@/components/nailong-companion";
import { MoodSelector } from "@/components/mood-selector";
import { ImagePicker } from "@/components/image-picker";
import { MultiImagePicker } from "@/components/multi-image-picker";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { EmptyState } from "@/components/ui/empty-state";
import { RewardFeedback } from "@/components/motion/reward-feedback";
import { AnniversaryMoment } from "@/components/anniversary-moment";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

/** Development-only fixtures: no user data and no simulated database writes. */
export function DesignLab() {
  const [reward, setReward] = useState<"normal" | "makeup" | "redeem" | null>(null);
  const [version, setVersion] = useState(0);
  const [balance, setBalance] = useState(128);
  const [calendarMonth, setCalendarMonth] = useState("2026-10");
  const [year, month] = calendarMonth.split("-").map(Number);
  const previousMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
  const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
  return <div onSubmitCapture={(event) => event.preventDefault()} className="space-y-8">
    <div className="grid gap-6 lg:grid-cols-2"><Card id="mood"><h2 className="mb-4 text-xl font-black">今天，感觉怎么样？</h2><MoodSelector date="2026-10-03" /></Card><Card><FeatureHero feature="checkin"><h1>记录一餐小幸福</h1></FeatureHero><ImagePicker /><div className="mt-4 flex flex-wrap gap-2"><button type="button" className="pill-button" onClick={() => { setReward("normal"); setVersion(version + 1); setBalance(balance + 10); }}>预览准时签到反馈</button><button type="button" className="pill-button bg-stone-100" onClick={() => { setReward("makeup"); setVersion(version + 1); setBalance(balance + 5); }}>预览补签反馈</button></div><p className="mt-3 text-xs text-muted">仅动画演示，不写入真实签到和余额</p></Card></div>
    <div data-wallet-target className="flex justify-end"><Coin value={balance} className="text-2xl" /></div>
    {reward && <RewardFeedback key={version} kind={reward} amount={reward === "normal" ? 10 : reward === "makeup" ? 5 : undefined} />}
    <FeatureHero feature="calendar"><h1>时间，也可以轻轻流动。</h1><p>月份、纪念日和两个人的回忆，都在这里。</p></FeatureHero>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CalendarToolbar key={calendarMonth} year={year} month={month} previousMonth={previousMonth} nextMonth={nextMonth} today="2026-10-03" defaultEventDate="2026-10-03" /><CalendarMotion month={calendarMonth} previousMonth={previousMonth} nextMonth={nextMonth} onMonthChange={setCalendarMonth}><div className="calendar-grid grid grid-cols-7 gap-1">{Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, i) => <a data-calendar-day={`2026-10-${i + 1}`} key={i} href="#calendar" className="rounded-2xl border border-line p-2 text-sm"><span>{i + 1}</span>{i === 2 && <span className="mt-3 block text-xs text-rose-600">特别日子</span>}</a>)}</div></CalendarMotion></Card><div className="space-y-6"><AnniversaryMoment title="在一起的每一天" days={365} /><AnniversaryMoment title="今天，是我们的特别日子" days={0} today /><EmptyState title="故事才刚刚开始" description="慢慢来，生活会把这里填满。" /></div></div>
    <FeatureHero feature="shop"><h1>给生活，一点小奖励。</h1><p>申请兑换只会保留金币，不会提前扣款。</p></FeatureHero><div className="shop-grid grid gap-5 sm:grid-cols-3">{["一起出发", "一份小惊喜", "认真生活的小奖"].map((name, i) => <Card key={name} className="shop-product"><NailongCompanion pose={i === 0 ? "travel" : i === 1 ? "gift" : "celebrate"} className="mx-auto size-40" /><h2 className="my-4 text-xl font-black">{name}</h2><Coin value={30 + i * 20} /><form className="mt-4" onSubmit={() => { setReward("redeem"); setVersion(version + 1); }}><ConfirmSubmitButton message="这是开发环境的动画预览，不会申请真实订单。" className="w-full">预览兑换确认</ConfirmSubmitButton></form></Card>)}</div>
    <Card><h2 className="mb-4 font-black">多图上传 · 照片会自动优化</h2><MultiImagePicker /></Card>
  </div>;
}
