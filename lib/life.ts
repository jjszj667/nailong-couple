import type {
  CalendarEvent,
  MoodValue,
  Profile,
  RelationshipSettings,
} from "@/types/database";
import { SHANGHAI_TIME_ZONE } from "@/lib/utils";

export const MOODS: {
  value: MoodValue;
  label: string;
  image: string;
  color: string;
}[] = [
  {
    value: "very_unpleasant",
    label: "很难过",
    image: "/nailong/moods/very-unpleasant.webp",
    color: "#9aa6b8",
  },
  {
    value: "unpleasant",
    label: "难过",
    image: "/nailong/moods/unpleasant.webp",
    color: "#aeb8c5",
  },
  {
    value: "slightly_unpleasant",
    label: "有点低落",
    image: "/nailong/moods/slightly-unpleasant.webp",
    color: "#bdc3bd",
  },
  {
    value: "neutral",
    label: "平静",
    image: "/nailong/moods/neutral.webp",
    color: "#d7c99f",
  },
  {
    value: "slightly_pleasant",
    label: "还不错",
    image: "/nailong/moods/slightly-pleasant.webp",
    color: "#e8c56d",
  },
  {
    value: "pleasant",
    label: "开心",
    image: "/nailong/moods/pleasant.webp",
    color: "#f3b847",
  },
  {
    value: "very_pleasant",
    label: "超级开心",
    image: "/nailong/moods/very-pleasant.webp",
    color: "#f19a55",
  },
];

export const MOOD_TAGS = [
  "吃到了好吃的",
  "见到了喜欢的人",
  "学习顺利",
  "工作顺利",
  "收到惊喜",
  "睡得很好",
  "天气很好",
  "和他聊天",
  "有点累",
  "学习压力",
  "工作压力",
  "没睡好",
  "想念某个人",
  "发生了不开心的事",
  "没有特别原因",
  "其他",
];

export const ANNIVERSARY_REMINDER_STAGES = [
  { days: 7, level: "week" },
  { days: 3, level: "soon" },
  { days: 0, level: "today" },
] as const;

export type AnniversaryReminderLevel =
  (typeof ANNIVERSARY_REMINDER_STAGES)[number]["level"];

export function moodMeta(value?: MoodValue | null) {
  return MOODS.find((item) => item.value === value) ?? MOODS[3];
}

export function resolvePartnerProfile(
  current: Profile,
  profiles: Profile[],
  relationship?: RelationshipSettings | null,
) {
  const partnerId =
    current.id === relationship?.partner_a_id
      ? relationship.partner_b_id
      : current.id === relationship?.partner_b_id
        ? relationship.partner_a_id
        : null;
  return (
    profiles.find((profile) => profile.id === partnerId) ??
    profiles.find(
      (profile) => profile.id !== current.id && profile.role !== current.role,
    ) ??
    profiles.find((profile) => profile.id !== current.id) ??
    null
  );
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

export function relationshipDays(
  startDate: string | null,
  today = dateInShanghai(),
) {
  if (!startDate || startDate > today) return null;
  return (
    Math.floor(
      (parseDateOnly(today).getTime() - parseDateOnly(startDate).getTime()) /
        86_400_000,
    ) + 1
  );
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

export function eventOccurrenceInYear(event: CalendarEvent, year: number) {
  const source = parseDateOnly(event.event_date);
  // 明确规则：2 月 29 日的年度事件，在非闰年按 2 月 28 日提醒和展示。
  return safeYearDate(year, source.getUTCMonth() + 1, source.getUTCDate());
}

export function nextEventOccurrence(
  event: CalendarEvent,
  today = dateInShanghai(),
) {
  if (event.repeat_type === "none")
    return event.event_date >= today ? event.event_date : null;
  const currentYear = parseDateOnly(today).getUTCFullYear();
  const thisYear = eventOccurrenceInYear(event, currentYear);
  return thisYear >= today
    ? thisYear
    : eventOccurrenceInYear(event, currentYear + 1);
}

export function daysBetween(from: string, to: string) {
  return Math.round(
    (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000,
  );
}

export function anniversaryYears(event: CalendarEvent, occurrence: string) {
  if (event.repeat_type !== "yearly") return null;
  return (
    parseDateOnly(occurrence).getUTCFullYear() -
    parseDateOnly(event.event_date).getUTCFullYear()
  );
}

export function eventDisplayTitle(event: CalendarEvent, occurrence: string) {
  const years =
    event.event_type === "anniversary"
      ? anniversaryYears(event, occurrence)
      : null;
  return years && years > 0 ? `${event.title} ${years} 周年` : event.title;
}

export function anniversaryReminderLevel(
  daysAway: number,
): AnniversaryReminderLevel | null {
  if (daysAway < 0 || daysAway > ANNIVERSARY_REMINDER_STAGES[0].days)
    return null;
  if (daysAway === 0) return "today";
  if (daysAway <= ANNIVERSARY_REMINDER_STAGES[1].days) return "soon";
  return "week";
}

export function isReminderEvent(event: CalendarEvent) {
  return event.repeat_type === "yearly" || event.event_type === "anniversary";
}

export function upcomingEventMeta(
  event: CalendarEvent,
  today = dateInShanghai(),
) {
  const occurrence = nextEventOccurrence(event, today);
  if (!occurrence) return null;
  const daysAway = daysBetween(today, occurrence);
  return {
    event,
    occurrence,
    daysAway,
    title: eventDisplayTitle(event, occurrence),
    reminderLevel: isReminderEvent(event)
      ? anniversaryReminderLevel(daysAway)
      : null,
    isPast: false as const,
  };
}

export function pastEventMeta(
  event: CalendarEvent,
  today = dateInShanghai(),
) {
  if (event.repeat_type === "yearly" || event.event_date >= today) return null;
  return {
    event,
    occurrence: event.event_date,
    daysAway: -daysBetween(event.event_date, today),
    title: event.title,
    reminderLevel: null,
    isPast: true as const,
  };
}

export function recentDates(days = 7, today = dateInShanghai()) {
  const weekday = ["日", "一", "二", "三", "四", "五", "六"];
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - days + 1);
    return {
      date,
      weekday: date === today ? "今" : weekday[parseDateOnly(date).getUTCDay()],
      monthDay: `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`,
      isToday: date === today,
    };
  });
}

export function monthBounds(month: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  const valid = match && Number(match[1]) >= 1900 && Number(match[1]) <= 2100
    ? month
    : dateInShanghai().slice(0, 7);
  const [year, monthNumber] = valid.split("-").map(Number);
  const start = `${valid}-01`;
  const end = dateOnly(new Date(Date.UTC(year, monthNumber, 0)));
  const previous = dateOnly(new Date(Date.UTC(year, monthNumber - 2, 1))).slice(
    0,
    7,
  );
  const next = dateOnly(new Date(Date.UTC(year, monthNumber, 1))).slice(0, 7);
  return { month: valid, year, monthNumber, start, end, previous, next };
}
