import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/scroll-story-lessons-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.scroll-story-details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    await page.waitForFunction(() => document.querySelectorAll('.scroll-story-row.is-expanded').length === 5);
    const rows = page.locator('.scroll-story-row');
    const panel = page.locator('.scroll-story-lessons');
    const lessons = page.locator('.scroll-story-lesson');
    assert.equal(await lessons.count(), 5);
    assert.equal(await panel.locator('.scroll-story-lesson-quote').count(), 5);
    assert.equal(await panel.isVisible(), width >= 1024);
    const stickyTops = [];
    for (let i = 0; i < 5; i++) {
      await rows.nth(i).evaluate(el => {
        const rect = el.getBoundingClientRect();
        scrollTo({ top: scrollY + rect.top - (innerHeight * .6 - rect.height / 2), behavior: 'instant' });
      });
      const text = await lessons.nth(i).locator('p').textContent();
      await page.waitForFunction(text => document.querySelector('.scroll-story-lesson-quote.is-active')?.textContent === text, text);
      if (width >= 1024) {
        const sourceStyle = await lessons.nth(i).evaluate(el => getComputedStyle(el).clipPath);
        assert.equal(sourceStyle, 'inset(50%)', 'Desktop keeps the source accessible without showing it twice');
        const bounds = await page.locator('.scroll-story-lessons-sticky').boundingBox();
        assert.ok(bounds.y >= 140 && bounds.y + bounds.height <= 900);
        if (i === 3 || i === 4) stickyTops.push(bounds.y);
        const storyBounds = await page.locator('.scroll-story').boundingBox();
        assert.ok(bounds.x >= storyBounds.x + storyBounds.width + 20, 'The lesson occupies the remaining right column');
      } else {
        assert.equal(await lessons.nth(i).evaluate(el => getComputedStyle(el).clipPath), 'none');
        assert.ok((await lessons.nth(i).boundingBox()).height > 40, 'Mobile/tablet shows each lesson in its row');
      }
      if (i === 1 && [1440, 390].includes(width)) {
        await capture(page, { path: `hero-animation/story-lessons-${width}.png` });
      }
    }
    if (stickyTops.length === 2) assert.ok(Math.abs(stickyTops[0] - stickyTops[1]) < 1, 'The lesson panel stays fixed while the rows scroll');
    await rows.first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.scroll-story-lesson-quote.is-active')?.textContent === document.querySelector('.scroll-story-lesson p').textContent);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.scroll-story-lessons').isVisible(), false);
  for (const summary of await page.locator('.scroll-story-details summary').all()) await summary.click();
  for (const lesson of await page.locator('.scroll-story-lesson').all()) assert.ok((await lesson.boundingBox()).height > 40);
  await page.close();
  console.log('PASS: five mock lessons, sticky 30% desktop sidebar, active quote follows scrolling both ways, mobile inline lessons, accessible source and no-JS fallback.');
} finally {
  await browser.close();
}
