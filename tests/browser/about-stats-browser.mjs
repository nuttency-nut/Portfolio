import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Run with PLAYWRIGHT_MODULE pointing to playwright/index.mjs.
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = new URL('/about/', process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').href;
const final = ['2022', '3+', '4+', '99+'];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 650 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const values = page.locator('.about-stat-value'), counters = page.locator('.about-stat-value[data-count]');
    assert.deepEqual(await values.evaluateAll(items => items.map(el => el.getAttribute('aria-label') || el.textContent)), final, 'Accessible final values remain available throughout animation');
    await page.locator('.about-stats').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelectorAll('.about-stat-value.is-counting').length === 3);
    const before = await page.locator('.about-stats').boundingBox();
    const motion = await counters.first().evaluate(el => {
      const track = el.querySelector('.about-counter-track');
      const animation = track.getAnimations()[0];
      animation.pause();
      animation.currentTime = 0;
      const first = new DOMMatrix(getComputedStyle(track).transform).m42;
      animation.currentTime = 900;
      const middle = new DOMMatrix(getComputedStyle(track).transform).m42;
      animation.currentTime = 1800;
      const last = new DOMMatrix(getComputedStyle(track).transform).m42;
      animation.finish();
      return { first, middle, last };
    });
    assert.ok(motion.first > motion.middle && motion.middle > motion.last, 'Reel rolls continuously toward the target');
    assert.equal(await values.first().textContent(), '2022', 'Year remains static');
    await page.waitForFunction(() => !document.querySelector('.about-stat-value.is-counting'));
    assert.deepEqual(await values.allTextContents(), final);
    assert.deepEqual(await counters.evaluateAll(items => items.map(el => el.getAttribute('aria-label'))), ['3+', '4+', '99+']);
    const after = await page.locator('.about-stats').boundingBox();
    assert.ok(Math.abs(before.height - after.height) < 1, 'Counting does not change section height');
    await capture(page.locator('.about-stats'), { path: `hero-animation/about-stats-${width}.png` });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(100);
    await page.locator('.about-stats').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.about-counter-track').count(), 0, 'Scrolling back does not restart counting');
    await page.reload({ waitUntil: 'load' });
    await page.locator('.about-stats').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.about-stat-value.is-counting'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.about-stat-value.is-counting'));
    assert.deepEqual(await values.allTextContents(), final, 'Enabling reduced motion settles all values immediately');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
  }
  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const page = await browser.newPage(options);
    await page.goto(url, { waitUntil: 'load' });
    await page.locator('.about-stats').scrollIntoViewIfNeeded();
    assert.deepEqual(await page.locator('.about-stat-value').allTextContents(), final);
    assert.equal(await page.locator('.about-counter-track').count(), 0);
    await page.close();
  }
  console.log('PASS: 2022 stays fixed, 3+/4+/99+ roll once on view, stable layout, accessible final values, no replay on scroll, restart only on reload, reduced-motion and no-JS fallbacks.');
} finally { await browser.close(); }
