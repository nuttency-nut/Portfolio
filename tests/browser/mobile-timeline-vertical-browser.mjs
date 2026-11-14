import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/mobile-timeline-vertical-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#work').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    const marks = page.locator('.work-timeline-mark');
    const start = await marks.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().y));
    const columns = await marks.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().x));
    assert.ok(columns.every(x => Math.abs(x - columns[0]) < 1), 'All five milestones share a vertical rail');
    for (const mark of await marks.all()) {
      const rect = await mark.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= viewport.width);
    }
    await page.waitForSelector('.work-timeline-runner.arrived');
    assert.equal(await page.locator('.work-timeline-mark.done').count(), 5);
    assert.equal(await page.locator('.work-timeline-photos.is-reached').count(), 5);
    const finish = await marks.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().y));
    finish.forEach((y, i) => {
      assert.ok(Math.abs(y - start[i]) < 1, 'Passed milestones remain in the document');
      if (i) assert.ok(y > finish[i - 1]);
    });
    const runner = await page.locator('.work-timeline-runner').boundingBox(), lastMark = await marks.last().boundingBox();
    assert.ok(Math.abs(runner.y + runner.height / 2 - lastMark.y - lastMark.height / 2) < 1, 'The avatar stays centered on the timeline rail');
    assert.ok(Math.abs(runner.x + runner.width / 2 - lastMark.x - lastMark.width / 2) < 1);
    const fill = await page.locator('.work-timeline-fill').boundingBox();
    assert.ok(fill.height > 500 && fill.width <= 8);
    assert.ok(Math.abs(fill.y + fill.height - lastMark.y - lastMark.height / 2) < 1, 'The vertical fill stops at the final marker');
    assert.equal(await page.locator('.work-timeline').evaluate(el => el.scrollLeft), 0);
    assert.equal(await page.locator('.work-timeline').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    const items = page.locator('.work-timeline-item');
    for (let i = 0; i < 5; i++) {
      const item = await items.nth(i).boundingBox(), mark = await marks.nth(i).boundingBox();
      assert.ok(Math.abs(mark.y + mark.height / 2 - item.y - 30) < 1, 'Each point aligns with its own milestone heading');
    }
    const rows = await items.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()));
    rows.forEach((rect, i) => {
      assert.ok(rect.x >= 0 && rect.right <= viewport.width);
      if (i) assert.ok(rect.top > rows[i - 1].bottom, 'All milestone details remain in a readable vertical list');
    });
    assert.equal(await page.locator('.work-timeline-photos').evaluateAll(elements => elements.every(el => el.parentElement.classList.contains('work-timeline-item'))), true);
    await items.last().evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    if (viewport.width === 390) await capture(page, { path: 'hero-animation/timeline-vertical-final-390.png' });
    await page.locator('.work-timeline-photos').first().locator('button').first().tap();
    await page.waitForTimeout(350);
    const preview = await page.locator('.work-timeline-photo-preview').boundingBox();
    assert.ok(preview.width > 200 && preview.x >= 0 && preview.x + preview.width <= viewport.width);
    await page.locator('.work-timeline-photo-close').tap();
    await page.waitForTimeout(200);
    await page.locator('#work').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.mouse.move(-10, -10);
    await capture(page, { path: `hero-animation/timeline-vertical-${viewport.width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    if (viewport.width === 390) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => [...document.querySelectorAll('.work-timeline-photos')].every(el => el.parentElement.classList.contains('work-timeline-track')));
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => [...document.querySelectorAll('.work-timeline-photos')].every(el => el.parentElement.classList.contains('work-timeline-item')));
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: vertical mobile timeline, points aligned with all five headings, 1-second animation legs, correct avatar/fill destination, photo previews and desktop resize.');
} finally { await browser.close(); }
