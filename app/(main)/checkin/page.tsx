import { Check, Clock3, Gift, LockKeyhole, Moon, Sun } from "lucide-react";
import { submitCheckinAction } from "@/app/actions";
import { getCheckinPageData } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/image-picker";
import { getCheckinWindow } from "@/lib/checkin-windows";

export const metadata = { title: "今日签到" };

export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [data, flash] = await Promise.all([getCheckinPageData(), searchParams]);
  const value = (key: string) => data.settings.find((item) => item.key === key)?.value ?? 0;
  const meals = [
    { type: "lunch", done: data.lunchDone, reward: value("lunch_reward"), icon: Sun, hint: "中午吃了什么？用照片留住这一餐。", window: getCheckinWindow("lunch") },
    { type: "dinner", done: data.dinnerDone, reward: value("dinner_reward"), icon: Moon, hint: "晚上也要好好吃，奶龙在等你的照片。", window: getCheckinWindow("dinner") },
  ] as const;

  return (
    <main className="page-shell py-7 sm:py-10">
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">Daily check-in</p><h1 className="mt-1 text-3xl font-black tracking-tight text-brown">每天限时签到</h1><p className="mt-2 text-sm leading-6 text-muted">午间 11:00–13:00、晚间 16:00–22:00 开放；两个时段都完成还有一份完整奖励。</p></div>
      <Flash {...flash} />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="py-4"><p className="text-xs text-muted">今日获得</p><Coin value={data.todayIncome} className="mt-2 text-xl" /></Card>
        <Card className="py-4"><p className="text-xs text-muted">连续完整签到</p><p className="mt-2 text-xl font-black text-brown">{data.streak} 天</p></Card>
        <Card className="py-4"><p className="text-xs text-muted">本月完整签到</p><p className="mt-2 text-xl font-black text-brown">{data.monthCompleteDays} 天</p></Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {meals.map(({ type, done, reward, icon: Icon, hint, window }) => (
          <Card key={type} className={done ? "border-green-200 bg-green-50/80" : "overflow-hidden"}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><span className={`flex size-11 items-center justify-center rounded-2xl ${done ? "bg-green-600 text-white" : "bg-amber-100 text-nailong-deep"}`}><Icon className="size-5" /></span><div><h2 className="text-lg font-black text-brown">{window.label}</h2><p className="text-xs font-semibold text-nailong-deep">{window.timeLabel} · 奖励 +{reward}</p></div></div>
              {done && <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-green-700"><Check className="size-3.5" />已完成</span>}
            </div>
            {done ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl bg-white/65 text-center"><div className="text-5xl">🍚</div><p className="mt-4 font-bold text-brown">这一餐已经好好记录啦</p><p className="mt-1 text-sm text-muted">明天再来和奶龙打卡吧～</p></div>
            ) : !window.isOpen ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-amber-50/70 px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-3xl bg-white text-nailong-deep shadow-sm"><LockKeyhole className="size-6" /></span>
                <p className="mt-4 font-bold text-brown">当前不在签到时间</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-nailong-deep"><Clock3 className="size-4" />{window.timeLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted">到时间后刷新页面，就可以上传照片啦。</p>
              </div>
            ) : (
              <form action={submitCheckinAction}>
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="request_id" value={crypto.randomUUID()} />
                <ImagePicker required purpose="checkin" label={`上传${window.shortLabel.slice(0, 2)}照片`} />
                <p className="mt-3 text-sm leading-6 text-muted">{hint}</p>
                <SubmitButton className="mt-4 w-full" pendingText="正在保存照片和发币…">完成{window.shortLabel}</SubmitButton>
              </form>
            )}
          </Card>
        ))}
      </section>

      <Card className="mt-6 border-amber-200 bg-amber-50/80">
        <div className="flex gap-3"><Gift className="mt-0.5 size-5 shrink-0 text-orange" /><div><h2 className="font-bold text-brown">今日完整奖励</h2><p className="mt-1 text-sm leading-6 text-muted">午间和晚间限时签到都完成后，再自动获得 +{value("daily_complete_reward")} 奶龙币。每个时段和每份奖励都只会发放一次。</p></div></div>
      </Card>
    </main>
  );
}
