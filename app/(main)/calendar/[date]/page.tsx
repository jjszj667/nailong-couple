import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarHeart,
  Camera,
  Coins,
  Footprints,
  Heart,
  ImagePlus,
  NotebookPen,
  ReceiptText,
  Trash2,
  Utensils,
} from "lucide-react";
import {
  deleteCalendarEventAction,
  deleteMemoryPhotoAction,
  saveCalendarEventAction,
  saveDailyNoteAction,
  saveMemoryPhotosAction,
} from "@/app/actions";
import { getDayDetail } from "@/lib/life-data";
import { dateInShanghai, eventDisplayTitle, moodMeta } from "@/lib/life";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { MediaImage } from "@/components/ui/media-image";
import { MoodIcon } from "@/components/mood-icon";
import { MoodSelector } from "@/components/mood-selector";
import { MultiImagePicker } from "@/components/multi-image-picker";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";

const categoryLabels: Record<string, string> = {
  daily: "生活",
  date: "约会",
  travel: "旅行",
  food: "美食",
  gift: "礼物",
  selfie: "自拍",
  scenery: "风景",
  special: "特别时刻",
  other: "其他",
};

export default async function DayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [{ date }, flash] = await Promise.all([params, searchParams]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const data = await getDayDetail(date);
  const today = dateInShanghai();
  const canEdit = date <= today;
  const ownMood = data.moods.find((item) => item.user_id === data.profile.id);
  const ownNote = data.notes.find((item) => item.user_id === data.profile.id);
  const profileMap = new Map(data.members.map((item) => [item.id, item]));
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${date}T12:00:00+08:00`));
  const income = data.transactions
    .filter((item) => item.direction === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = Math.abs(
    data.transactions
      .filter((item) => item.direction === "expense")
      .reduce((sum, item) => sum + item.amount, 0),
  );
  const hasDayContent = [data.moods, data.notes, data.checkins, data.events, data.photos, data.transactions, data.orders, data.wishes, data.places].some((items) => items.length > 0);

  return (
    <main className="page-shell max-w-5xl py-6 sm:py-10">
      <Link
        href={`/calendar?month=${date.slice(0, 7)}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted"
      >
        <ArrowLeft className="size-4" /> 返回日历
      </Link>
      <Flash {...flash} />

      <header className="relative mb-6 overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-amber-200 via-nailong to-orange-200 p-6 sm:p-9">
        <div className="absolute -right-8 -top-10 size-40 rounded-full bg-white/25" />
        <p className="relative text-xs font-bold text-brown/60">DAY DETAIL</p>
        <h1 className="relative mt-2 text-3xl font-black text-brown">
          {formatDate(date)}
        </h1>
        <p className="relative mt-1 text-sm font-bold text-brown/65">
          {weekday} · 这一天的回忆卡片
        </p>
        {data.events.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {data.events.map((event) => (
              <span
                key={event.id}
                className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-brown"
              >
                ❤️ {eventDisplayTitle(event, date)}
              </span>
            ))}
          </div>
        )}
      </header>

      {!hasDayContent && (
        <EmptyState className="mb-6" icon={CalendarHeart} title="这一天还没有留下记录。" description="以后想起来，也可以回来补上一点。" variant="quiet" />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2">
              <Heart className="size-5 text-rose-500" />
              <h2 className="font-black text-brown">我们的心情</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.members.map((member) => {
                const mood = data.moods.find(
                  (item) => item.user_id === member.id,
                );
                const meta = mood ? moodMeta(mood.value) : null;
                return (
                  <div key={member.id} className="rounded-3xl bg-rose-50 p-4">
                    <div className="flex items-center gap-3">
                      {meta ? (
                        <MoodIcon
                          image={meta.image}
                          label={meta.label}
                          className="size-12 shadow-sm"
                          sizes="48px"
                        />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-full bg-white text-muted">
                          —
                        </span>
                      )}
                      <div>
                        <p className="text-xs font-bold text-muted">
                          {member.nickname} 那天的心情
                        </p>
                        <p className="mt-1 font-black text-brown">
                          {meta?.label ?? "没有记录"}
                        </p>
                      </div>
                    </div>
                    {mood?.note && (
                      <p className="mt-3 text-sm leading-6 text-muted">
                        {mood.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {canEdit && (
              <details className="mt-4" open={!ownMood}>
                <summary className="cursor-pointer text-sm font-bold text-nailong-deep">
                  {ownMood ? "编辑我的心情" : "留下我的心情"}
                </summary>
                <div className="mt-4">
                  <MoodSelector
                    date={date}
                    mood={ownMood}
                    returnTo={`/calendar/${date}`}
                  />
                </div>
              </details>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <NotebookPen className="size-5 text-nailong-deep" />
              <h2 className="font-black text-brown">今日一句</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.members.map((member) => {
                const note = data.notes.find(
                  (item) => item.user_id === member.id,
                );
                return (
                  <div key={member.id} className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-bold text-nailong-deep">
                      {member.nickname}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-brown">
                      {note ? `“${note.content}”` : "那天没有留下这句话。"}
                    </p>
                  </div>
                );
              })}
            </div>
            {canEdit && (
              <form action={saveDailyNoteAction} className="mt-4">
                <input type="hidden" name="date" value={date} />
                <input
                  type="hidden"
                  name="return_to"
                  value={`/calendar/${date}`}
                />
                <textarea
                  name="content"
                  className="field min-h-20"
                  maxLength={240}
                  required
                  defaultValue={ownNote?.content ?? ""}
                  placeholder="我也想给这一天留一句话……"
                />
                <SubmitButton className="mt-3" pendingText="正在保存…">
                  {ownNote ? "更新我的一句话" : "留下我的一句话"}
                </SubmitButton>
              </form>
            )}
          </Card>

          <Card id="photos">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Camera className="size-5 text-nailong-deep" />
                <h2 className="font-black text-brown">今天的照片</h2>
              </div>
              <span className="text-xs text-muted">
                {data.checkins.length + data.photos.length} 张
              </span>
            </div>
            {(data.checkins.length > 0 || data.photos.length > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.checkins.map((item) => (
                  <figure key={item.id} className="min-w-0">
                    <a
                      href={item.signed_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MediaImage
                        src={item.signed_url}
                        alt="吃饭签到照片"
                        className="aspect-square w-full rounded-2xl"
                      />
                    </a>
                    <figcaption className="mt-1 truncate text-[11px] text-muted">
                      {profileMap.get(item.user_id)?.nickname ?? "我们"} ·{" "}
                      {item.type === "lunch" ? "午饭" : "晚饭"}
                    </figcaption>
                  </figure>
                ))}
                {data.photos.map((item) => (
                  <figure key={item.id} className="group relative min-w-0">
                    <a
                      href={item.signed_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MediaImage
                        src={item.signed_url}
                        alt={item.caption || "生活照片"}
                        className="aspect-square w-full rounded-2xl"
                      />
                    </a>
                    <figcaption className="mt-1 text-[11px] text-muted">
                      <span className="block truncate">
                        {profileMap.get(item.user_id)?.nickname ?? "我们"} ·{" "}
                        {categoryLabels[item.category]}
                      </span>
                      {item.caption && (
                        <span className="block truncate">{item.caption}</span>
                      )}
                    </figcaption>
                    {item.user_id === data.profile.id && (
                      <form
                        action={deleteMemoryPhotoAction}
                        className="absolute right-2 top-2"
                      >
                        <input type="hidden" name="photo_id" value={item.id} />
                        <input type="hidden" name="photo_date" value={date} />
                        <button
                          className="flex size-8 items-center justify-center rounded-full bg-white/90 text-muted shadow-sm"
                          aria-label="删除我上传的照片"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    )}
                  </figure>
                ))}
              </div>
            )}
            {canEdit && (
              <details className="mt-5" open={data.photos.length === 0}>
                <summary className="cursor-pointer text-sm font-bold text-nailong-deep">
                  <ImagePlus className="mr-1 inline size-4" /> 添加生活照片
                </summary>
                <form
                  action={saveMemoryPhotosAction}
                  className="mt-4 space-y-3 rounded-3xl bg-amber-50 p-4"
                >
                  <input type="hidden" name="photo_date" value={date} />
                  <MultiImagePicker />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      name="category"
                      className="field"
                      defaultValue="daily"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="caption"
                      className="field"
                      maxLength={240}
                      placeholder="这一刻想说什么？（可选）"
                    />
                  </div>
                  <SubmitButton pendingText="正在上传…">
                    把照片放进这一天
                  </SubmitButton>
                </form>
              </details>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2">
              <Utensils className="size-5 text-nailong-deep" />
              <h2 className="font-black text-brown">认真吃饭</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data.members.map((member) => (
                <div key={member.id} className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs font-bold text-brown">
                    {member.nickname}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
                    {(["lunch", "dinner"] as const).map((type) => (
                      <span key={type}>
                        {type === "lunch" ? "午饭" : "晚饭"}：
                        {data.checkins.some(
                          (item) =>
                            item.user_id === member.id && item.type === type,
                        )
                          ? "✓ 已完成"
                          : "未记录"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {(data.events.length > 0 ||
            data.wishes.length > 0 ||
            data.places.length > 0) && (
            <Card>
              <div className="flex items-center gap-2">
                <CalendarHeart className="size-5 text-rose-500" />
                <h2 className="font-black text-brown">今天发生的事</h2>
              </div>
              <div className="mt-4 space-y-3">
                {data.events.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-rose-50 p-3">
                    <p className="font-bold text-brown">
                      ❤️ {eventDisplayTitle(event, date)}
                    </p>
                    {event.note && (
                      <p className="mt-1 text-xs text-muted">{event.note}</p>
                    )}
                    {(data.profile.role === "admin" ||
                      event.created_by === data.profile.id) && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-bold text-rose-500">
                          修改或删除这个纪念日
                        </summary>
                        <form
                          action={saveCalendarEventAction}
                          className="mt-3 space-y-2 rounded-2xl bg-white/80 p-3"
                        >
                          <input type="hidden" name="id" value={event.id} />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/calendar/${date}`}
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
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              name="event_type"
                              className="field"
                              required
                              maxLength={30}
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
                            className="field min-h-20"
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
                          <div className="flex flex-wrap gap-2">
                            <SubmitButton pendingText="正在更新…">
                              保存修改
                            </SubmitButton>
                          </div>
                        </form>
                        <form
                          action={deleteCalendarEventAction}
                          className="mt-2"
                        >
                          <input
                            type="hidden"
                            name="event_id"
                            value={event.id}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/calendar/${date}`}
                          />
                          <SubmitButton
                            className="bg-stone-100 text-stone-600 shadow-none"
                            pendingText="正在删除…"
                          >
                            <Trash2 className="size-4" /> 删除纪念日
                          </SubmitButton>
                        </form>
                      </details>
                    )}
                  </div>
                ))}
                {data.wishes.map((wish) => (
                  <div
                    key={wish.id}
                    className="rounded-2xl bg-amber-50 p-3 font-bold text-brown"
                  >
                    ✨ “{wish.title}”实现啦
                  </div>
                ))}
                {data.places.map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center gap-2 rounded-2xl bg-green-50 p-3"
                  >
                    <Footprints className="size-4 text-green-700" />
                    <span className="font-bold text-brown">
                      {place.title} · {place.place_name}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-green-700" />
              <h2 className="font-black text-brown">奶龙币</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-green-50 p-3">
                <p className="text-xs text-muted">当天获得</p>
                <p className="mt-1 font-black text-green-700">+{income}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-3">
                <p className="text-xs text-muted">当天消费</p>
                <p className="mt-1 font-black text-brown">-{expense}</p>
              </div>
            </div>
          </Card>

          {data.orders.length > 0 && (
            <Card>
              <div className="flex items-center gap-2">
                <ReceiptText className="size-5 text-muted" />
                <h2 className="font-black text-brown">兑换</h2>
              </div>
              <div className="mt-3 space-y-2">
                {data.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3"
                  >
                    <span className="min-w-0 truncate text-sm font-bold text-brown">
                      {order.product_name_snapshot} ×1
                    </span>
                    <StatusBadge status={order.status} context="life" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
