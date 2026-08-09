import type { CheckinType } from "@/types/database";
import { SHANGHAI_TIME_ZONE } from "@/lib/utils";

const CHECKIN_WINDOWS = {
  lunch: {
    label: "午间限时签到",
    shortLabel: "午间签到",
    timeLabel: "每天 11:00–13:00",
    startMinutes: 11 * 60,
    endMinutes: 13 * 60,
  },
  dinner: {
    label: "晚间限时签到",
    shortLabel: "晚间签到",
    timeLabel: "每天 16:00–22:00",
    startMinutes: 16 * 60,
    endMinutes: 22 * 60,
  },
} as const;

function shanghaiMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHANGHAI_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function getCheckinWindow(type: CheckinType, date = new Date()) {
  const window = CHECKIN_WINDOWS[type];
  const minutes = shanghaiMinutes(date);
  return {
    ...window,
    isOpen: minutes >= window.startMinutes && minutes < window.endMinutes,
  };
}

