// One-off celebration, explicitly bounded in Asia/Shanghai; never repeats yearly.
export const BIRTHDAY_START = Date.parse("2026-10-01T00:00:00+08:00");
export const BIRTHDAY_END = Date.parse("2026-10-08T00:00:00+08:00");

export function isBirthdayWeek(now: number) {
  return now >= BIRTHDAY_START && now < BIRTHDAY_END;
}
