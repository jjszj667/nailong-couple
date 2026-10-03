/** Read-only fixture QA: never signs in or writes production business data. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NIWA_PLAYWRIGHT_PATH || "playwright");
const base = process.env.NIWA_TEST_URL || "http://127.0.0.1:3000";
const out = path.resolve(".artifacts/mobile-motion-20261004");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = { cases: [], errors: [], limitations: ["Touch-capable Chromium emulation, not physical iOS / WeChat performance certification.", "Development fixtures only; no authenticated business writes."] };
async function record(name, work) { await work(); results.cases.push(name); console.log(`PASS ${name}`); }
try {
  for (const width of [320, 390, 430, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: true, reducedMotion: "no-preference" });
    const page = await context.newPage();
    page.on("pageerror", error => results.errors.push(error.message));
    page.on("console", message => { if (["error", "warning"].includes(message.type())) results.errors.push(message.text()); });
    await page.goto(`${base}/design-preview`, { waitUntil: "networkidle" });
    const hero = page.locator(".hero-companion");
    await hero.scrollIntoViewIfNeeded();
    await page.waitForTimeout(750);
    await record(`visible first-screen character moves without hover ${width}px`, async () => {
      assert.equal(await hero.getAttribute("data-awake"), "true");
      assert.equal(await hero.getAttribute("data-pose"), "dance");
      const art = hero.locator(".nailong-art");
      assert.equal(await art.evaluate(el => getComputedStyle(el).animationIterationCount), "infinite");
      assert.equal(await art.evaluate(el => getComputedStyle(el).animationPlayState), "running");
      const first = await art.evaluate(el => getComputedStyle(el).transform);
      await page.waitForTimeout(600);
      assert.notEqual(await art.evaluate(el => getComputedStyle(el).transform), first);
      assert.ok(await hero.locator("img").evaluate(el => el.complete && el.naturalWidth > 0));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, `arrival-${width}.png`) });
    });
    await record(`touch changes image, and manual pause works ${width}px`, async () => {
      await hero.locator(".nailong-figure").tap();
      assert.equal(await hero.getAttribute("data-pose"), "balloon");
      await hero.getByRole("button", { name: "暂停动作轮播" }).tap();
      await page.waitForFunction(() => document.querySelector(".hero-companion")?.getAttribute("data-awake") === "false");
      assert.equal(await hero.getAttribute("data-awake"), "false");
      assert.equal(await hero.locator(".nailong-art").evaluate(el => getComputedStyle(el).animationPlayState), "paused");
      await hero.getByRole("button", { name: "继续播放动作" }).tap();
      await page.waitForFunction(() => document.querySelector(".hero-companion")?.getAttribute("data-awake") === "true");
      assert.equal(await hero.getAttribute("data-awake"), "true");
    });
    await record(`six real transparent images and larger mobile feature hero ${width}px`, async () => {
      const gallery = page.getByRole("region", { name: "六种新增手机角色" });
      const images = gallery.locator("img");
      assert.equal(await images.count(), 6);
      for (const image of await images.all()) {
        await image.evaluate(el => el.closest(".soft-card").scrollIntoView({ block: "center", behavior: "instant" }));
        await page.waitForFunction(src => [...document.images].some(image => image.src === src && image.complete && image.naturalWidth === 512), await image.getAttribute("src").then(src => new URL(src, base).href));
      }
      assert.equal(new Set(await images.evaluateAll(nodes => nodes.map(node => node.getAttribute("src")))).size, 6);
      assert.equal(await hero.getAttribute("data-awake"), "false");
      const feature = page.locator('[data-feature="checkin"] .feature-character').first();
      await feature.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      assert.equal(await feature.getAttribute("data-pose"), "chef");
      assert.ok((await feature.boundingBox()).width >= 118);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await gallery.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `characters-${width}.png`) });
    });
    if (width === 390) {
      await hero.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
      await record("autoplay rotates; pause survives a full timer interval", async () => {
        const before = await hero.getAttribute("data-pose");
        await page.waitForTimeout(6400);
        assert.notEqual(await hero.getAttribute("data-pose"), before);
        await hero.getByRole("button", { name: "暂停动作轮播" }).tap();
        const paused = await hero.getAttribute("data-pose");
        await page.waitForTimeout(6400);
        assert.equal(await hero.getAttribute("data-pose"), paused);
        await hero.getByRole("button", { name: "继续播放动作" }).tap();
      });
      await record("reduced motion change stops live motion and automatic switching", async () => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForTimeout(100);
        assert.equal(await hero.getAttribute("data-awake"), "false");
        assert.equal(await hero.locator(".nailong-art").evaluate(el => getComputedStyle(el).animationName), "none");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForTimeout(100);
        assert.equal(await hero.getAttribute("data-awake"), "true");
      });
      await page.goto(`${base}/login`, { waitUntil: "networkidle" });
      await record("mobile login retains form and visible birthday character", async () => {
        assert.equal(await page.locator('input[type="email"]').count(), 1);
        assert.equal(await page.locator('input[autocomplete="current-password"]').count(), 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: path.join(out, "login-390.png"), fullPage: true });
      });
    }
    await context.close();
  }
  assert.deepEqual(results.errors, []);
} catch (error) { results.failure = error.stack; throw error; }
finally { await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2)); await browser.close(); }
