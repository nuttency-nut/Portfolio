import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/scroll-story-photos-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [1440, 1024, 390, 320]) {
    const touch = width < 768;
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.scroll-story-details').evaluateAll(items => items.forEach(item => { item.open = true; }));
    await page.waitForFunction(() => document.querySelectorAll('.scroll-story-row.is-expanded').length === 5);
    const stacks = page.locator('.scroll-story-photo');
    assert.equal(await stacks.count(), 5);
    assert.equal(await stacks.locator('img, video').count(), 20);
    for (let i = 0; i < 5; i++) {
      const stack = stacks.nth(i), button = stack.locator('button');
      await stack.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await stack.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      if (!touch) await button.hover();
      await page.waitForFunction(button => button.getAttribute('aria-expanded') === 'true', await button.elementHandle());
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('.scroll-story-photo.is-open').count(), 1);
      const delays = await stack.locator('img, video').evaluateAll(media => media.map(item => getComputedStyle(item).transitionDelay));
      assert.deepEqual(delays, ['0s', '0.06s', '0.12s', '0.18s'], 'The four images open in sequence');
      await page.waitForTimeout(820);
      const images = await stack.locator('img, video').evaluateAll(images => images.map(img => {
        const rect = img.getBoundingClientRect();
        const matrix = new DOMMatrix(getComputedStyle(img).transform);
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, x: matrix.m41, y: matrix.m42 };
      }));
      assert.ok(images[0].x < 0 && images[0].y < 0 && images[1].x > 0 && images[1].y < 0
        && images[2].x < 0 && images[2].y > 0 && images[3].x > 0 && images[3].y > 0, 'Images spread to all four corners');
      const textBoxes = await page.locator('.scroll-story-row').nth(i).locator('.scroll-story-heading-group, .scroll-story-details-copy > p, .scroll-story-lesson').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()));
      for (const image of images) {
        assert.ok(image.left >= 0 && image.right <= width, 'Expanded photos stay inside the viewport');
        for (const content of textBoxes) {
          const intersects = image.left < content.x + content.width && image.right > content.x
            && image.top < content.y + content.height && image.bottom > content.y;
          assert.equal(intersects, false, 'Expanded photos must not cover the row text');
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      if (i === 0 && width !== 1024) {
        await capture(page, { path: `hero-animation/story-photo-open-${width}.png` });
      }
      if (touch) await button.tap();
      else await page.mouse.move(width - 2, 898);
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      await page.waitForTimeout(480);
    }
    const button = stacks.first().locator('button');
    await stacks.first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    if (!touch) {
      await button.hover();
      const transitions = await stacks.first().locator('img').first().evaluate(img => {
        const transition = img.getAnimations().find(item => item.transitionProperty === 'transform');
        transition.pause();
        transition.currentTime = 0;
        const start = new DOMMatrix(getComputedStyle(img).transform).m41;
        transition.currentTime = 300;
        const middle = new DOMMatrix(getComputedStyle(img).transform).m41;
        transition.finish();
        const end = new DOMMatrix(getComputedStyle(img).transform).m41;
        return { start, middle, end };
      });
      assert.ok(transitions.start > transitions.middle && transitions.middle > transitions.end, 'Hover moves progressively, without jumping');
      await page.mouse.move(width - 2, 898);
      await page.waitForTimeout(60);
      await button.hover();
      await page.waitForTimeout(820);
      assert.equal(await button.getAttribute('aria-expanded'), 'true', 'Rapid re-entry remains open');
      await page.keyboard.press('Escape');
      await page.mouse.move(width - 2, 898);
    }
    await button.focus();
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Enter');
    assert.equal(await button.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await button.getAttribute('aria-expanded'), 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (touch) {
      if (await button.getAttribute('aria-expanded') !== 'true') await button.tap();
    } else await button.hover();
    assert.equal(await stacks.first().locator('img').first().evaluate(img => getComputedStyle(img).transitionDuration), '0s');
    if (touch) await page.locator('#contact').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    else await page.locator('.scroll-story-heading').click();
    await page.waitForFunction(button => button.getAttribute('aria-expanded') === 'false', await button.elementHandle());
    assert.equal(await button.getAttribute('aria-expanded'), 'false', 'Clicking outside closes the stack');
    await page.close();
  }
  console.log('PASS: 4 images per milestone, staggered hover/scroll opening, rapid re-entry, touch toggle, keyboard/Escape, reduced motion, no text overlap or viewport overflow.');
} finally {
  await browser.close();
}
