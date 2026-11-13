import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/testimonials-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [1440, 768, 390, 320, 3840]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: width < 768, isMobile: width < 768 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('.testimonials');
    await section.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.testimonials').dataset.moving === 'true');
    const groups = section.locator('.testimonials-group');
    assert.equal(await groups.count(), 2);
    assert.equal(await groups.first().locator('.testimonial-card').count(), 8);
    const cards = await groups.first().locator('.testimonial-card').evaluateAll(cards => cards.map(card => {
      const quote = card.querySelector('blockquote p');
      const style = getComputedStyle(quote);
      return { height: card.getBoundingClientRect().height, quoteHeight: quote.getBoundingClientRect().height, lineHeight: parseFloat(style.lineHeight), clamp: style.webkitLineClamp };
    }));
    for (const card of cards) {
      assert.equal(card.clamp, '3');
      assert.ok(card.quoteHeight <= card.lineHeight * 3 + 1, 'Review stays within three visible lines');
      assert.ok(card.height < (width < 768 ? 235 : 255), 'Cards no longer keep the old 278px height');
    }
    assert.equal(await groups.last().getAttribute('aria-hidden'), 'true');
    assert.equal(await groups.last().evaluate(el => el.inert), true);
    await section.locator('img').evaluateAll(images => Promise.all(images.map(img => {
      img.loading = 'eager'; // Check every avatar, including offscreen loop copies.
      return img.decode();
    })));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    const windowBox = await section.locator('.testimonials-window').boundingBox();
    assert.equal(windowBox.x, 0);
    assert.equal(windowBox.width, width);
    const firstGroup = await groups.first().boundingBox();
    assert.ok(firstGroup.width >= width - .1, 'Both groups fill even a wide viewport without a blank tail');
    assert.ok(Math.abs(firstGroup.width - (await groups.last().boundingBox()).width) < 1);
    const samples = await section.locator('.testimonials-track').evaluate(track => {
      const animation = track.getAnimations()[0];
      animation.currentTime = 1000;
      const start = track.getBoundingClientRect().x;
      animation.currentTime = 2000;
      const next = track.getBoundingClientRect().x;
      const duration = animation.effect.getTiming().duration;
      animation.currentTime = duration - 1;
      const before = track.children[1].firstElementChild.getBoundingClientRect().x;
      animation.currentTime = 0;
      const after = track.children[0].firstElementChild.getBoundingClientRect().x;
      return { start, next, before, after };
    });
    assert.ok(Math.abs(samples.start - samples.next - 42) < .2, 'Moves steadily right to left at 42px/sec');
    assert.ok(Math.abs(samples.before - samples.after) < .2, 'Last frame matches the start of the next loop');
    assert.equal(await section.locator('button').count(), 0);
    const phase = () => section.locator('.testimonials-track').evaluate(track => {
      const loop = track.getAnimations()[0], duration = loop.effect.getTiming().duration;
      return (loop.currentTime % duration) / 1000 * 42;
    });
    const box = await section.locator('.testimonials-window').boundingBox();
    const x = width / 2, y = box.y + 90;
    const cdp = width < 768 ? await page.context().newCDPSession(page) : null;
    const touch = async (type, pointX = x, pointY = y) => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: pointX, y: pointY }] });
      // Touch moves are coalesced by Chromium until the next rendered frame.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    if (cdp) await touch('touchStart');
    else { await page.mouse.move(x, y); await page.mouse.down(); }
    assert.equal(await section.getAttribute('data-moving'), 'false');
    const held = await phase();
    await page.waitForTimeout(150);
    assert.ok(Math.abs(held - await phase()) < .1, 'Holding freezes the loop');
    const circularDistance = (a, b) => Math.abs(((a - b + firstGroup.width * 1.5) % firstGroup.width) - firstGroup.width / 2);
    if (cdp) await touch('touchMove', x + 80);
    else await page.mouse.move(x + 80, y);
    assert.ok(circularDistance(await phase(), held - 80) < 1, 'Drag right follows the pointer, including crossing the loop boundary');
    if (cdp) await touch('touchMove', x - 100);
    else await page.mouse.move(x - 100, y);
    assert.ok(circularDistance(await phase(), held + 100) < 1, 'Drag left follows the pointer');
    const beforeRelease = await phase();
    if (cdp) await touch('touchEnd');
    else await page.mouse.up();
    assert.equal(await section.getAttribute('data-moving'), 'true');
    await page.waitForTimeout(150);
    assert.ok(circularDistance(await phase(), beforeRelease + 6.3) < 3, 'Release resumes at the held position without resetting');
    if (cdp && width === 390) {
      const beforeScroll = await page.evaluate(() => scrollY);
      await touch('touchStart');
      for (let distance = 20; distance <= 140; distance += 20) await touch('touchMove', x, y - distance);
      await touch('touchEnd');
      assert.ok(await page.evaluate(() => scrollY) > beforeScroll + 50, 'Vertical touch scrolling remains native');
      assert.equal(await section.getAttribute('data-dragging'), 'false', 'A canceled horizontal gesture releases capture');
    }
    if ([1440, 390].includes(width)) await capture(page, { path: `hero-animation/testimonials-${width}.png` });
    await page.locator('.hero-intro').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.testimonials').dataset.moving === 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await section.scrollIntoViewIfNeeded();
    assert.equal(await section.locator('.testimonials-track').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await section.locator('button').count(), 0);
    assert.equal(await groups.last().isVisible(), false);
    assert.ok(await section.locator('.testimonials-window').evaluate(el => {
      if (el.scrollWidth <= el.clientWidth) return true; // Ultra-wide screens can show every card.
      el.scrollLeft = 200;
      return el.scrollLeft > 0;
    }));
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: 'load' });
  assert.equal(await page.locator('.testimonials-group').count(), 1);
  assert.equal(await page.locator('.testimonials-pause').count(), 0);
  await page.locator('.testimonials-window').evaluate(el => { el.scrollLeft = 200; });
  assert.ok(await page.locator('.testimonials-window').evaluate(el => el.scrollLeft > 0));
  await page.close();
  console.log('PASS: full-bleed seamless loop, mouse/touch drag both directions, hold/release without jumping, native vertical touch scroll, offscreen pause, reduced motion, no-JS scrolling, no page overflow.');
} finally { await browser.close(); }
