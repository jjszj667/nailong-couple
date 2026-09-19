import assert from "node:assert/strict";
import test from "node:test";
import { completedByNormal, makeupReward, missedPenalty } from "../lib/checkin-rules.ts";

test("two on-time or one on-time with makeup both complete the day", () => {
  assert.equal(completedByNormal(["normal", "normal"]), true);
  assert.equal(completedByNormal(["normal", "makeup"]), true);
  assert.equal(completedByNormal(["makeup", "makeup"]), false);
});

test("first makeup gets integer half, second gets zero", () => {
  assert.equal(makeupReward(10, 0), 5);
  assert.equal(makeupReward(9, 0), 4);
  assert.equal(makeupReward(10, 1), 0);
});

test("missing-day penalty is capped, never makes balance negative", () => {
  assert.deepEqual([1, 2, 3, 4, 20].map((day) => missedPenalty(day, 100).planned), [0, 3, 4, 5, 5]);
  assert.deepEqual(missedPenalty(4, 2), { planned: 5, actual: 2 });
  assert.deepEqual(missedPenalty(4, 0), { planned: 5, actual: 0 });
  assert.deepEqual(missedPenalty(1, 99), { planned: 0, actual: 0 });
});
