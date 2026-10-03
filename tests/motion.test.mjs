import assert from "node:assert/strict";
import test from "node:test";
import { motion, sceneForPath, interpolateNumber } from "../lib/motion.ts";

test("scene selection covers front-office and protected admin routes", () => {
  assert.equal(sceneForPath("/"), "home");
  assert.equal(sceneForPath("/calendar/2026-10-03"), "calendar");
  assert.equal(sceneForPath("/daily/2026-10-03"), "calendar");
  assert.equal(sceneForPath("/shop/id"), "shop");
  assert.equal(sceneForPath("/admin/products/id"), "admin");
  assert.equal(sceneForPath("/checkin"), "sunshine");
  assert.equal(sceneForPath("/story"), "romance");
  assert.equal(sceneForPath("/profile"), "mint");
});
test("number animation ends exactly on the authoritative value in either direction", () => {
  for (const [from, to] of [[0, 99], [99, 24], [20, 0], [100000, 3], [-5, 5]]) {
    assert.equal(interpolateNumber(from, to, 0), from);
    assert.equal(interpolateNumber(from, to, 1), to);
    assert.equal(interpolateNumber(from, to, 2), to);
    assert.equal(interpolateNumber(from, to, -1), from);
    for (const progress of [.1, .25, .5, .75]) {
      const result = interpolateNumber(from, to, progress);
      assert.ok(result >= Math.min(from, to) && result <= Math.max(from, to));
    }
  }
});
test("motion hierarchy keeps frequent feedback quicker than entrance", () => {
  assert.ok(motion.fast < motion.normal && motion.normal < motion.slow && motion.slow < motion.cinematic);
  assert.ok(motion.stagger * 5 < motion.normal);
});
