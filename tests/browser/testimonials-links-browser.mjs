import assert from 'node:assert/strict';
import { chromium, browserExecutable } from '../helpers/browser.mjs';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const origin = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width < 768, isMobile: width < 768 });
    await page.context().route('https://minhngo.vn/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Link target fixture</title>' }));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.testimonials.is-ready');
    await page.locator('.testimonials').scrollIntoViewIfNeeded();
    for (const index of [0, 1]) {
      const link = page.locator('.testimonials-group').nth(index).locator('a[href="https://minhngo.vn/"]');
      // Put either loop copy on screen, independently of the current marquee phase.
      await link.evaluate(element => {
        const track = element.closest('.testimonials-track');
        track.style.animation = 'none';
        track.style.transform = 'none';
        element.closest('.testimonials-window').scrollLeft = 0;
        const box = element.getBoundingClientRect();
        track.style.transform = `translateX(${innerWidth / 2 - box.x - box.width / 2}px)`;
      });
      assert.equal(await link.evaluate(element => Boolean(element.closest('[inert]'))), false);
      assert.equal(await link.evaluate(element => element.tabIndex), index ? -1 : 0);
      const opened = page.waitForEvent('popup');
      if (width < 768) await link.tap(); else await link.click();
      const popup = await opened;
      await popup.waitForLoadState('domcontentloaded');
      assert.equal(popup.url(), 'https://minhngo.vn/');
      assert.equal(await popup.evaluate(() => window.opener === null), true);
      assert.equal(await page.locator('.testimonials').getAttribute('data-dragging'), 'false');
      await popup.close();
      if (!index && width === 1440) {
        await link.focus();
        const keyboardOpened = page.waitForEvent('popup');
        await page.keyboard.press('Enter');
        const keyboardPopup = await keyboardOpened;
        await keyboardPopup.waitForLoadState('domcontentloaded');
        assert.equal(keyboardPopup.url(), 'https://minhngo.vn/');
        await keyboardPopup.close();
      }
    }
    await page.close();
    console.log(`PASS: ${width}px, original and loop-copy links open the correct tab by mouse/touch; original link also supports Enter.`);
  }
} finally {
  await browser.close();
}
