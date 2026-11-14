import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/hero-typing-browser.mjs
import assert from 'node:assert/strict';


const browser = await chromium.launch({
  executablePath: browserExecutable,
  headless: true,
});
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 375, height: 667 }, { width: 360, height: 800 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(url);
    await page.waitForSelector('.hero-description.is-typing');
    const caret = await page.evaluate(() => {
      const animation = document.getAnimations().find(item => item.animationName === 'hero-caret-blink');
      animation.pause();
      const typed = document.querySelector('.hero-description-typed');
      animation.currentTime = 0;
      const visible = getComputedStyle(typed, '::after').opacity;
      animation.currentTime = 450;
      const hidden = getComputedStyle(typed, '::after').opacity;
      animation.play();
      return { visible, hidden };
    });
    assert.deepEqual(caret, { visible: '1', hidden: '0' }, 'The typing cursor must blink');
    await page.waitForFunction(() => document.querySelector('.hero-description-typed').textContent.length > 3);
    const state = await page.locator('.hero-description').evaluate(el => ({
      full: el.querySelector('.hero-description-source').textContent,
      partial: el.querySelector('.hero-description-typed').textContent,
      height: el.getBoundingClientRect().height,
      center: el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
      align: getComputedStyle(el).textAlign,
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"'),
    }));
    assert.ok(state.full.startsWith(state.partial) && state.partial.length < state.full.length,
      'Each visit must type the supplied Vietnamese text progressively');
    if (viewport.width <= 767) {
      assert.ok(Math.abs(state.center - viewport.width / 2) < 1, 'The mobile introduction remains centered');
    }
    assert.equal(state.align, 'right');
    assert.ok(state.fontLoaded, 'The Vietnamese body font must load before typing');
    await page.waitForFunction(() => !document.querySelector('.hero-description').classList.contains('is-typing'));
    assert.equal(await page.locator('.hero-description-source').textContent(), state.full);
    assert.equal(await page.locator('.hero-description').evaluate(el => el.getBoundingClientRect().height), state.height,
      'Typing must reserve its final height without shifting the title');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    if (viewport.width >= 1280) {
      const lines = await page.locator('.hero-description-source').evaluate(el => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top))).size;
      });
      assert.equal(lines, 3, 'The full desktop introduction occupies exactly three lines');
    }
    if (viewport.width <= 767) {
      assert.ok(await page.locator('.hero-description').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight - 12),
        'The complete introduction must fit above the bottom of the mobile screen');
    }
    await capture(page, { path: `hero-animation/typing-${viewport.width}.png` });
    // Visitors with the previous version's flag must also get the new behavior.
    await page.evaluate(() => sessionStorage.setItem('portfolio-intro-typed-v1', '1'));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.hero-description-typed').textContent.length > 3);
    assert.equal(await page.locator('.hero-description').evaluate(el => el.classList.contains('is-typing')), true,
      'Reloading the same tab must replay the typing effect');
    await page.close();
  }
  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const page = await browser.newPage({ ...options, viewport: { width: 390, height: 844 } });
    await page.goto(url);
    assert.equal(await page.locator('.hero-description-source').evaluate(el => getComputedStyle(el).opacity), '1',
      'The full introduction must remain visible without motion or JavaScript');
    await page.close();
  }
  console.log('PASS: progressive Vietnamese typing on every reload, blinking cursor, stable layout, mobile widths, reduced motion, no JavaScript.');
} finally {
  await browser.close();
}
