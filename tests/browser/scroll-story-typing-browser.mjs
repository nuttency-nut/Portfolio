import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/scroll-story-typing-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const description = page.locator('.scroll-story-description');
    const expected = await page.locator('.scroll-story-description-source').textContent();
    assert.ok(expected.length > 50);
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.scroll-story-description-typed').textContent(), '', 'Typing waits until the paragraph enters view');
    const height = (await description.boundingBox()).height;
    const bodyTop = await page.locator('.scroll-story-body').evaluate(el => el.getBoundingClientRect().top + scrollY);
    await description.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.scroll-story-description-typed').textContent.length > 3);
    const partial = await page.locator('.scroll-story-description-typed').textContent();
    assert.ok(expected.startsWith(partial) && partial.length < expected.length);
    assert.equal(await description.evaluate(el => getComputedStyle(el).textAlign), 'left');
    const caret = await page.evaluate(() => {
      const animation = document.getAnimations().find(item => item.animationName === 'story-caret-blink');
      animation.pause();
      animation.currentTime = 0;
      const typed = document.querySelector('.scroll-story-description-typed');
      const visible = getComputedStyle(typed, '::after').opacity;
      animation.currentTime = 450;
      const hidden = getComputedStyle(typed, '::after').opacity;
      animation.play();
      return { visible, hidden };
    });
    assert.deepEqual(caret, { visible: '1', hidden: '0' });
    await page.waitForFunction(() => !document.querySelector('.scroll-story-description').classList.contains('is-typing'));
    assert.equal((await description.boundingBox()).height, height);
    assert.equal(await page.locator('.scroll-story-body').evaluate(el => el.getBoundingClientRect().top + scrollY), bodyTop);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.locator('.scroll-story').evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 150, behavior: 'instant' }));
    await capture(page, { path: `hero-animation/scroll-story-description-${width}.png` });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.scroll-story-description').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.scroll-story-description-typed').textContent.length > 3);
    assert.equal(await page.locator('.scroll-story-description.is-typing').count(), 1, 'Reloading replays the effect');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.scroll-story-description').classList.contains('is-typing'));
    assert.equal(await description.evaluate(el => el.classList.contains('is-typing')), false);
    assert.equal(await page.locator('.scroll-story-description-source').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.close();
  }
  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const page = await browser.newPage({ ...options, viewport: { width: 320, height: 568 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    assert.ok((await page.locator('.scroll-story-description-source').textContent()).length > 50);
    assert.equal(await page.locator('.scroll-story-description-source').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
    await page.close();
  }
  console.log('PASS: exact Vietnamese text, typing on entering view, blinking caret, stable layout, replay on reload, reduced motion and no-JS fallback.');
} finally {
  await browser.close();
}
