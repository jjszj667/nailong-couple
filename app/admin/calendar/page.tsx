import { BookHeart, CalendarHeart, Trash2 } from "lucide-react";
import {
  deleteCalendarEventAction,
  saveCalendarEventAction,
} from "@/app/actions";
import { getCalendarData } from "@/lib/life-data";
import { dateInShanghai } from "@/lib/life";
import { Card } from "@/components/ui/card";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [data, flash] = await Promise.all([getCalendarData(), searchParams]);
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-black text-brown">纪念日管理</h2>
        <p className="mt-1 text-sm text-muted">
          日历、纪念日提醒和“我们的故事”使用同一份事件数据。
        </p>
      </div>
      <Flash {...flash} />
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <h3 className="font-black text-brown">添加纪念日</h3>
          <form action={saveCalendarEventAction} className="mt-4 space-y-3">
            <input type="hidden" name="return_to" value="/admin/calendar" />
            <input
              name="title"
              className="field"
              required
              maxLength={80}
              placeholder="纪念日名称"
            />
            <input
              name="event_date"
              type="date"
              className="field"
              required
              defaultValue={dateInShanghai()}
            />
            <div className="grid grid-cols-2 gap-3">
              <select name="event_type" className="field">
                <option value="anniversary">纪念日</option>
                <option value="birthday">生日</option>
                <option value="travel">旅行</option>
                <option value="date">约会</option>
                <option value="special">特别事件</option>
              </select>
              <select name="repeat_type" className="field">
                <option value="none">不重复</option>
                <option value="yearly">每年重复</option>
              </select>
            </div>
            <textarea
              name="note"
              className="field min-h-20"
              maxLength={800}
              placeholder="备注（可选）"
            />
            <label className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-brown">
              <input
                name="is_story_event"
                type="checkbox"
                className="size-4 accent-rose-400"
              />
              加入“我们的故事”时间线
            </label>
            <SubmitButton pendingText="正在保存…">
              <CalendarHeart className="size-4" /> 保存纪念日
            </SubmitButton>
          </form>
        </Card>
        <div className="space-y-3">
          {data.events.length ? (
            data.events.map((event) => (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-nailong-deep">
                      {event.event_date} ·{" "}
                      {event.repeat_type === "yearly" ? "每年重复" : "仅一次"}
                    </p>
                    <h3 className="mt-1 font-black text-brown">
                      {event.title}
                    </h3>
                    {event.is_story_event && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-rose-500">
                        <BookHeart className="size-3.5" /> 已加入我们的故事
                      </p>
                    )}
                    {event.note && (
                      <p className="mt-1 text-sm text-muted">{event.note}</p>
                    )}
                  </div>
                  <form action={deleteCalendarEventAction}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input
                      type="hidden"
                      name="return_to"
                      value="/admin/calendar"
                    />
                    <button
                      className="flex size-10 items-center justify-center rounded-full bg-stone-100 text-muted"
                      aria-label="删除"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState icon={CalendarHeart} title="暂无纪念日" description="使用左侧表单创建第一条事件。" variant="technical" />
          )}
        </div>
      </div>
    </div>
  );
}
