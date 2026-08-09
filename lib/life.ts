import type { CalendarEvent, MoodValue } from "@/types/database";
import { SHANGHAI_TIME_ZONE } from "@/lib/utils";

export const MOODS: { value: MoodValue; label: string; emoji: string; color: string }[] = [
  { value: "very_unpleasant", label: "很难过", emoji: "😢", color: "#9aa6b8" },
  { value: "unpleasant", label: "难过", emoji: "☹️", color: "#aeb8c5" },
  { value: "slightly_unpleasant", label: "有点低落", emoji: "😔", color: "#bdc3bd" },
  { value: "neutral", label: "平静", emoji: "😌", color: "#d7c99f" },
  { value: "slightly_pleasant", label: "还不错", emoji: "🙂", color: "#e8c56d" },
  { value: "pleasant", label: "开心", emoji: "😊", color: "#f3b847" },
  { value: "very_pleasant", label: "超级开心", emoji: "🥰", color: "#f19a55" },
];

export const MOOD_TAGS = [
  "吃到了好吃的", "见到了喜欢的人", "学习顺利", "工作顺利", "收到惊喜", "睡得很好",
  "天气很好", "和他聊天", "有点累", "学习压力", "工作压力", "没睡好", "想念某个人",
  "发生了不开心的事", "没有特别原因", "其他",
];

export function moodMeta(value?: MoodValue | null) {
  return MOODS.find((item) => item.value === value) ?? MOODS[3];
}

export function dateInShanghai(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function relationshipDays(startDate: string | null, today = dateInShanghai()) {
  if (!startDate || startDate > today) return null;
  return Math.floor((parseDateOnly(today).getTime() - parseDateOnly(startDate).getTime()) / 86_400_000) + 1;
}

export function addDays(date: string, amount: number) {
  const value = parseDateOnly(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return dateOnly(value);
}

function safeYearDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return dateOnly(new Date(Date.UTC(year, month - 1, Math.min(day, lastDay))));
}

export function nextEventOccurrence(event: CalendarEvent, today = dateInShanghai()) {
  if (event.repeat_type === "none") return event.event_date >= today ? event.event_date : null;
  const source = parseDateOnly(event.event_date);
  const currentYear = parseDateOnly(today).getUTCFullYear();
  const thisYear = safeYearDate(currentYear, source.getUTCMonth() + 1, source.getUTCDate());
  return thisYear >= today ? thisYear : safeYearDate(currentYear + 1, source.getUTCMonth() + 1, source.getUTCDate());
}

export function daysBetween(from: string, to: string) {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000);
}

export function anniversaryYears(event: CalendarEvent, occurrence: string) {
  if (event.repeat_type !== "yearly") return null;
  return parseDateOnly(occurrence).getUTCFullYear() - parseDateOnly(event.event_date).getUTCFullYear();
}

export function monthBounds(month: string) {
  const valid = /^\d{4}-\d{2}$/.test(month) ? month : dateInShanghai().slice(0, 7);
  const [year, monthNumber] = valid.split("-").map(Number);
  const start = `${valid}-01`;
  const end = dateOnly(new Date(Date.UTC(year, monthNumber, 0)));
  const previous = dateOnly(new Date(Date.UTC(year, monthNumber - 2, 1))).slice(0, 7);
  const next = dateOnly(new Date(Date.UTC(year, monthNumber, 1))).slice(0, 7);
  return { month: valid, year, monthNumber, start, end, previous, next };
}
