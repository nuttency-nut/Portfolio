import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/contact-photo-tags-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
const labels = ['170cm', '2001', 'Xữ nữ', 'GenZ', 'Coffee ☕', 'Trade', 'Vide Code', 'Aumation', 'Ecom', 'Operation', 'BA', 'DA', 'Coach', 'ThaiPop'];
try {
  for (const width of [1440, 768, 390, 320]) {
    const mobile = width < 768;
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: mobile, isMobile: mobile });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const photo = page.locator('.contact-photo'), button = photo.locator('button'), image = photo.locator('img');
    await photo.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await image.evaluate(el => el.decode());
    await page.mouse.move(width - 1, 899);
    assert.deepEqual((await photo.locator('.contact-photo-tag').allTextContents()).sort(), [...labels].sort());
    const original = await image.boundingBox();
    assert.ok(Math.abs(original.width / original.height - .75) < .01);
    const points = await photo.locator('.contact-photo-point').evaluateAll(nodes => nodes.map(node => ({ x: parseFloat(node.style.getPropertyValue('--point-x')) / 100, y: parseFloat(node.style.getPropertyValue('--point-y')) / 100 })));
    const bounds = await button.boundingBox();
    if (mobile) await button.tap();
    else await button.hover({ position: { x: points[0].x * bounds.width, y: points[0].y * bounds.height } });
    const activeTag = photo.locator('.is-active .contact-photo-tag');
    assert.ok(await activeTag.evaluate(el => el.getAnimations().some(animation => animation.transitionProperty === 'transform')), 'The label pops up through a transform transition');
    await page.waitForTimeout(430);
    if ([1440, 390, 320].includes(width)) await capture(photo, { path: `hero-animation/contact-tags-${width}.png` });
    const current = await image.boundingBox();
    for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(current[key] - original[key]) < .2, 'The image stays fixed while labels animate');
    assert.deepEqual(await image.evaluate(el => ({ transform: getComputedStyle(el).transform, filter: getComputedStyle(el).filter, animation: getComputedStyle(el).animationName })), { transform: 'none', filter: 'none', animation: 'none' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const seen = new Set();
    for (let i = 0; i < 14; i++) {
      if (mobile) await button.tap();
      else await button.hover({ position: { x: points[i].x * bounds.width, y: points[i].y * bounds.height } });
      assert.equal(await photo.locator('.is-active').count(), 1);
      seen.add(await activeTag.innerText());
      const tag = await activeTag.boundingBox();
      const frame = await photo.boundingBox();
      assert.ok(tag.x >= frame.x && tag.y >= frame.y && tag.x + tag.width <= frame.x + frame.width && tag.y + tag.height <= frame.y + frame.height, 'Every tag fits completely inside the photo');
      assert.equal(await activeTag.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    }
    assert.equal(seen.size, 14, 'All supplied labels can be explored');
    await button.focus();
    await page.keyboard.press('Escape');
    assert.equal(await photo.locator('.is-active').count(), 0);
    await page.keyboard.press('ArrowRight');
    assert.equal(await photo.locator('.is-active').count(), 1);
    assert.ok((await button.getAttribute('aria-label')).includes(await activeTag.innerText()));
    await page.locator('#contact-name').click();
    assert.equal(await photo.locator('.is-active').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: all 14 randomized labels, hover and touch cycling, smooth pop transition, fixed 3:4 image, in-frame labels at all widths, keyboard and reduced motion.');
} finally { await browser.close(); }
