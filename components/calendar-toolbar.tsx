"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  CalendarHeart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { saveCalendarEventAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";

type CalendarToolbarProps = {
  year: number;
  month: number;
  previousMonth: string;
  nextMonth: string;
  today: string;
  defaultEventDate: string;
};

function closeDialog(ref: React.RefObject<HTMLDialogElement | null>) {
  ref.current?.close();
}

export function CalendarToolbar({
  year,
  month,
  previousMonth,
  nextMonth,
  today,
  defaultEventDate,
}: CalendarToolbarProps) {
  const router = useRouter();
  const jumpDialog = useRef<HTMLDialogElement>(null);
  const eventDialog = useRef<HTMLDialogElement>(null);
  const [jumpYear, setJumpYear] = useState(year);
  const [jumpMonth, setJumpMonth] = useState(month);
  const [eventDate, setEventDate] = useState(defaultEventDate);
  const currentYear = Number(today.slice(0, 4));
  const years = useMemo(
    () => Array.from({ length: 101 }, (_, index) => currentYear - 50 + index),
    [currentYear],
  );

  function jumpToMonth() {
    const targetMonth = `${jumpYear}-${String(jumpMonth).padStart(2, "0")}`;
    closeDialog(jumpDialog);
    router.push(`/calendar?month=${targetMonth}`);
  }

  return (
    <>
      <div className="mb-5 space-y-3">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
          <Link
            href={`/calendar?month=${previousMonth}`}
            className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-brown transition hover:bg-amber-100"
            aria-label="上个月"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <button
            type="button"
            onClick={() => jumpDialog.current?.showModal()}
            className="mx-auto flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-full px-3 text-lg font-black text-brown transition hover:bg-amber-50 sm:text-xl"
            aria-label="快速选择年份和月份"
          >
            <span className="truncate">{year} 年 {month} 月</span>
            <ChevronDown className="size-4 shrink-0 text-nailong-deep" />
          </button>
          <Link
            href={`/calendar?month=${nextMonth}`}
            className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-brown transition hover:bg-amber-100"
            aria-label="下个月"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <Link
            href={`/calendar?month=${today.slice(0, 7)}&date=${today}`}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-4 text-sm font-bold text-brown transition hover:bg-stone-200"
          >
            <RotateCcw className="size-4" /> 回到今天
          </Link>
          <button
            type="button"
            onClick={() => eventDialog.current?.showModal()}
            className="pill-button min-h-11 px-4 text-sm"
          >
            <Plus className="size-4" /> 添加纪念日
          </button>
        </div>
      </div>

      <dialog
        ref={jumpDialog}
        className="m-auto w-[calc(100%_-_1.25rem)] max-w-md rounded-[1.75rem] border border-line bg-milk p-0 text-brown shadow-2xl backdrop:bg-brown/35"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog(jumpDialog);
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-nailong-deep">QUICK JUMP</p>
              <h2 className="mt-1 text-xl font-black">快速跳转日期</h2>
            </div>
            <button
              type="button"
              onClick={() => closeDialog(jumpDialog)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-muted"
              aria-label="关闭年月选择器"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">
              年份
              <select
                className="field mt-2"
                value={jumpYear}
                onChange={(event) => setJumpYear(Number(event.target.value))}
              >
                {years.map((item) => (
                  <option key={item} value={item}>{item} 年</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              月份
              <select
                className="field mt-2"
                value={jumpMonth}
                onChange={(event) => setJumpMonth(Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>{item} 月</option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" onClick={jumpToMonth} className="pill-button mt-5 w-full">
            跳转到 {jumpYear} 年 {jumpMonth} 月
          </button>
        </div>
      </dialog>

      <dialog
        ref={eventDialog}
        className="m-auto max-h-[calc(100dvh_-_1.25rem)] w-[calc(100%_-_1.25rem)] max-w-lg overflow-y-auto rounded-[1.75rem] border border-line bg-milk p-0 text-brown shadow-2xl backdrop:bg-brown/35"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog(eventDialog);
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
                <CalendarHeart className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-nailong-deep">OUR SPECIAL DAY</p>
                <h2 className="mt-0.5 text-xl font-black">添加纪念日</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => closeDialog(eventDialog)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-muted"
              aria-label="关闭添加纪念日界面"
            >
              <X className="size-5" />
            </button>
          </div>
          <form action={saveCalendarEventAction} className="mt-5 space-y-3">
            <input
              type="hidden"
              name="return_to"
              value={`/calendar?month=${eventDate.slice(0, 7)}&date=${eventDate}`}
            />
            <label className="block text-sm font-bold">
              纪念日名称
              <input
                name="title"
                className="field mt-2"
                required
                maxLength={80}
                placeholder="例如：第一次一起看电影"
              />
            </label>
            <label className="block text-sm font-bold">
              日期
              <input
                name="event_date"
                type="date"
                className="field mt-2"
                required
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
              <label className="text-sm font-bold">
                类型
                <select name="event_type" className="field mt-2" defaultValue="anniversary">
                  <option value="anniversary">纪念日</option>
                  <option value="birthday">生日</option>
                  <option value="travel">旅行</option>
                  <option value="date">约会</option>
                  <option value="special">特别的一天</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                重复
                <select name="repeat_type" className="field mt-2" defaultValue="yearly">
                  <option value="yearly">每年重复</option>
                  <option value="none">仅这一次</option>
                </select>
              </label>
            </div>
            <label className="block text-sm font-bold">
              想记住的细节（可选）
              <textarea
                name="note"
                className="field mt-2 min-h-20"
                maxLength={800}
                placeholder="写下一点属于这一天的故事"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold">
              <input name="is_story_event" type="checkbox" className="size-5 accent-rose-400" />
              加入“我们的故事”时间线
            </label>
            <SubmitButton className="w-full" pendingText="正在收藏…">
              <CalendarHeart className="size-4" /> 收藏这个特别日子
            </SubmitButton>
          </form>
        </div>
      </dialog>
    </>
  );
}
