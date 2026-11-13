import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/scroll-story-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
try {
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.scroll-story-details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    await page.waitForFunction(() => document.querySelectorAll('.scroll-story-row.is-expanded').length === 5);
    const rows = page.locator('.scroll-story-row');
    assert.equal(await rows.count(), 5);
    const story = await page.locator('.scroll-story').boundingBox();
    assert.ok(story.y >= await page.locator('#work').evaluate(el => el.getBoundingClientRect().bottom) - 1);
    const hero = await page.locator('.hero-intro').boundingBox();
    const timeline = await page.locator('.work-timeline').boundingBox();
    assert.ok(Math.abs(story.width - hero.width * (width >= 1024 ? .7 : 1)) < 1, 'Story uses the shared content bounds');
    assert.ok(Math.abs(story.x - hero.x) < 1 && Math.abs(story.x - timeline.x) < 1, 'All three sections share their left edge');
    assert.equal(await page.locator('.scroll-story-heading').evaluate(el => getComputedStyle(el).textAlign), 'left');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    for (let i = 0; i < 5; i++) {
      await rows.nth(i).scrollIntoViewIfNeeded();
      const photo = await rows.nth(i).locator('figure').boundingBox();
      const content = await rows.nth(i).locator(width < 768 ? '.scroll-story-content h3' : '.scroll-story-content').boundingBox();
      assert.equal(photo.width, width < 768 ? 100 : 132);
      assert.equal(photo.height, width < 768 ? 148 : 195);
      if (width >= 768) assert.ok(i % 2 ? content.x < photo.x : photo.x < content.x);
      else {
        assert.ok(photo.x < content.x, 'Mobile keeps the album next to its heading');
        assert.ok(photo.y + photo.height < (await rows.nth(i).locator('.scroll-story-details-copy > p').first().boundingBox()).y);
      }
      assert.equal(await rows.nth(i).locator('.scroll-story-photo img').count(), 4);
      await rows.nth(i).locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      const logo = await rows.nth(i).locator('.scroll-story-company-logo').boundingBox();
      const title = await rows.nth(i).locator('h3').boundingBox();
      const position = await rows.nth(i).locator('.scroll-story-position').boundingBox();
      const period = await rows.nth(i).locator('.scroll-story-period').boundingBox();
      const metadata = await rows.nth(i).locator('.scroll-story-meta').boundingBox();
      const body = await rows.nth(i).locator('.scroll-story-details-copy > p').first().boundingBox();
      assert.ok(period.x + period.width <= metadata.x + metadata.width + 1, 'The period fits within the company metadata');
      assert.ok(period.y + period.height < body.y, 'The period stays above the description');
      if (Math.abs(period.y - position.y) < 4) assert.ok(Math.abs(period.x - position.x - position.width - 12) < 1, 'The period sits only 12px after the job title');
      else assert.ok(Math.abs(period.x - metadata.x) < 1, 'Wrapped dates align with the job title instead of the far edge');
      assert.ok(position.y >= title.y + title.height && position.y + position.height < body.y, 'Job title follows the company name and precedes the description');
      assert.equal(await rows.nth(i).locator('.scroll-story-position').evaluate(el => getComputedStyle(el).fontSize), '14px');
      if (width < 768) {
        const heading = await rows.nth(i).locator('.scroll-story-heading-group').boundingBox();
        assert.ok(Math.abs(heading.y + heading.height / 2 - photo.y - photo.height / 2) < 1, 'Mobile centers the complete company heading beside the album');
      }
      assert.ok(logo.width === logo.height && logo.height === (width < 768 ? 32 : 40));
      assert.ok(Math.abs(logo.x - title.x) < 1 && logo.y + logo.height < title.y, 'Company logo sits above and aligns with its title');
    }
    if (width >= 768) {
      const positionAt = async progress => {
        await page.evaluate(progress => {
          const track = document.querySelector('.scroll-story-track');
          const bounds = track.getBoundingClientRect();
          scrollTo({ top: scrollY + bounds.top + bounds.height * progress - innerHeight / 2, behavior: 'instant' });
        }, progress);
        await page.waitForTimeout(60);
        return page.locator('.scroll-story-dot').evaluate(dot => ({ x: +dot.getAttribute('cx'), y: +dot.getAttribute('cy') }));
      };
      const first = await positionAt(0);
      const middle = await positionAt(.5);
      const last = await positionAt(1);
      assert.ok(middle.y > first.y + 200 && last.y > middle.y + 200);
      const endpoint = await page.locator('.scroll-story-mask').evaluate(path => {
        const point = path.getPointAtLength(path.getTotalLength());
        return { x: point.x, y: point.y };
      });
      assert.ok(Math.abs(last.x - endpoint.x) < 1 && Math.abs(last.y - endpoint.y) < 1, 'The final point is reachable at the page bottom');
      const reset = await positionAt(0);
      assert.ok(Math.abs(reset.x - first.x) < 1 && Math.abs(reset.y - first.y) < 1, 'Scrolling upward restores the starting point');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.scroll-story-dot').isVisible(), false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const before = await page.locator('.scroll-story-mask').getAttribute('d');
      await rows.nth(1).locator('.scroll-story-details-copy > p').first().evaluate(el => { el.textContent = (el.textContent + ' ').repeat(18); });
      await page.waitForTimeout(100);
      assert.notEqual(await page.locator('.scroll-story-mask').getAttribute('d'), before, 'Path relayouts for longer content');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
    } else assert.equal(await page.locator('.scroll-story-track').isVisible(), false);
    await rows.first().scrollIntoViewIfNeeded();
    if ([1920, 1440, 390].includes(width)) {
      await capture(page.locator('.scroll-story'), { path: `hero-animation/scroll-story-${width}.png` });
      await page.locator('.scroll-story').evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 150, behavior: 'instant' }));
      await capture(page, { path: `hero-animation/scroll-story-in-page-${width}.png` });
    }
    await page.close();
  }
  console.log('PASS: shared hero/timeline left edge, 70% of the content container, five alternating rows, responsive mobile, scroll path forward/backward, content relayout, reduced motion.');
} finally {
  await browser.close();
}
