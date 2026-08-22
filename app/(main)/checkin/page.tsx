import { Camera, Check, Clock3, Gift, Info, LockKeyhole, Moon, Sun } from "lucide-react";
import { submitCheckinAction } from "@/app/actions";
import { getAdminPartnerCheckinData, getCheckinPageData } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/image-picker";
import { getCheckinWindow } from "@/lib/checkin-windows";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "签到情况" };

export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ profile }, flash] = await Promise.all([requireUser(), searchParams]);

  if (profile.role === "admin") {
    const data = await getAdminPartnerCheckinData();
    const meals = [
      {
        type: "lunch",
        label: "午间签到",
        icon: Sun,
        checkin: data.todayCheckins.find((item) => item.type === "lunch"),
      },
      {
        type: "dinner",
        label: "晚间签到",
        icon: Moon,
        checkin: data.todayCheckins.find((item) => item.type === "dinner"),
      },
    ] as const;
    const completed = meals.filter((item) => item.checkin).length;
    const earlierCheckins = data.recentCheckins.filter(
      (item) => item.checkin_date !== data.today,
    );

    return (
      <main className="page-shell py-7 sm:py-10">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">
            Her daily check-in
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-brown">
            {data.partner ? `${data.partner.nickname}今天的签到` : "她今天的签到"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            这里只用来查看她的签到状态和照片，管理员账户不再参与签到。
          </p>
        </div>
        <Flash {...flash} />

        {!data.partner ? (
          <Card className="py-14 text-center">
            <Camera className="mx-auto size-9 text-nailong-deep" />
            <p className="mt-3 font-bold text-brown">还没有找到对方账户</p>
            <p className="mt-1 text-sm text-muted">请先在管理设置中配置关系双方。</p>
          </Card>
        ) : (
          <>
            <section className="mb-6 grid gap-3 sm:grid-cols-3">
              <Card className="py-4">
                <p className="text-xs text-muted">今日进度</p>
                <p className="mt-2 text-xl font-black text-brown">{completed} / 2 餐</p>
              </Card>
              <Card className="py-4">
                <p className="text-xs text-muted">连续完整签到</p>
                <p className="mt-2 text-xl font-black text-brown">{data.streak} 天</p>
              </Card>
              <Card className="py-4">
                <p className="text-xs text-muted">本月完整签到</p>
                <p className="mt-2 text-xl font-black text-brown">{data.monthCompleteDays} 天</p>
              </Card>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              {meals.map(({ type, label, icon: Icon, checkin }) => (
                <Card key={type} className={checkin ? "border-green-200 bg-green-50/80" : "border-amber-200 bg-amber-50/70"}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-11 items-center justify-center rounded-2xl ${checkin ? "bg-green-600 text-white" : "bg-white text-nailong-deep"}`}>
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h2 className="font-black text-brown">{label}</h2>
                        <p className="mt-1 text-xs text-muted">
                          {checkin ? formatDate(checkin.created_at, true) : "今天还没有完成"}
                        </p>
                      </div>
                    </div>
                    {checkin ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-green-700">
                        {checkin.checkin_kind === "makeup" ? "已补签" : "已完成"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">未签到</span>
                    )}
                  </div>
                  {checkin ? (
                    <a href={checkin.signed_url || "#"} target="_blank" rel="noreferrer">
                      <MediaImage
                        src={checkin.signed_url}
                        alt={`${data.partner.nickname}${label}照片`}
                        className="aspect-[4/3] w-full rounded-3xl"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-white/70 text-center">
                      <div>
                        <Camera className="mx-auto size-7 text-nailong-deep" />
                        <p className="mt-2 text-sm font-semibold text-muted">等她留下今天的照片</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <p className="text-xs font-bold text-nailong-deep">RECENT PHOTOS</p>
                <h2 className="mt-1 text-xl font-black text-brown">最近的签到照片</h2>
              </div>
              {earlierCheckins.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {earlierCheckins.slice(0, 12).map((item) => (
                    <Card key={item.id} className="p-3">
                      <a href={item.signed_url || "#"} target="_blank" rel="noreferrer">
                        <MediaImage
                          src={item.signed_url}
                          alt={`${data.partner.nickname}签到照片`}
                          className="aspect-[4/3] w-full rounded-2xl"
                        />
                      </a>
                      <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
                        <div>
                          <p className="font-bold text-brown">{formatDate(item.checkin_date)}</p>
                          <p className="mt-1 text-xs text-muted">
                            {item.type === "lunch" ? "午间" : "晚间"} · {item.checkin_kind === "makeup" ? "补签" : "正常签到"}
                          </p>
                        </div>
                        <Check className="size-4 text-green-700" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="py-12 text-center text-sm text-muted">还没有更早的签到照片。</Card>
              )}
            </section>
          </>
        )}
      </main>
    );
  }

  const data = await getCheckinPageData();
  const value = (key: string) => data.settings.find((item) => item.key === key)?.value ?? 0;
  const meals = [
    { type: "lunch", checkin: data.todayCheckins.find((item) => item.type === "lunch"), reward: value("lunch_reward"), icon: Sun, hint: "中午吃了什么？用照片留住这一餐。", window: getCheckinWindow("lunch") },
    { type: "dinner", checkin: data.todayCheckins.find((item) => item.type === "dinner"), reward: value("dinner_reward"), icon: Moon, hint: "晚上也要好好吃，奶龙在等你的照片。", window: getCheckinWindow("dinner") },
  ] as const;

  return (
    <main className="page-shell py-7 sm:py-10">
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-wider text-nailong-deep">Daily check-in</p><h1 className="mt-1 text-3xl font-black tracking-tight text-brown">每天限时签到</h1><p className="mt-2 text-sm leading-6 text-muted">午间 11:00–14:00、晚间 16:00–22:00 为正常签到；当天错过对应时段后仍可补签。</p></div>
      <Flash {...flash} />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="py-4"><p className="text-xs text-muted">今日获得</p><Coin value={data.todayIncome} className="mt-2 text-xl" /></Card>
        <Card className="py-4"><p className="text-xs text-muted">连续完整签到</p><p className="mt-2 text-xl font-black text-brown">{data.streak} 天</p></Card>
        <Card className="py-4"><p className="text-xs text-muted">本月完整签到</p><p className="mt-2 text-xl font-black text-brown">{data.monthCompleteDays} 天</p></Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {meals.map(({ type, checkin, reward, icon: Icon, hint, window }) => (
          <Card key={type} className={checkin ? "border-green-200 bg-green-50/80" : "overflow-hidden"}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${checkin ? "bg-green-600 text-white" : "bg-amber-100 text-nailong-deep"}`}><Icon className="size-5" /></span><div className="min-w-0"><h2 className="text-lg font-black text-brown">{window.label}</h2><p className="text-xs font-semibold leading-5 text-nailong-deep">{window.timeLabel} · {window.isMakeup && !checkin ? "补签 +1" : `正常奖励 +${reward}`}</p></div></div>
              {checkin && <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-green-700"><Check className="size-3.5" />{checkin.checkin_kind === "makeup" ? "已补签" : "已完成"}</span>}
            </div>
            {checkin ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl bg-white/65 px-5 text-center"><div className="text-5xl">🍚</div><p className="mt-4 font-bold text-brown">这一餐已经好好记录啦</p><p className="mt-1 text-sm text-muted">{checkin.checkin_kind === "makeup" ? "本次为补签，奖励 1 枚奶龙币。" : `本次为正常签到，奖励 ${checkin.reward_amount} 枚奶龙币。`}</p></div>
            ) : window.isBeforeWindow ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-amber-200 bg-amber-50/70 px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-3xl bg-white text-nailong-deep shadow-sm"><LockKeyhole className="size-6" /></span>
                <p className="mt-4 font-bold text-brown">签到时间还没到</p>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-nailong-deep"><Clock3 className="size-4" />{window.timeLabel}</p>
                <p className="mt-2 text-sm leading-6 text-muted">到时间后刷新页面，就可以按正常奖励签到啦。</p>
              </div>
            ) : (
              <form action={submitCheckinAction}>
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="request_id" value={crypto.randomUUID()} />
                {window.isMakeup && (
                  <div className="mb-4 flex gap-2.5 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm leading-6 text-brown">
                    <Info className="mt-0.5 size-4 shrink-0 text-orange" />
                    <p><strong>当前为补签，补签奖励 1 奶龙币。</strong> 补签后本餐会记为已完成，但不参与正常完整签到和连续签到奖励。</p>
                  </div>
                )}
                <ImagePicker required purpose="checkin" label={`上传${window.shortLabel.slice(0, 2)}照片`} />
                <p className="mt-3 text-sm leading-6 text-muted">{hint}</p>
                <SubmitButton className="mt-4 w-full" pendingText="正在保存照片和发币…">{window.isMakeup ? `补签${window.shortLabel}` : `完成${window.shortLabel}`}</SubmitButton>
              </form>
            )}
          </Card>
        ))}
      </section>

      <Card className="mt-6 border-amber-200 bg-amber-50/80">
        <div className="flex gap-3"><Gift className="mt-0.5 size-5 shrink-0 text-orange" /><div><h2 className="font-bold text-brown">今日正常完整奖励</h2><p className="mt-1 text-sm leading-6 text-muted">午间和晚间都在正常时段完成后，再自动获得 +{value("daily_complete_reward")} 奶龙币。补签只发放本餐的 1 枚奶龙币，不额外触发完整或连续奖励。</p></div></div>
      </Card>
    </main>
  );
}
