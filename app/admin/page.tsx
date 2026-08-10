import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Check,
  ClipboardCheck,
  Coins,
  Flame,
  Gift,
  Heart,
  MessageCircleHeart,
  NotebookPen,
  Snowflake,
  Utensils,
} from "lucide-react";
import { getAdminDashboard } from "@/lib/data";
import { moodMeta } from "@/lib/life";
import { Card } from "@/components/ui/card";
import { Coin } from "@/components/ui/coin";
import { MediaImage } from "@/components/ui/media-image";
import { MoodIcon } from "@/components/mood-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "情侣控制台" };

export default async function AdminPage() {
  const data = await getAdminDashboard();
  const mood = data.mood ? moodMeta(data.mood.value) : null;
  const stats = [
    [Coins, "可用奶龙币", data.wallet?.available_balance ?? 0],
    [Snowflake, "冻结奶龙币", data.wallet?.frozen_balance ?? 0],
    [Flame, "当前连续签到", `${data.streak} 天`],
    [Camera, "本月完整签到", `${data.monthCompleteDays} 天`],
    [Utensils, "累计午间 / 晚间", `${data.lunchCount} / ${data.dinnerCount}`],
    [Coins, "累计发放 / 消费", `${data.totalGranted} / ${data.totalSpent}`],
    [ClipboardCheck, "累计兑换", data.orderCount],
    [ClipboardCheck, "待确认兑换", data.pendingOrders],
  ] as const;

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-bold text-nailong-deep">COUPLE CONSOLE</p>
        <h2 className="mt-1 text-2xl font-black text-brown">她今天怎么样</h2>
        <p className="mt-1 text-sm text-muted">
          {data.user
            ? `先看看 ${data.user.nickname} 今天留下的生活片段，再处理后台事项。`
            : "请先在关系设置中选择另一位成员。"}
        </p>
      </div>

      {data.user && (
        <>
          <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-rose-50">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-white/75 p-4">
                {mood ? (
                  <MoodIcon
                    image={mood.image}
                    label={mood.label}
                    className="size-12"
                    sizes="48px"
                  />
                ) : (
                  <Heart className="size-6 text-rose-400" />
                )}
                <p className="mt-3 text-xs text-muted">今日心情</p>
                <p className="mt-1 font-black text-brown">
                  {mood?.label ?? "今天还没有留下心情"}
                </p>
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <Utensils className="size-6 text-nailong-deep" />
                <p className="mt-3 text-xs text-muted">认真吃饭</p>
                <p className="mt-1 text-sm font-bold text-brown">
                  午饭 {data.lunchDone ? "✓" : "未记录"} · 晚饭{" "}
                  {data.dinnerDone ? "✓" : "未记录"}
                </p>
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <NotebookPen className="size-6 text-orange" />
                <p className="mt-3 text-xs text-muted">今日一句</p>
                <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-brown">
                  {data.note
                    ? `“${data.note.content}”`
                    : "今天还没有留下这句话。"}
                </p>
              </div>
              <div className="rounded-3xl bg-white/75 p-4">
                <Coins className="size-6 text-green-700" />
                <p className="mt-3 text-xs text-muted">奶龙币 / 连续签到</p>
                <p className="mt-1 font-black text-brown">
                  {data.wallet?.available_balance ?? 0} · {data.streak} 天
                </p>
              </div>
            </div>
          </Card>

          <section className="mt-6 grid gap-5 xl:grid-cols-3">
            <Card
              className={
                data.mood && !data.response
                  ? "border-rose-200 bg-rose-50/70"
                  : ""
              }
            >
              <div className="flex items-center gap-2">
                <MessageCircleHeart className="size-5 text-rose-500" />
                <h3 className="font-black text-brown">需要你的回应</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {!data.mood
                  ? `${data.user.nickname} 今天还没有留下心情。`
                  : data.response
                    ? "今天已经回应过啦 ✓"
                    : `${data.user.nickname} 今天${mood?.label ?? "留下了心情"}。`}
              </p>
              {data.mood && (
                <Link
                  href="/admin/moods"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-rose-500"
                >
                  {data.response ? "查看回应" : "回应她"}{" "}
                  <ArrowRight className="size-4" />
                </Link>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gift className="size-5 text-nailong-deep" />
                  <h3 className="font-black text-brown">最近的愿望</h3>
                </div>
                <Link
                  href="/admin/wishes"
                  className="text-xs font-bold text-muted"
                >
                  全部
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {data.recentWishes.length ? (
                  data.recentWishes.map(({ wish, meta }) => (
                    <Link
                      key={wish.id}
                      href="/admin/wishes"
                      className="block rounded-2xl bg-amber-50 p-3"
                    >
                      <p className="text-sm font-bold text-brown">
                        🍰 {wish.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {meta?.status === "preparing"
                          ? "正在偷偷准备中"
                          : meta?.status === "ready"
                            ? "已经准备好"
                            : "可以开始偷偷准备"}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted">最近还没有新愿望。</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="size-5 text-orange" />
                  <h3 className="font-black text-brown">待处理兑换</h3>
                </div>
                <Link
                  href="/admin/orders"
                  className="text-xs font-bold text-muted"
                >
                  全部
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {data.actionOrders.length ? (
                  data.actionOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-stone-50 p-3"
                    >
                      <span className="min-w-0 truncate text-sm font-bold text-brown">
                        {order.product_name_snapshot} ×1
                      </span>
                      <StatusBadge status={order.status} />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm font-bold text-green-700">现在没有需要处理的兑换 · 都处理好啦 ✓</p>
                )}
              </div>
            </Card>
          </section>
        </>
      )}

      <div className="mb-3 mt-8 flex items-center gap-2">
        <Check className="size-5 text-green-700" />
        <h2 className="font-black text-brown">管理概览</h2>
      </div>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(([Icon, label, value]) => (
          <Card key={label} className="p-4">
            <Icon className="size-5 text-nailong-deep" />
            <p className="mt-3 text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl font-black text-brown">{value}</p>
          </Card>
        ))}
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-brown">最近签到</h2>
            <Link
              href="/admin/checkins"
              className="text-xs font-semibold text-muted"
            >
              全部记录
            </Link>
          </div>
          <Card className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
            {data.recentCheckins.length ? (
              data.recentCheckins.map((item) => (
                <div key={item.id}>
                  <MediaImage
                    src={item.signed_url}
                    alt="签到照片"
                    className="aspect-square w-full rounded-2xl"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {formatDate(item.checkin_date)}
                    </span>
                    <StatusBadge status={item.type} />
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full p-5 text-center text-sm text-muted">
                还没有签到记录。
              </p>
            )}
          </Card>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-brown">最近订单</h2>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-muted"
            >
              全部订单
            </Link>
          </div>
          <Card className="divide-y divide-line p-2">
            {data.recentOrders.length ? (
              data.recentOrders.map((order) => (
                <Link
                  href={`/admin/orders/${order.id}`}
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-2xl p-3 hover:bg-amber-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-brown">
                      {order.product_name_snapshot}
                    </p>
                    <Coin
                      value={order.price_snapshot}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <StatusBadge status={order.status} />
                </Link>
              ))
            ) : (
              <p className="p-5 text-center text-sm text-muted">
                还没有兑换订单。
              </p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
