import Link from "next/link";
import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Coins,
  NotebookPen,
  Plus,
  Trash2,
  Utensils,
} from "lucide-react";
import {
  deleteCalendarEventAction,
  saveCalendarEventAction,
  saveDailyNoteAction,
} from "@/app/actions";
import { getCalendarData } from "@/lib/life-data";
import {
  dateInShanghai,
  dateOnly,
  eventOccurrenceInYear,
  moodMeta,
  parseDateOnly,
} from "@/lib/life";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { MoodIcon } from "@/components/mood-icon";
import { MoodSelector } from "@/components/mood-selector";
import { MoodTrend } from "@/components/mood-trend";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "我们的日历" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    date?: string;
    ok?: string;
    error?: string;
  }>;
}) {
  const query = await searchParams;
  const data = await getCalendarData(query.month, query.date);
  const today = dateInShanghai();
  const firstWeekday = parseDateOnly(data.bounds.start).getUTCDay();
  const totalDays = parseDateOnly(data.bounds.end).getUTCDate();
  const cells = Array.from({ length: firstWeekday + totalDays }, (_, index) =>
    index < firstWeekday
      ? null
      : dateOnly(
          new Date(
            Date.UTC(
              data.bounds.year,
              data.bounds.monthNumber - 1,
              index - firstWeekday + 1,
            ),
          ),
        ),
  );
  const returnTo = data.selectedDate
    ? `/calendar?month=${data.bounds.month}&date=${data.selectedDate}`
    : `/calendar?month=${data.bounds.month}`;
  const eventOnDate = (date: string) =>
    data.events.filter((event) =>
      event.repeat_type === "yearly"
        ? eventOccurrenceInYear(event, Number(date.slice(0, 4))) === date
        : event.event_date === date,
    );
  const reminders = data.upcomingEvents
    .filter((item) => item.reminderLevel)
    .slice(0, 3);
  const eventTypeLabels: Record<string, string> = {
    anniversary: "纪念日",
    birthday: "生日",
    travel: "旅行",
    date: "约会",
    special: "特别的一天",
  };

  return (
    <main className="page-shell py-6 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-bold text-nailong-deep">OUR TIME</p>
        <h1 className="mt-1 text-3xl font-black text-brown">我们的日历</h1>
        <p className="mt-2 text-sm text-muted">
          心情、吃饭、纪念日和一句话，都从同一条时间线回看。
        </p>
      </div>
      <Flash ok={query.ok} error={query.error} />
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <MoodTrend moods={data.recentMoods} dates={data.trendDates} />
        <Card className="bg-gradient-to-br from-amber-50 to-rose-50">
          <p className="text-xs font-bold text-nailong-deep">纪念日提醒</p>
          <h2 className="mt-1 text-lg font-black text-brown">日子快到啦</h2>
          {reminders.length ? (
            <div className="mt-3 space-y-2">
              {reminders.map((item) => (
                <Link
                  key={item.event.id}
                  href={`/calendar/${item.occurrence}`}
                  className={`flex items-center justify-between gap-3 rounded-2xl p-3 ${item.reminderLevel === "today" ? "bg-rose-100" : item.reminderLevel === "soon" ? "bg-orange-100" : "bg-amber-100"}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brown">
                      ❤️ {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.daysAway === 0
                        ? "今天就是这个特别的日子 ❤️"
                        : item.daysAway <= 3
                          ? `还有 ${item.daysAway} 天就是这个特别的日子啦`
                          : `再过 ${item.daysAway} 天，就是这个特别的日子啦`}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              最近 7 天没有纪念日提醒，下一个特别日子仍会显示在日历里。
            </p>
          )}
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="min-w-0 overflow-hidden p-3 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <Link
              href={`/calendar?month=${data.bounds.previous}`}
              className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-brown"
              aria-label="上个月"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <h2 className="text-xl font-black text-brown">
              {data.bounds.year} 年 {data.bounds.monthNumber} 月
            </h2>
            <Link
              href={`/calendar?month=${data.bounds.next}`}
              className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-brown"
              aria-label="下个月"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted">
            {"日一二三四五六".split("").map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((date, index) =>
              date ? (
                (() => {
                  const dayMoods = data.moods.filter(
                    (item) => item.mood_date === date,
                  );
                  const completed = data.checkins.filter(
                    (item) => item.checkin_date === date,
                  ).length;
                  const events = eventOnDate(date);
                  const selected = data.selectedDate === date;
                  return (
                    <Link
                      key={date}
                      href={`/calendar/${date}`}
                      className={`relative min-h-20 min-w-0 rounded-2xl border p-1.5 transition sm:min-h-24 sm:p-2 ${selected ? "border-amber-400 bg-amber-100" : date === today ? "border-amber-300 bg-amber-50" : "border-line/70 bg-white hover:bg-amber-50"}`}
                    >
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${date === today ? "bg-nailong text-brown" : "text-muted"}`}
                      >
                        {Number(date.slice(-2))}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {dayMoods.slice(0, 2).map((mood) => {
                          const owner = data.members.find(
                            (member) => member.id === mood.user_id,
                          );
                          const meta = moodMeta(mood.value);
                          return (
                            <span
                              key={mood.id}
                              className="size-2.5 rounded-full ring-2 ring-white"
                              style={{ backgroundColor: meta.color }}
                              title={`${owner?.nickname ?? "我们"}：${meta.label}`}
                            />
                          );
                        })}
                        {events.length > 0 && (
                          <span
                            className="size-2 rounded-full bg-rose-400"
                            title={events[0].title}
                          />
                        )}
                        {completed === 2 && (
                          <span className="text-[10px] text-green-700">✓✓</span>
                        )}
                      </div>
                      {events[0] && (
                        <p className="mt-1 truncate text-[9px] font-semibold text-rose-600 sm:text-[10px]">
                          {events[0].title}
                        </p>
                      )}
                    </Link>
                  );
                })()
              ) : (
                <div key={`blank-${index}`} />
              ),
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <MoodIcon
                image={moodMeta("pleasant").image}
                label="心情"
                className="size-5"
                sizes="20px"
              />
              双人心情
            </span>
            <span>● 纪念日</span>
            <span>✓✓ 两餐完成</span>
          </div>
        </Card>

        <div className="space-y-5">
          {data.selectedDate && data.day ? (
            <>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-nailong-deep">
                      DAY DETAIL
                    </p>
                    <h2 className="mt-1 text-xl font-black text-brown">
                      {formatDate(data.selectedDate)}
                    </h2>
                  </div>
                  <Link
                    href={`/daily/${data.selectedDate}`}
                    className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-brown"
                  >
                    奶龙日报
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {["lunch", "dinner"].map((type) => {
                    const item = data.day?.checkins.find(
                      (checkin) => checkin.type === type,
                    );
                    return (
                      <div
                        key={type}
                        className={`rounded-2xl p-3 ${item ? "bg-green-50" : "bg-stone-50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <Utensils
                            className={`size-4 ${item ? "text-green-700" : "text-muted"}`}
                          />
                          <span className="text-sm font-bold text-brown">
                            {type === "lunch" ? "午间" : "晚间"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {item ? "已完成 ✓" : "未记录"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {data.day.checkins.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {data.day.checkins.map((item) => (
                      <MediaImage
                        key={item.id}
                        src={item.signed_url}
                        alt="吃饭照片"
                        className="aspect-square w-full rounded-2xl"
                      />
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  {data.day.note && (
                    <div className="rounded-2xl bg-amber-50 p-3">
                      <p className="text-xs font-bold text-nailong-deep">
                        今日一句
                      </p>
                      <p className="mt-1 text-sm text-brown">
                        {data.day.note.content}
                      </p>
                    </div>
                  )}
                  {data.day.events.map((event) => {
                    const next = data.upcomingEvents.find(
                      (item) => item.event.id === event.id,
                    );
                    const canManageEvent =
                      data.profile.role === "admin" ||
                      event.created_by === data.profile.id;
                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl bg-rose-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-rose-500">
                              {eventTypeLabels[event.event_type] ?? "特别事件"}{" "}
                              ·{" "}
                              {event.repeat_type === "yearly"
                                ? "每年重复"
                                : "仅这一次"}
                            </p>
                            <p className="mt-1 font-bold text-brown">
                              {next?.title ?? event.title}
                            </p>
                            {next && (
                              <p className="mt-1 text-xs text-muted">
                                下次 {formatDate(next.occurrence)} ·{" "}
                                {next.daysAway === 0
                                  ? "就是今天 ❤️"
                                  : `还有 ${next.daysAway} 天`}
                              </p>
                            )}
                            {event.note && (
                              <p className="mt-1 text-xs text-muted">
                                {event.note}
                              </p>
                            )}
                          </div>
                          {canManageEvent && (
                            <form action={deleteCalendarEventAction}>
                              <input
                                type="hidden"
                                name="event_id"
                                value={event.id}
                              />
                              <input
                                type="hidden"
                                name="return_to"
                                value={returnTo}
                              />
                              <button
                                className="flex size-9 items-center justify-center rounded-full bg-white text-muted"
                                aria-label="删除纪念日"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </form>
                          )}
                        </div>
                        {canManageEvent && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-bold text-rose-500">
                              编辑这件事
                            </summary>
                            <form
                              action={saveCalendarEventAction}
                              className="mt-3 space-y-2 rounded-2xl bg-white/75 p-3"
                            >
                              <input type="hidden" name="id" value={event.id} />
                              <input
                                type="hidden"
                                name="return_to"
                                value={returnTo}
                              />
                              <input
                                name="title"
                                className="field"
                                required
                                maxLength={80}
                                defaultValue={event.title}
                              />
                              <input
                                name="event_date"
                                type="date"
                                className="field"
                                required
                                defaultValue={event.event_date}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  name="event_type"
                                  className="field"
                                  defaultValue={event.event_type}
                                />
                                <select
                                  name="repeat_type"
                                  className="field"
                                  defaultValue={event.repeat_type}
                                >
                                  <option value="none">仅这一次</option>
                                  <option value="yearly">每年重复</option>
                                </select>
                              </div>
                              <textarea
                                name="note"
                                className="field min-h-16"
                                maxLength={800}
                                defaultValue={event.note}
                              />
                              <label className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-brown">
                                <input
                                  name="is_story_event"
                                  type="checkbox"
                                  defaultChecked={event.is_story_event}
                                  className="size-4 accent-rose-400"
                                />
                                加入“我们的故事”时间线
                              </label>
                              <SubmitButton pendingText="正在更新…">
                                保存修改
                              </SubmitButton>
                            </form>
                          </details>
                        )}
                      </div>
                    );
                  })}
                  {data.day.transactions.length > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-green-50 p-3">
                      <span className="flex items-center gap-2 text-sm font-bold text-brown">
                        <Coins className="size-4 text-green-700" />
                        当日奶龙币变化
                      </span>
                      <strong className="text-green-700">
                        {data.day.transactions.reduce(
                          (sum, item) => sum + item.amount,
                          0,
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <h2 className="font-black text-brown">这一天的心情</h2>
                <div className="mt-4">
                  <MoodSelector
                    date={data.selectedDate}
                    mood={data.day.mood}
                    returnTo={returnTo}
                  />
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-2">
                  <NotebookPen className="size-5 text-nailong-deep" />
                  <h2 className="font-black text-brown">这一天的一句话</h2>
                </div>
                <form action={saveDailyNoteAction} className="mt-4">
                  <input type="hidden" name="date" value={data.selectedDate} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <textarea
                    name="content"
                    className="field min-h-20"
                    maxLength={240}
                    required
                    defaultValue={data.day.note?.content ?? ""}
                  />
                  <SubmitButton className="mt-3" pendingText="正在保存…">
                    保存
                  </SubmitButton>
                </form>
              </Card>

              <Card>
                <div className="flex items-center gap-2">
                  <Plus className="size-5 text-nailong-deep" />
                  <h2 className="font-black text-brown">
                    添加纪念日 / 特殊事件
                  </h2>
                </div>
                <form
                  action={saveCalendarEventAction}
                  className="mt-4 space-y-3"
                >
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input
                    type="hidden"
                    name="event_date"
                    value={data.selectedDate}
                  />
                  <input
                    name="title"
                    className="field"
                    required
                    maxLength={80}
                    placeholder="例如：第一次一起看电影"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select name="event_type" className="field">
                      <option value="anniversary">纪念日</option>
                      <option value="birthday">生日</option>
                      <option value="travel">旅行</option>
                      <option value="date">约会</option>
                      <option value="special">特别的一天</option>
                    </select>
                    <select name="repeat_type" className="field">
                      <option value="none">仅这一次</option>
                      <option value="yearly">每年重复</option>
                    </select>
                  </div>
                  <textarea
                    name="note"
                    className="field min-h-20"
                    maxLength={800}
                    placeholder="补充一点想记住的细节（可选）"
                  />
                  <label className="flex items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-brown">
                    <input
                      name="is_story_event"
                      type="checkbox"
                      className="size-4 accent-rose-400"
                    />
                    加入“我们的故事”时间线
                  </label>
                  <SubmitButton pendingText="正在收藏…">
                    <CalendarHeart className="size-4" />
                    收藏这一天
                  </SubmitButton>
                </form>
              </Card>
            </>
          ) : (
            <Card className="py-14 text-center">
              <CalendarHeart className="mx-auto size-10 text-nailong-deep" />
              <h2 className="mt-4 font-black text-brown">点一天看看</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                这里会显示当天的心情、吃饭照片、今日一句和特别事件。
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
