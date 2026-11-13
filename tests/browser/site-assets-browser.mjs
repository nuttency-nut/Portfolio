import assert from 'node:assert/strict';
import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const routes = ['/', '/Project/', '/Project/project-01/', '/Project/project-02/', '/Project/project-03/', '/Project/project-04/', '/about/', '/about/hobby/'];
const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) missing.push(response.url());
    });
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const failed = await page.evaluate(async () => {
        const images = [...document.images].filter(image => image.getAttribute('src')?.trim() && new URL(image.src, location.href).origin === location.origin);
        for (const image of images) image.loading = 'eager';
        return (await Promise.all(images.map(image => image.decode().then(() => null, () => image.src)))).filter(Boolean);
      });
      assert.deepEqual(failed, [], `${route}: every local image decodes`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `${route}: no horizontal overflow`);
      if (route === '/') {
        await page.waitForSelector('.hero-title.is-ready');
        await page.waitForSelector('#lanyard canvas', { state: 'attached' });
        assert.equal(await page.locator('.work-timeline-item').count(), 5);
      } else if (route === '/about/') {
        await page.waitForSelector('.about-radar.is-ready');
        assert.equal(await page.locator('.about-tools-window.is-ready').count(), 2);
      } else if (route === '/about/hobby/') {
        assert.equal(await page.locator('.topbar-wrap, .site-footer').count(), 0);
        assert.equal(await page.locator('#deck .track').count(), 5);
        for (let index = 0; index < 5; index++) {
          const button = page.locator('#deck .track').nth(index);
          await button.focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => {
            const audio = document.querySelector('#hobby-audio');
            return !audio.paused && audio.duration > 100 && !audio.error;
          });
          assert.ok(await page.locator('#hobby-audio').evaluate(audio => audio.src.includes('/assets/audio/hobby/')));
          await button.focus();
          await page.keyboard.press('Enter');
          assert.equal(await page.locator('#hobby-audio').evaluate(audio => audio.paused), true);
        }
      }
      assert.deepEqual(missing, [], `${route}: no local 404s`);
      assert.deepEqual(errors, [], `${route}: no JavaScript errors`);
      await capture(page, { path: `${route.replaceAll('/', '-') || 'home'}-${width}.png` });
      console.log(`PASS ${width}px ${route}: assets, fonts, layout and page initialization`);
    }
    await page.close();
  }
  console.log('PASS: all eight routes on desktop/mobile, all local images, five real Hobby MP3 files, no missing assets or JavaScript errors.');
} finally { await browser.close(); }
