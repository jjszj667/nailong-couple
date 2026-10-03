import assert from "node:assert/strict";
import test from "node:test";
import { statSync } from "node:fs";
import { companionCanAnimate, mobileCompanionPoses, nextCompanionStep } from "../lib/companion-motion.ts";

test("six distinct mobile characters have compact production assets", () => {
  assert.equal(new Set(mobileCompanionPoses).size, 6);
  for (const pose of mobileCompanionPoses) {
    const bytes = statSync(new URL(`../public/nailong/mobile-v4/${pose}.webp`, import.meta.url)).size;
    assert.ok(bytes > 1000 && bytes < 64000, `${pose} is a lightweight real image`);
  }
});
test("companion carousel wraps and handles an empty sequence", () => {
  assert.equal(nextCompanionStep(0, 6), 1);
  assert.equal(nextCompanionStep(5, 6), 0);
  assert.equal(nextCompanionStep(0, 0), 0);
});
test("motion requires visibility, a foreground page, no reduced-motion and no manual pause", () => {
  for (const visible of [true, false]) for (const hidden of [true, false]) for (const reduced of [true, false]) for (const paused of [true, false]) {
    assert.equal(companionCanAnimate(visible, hidden, reduced, paused), visible && !hidden && !reduced && !paused);
  }
});
