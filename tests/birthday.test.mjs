import assert from "node:assert/strict";
import test from "node:test";
import { BIRTHDAY_START, BIRTHDAY_END, isBirthdayWeek } from "../lib/birthday.ts";

test("birthday is a one-off seven-day Shanghai window with exclusive expiry", () => {
  assert.equal(BIRTHDAY_END - BIRTHDAY_START, 7 * 24 * 60 * 60 * 1000);
  assert.equal(isBirthdayWeek(BIRTHDAY_START - 1), false);
  assert.equal(isBirthdayWeek(BIRTHDAY_START), true);
  assert.equal(isBirthdayWeek(Date.parse("2026-10-07T23:59:59+08:00")), true);
  assert.equal(isBirthdayWeek(BIRTHDAY_END), false);
  assert.equal(isBirthdayWeek(Date.parse("2027-10-01T00:00:00+08:00")), false);
});
