import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/scroll-story-center-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [320, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: width === 320 ? 568 : 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const photos = page.locator('.scroll-story-photo');
    const centerPhoto = (photo, fraction = .5) => photo.evaluate((el, fraction) => {
      const rect = el.getBoundingClientRect();
      scrollTo({ top: scrollY + rect.top + rect.height / 2 - innerHeight * fraction, behavior: 'instant' });
    }, fraction);
    await centerPhoto(photos.first(), .86);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.scroll-story-photo.is-open').count(), 0, 'Photos outside the center band stay stacked');
    for (let i = 0; i < 5; i++) {
      const photo = photos.nth(i);
      await centerPhoto(photo);
      await page.waitForFunction(el => el.classList.contains('is-open'), await photo.elementHandle());
      assert.equal(await photo.locator('button').getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.scroll-story-photo.is-open').count(), 1);
      if (i) assert.equal(await photos.nth(i - 1).locator('button').getAttribute('aria-expanded'), 'false');
      assert.equal(await photo.locator('img').count(), 4);
      if (i === 0) {
        await page.waitForTimeout(850);
        assert.equal(await photo.locator('img').evaluateAll(images => images.some(img => img.getAnimations().some(animation => animation.playState === 'running'))), false);
        await page.evaluate(() => dispatchEvent(new Event('scroll')));
        await page.waitForTimeout(80);
        assert.equal(await photo.locator('img').evaluateAll(images => images.some(img => img.getAnimations().some(animation => animation.playState === 'running'))), false, 'Remaining centered must not restart the opening animation');
        if (width === 390) await capture(page, { path: 'hero-animation/story-center-open-390.png' });
      }
    }
    await centerPhoto(photos.first());
    await page.waitForFunction(() => document.querySelector('.scroll-story-photo').classList.contains('is-open'));
    await page.locator('#contact').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelectorAll('.scroll-story-photo.is-open').length === 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await centerPhoto(photos.nth(2));
    await page.waitForFunction(el => el.classList.contains('is-open'), await photos.nth(2).elementHandle());
    assert.equal(await photos.nth(2).locator('img').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelectorAll('.scroll-story-photo.is-open').length === 0);
    await photos.first().locator('button').hover();
    assert.equal(await photos.first().locator('button').getAttribute('aria-expanded'), 'true');
    await page.mouse.move(1438, 898);
    assert.equal(await photos.first().locator('button').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1440);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: mobile scroll opens each centered photo stack automatically, closes the old one, supports scrolling back, avoids repeated animation, respects reduced motion and preserves desktop hover.');
} finally { await browser.close(); }
