import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/browser/about-radar-browser.mjs
import assert from 'node:assert/strict';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  for (const [width, height] of [[1440, 900], [1366, 650], [1100, 900], [1024, 900], [768, 900], [390, 844], [320, 800]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/about/`, { waitUntil: 'load' });
    await page.waitForSelector('.about-radar.is-ready');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.about-radar-photo img').scrollIntoViewIfNeeded();
    await page.locator('.about-radar-photo img').evaluate(el => el.decode());
    const card = page.locator('.about-radar');
    const composition = await page.locator('.about-capabilities').boundingBox();
    const tools = await page.locator('.about-tools').boundingBox();
    const faq = await page.locator('.about-faq').boundingBox();
    const photo = await page.locator('.about-radar-photo').boundingBox();
    const portrait = await page.locator('.about-portrait').boundingBox();
    const bounds = await card.boundingBox();
    assert.ok(composition.y >= tools.y + tools.height && faq.y >= composition.y + composition.height, 'Photo/radar follows both app rows and precedes Q&A');
    const lastAppRow = await page.locator('.about-tools-window').last().boundingBox();
    const faqTitle = await page.locator('.about-faq-intro h2').boundingBox();
    const aboveGap = composition.y - lastAppRow.y - lastAppRow.height;
    const belowGap = faqTitle.y - Math.max(photo.y + photo.height, bounds.y + bounds.height);
    assert.ok(aboveGap >= 24 && aboveGap <= 48 && belowGap >= 24 && belowGap <= 64, 'Neighboring sections have compact, readable spacing');
    assert.ok(Math.abs(photo.width / photo.height - 4 / 3) < .01, 'Mock image keeps a landscape 4:3 frame');
    assert.ok(await page.locator('.about-radar-photo img').evaluate(el => el.complete && el.naturalWidth > 0), 'Mock image loads');
    if (width >= 1100) {
      assert.ok(photo.x + photo.width < bounds.x, 'Desktop places photo on the left and chart on the right');
      assert.ok(Math.abs(photo.height - bounds.height) < 1 && Math.abs(photo.y - bounds.y) < 1, 'Chart and 4:3 image share top and bottom edges');
    }
    else assert.ok(bounds.y >= photo.y + photo.height + 23, 'Narrow screens stack the chart below the photo');
    if (width >= 1024) {
      const stats = await page.locator('.about-stats').boundingBox();
      assert.ok(stats.y + stats.height < height && portrait.y + portrait.height < height, 'Original portrait and statistics still fit laptop first view');
    }
    for (const [name, axes] of [['Soft', 8], ['YoE', 6], ['Hard', 8], ['Tools', 8]]) {
      await card.getByRole('tab', { name, exact: true }).click();
      await page.waitForTimeout(500); // Let the real SVG morph settle before checking bounds.
      assert.equal(await card.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await card.locator('.about-radar-values > div').count(), axes);
      assert.equal(await card.locator('.about-radar-chart svg text').count(), axes);
      assert.ok(await card.locator('.about-radar-note').textContent().then(text => text.includes('minh họa')));
      assert.ok(await card.evaluate(el => {
        const svg = el.querySelector('.about-radar-chart svg').getBoundingClientRect();
        return [...el.querySelectorAll('.about-radar-chart svg text')].every(text => {
          const rect = text.getBoundingClientRect();
          return rect.left >= svg.left - 1 && rect.right <= svg.right + 1 && rect.top >= svg.top - 1 && rect.bottom <= svg.bottom + 1;
        });
      }), `All ${name} labels remain inside the SVG at ${width}px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    }
    await card.getByRole('tab', { name: 'Tools', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await card.getByRole('tab', { name: 'YoE', exact: true }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    assert.equal(await card.getByRole('tab', { name: 'Soft', exact: true }).getAttribute('aria-selected'), 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await card.getByRole('tab', { name: 'Hard', exact: true }).click();
    assert.equal(await card.locator('.about-radar-values > div').count(), 8);
    if ([1440, 390].includes(width)) {
      await card.getByRole('tab', { name: 'Soft', exact: true }).click();
      await capture(page.locator('.about-capabilities'), { path: `about-radar/composition-${width}.png` });
      await capture(card, { path: `about-radar/card-${width}.png` });
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: placement, original hero sizing, four datasets, unclipped labels, keyboard, reduced motion`);
    await page.close();
  }
  for (const noJS of [true, false]) {
    const page = await browser.newPage({ javaScriptEnabled: !noJS, viewport: { width: 390, height: 844 } });
    if (!noJS) await page.route('**/vendor/apexcharts/**', route => route.abort());
    await page.goto(`${origin}/about/`, { waitUntil: 'load' });
    assert.equal(await page.locator('.about-radar-values').isVisible(), true);
    assert.equal(await page.locator('.about-radar-values > div').count(), 8);
    assert.equal(await page.locator('.about-radar-tabs button:disabled').count(), 4);
    await page.close();
  }
  console.log('PASS: readable score fallback with JavaScript disabled or ApexCharts unavailable');
} finally { await browser.close(); }
