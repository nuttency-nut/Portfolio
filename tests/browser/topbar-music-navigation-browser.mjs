import { chromium, browserExecutable } from '../helpers/browser.mjs';
// Run with PLAYWRIGHT_MODULE pointing to playwright/index.mjs.
import assert from 'node:assert/strict';


const executablePath = browserExecutable;
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;

for (const policy of ['default', 'allowed']) {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: policy === 'allowed' ? ['--autoplay-policy=no-user-gesture-required'] : []
  });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const audio = page.locator('.music-audio');
      const button = page.locator('.music-toggle');

      async function ready() {
        await page.waitForFunction(() => !document.querySelector('.music-toggle').disabled);
      }

      async function expectPosition(time, playing) {
        await ready();
        await page.waitForFunction(({ time, playing }) => {
          const audio = document.querySelector('.music-audio');
          const state = document.querySelector('.topbar-music').dataset.playing;
          return audio.readyState >= 1 && audio.currentTime >= time - .1 &&
            audio.currentTime < time + 5 && state === String(playing);
        }, { time, playing });
      }

      async function navigate(name, path) {
        if (width < 768) await page.locator('#menuBtn').click();
        await page.locator(width < 768 ? '#mobileMenu' : '.nav-links')
          .getByRole('link', { name, exact: true }).click();
        await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === path);
        await ready();
      }

      await page.goto(`${origin}/about/`, { waitUntil: 'domcontentloaded' });
      await ready();
      if (await audio.evaluate(element => element.paused)) await button.click();
      await page.waitForFunction(() => document.querySelector('.topbar-music').dataset.playing === 'true');
      await audio.evaluate(element => { element.currentTime = 42; });
      await navigate('Project', '/Project');
      await expectPosition(42, true);

      await page.locator('.project-card').first().click();
      await page.waitForURL(/\/Project\/project-01\/?$/);
      await expectPosition(42, true);
      await page.locator('.project-back').click();
      await page.waitForURL(url => url.pathname.replace(/\/+$/, '') === '/Project');
      await expectPosition(42, true);

      await button.click();
      await audio.evaluate(element => { element.currentTime = 81; });
      await navigate('About', '/about');
      await expectPosition(81, false);
      await navigate('Contact', '/about');
      await page.waitForFunction(() => document.querySelector('#contact-dialog').open);
      assert.equal(await audio.evaluate(element => element.paused), true);
      await page.keyboard.press('Escape');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await ready();
      await page.waitForFunction(() => document.querySelector('.music-audio').readyState >= 1);
      assert.ok(await audio.evaluate(element => element.currentTime) < 5, 'Reload starts from the beginning');
      if (policy === 'allowed') {
        await page.waitForFunction(() => document.querySelector('.topbar-music').dataset.playing === 'true');
      } else if (await audio.evaluate(element => element.paused)) {
        await button.click();
      }

      await audio.evaluate(element => { element.currentTime = 20; });
      await navigate('Home', '');
      await expectPosition(20, true);
      await audio.evaluate(element => { element.currentTime = 60; });
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.music-audio').currentTime >= 59.9);
      // Browser history can require a fresh gesture even after an internal link played.
      if (policy === 'default' && await audio.evaluate(element => element.paused)) await button.click();
      await expectPosition(60, true);
      await audio.evaluate(element => { element.currentTime = 80; });
      await page.goForward({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.music-audio').currentTime >= 79.9);
      if (policy === 'default' && await audio.evaluate(element => element.paused)) await button.click();
      await expectPosition(80, true);

      await page.goto(`${origin}/Project/`, { waitUntil: 'domcontentloaded' });
      await ready();
      await page.waitForFunction(() => document.querySelector('.music-audio').readyState >= 1);
      assert.ok(await audio.evaluate(element => element.currentTime) < 5, 'Opening a URL directly starts from the beginning');
      assert.deepEqual(errors, []);
      console.log(`PASS ${policy} ${width}: navigation, project details, pause, popup, reload, history and direct loads`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
