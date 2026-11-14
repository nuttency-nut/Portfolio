import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Run with PLAYWRIGHT_MODULE pointing to playwright/index.mjs.
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  for (const width of [1440, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const hint = page.locator('.scroll-story-hint'), wipe = hint.locator('.story-hint-wipe');
    await page.locator('.scroll-story-body').evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - innerHeight * .65, behavior: 'instant' }));
    await page.waitForTimeout(100);
    if (width >= 768) {
      assert.equal(await hint.isVisible(), true);
      assert.equal(await hint.locator('text').textContent(), 'click to expand all');
      assert.equal(await hint.evaluate(el => el.classList.contains('is-dismissed')), false);
      assert.equal(await hint.evaluate(el => getComputedStyle(el).pointerEvents), 'none');
      const box = await hint.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width, 'Hint stays inside the viewport');
      const description = await page.locator('.scroll-story-description').boundingBox();
      assert.ok(box.y >= description.y + description.height + 8, 'Handwritten cue clears the full description, including while typing');
      const start = await page.locator('.scroll-story-dot-toggle').boundingBox();
      assert.ok(Math.hypot(box.x + 8 - (start.x + 22), box.y + 66 - (start.y + 22)) < 25, 'Arrow tip points at initial purple dot');
      if ([1440, 768].includes(width)) await capture(page, { path: `hero-animation/story-hint-${width}.png` });
      await page.evaluate(() => scrollBy({ top: 220, behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('.scroll-story-hint').classList.contains('is-dismissed'));
      const motion = await wipe.evaluate(el => {
        const animation = el.getAnimations().find(item => item.transitionProperty === 'stroke-dashoffset');
        if (!animation) throw Error('Missing progressive SVG-mask retraction');
        animation.pause(); animation.currentTime = 0;
        const first = parseFloat(getComputedStyle(el).strokeDashoffset);
        animation.currentTime = animation.effect.getTiming().duration / 2;
        const middle = parseFloat(getComputedStyle(el).strokeDashoffset);
        return { first, middle };
      });
      assert.ok(motion.middle < motion.first && motion.middle > -1);
      if (width === 1440) await capture(page, { path: 'hero-animation/story-hint-retracting.png' });
      await wipe.evaluate(el => el.getAnimations().forEach(animation => animation.finish()));
      assert.equal(await wipe.evaluate(el => parseFloat(getComputedStyle(el).strokeDashoffset)), -1);
      await page.locator('.scroll-story-body').evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - innerHeight * .65, behavior: 'instant' }));
      await page.waitForFunction(() => !document.querySelector('.scroll-story-hint').classList.contains('is-dismissed'));
      await page.waitForTimeout(1000);
      assert.equal(await wipe.evaluate(el => parseFloat(getComputedStyle(el).strokeDashoffset)), 0);
      await page.locator('.scroll-story-dot-toggle').click();
      assert.equal(await hint.evaluate(el => el.classList.contains('is-used')), true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('.scroll-story-hint').hasAttribute('hidden'));
      assert.equal(await hint.isVisible(), false);
    } else assert.equal(await hint.isVisible(), false, 'Mobile has no global purple-dot control or misleading cue');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/');
  assert.equal(await noJS.locator('.scroll-story-hint').isVisible(), false);
  await noJS.close();
  console.log('PASS: handwritten cue points at initial dot, mask retracts progressively on scroll and redraws on return, hides after use/mobile/reduced motion/no-JS, no overflow or JS errors.');
} finally { await browser.close(); }
