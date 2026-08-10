import Link from "next/link";
import { MoodIcon } from "@/components/mood-icon";
import { moodMeta } from "@/lib/life";
import { cn } from "@/lib/utils";
import type { Mood } from "@/types/database";

type TrendDate = {
  date: string;
  weekday: string;
  monthDay: string;
  isToday: boolean;
};

export function MoodTrend({
  moods,
  dates,
  compact = false,
}: {
  moods: Mood[];
  dates: TrendDate[];
  compact?: boolean;
}) {
  const recorded = dates.filter((day) =>
    moods.some((mood) => mood.mood_date === day.date),
  ).length;
  return (
    <section
      aria-label="最近 7 天心情"
      className={
        compact
          ? "mt-4 border-t border-line pt-4"
          : "rounded-3xl bg-gradient-to-br from-white to-amber-50 p-4 sm:p-5"
      }
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-nailong-deep">最近 7 天</p>
          {!compact && (
            <h2 className="mt-1 text-lg font-black text-brown">这一周的心情</h2>
          )}
        </div>
        <Link href="/calendar" className="text-xs font-bold text-muted">
          查看全部
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
        {dates.map((day) => {
          const mood = moods.find((item) => item.mood_date === day.date);
          const meta = mood ? moodMeta(mood.value) : null;
          return (
            <Link
              key={day.date}
              href={`/calendar/${day.date}`}
              aria-label={`${day.date}${meta ? `，${meta.label}` : "，没有记录"}`}
              className={cn(
                "flex min-w-0 flex-col items-center rounded-2xl px-0.5 py-2 transition hover:bg-white",
                day.isToday && "bg-amber-100 ring-1 ring-amber-300",
              )}
            >
              <span className="text-[10px] font-bold text-muted sm:text-xs">
                {day.weekday}
              </span>
              {meta ? (
                <MoodIcon
                  image={meta.image}
                  label={meta.label}
                  className="my-1 size-7 shadow-sm sm:size-9"
                  sizes="36px"
                />
              ) : (
                <span className="my-1 flex size-7 items-center justify-center rounded-full bg-stone-100 text-sm text-stone-300 sm:size-9">
                  —
                </span>
              )}
              <span className="truncate text-[9px] text-muted sm:text-[10px]">
                {day.monthDay}
              </span>
            </Link>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-3 text-center text-xs text-muted">
          这一周留下了 {recorded} 个心情。
        </p>
      )}
    </section>
  );
}
