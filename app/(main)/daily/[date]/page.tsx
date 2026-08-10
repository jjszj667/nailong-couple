import Link from "next/link";
import {
  ArrowLeft,
  CalendarHeart,
  Coins,
  Heart,
  NotebookPen,
  ReceiptText,
  Utensils,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getDailyReport } from "@/lib/life-data";
import { moodMeta } from "@/lib/life";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { MoodIcon } from "@/components/mood-icon";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function DailyReportPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const report = await getDailyReport(date);
  const mood = report.mood ? moodMeta(report.mood.value) : null;
  return (
    <main className="page-shell max-w-3xl py-6 sm:py-10">
      <Link
        href={`/calendar?month=${date.slice(0, 7)}&date=${date}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted"
      >
        <ArrowLeft className="size-4" />
        返回日历
      </Link>
      <Card className="overflow-hidden p-0">
        <header className="relative overflow-hidden bg-gradient-to-br from-amber-200 via-nailong to-orange-300 p-7 sm:p-10">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/20" />
          <p className="relative text-xs font-bold text-brown/60">
            NAILONG DAILY
          </p>
          <h1 className="relative mt-2 text-3xl font-black text-brown">
            奶龙日报
          </h1>
          <p className="relative mt-2 text-sm font-semibold text-brown/70">
            {formatDate(date)} · 今天的生活卡片
          </p>
        </header>
        <div className="space-y-4 p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-rose-50 p-4">
              {mood ? (
                <MoodIcon
                  image={mood.image}
                  label={mood.label}
                  className="size-12 shadow-sm"
                  sizes="48px"
                />
              ) : (
                <Heart className="size-5 text-rose-500" />
              )}
              <p className="mt-3 text-xs text-muted">今日心情</p>
              <p className="mt-1 font-black text-brown">
                {mood?.label ?? "没有记录"}
              </p>
            </div>
            <div className="rounded-3xl bg-green-50 p-4">
              <Coins className="size-5 text-green-700" />
              <p className="mt-3 text-xs text-muted">今日获得</p>
              <p className="mt-1 font-black text-green-700">
                +{report.income} 奶龙币
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["lunch", "dinner"].map((type) => {
              const checkin = report.checkins.find(
                (item) => item.type === type,
              );
              return (
                <div key={type} className="rounded-3xl bg-amber-50 p-4">
                  <Utensils className="size-5 text-nailong-deep" />
                  <p className="mt-3 text-xs text-muted">
                    {type === "lunch" ? "午间签到" : "晚间签到"}
                  </p>
                  <p className="mt-1 font-black text-brown">
                    {checkin ? "完成 ✓" : "未记录"}
                  </p>
                </div>
              );
            })}
          </div>
          {report.checkins.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {report.checkins.map((item) => (
                <MediaImage
                  key={item.id}
                  src={item.signed_url}
                  alt="当天吃饭照片"
                  className="aspect-square w-full rounded-3xl"
                />
              ))}
            </div>
          )}
          {report.note && (
            <div className="rounded-3xl bg-amber-50 p-5">
              <div className="flex items-center gap-2">
                <NotebookPen className="size-5 text-nailong-deep" />
                <p className="text-xs font-bold text-nailong-deep">今日一句</p>
              </div>
              <p className="mt-3 text-lg font-bold leading-8 text-brown">
                “{report.note.content}”
              </p>
            </div>
          )}
          {report.events.length > 0 && (
            <div className="rounded-3xl bg-rose-50 p-5">
              <div className="flex items-center gap-2">
                <CalendarHeart className="size-5 text-rose-500" />
                <p className="text-xs font-bold text-rose-500">今日事件</p>
              </div>
              <div className="mt-3 space-y-2">
                {report.events.map((event) => (
                  <div key={event.id}>
                    <p className="font-bold text-brown">{event.title}</p>
                    {event.note && (
                      <p className="text-sm text-muted">{event.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.orders.length > 0 && (
            <div className="rounded-3xl bg-stone-50 p-5">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5 text-muted" />
                <p className="text-xs font-bold text-muted">今日兑换</p>
              </div>
              <div className="mt-3 space-y-2">
                {report.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-bold text-brown">
                      {order.product_name_snapshot}
                    </span>
                    <StatusBadge status={order.status} context="life" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.wishes.length > 0 && (
            <div className="rounded-3xl bg-rose-50 p-5">
              <div className="flex items-center gap-2">
                <Heart className="size-5 text-rose-500" />
                <p className="text-xs font-bold text-rose-500">愿望实现</p>
              </div>
              <div className="mt-3 space-y-2">
                {report.wishes.map((wish) => (
                  <p key={wish.id} className="font-bold text-brown">
                    “{wish.title}”实现啦 ❤️
                  </p>
                ))}
              </div>
            </div>
          )}
          {!report.mood &&
            !report.note &&
            report.checkins.length === 0 &&
            report.events.length === 0 &&
            report.orders.length === 0 &&
            report.wishes.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-4xl">🌙</p>
                <h2 className="mt-3 font-black text-brown">这一天还很安静</h2>
                <p className="mt-1 text-sm text-muted">
                  以后留下的生活片段会自动聚合到这里。
                </p>
              </div>
            )}
        </div>
      </Card>
    </main>
  );
}
