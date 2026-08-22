import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Heart,
  MessageCircleHeart,
  NotebookPen,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";
import { getHomePageData } from "@/lib/life-data";
import { moodMeta } from "@/lib/life";
import { saveDailyNoteAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { MoodIcon } from "@/components/mood-icon";
import { MoodSelector } from "@/components/mood-selector";
import { MoodTrend } from "@/components/mood-trend";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, getPublicImageUrl } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [{ overview: data, life }, flash] = await Promise.all([
    getHomePageData(),
    searchParams,
  ]);
  const balance = data.wallet?.available_balance ?? 0;
  const total = balance + (data.wallet?.frozen_balance ?? 0);
  const mood = life.mood ? moodMeta(life.mood.value) : null;
  const highlightedEvent =
    life.nearEvents[0] ?? life.upcoming ?? life.latestPastEvent;
  const extraNearEvents = Math.max(0, life.nearEvents.length - 1);
  const isAdmin = data.profile.role === "admin";
  const partnerTodayCheckins = life.partner
    ? life.coupleCheckins.filter(
        (item) => item.user_id === life.partner?.id,
      )
    : [];
  const partnerLunch = partnerTodayCheckins.find(
    (item) => item.type === "lunch",
  );
  const partnerDinner = partnerTodayCheckins.find(
    (item) => item.type === "dinner",
  );
  const todayMeals = [
    {
      label: "午间",
      done: isAdmin ? Boolean(partnerLunch) : data.lunchDone,
      icon: Utensils,
      checkin: isAdmin ? partnerLunch : null,
    },
    {
      label: "晚间",
      done: isAdmin ? Boolean(partnerDinner) : data.dinnerDone,
      icon: Clock3,
      checkin: isAdmin ? partnerDinner : null,
    },
  ];
  const partnerCompletedMeals = todayMeals.filter((item) => item.done).length;

  return (
    <main className="page-shell py-5 sm:py-9">
      <Flash {...flash} />
      <section
        className={`relative overflow-hidden rounded-[2.25rem] p-6 shadow-[0_20px_45px_rgba(203,140,22,0.2)] sm:p-9 ${life.anniversaryMode ? "bg-gradient-to-br from-rose-200 via-amber-100 to-orange-200" : "bg-gradient-to-br from-[#f9d766] via-[#f6c84c] to-[#eeae32]"}`}
      >
        <div className="absolute -right-8 -top-12 size-52 rounded-full bg-white/20" />
        {life.anniversaryMode && (
          <>
            <Heart className="absolute left-[52%] top-5 size-5 fill-rose-300 text-rose-300" />
            <Sparkles className="absolute right-[22%] top-10 size-6 text-rose-400" />
          </>
        )}
        <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold text-brown/65">
              你好，{data.profile.nickname}
            </p>
            <h1 className="mt-2 max-w-xl text-2xl font-black leading-tight tracking-tight text-brown sm:text-4xl">
              {life.anniversaryMode
                ? `❤️ 今天是${life.anniversaryMode.title}`
                : isAdmin
                  ? `今天也看看${life.partner?.nickname ?? "她"}有没有好好吃饭`
                  : "奶龙提醒你：今天有好好吃饭吗？"}
            </h1>
            {life.anniversaryMode && (
              <p className="mt-2 text-sm font-bold text-brown/65">
                今天是属于我们的特别一天。
                {life.otherTodayEvents.length > 0 &&
                  ` 还有 ${life.otherTodayEvents.length} 个特别日子也在今天。`}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/55 px-4 py-2 text-sm font-bold text-brown">
                {isAdmin ? (
                  <>她今日已签 <strong className="ml-1 text-lg">{partnerCompletedMeals} / 2</strong></>
                ) : (
                  <>当前奶龙币 <strong className="ml-1 text-lg">{total}</strong></>
                )}
              </span>
              <Link href="/checkin" className="pill-button bg-white">
                {isAdmin ? "查看她的签到" : "去签到"} <Camera className="size-4" />
              </Link>
            </div>
          </div>
          <Image
            src="/nailong/nailong-3d.png"
            alt="开心的奶龙"
            width={176}
            height={176}
            priority
            className="mx-auto size-36 object-contain drop-shadow-[0_16px_18px_rgba(119,72,8,0.2)] sm:size-44"
          />
        </div>
      </section>

      {data.announcement && (
        <Card className="mt-4 flex items-start gap-3 border-amber-200 bg-amber-50/90 py-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-orange" />
          <div>
            <p className="text-xs font-bold text-nailong-deep">
              {life.partner?.nickname ?? "TA"} 给你留了一句话
            </p>
            <p className="mt-1 text-sm font-bold text-brown">
              {data.announcement.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-brown">
              {data.announcement.content}
            </p>
          </div>
        </Card>
      )}

      <section className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-br from-[#fff9e5] via-[#fff2c8] to-[#fde4c7] text-brown">
          <CalendarDays className="absolute -bottom-4 -right-3 size-28 text-brown/5" />
          {highlightedEvent?.reminderLevel === "today" && (
            <Sparkles className="absolute right-5 top-5 size-7 text-rose-200" />
          )}
          <p className="text-xs font-bold text-nailong-deep">OUR DAYS</p>
          {life.relationshipDays ? (
            <>
              <h2 className="mt-2 text-2xl font-black">
                我们已经一起走过 {life.relationshipDays} 天啦
              </h2>
              <p className="mt-2 text-sm text-brown/65">
                {life.relationship?.title}的第 {life.relationshipDays} 天
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-xl font-black">
                我们的日子正在等一个开始日期
              </h2>
              <p className="mt-2 text-sm text-brown/65">
                先在小屋设置里写下我们的开始日期吧。
              </p>
            </>
          )}
          {highlightedEvent ? (
            <Link
              href={`/calendar/${highlightedEvent.occurrence}`}
              className={`relative mt-5 block rounded-[1.5rem] border p-4 transition hover:-translate-y-0.5 sm:p-5 ${
                highlightedEvent.reminderLevel === "today"
                  ? "border-rose-200 bg-rose-50/90"
                  : highlightedEvent.reminderLevel === "soon"
                    ? "border-orange-200 bg-orange-50/90"
                    : highlightedEvent.reminderLevel === "week"
                      ? "border-amber-200 bg-amber-50/90"
                      : "border-white/80 bg-white/70"
              }`}
            >
              <div className="relative min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-wide text-rose-500">
                      ❤️ {highlightedEvent.isPast ? "最近的特别日子" : "下一个特别日子"}
                    </p>
                    <h3 className="mt-1 break-words text-lg font-black leading-snug text-brown sm:text-xl">
                      {highlightedEvent.title}
                    </h3>
                  </div>
                  <ArrowRight className="mt-1 size-5 shrink-0 text-nailong-deep" />
                </div>
                <div className="mt-4 grid gap-2 min-[390px]:grid-cols-[1fr_auto] min-[390px]:items-center">
                  <div className="rounded-2xl bg-white/75 px-3 py-2.5">
                    <p className="text-[11px] font-bold text-muted">纪念日日期</p>
                    <p className="mt-0.5 text-sm font-black text-brown">
                      {formatDate(highlightedEvent.occurrence)}
                    </p>
                  </div>
                  <p className="rounded-2xl bg-brown px-4 py-3 text-center text-sm font-black text-white">
                    {highlightedEvent.daysAway === 0
                      ? "就是今天 ❤️"
                      : highlightedEvent.daysAway < 0
                        ? `已经过去 ${Math.abs(highlightedEvent.daysAway)} 天`
                        : `还有 ${highlightedEvent.daysAway} 天`}
                  </p>
                </div>
                {extraNearEvents > 0 && (
                  <p className="mt-3 text-xs font-semibold text-brown/60">
                    还有 {extraNearEvents} 个日子快到啦
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <Link
              href="/calendar"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-nailong"
            >
              收藏我们的特别日子 <ArrowRight className="size-4" />
            </Link>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-nailong-deep">TODAY</p>
              <h2 className="mt-1 text-xl font-black text-brown">
                {isAdmin ? `${life.partner?.nickname ?? "她"}今天的签到` : "今日签到"}
              </h2>
            </div>
            <Link href="/checkin" className="text-sm font-bold text-muted">
              {isAdmin ? "查看照片" : "去签到"}
            </Link>
          </div>
          {todayMeals.every((item) => !item.done) && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <p className="font-black text-brown">
                {isAdmin ? "她今天还没有签到" : "今天还没有签到"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isAdmin ? "等她留下今天的吃饭照片。" : "吃完饭记得来留张照片。"}
              </p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {todayMeals.map(({ label, done, icon: MealIcon, checkin }) => (
                <div
                  key={label}
                  className={`rounded-2xl p-4 ${done ? "bg-green-50" : "bg-amber-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <MealIcon
                      className={`size-5 ${done ? "text-green-700" : "text-nailong-deep"}`}
                    />
                    {done ? (
                      <Check className="size-4 text-green-700" />
                    ) : (
                      <span className="text-xs text-muted">未完成</span>
                    )}
                  </div>
                  {isAdmin && checkin?.signed_url && (
                    <MediaImage
                      src={checkin.signed_url}
                      alt={`${life.partner?.nickname ?? "她"}${label}签到照片`}
                      className="mt-3 aspect-[4/3] w-full rounded-xl"
                    />
                  )}
                  <p className="mt-3 font-bold text-brown">
                    {label}签到
                  </p>
                  {isAdmin && checkin && (
                    <p className="mt-1 text-xs text-muted">
                      {checkin.checkin_kind === "makeup" ? "补签" : "正常签到"} · {formatDate(checkin.created_at, true)}
                    </p>
                  )}
                </div>
              ))}
          </div>
          {isAdmin ? (
            <p className="mt-3 text-sm text-muted">今天已完成 {partnerCompletedMeals} / 2 次签到。</p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              今日通过生活记录获得{" "}
              <strong className="text-green-700">+{data.todayIncome}</strong>{" "}
              奶龙币
            </p>
          )}
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-nailong-deep">MOOD</p>
                <h2 className="mt-1 text-xl font-black text-brown">我的心情</h2>
              </div>
              {mood && (
                <span className="flex items-center gap-2 rounded-full bg-amber-100 py-1 pl-1 pr-3 text-sm font-bold text-brown">
                  <MoodIcon
                    image={mood.image}
                    label={mood.label}
                    className="size-8"
                    sizes="32px"
                  />
                  {mood.label}
                </span>
              )}
            </div>
            {life.mood ? (
              <div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="font-bold text-brown">
                    今天的心情：{mood?.label}
                  </p>
                  {life.mood.note && (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {life.mood.note}
                    </p>
                  )}
                  {life.mood.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {life.mood.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white px-2.5 py-1 text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-nailong-deep">
                    编辑今天的心情
                  </summary>
                  <div className="mt-4">
                    <MoodSelector date={data.today} mood={life.mood} />
                  </div>
                </details>
              </div>
            ) : (
              <div>
                <p className="font-black text-brown">今天还没有留下心情</p>
                <p className="mt-1 text-sm text-muted">现在感觉怎么样？</p>
                <div className="mt-4"><MoodSelector date={data.today} /></div>
              </div>
            )}
            {life.partner && (
              <div className="mt-4 rounded-2xl bg-rose-50 p-3">
                {(() => {
                  const partnerMood = life.coupleMoods.find(
                    (item) => item.user_id === life.partner?.id,
                  );
                  const partnerMeta = partnerMood
                    ? moodMeta(partnerMood.value)
                    : null;
                  return (
                    <div className="flex items-center gap-3">
                      {partnerMeta ? (
                        <MoodIcon
                          image={partnerMeta.image}
                          label={partnerMeta.label}
                          className="size-10"
                          sizes="40px"
                        />
                      ) : (
                        <span className="flex size-10 items-center justify-center rounded-full bg-white text-muted">
                          —
                        </span>
                      )}
                      <div>
                        <p className="text-xs font-bold text-muted">
                          {life.partner.nickname} 今天的心情
                        </p>
                        <p className="mt-0.5 font-bold text-brown">{partnerMeta?.label ?? `${life.partner.nickname || "TA"} 今天还没有留下心情`}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <MoodTrend
              moods={life.recentMoods}
              dates={life.trendDates}
              compact
            />
          </Card>

          {life.response && (
            <Card className="border-rose-200 bg-rose-50/80">
              <div className="flex gap-3">
                <MessageCircleHeart className="mt-0.5 size-6 shrink-0 text-rose-500" />
                <div>
                  <p className="text-xs font-bold text-rose-500">
                    {life.responseFrom?.nickname ??
                      life.partner?.nickname ??
                      "TA"}{" "}
                    回应了你今天的心情 ❤️
                  </p>
                  <p className="mt-2 text-lg font-bold text-brown">
                    {life.response.content}
                  </p>
                  {life.response.coin_reward > 0 && (
                    <p className="mt-2 text-sm text-muted">
                      还偷偷塞给你{" "}
                      <Coin
                        value={life.response.coin_reward}
                        className="text-sm"
                      />
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-nailong-deep">
                <NotebookPen className="size-5" />
              </span>
              <div>
                <h2 className="font-black text-brown">今日一句</h2>
                <p className="text-xs text-muted">今天最想留下的一句话</p>
              </div>
            </div>
            <form action={saveDailyNoteAction} className="mt-4">
              <input type="hidden" name="date" value={data.today} />
              <input type="hidden" name="return_to" value="/" />
              <textarea
                name="content"
                className="field min-h-24"
                maxLength={240}
                required
                defaultValue={life.note?.content ?? ""}
                placeholder="今天想留下什么？"
              />
              <SubmitButton className="mt-3" pendingText="正在保存…">
                {life.note ? "更新这句话" : "留在今天"}
              </SubmitButton>
            </form>
            {life.partner && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3">
                <p className="text-xs font-bold text-nailong-deep">
                  {life.partner.nickname} 今天留下的一句话
                </p>
                <p className="mt-1 text-sm leading-6 text-brown">
                  {life.coupleNotes.find(
                    (item) => item.user_id === life.partner?.id,
                  )?.content ?? "今天还没有留下记录。"}
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {!isAdmin && data.goalProduct && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
              <div className="flex items-center gap-2">
                <Target className="size-5 text-nailong-deep" />
                <p className="text-xs font-bold text-nailong-deep">
                  下一份期待
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <MediaImage
                  src={getPublicImageUrl(
                    "product-images",
                    data.goalProduct.image_url,
                  )}
                  alt={data.goalProduct.name}
                  className="size-14 rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-brown">
                    {data.goalProduct.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {data.goalRemaining > 0
                      ? `还差 ${data.goalRemaining} 奶龙币`
                      : "已经攒够啦！"}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-nailong to-orange"
                  style={{ width: `${data.goalProgress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>
                  {balance} / {data.goalProduct.price}
                </span>
                <Link
                  href={`/shop/${data.goalProduct.id}`}
                  className="font-bold text-nailong-deep"
                >
                  去看看 →
                </Link>
              </div>
            </Card>
          )}

          {life.randomMemory && (
            <Card className="overflow-hidden p-0">
              {life.randomMemory.signed_url && (
                <MediaImage
                  src={life.randomMemory.signed_url}
                  alt={life.randomMemory.title}
                  className="aspect-[16/7] w-full"
                />
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 text-nailong-deep">
                  <BookOpen className="size-5" />
                  <p className="text-xs font-bold">
                    奶龙翻到了一页以前的故事 📖
                  </p>
                </div>
                <p className="mt-3 text-xs text-muted">
                  {life.randomMemory.isOnThisDay
                    ? "那年今日"
                    : `${life.randomMemory.daysAgo} 天前`}
                  {life.randomMemory.owner &&
                    ` · ${life.randomMemory.owner.nickname}`}
                </p>
                <p className="mt-1 font-black text-brown">
                  {life.randomMemory.title}
                </p>
                {life.randomMemory.body && (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                    {life.randomMemory.body}
                  </p>
                )}
                <Link
                  href={`/calendar/${life.randomMemory.memory_date}`}
                  className="mt-3 inline-flex text-xs font-bold text-nailong-deep"
                >
                  看看那一天 →
                </Link>
              </div>
            </Card>
          )}

          {life.wishes.length > 0 && (
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-black text-brown">最近愿望</h2>
                <Link href="/wishes" className="text-xs font-bold text-muted">
                  全部
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {life.wishes.map((wish) => (
                  <div
                    key={wish.id}
                    className="flex items-center gap-2 rounded-2xl bg-amber-50 p-3"
                  >
                    <Heart className="size-4 text-orange" />
                    <span className="text-sm font-semibold text-brown">
                      {wish.title}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!isAdmin && <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-brown">推荐兑换</h2>
              <Link href="/shop" className="text-sm font-bold text-muted">
                全部
              </Link>
            </div>
            <div className="grid gap-3">
              {data.products.slice(0, 3).map((product) => (
                <Link href={`/shop/${product.id}`} key={product.id}>
                  <Card className="flex gap-3 p-3 transition hover:-translate-y-0.5">
                    <MediaImage
                      src={getPublicImageUrl(
                        "product-images",
                        product.image_url,
                      )}
                      alt={product.name}
                      className="size-16 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-brown">
                        {product.name}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted">
                        {product.product_type === "mystery"
                          ? product.mystery_hint
                          : product.description}
                      </p>
                      <Coin value={product.price} className="mt-2 text-sm" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>}

          {(life.activities.length > 0 || data.transactions.length > 0) && <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-nailong-deep" />
              <h2 className="font-black text-brown">最近动态</h2>
            </div>
            <div className="mt-3 divide-y divide-line">
              {life.activities.slice(0, 2).map((item) => (
                <div key={item.id} className="py-3">
                  <p className="text-sm text-brown">{item.text}</p>
                </div>
              ))}
              {data.transactions.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <p className="min-w-0 truncate text-sm text-brown">
                    {item.operator_id &&
                    item.operator_id === life.partner?.id &&
                    item.direction === "income"
                      ? `${life.partner.nickname} 偷偷塞给你奶龙币`
                      : item.reason}
                  </p>
                  <span
                    className={`text-sm font-bold ${item.amount > 0 ? "text-green-700" : "text-muted"}`}
                  >
                    {item.amount > 0 ? "+" : ""}
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
          </Card>}
        </div>
      </section>
    </main>
  );
}
