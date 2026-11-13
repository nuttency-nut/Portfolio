import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/scroll-story-disclosure-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
const settled = page => page.waitForFunction(() => !document.querySelector('.scroll-story-details[data-animating]'));
async function sampleMotion(copy) {
  return copy.evaluate(el => {
    const animation = el.getAnimations()[0];
    if (!animation) throw Error('Expected a disclosure animation');
    animation.pause();
    const duration = animation.effect.getTiming().duration;
    animation.currentTime = 0;
    const start = el.getBoundingClientRect().height;
    animation.currentTime = duration / 2;
    const middle = el.getBoundingClientRect().height;
    animation.finish();
    const end = el.getBoundingClientRect().height;
    return { start, middle, end };
  });
}
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 768, isMobile: width < 768 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const details = page.locator('.scroll-story-details'), control = page.locator('.scroll-story-dot-toggle');
    const first = details.first(), summary = first.locator('summary'), copy = first.locator('.scroll-story-details-copy');
    assert.equal(await details.count(), 5);
    assert.equal(await details.evaluateAll(items => items.every(item => !item.open)), true);
    const closedHeight = await page.locator('.scroll-story-body').evaluate(el => el.offsetHeight);
    const closedLength = await page.locator('.scroll-story-mask').evaluate(el => el.getTotalLength());
    await first.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    if (width >= 768) {
      await page.waitForFunction(() => !document.querySelector('.scroll-story-dot-toggle').hidden);
      assert.equal((await control.getAttribute('aria-controls')).split(' ').length, 5);
      await control.click();
      const opening = await sampleMotion(copy);
      assert.ok(opening.start < opening.middle && opening.middle < opening.end, JSON.stringify(opening));
      await settled(page);
      assert.equal(await details.evaluateAll(items => items.every(item => item.open)), true);
      assert.equal(await control.getAttribute('aria-expanded'), 'true');
      assert.ok(await page.locator('.scroll-story-body').evaluate(el => el.offsetHeight) > closedHeight + 200);
      assert.ok(await page.locator('.scroll-story-mask').evaluate(el => el.getTotalLength()) > closedLength);
      await control.press('Enter');
      const closing = await sampleMotion(copy);
      assert.ok(closing.start > closing.middle && closing.middle > closing.end, JSON.stringify(closing));
      await settled(page);
      assert.equal(await details.evaluateAll(items => items.every(item => !item.open)), true);
      assert.ok(Math.abs(await page.locator('.scroll-story-body').evaluate(el => el.offsetHeight) - closedHeight) < 1);
      await control.press('Enter');
      await page.waitForTimeout(80);
      await control.press('Enter');
      await settled(page);
      assert.equal(await details.evaluateAll(items => items.every(item => !item.open)), true, 'Rapid global reversal closes all');
    } else assert.equal(await control.isVisible(), false);
    await summary.press('Enter');
    await settled(page);
    assert.equal(await details.evaluateAll(items => items.filter(item => item.open).length), 1);
    assert.equal(await copy.evaluate(el => el.inert), false);
    if ([1440, 390].includes(width)) {
      await first.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await capture(page, { path: `hero-animation/story-smooth-${width}.png` });
    }
    if (width >= 768) {
      assert.equal(await control.getAttribute('aria-expanded'), 'false');
      await control.press('Enter');
      await settled(page);
      assert.equal(await details.evaluateAll(items => items.every(item => item.open)), true, 'Mixed state expands remaining milestones');
      await control.press('Enter');
    } else await summary.tap();
    await settled(page);
    assert.equal(await details.evaluateAll(items => items.every(item => !item.open)), true);
    assert.equal(await copy.evaluate(el => el.style.height), '');
    assert.equal(await copy.evaluate(el => el.inert), true);
    await summary.press('Enter');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await settled(page);
    assert.equal(await first.evaluate(el => el.open), true);
    assert.equal(await control.isVisible(), false);
    assert.equal(await copy.evaluate(el => el.getAnimations().length), 0);
    await summary.press('Enter');
    assert.equal(await first.evaluate(el => el.open), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: 'load' });
  const detail = page.locator('.scroll-story-details').first();
  await detail.locator('summary').click();
  assert.equal(await detail.locator('.scroll-story-details-copy').isVisible(), true);
  await detail.locator('summary').click();
  assert.equal(await detail.evaluate(el => el.open), false);
  await page.close();
  console.log('PASS: global expand/collapse all, individual controls, progressive height/fade in both directions, rapid reversal, responsive path, reduced motion and no-JS fallback.');
} finally { await browser.close(); }
