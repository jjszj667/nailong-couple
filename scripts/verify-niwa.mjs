/** Read-only local visual QA. Uses dev fixtures; never signs in or mutates production. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NIWA_PLAYWRIGHT_PATH || "playwright");
const base = process.env.NIWA_TEST_URL || "http://127.0.0.1:3000";
const out = path.resolve(".artifacts/niwa-20261003");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = { base, date: new Date().toISOString(), cases: [], browserErrors: [], limitations: ["Dev fixtures only: authenticated database writes, real wallets and orders are not exercised.", "No real-device GPU or 60fps certification."] };
async function record(name, fn) { await fn(); results.cases.push({ name, passed: true }); console.log(`PASS ${name}`); }
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    page.on("pageerror", error => results.browserErrors.push(error.message));
    page.on("console", msg => { if (["error", "warning"].includes(msg.type())) results.browserErrors.push(msg.text()); });
    await page.goto(`${base}/design-preview`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await record(`layout ${width}px`, async () => {
      assert.equal(await page.locator('[role="radio"]').count(), 7);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal page overflow");
      assert.equal(await page.locator('.mobile-nav').isVisible(), width < 768);
      assert.equal(await page.locator('.desktop-nav').isVisible(), width >= 768);
      await page.waitForTimeout(1100);
      await page.screenshot({ path: path.join(out, `home-${width}.png`) });
    });
    await record(`mood keyboard, environment, tags ${width}px`, async () => {
      const radio = page.getByRole("radio", { checked: true });
      await radio.focus(); await page.keyboard.press("End");
      assert.equal(await page.getByRole("radio").last().getAttribute("aria-checked"), "true");
      assert.ok(await page.locator(".motion-environment").evaluate(el => el.style.getPropertyValue("--environment-mood")));
      const tags = page.locator('.mood-tags label');
      for (let i = 0; i < 8; i++) await tags.nth(i).click();
      assert.equal(await page.locator('.mood-tags input:checked').count(), 8);
      assert.ok(await page.locator('.mood-tags input').nth(8).isDisabled());
      await page.locator('.mood-stage').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `mood-${width}.png`) });
    });
    await record(`calendar modal, escape and mobile sheet ${width}px`, async () => {
      await page.getByRole("button", { name: "快速选择年份和月份" }).click();
      const dialog = page.getByRole("dialog", { name: "快速跳转日期" });
      await dialog.waitFor({ state: "visible" });
      assert.equal(await dialog.getByLabel("年份").inputValue(), "2026");
      assert.equal(await dialog.getByLabel("月份").inputValue(), "10");
      await page.waitForTimeout(600);
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, "dialog width outside viewport");
      await page.screenshot({ path: path.join(out, `dialog-${width}.png`) });
      await page.keyboard.press("Escape"); await dialog.waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "添加纪念日", exact: true }).click();
      const event = page.getByRole("dialog", { name: "添加纪念日", exact: true });
      await event.getByLabel("纪念日名称").fill("视觉验收，不保存");
      assert.equal(await event.getByLabel("日期", { exact: true }).inputValue(), "2026-10-03");
      await event.getByRole("button", { name: "关闭添加纪念日界面" }).click(); await event.waitFor({ state: "hidden" });
    });
    await record(`calendar touch swipe ${width}px`, async () => {
      const grid = page.locator('.calendar-motion');
      await grid.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 240, clientY: 500 });
      await grid.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 120, clientY: 508 });
      await page.getByRole('button', { name: '快速选择年份和月份' }).filter({ hasText: '11 月' }).waitFor();
      await page.getByRole('button', { name: '快速选择年份和月份' }).click();
      const dialog = page.getByRole('dialog', { name: '快速跳转日期' });
      assert.equal(await dialog.getByLabel('月份').inputValue(), '11', 'picker must reset after month change');
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    });
    await record(`reward distinction and real confirmation form submit ${width}px`, async () => {
      await page.getByRole("button", { name: "预览准时签到反馈" }).click();
      assert.equal(await page.locator('.feedback-stage').getAttribute('data-kind'), "normal");
      assert.equal(await page.locator('[data-wallet-target] .animated-number').getAttribute('aria-label'), '138');
      await page.getByRole("button", { name: "预览补签反馈" }).click();
      assert.equal(await page.locator('.feedback-stage').getAttribute('data-kind'), "makeup");
      assert.equal(await page.locator('[data-wallet-target] .animated-number').getAttribute('aria-label'), '143');
      await page.getByRole("button", { name: "预览兑换确认" }).first().click();
      const dialog = page.getByRole("dialog", { name: "确认操作" });
      await dialog.getByRole("button", { name: "先不操作" }).click(); await dialog.waitFor({ state: "hidden" });
      assert.equal(await page.locator('.feedback-stage').getAttribute('data-kind'), "makeup");
      await page.getByRole("button", { name: "预览兑换确认" }).first().click();
      await dialog.getByRole("button", { name: "确认继续" }).click();
      await page.locator('.feedback-stage[data-kind="redeem"]').waitFor();
    });
    await record(`upload client compression ${width}px`, async () => {
      await page.locator('input[type="file"]').first().setInputFiles(path.resolve('public/nailong/nailong-3d.png'));
      await page.locator('.upload-zone[data-ready="true"]').first().waitFor();
      const file = await page.locator('input[type="file"]').first().evaluate(el => ({ type: el.files[0].type, size: el.files[0].size }));
      assert.ok(file.type.startsWith("image/") && file.size > 0);
      await page.locator('input[type="file"]').last().setInputFiles([path.resolve('public/nailong/nailong-3d.png'), path.resolve('public/nailong/coin-3d.png')]);
      await page.locator('.upload-zone[data-ready="true"]:has(input[multiple])').waitFor();
      assert.equal(await page.locator('input[type="file"]').last().evaluate(el => el.files.length), 2);
    });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${base}/design-preview`, { waitUntil: "networkidle" });
  await record("reduced-motion disables parallax and reward flight", async () => {
    assert.equal(await page.locator('.motion-environment').getAttribute('data-paused'), "true");
    await page.getByRole('button', { name: '预览准时签到反馈' }).click();
    assert.equal(await page.locator('.reward-flight').evaluate(el => getComputedStyle(el).display), "none");
    assert.ok(["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(await page.locator('.home-hero').evaluate(el => getComputedStyle(el).transform)));
  });
  await record("login form and protected routes retain authentication", async () => {
    for (const route of ["/", "/checkin", "/calendar", "/calendar/2026-10-03", "/daily/2026-10-03", "/shop", "/orders", "/wallet", "/profile", "/memories", "/story", "/wishes", "/places", "/achievements", "/releases", "/profile/recently-deleted", "/admin", "/admin/checkins", "/admin/moods", "/admin/calendar", "/admin/orders", "/admin/products", "/admin/settings", "/admin/wallet", "/admin/storage", "/admin/releases", "/admin/announcements", "/admin/mysteries", "/admin/wishes", "/admin/places", "/admin/achievements"]) {
      const response = await context.request.get(`${base}${route}`);
      assert.equal(response.status(), 200, route);
      assert.ok(response.url().includes('/login'), `${route} did not require login`);
    }
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('input[name="email"]').getAttribute('type'), "email");
    assert.equal(await page.locator('input[name="password"]').getAttribute('autocomplete'), "current-password");
    await page.screenshot({ path: path.join(out, 'login-mobile.png') });
  });
  await context.close();
  assert.deepEqual(results.browserErrors, [], 'browser errors / warnings');
} catch (error) { results.failure = error.stack; throw error; }
finally { await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2)); await browser.close(); }
