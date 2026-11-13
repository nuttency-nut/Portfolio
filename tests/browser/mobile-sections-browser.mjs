import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/mobile-sections-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [320, 390, 430, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.scroll-story-details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    await page.waitForFunction(() => document.querySelectorAll('.scroll-story-row.is-expanded').length === 5);
    assert.equal(await page.locator('.home-background-continuation').evaluate(el => getComputedStyle(el).zoom), '1');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    for (const selector of ['.work-timeline-role p', '.scroll-story-description', '.scroll-story-details-copy > p', '.scroll-story-lesson p']) {
      assert.ok(await page.locator(selector).first().evaluate(el => parseFloat(getComputedStyle(el).fontSize) >= 14));
    }
    assert.equal(await page.locator('.contact-field input').first().evaluate(el => getComputedStyle(el).fontSize), '16px');
    const timeline = page.locator('.work-timeline');
    if (width < 768) {
      assert.ok(await timeline.evaluate(el => el.scrollWidth <= el.clientWidth));
      assert.equal(await timeline.evaluate(el => el.scrollLeft), 0);
    } else assert.ok(await timeline.evaluate(el => el.scrollWidth > el.clientWidth));
    const rows = page.locator('.scroll-story-row');
    for (let i = 0; i < 5; i++) {
      const row = rows.nth(i);
      if (width < 768) {
        const image = await row.locator('figure').boundingBox(), title = await row.locator('.scroll-story-heading-group').boundingBox();
        assert.ok(title.x > image.x && Math.abs((title.y + title.height / 2) - (image.y + image.height / 2)) < 2);
        assert.ok((await row.locator('.scroll-story-details-copy > p').first().boundingBox()).width > width * .8, 'The body text uses the full row width');
      }
      assert.ok((await row.locator('.scroll-story-lesson').boundingBox()).height > 40);
    }
    assert.equal(await page.locator('.scroll-story-lessons').isVisible(), false);
    if (width < 768) {
      await rows.first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await rows.first().locator('.scroll-story-photo-toggle').tap();
      await page.waitForTimeout(50);
      const rectangles = await rows.first().locator('img').evaluateAll(images => images.map(img => img.getBoundingClientRect().toJSON()));
      for (const rect of rectangles) assert.ok(rect.left >= 0 && rect.right <= width);
      await rows.first().locator('.scroll-story-photo-toggle').tap();
      await page.waitForTimeout(450);
      const name = await page.getByLabel('Name', { exact: true }).boundingBox(), email = await page.getByLabel('Email', { exact: true }).boundingBox();
      assert.ok(email.y > name.y + name.height);
      assert.equal(await page.locator('.site-footer-top').evaluate(el => getComputedStyle(el).flexDirection), 'column');
    }
    if ([390, 320].includes(width)) {
      await page.locator('#work').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await capture(page, { path: `hero-animation/mobile-timeline-${width}.png` });
      await rows.first().evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 116, behavior: 'instant' }));
      await capture(page, { path: `hero-animation/mobile-story-${width}.png` });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: readable mobile text, vertical timeline, album beside heading, full-width story copy and lessons, stacked form/footer, no page overflow.');
} finally { await browser.close(); }
