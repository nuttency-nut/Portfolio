import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Run with PLAYWRIGHT_MODULE pointing to playwright/index.mjs.
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const url = new URL('/about/', process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').href;

async function waitForState(card, open) {
  await card.locator('details').evaluate((el, open) => new Promise(resolve => {
    function check() {
      if (el.open === open && !el.dataset.animating) resolve();
      else requestAnimationFrame(check);
    }
    check();
  }), open);
}

async function sampleExpansion(card) {
  return card.locator('.about-skill-reveal').evaluate(el => {
    const animation = el.getAnimations()[0];
    if (!animation) throw Error('Missing disclosure animation');
    animation.pause();
    const duration = animation.effect.getTiming().duration;
    animation.currentTime = 0;
    const start = el.getBoundingClientRect().height;
    animation.currentTime = duration / 2;
    const middle = el.getBoundingClientRect().height;
    animation.currentTime = duration;
    const end = el.getBoundingClientRect().height;
    animation.finish();
    return { start, middle, end };
  });
}

try {
  for (const [width, height] of [[1440, 1000], [1366, 650], [1024, 600], [768, 1000], [640, 900], [390, 844], [320, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 640, isMobile: width < 640 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const skills = page.locator('.about-skills'), cards = skills.locator('.about-skill-card');
    assert.equal(await skills.locator('h2').innerText(), 'DUY LÀM ĐƯỢC GÌ?');
    assert.equal(await skills.locator('.about-skills-description').innerText(), 'Mình có khả năng kết nối, tổ chức và tối ưu quy trình vận hành trong lĩnh vực TMĐT, với tư duy kinh doanh thực tế và tinh thần cải tiến liên tục.');
    assert.equal(await cards.count(), 4);
    for (const card of await cards.all()) {
      assert.equal(await card.locator('li').count(), 3);
      assert.equal(await card.locator('details').evaluate(el => el.open), false);
      assert.ok(await card.locator('h3').isVisible());
      assert.equal(await card.locator('li').first().isVisible(), false);
    }
    if (width >= 1024) {
      assert.ok(await page.locator('.about-stats').evaluate(el => el.getBoundingClientRect().bottom) <= height - 12);
      const firstScreenBottom = await page.locator('.about-first-screen').evaluate(el => el.getBoundingClientRect().bottom);
      assert.ok(await skills.evaluate(el => el.getBoundingClientRect().top) >= firstScreenBottom - 1);
    }
    const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
    if (width < 640) assert.ok(second.y >= first.y + first.height);
    else assert.ok(Math.abs(first.y - second.y) < 1);
    await skills.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 144, behavior: 'instant' }));

    if (width === 1440) {
      const card = cards.first(), bounds = await card.boundingBox();
      await capture(skills, { path: 'hero-animation/about-skills-closed.png', style: '.topbar {visibility:hidden}' });
      await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .3);
      await page.waitForFunction(() => document.querySelector('.about-skill-details').dataset.animating);
      const opening = await sampleExpansion(card);
      assert.ok(opening.start < opening.middle && opening.middle < opening.end);
      await waitForState(card, true);
      assert.ok((await card.boundingBox()).height > bounds.height + 100);
      assert.ok(Math.abs((await cards.nth(1).boundingBox()).height - second.height) < 1);
      await page.waitForTimeout(200);
      assert.ok(await card.locator('.about-skill-content').evaluate(el => {
        const matrix = new DOMMatrix(getComputedStyle(el).transform);
        return matrix.m41 < 0 && Math.abs(matrix.m11 - 1.03) < .001;
      }));
      await capture(skills, { path: 'hero-animation/about-skills-open.png', style: '.topbar {visibility:hidden}' });
      await page.mouse.move(1, 1);
      const closing = await sampleExpansion(card);
      assert.ok(closing.start > closing.middle && closing.middle > closing.end);
      await waitForState(card, false);
      assert.equal(await card.locator('li').first().isVisible(), false);
      // Reverse an unfinished entrance, then enter again before the exit finishes.
      await page.mouse.move(bounds.x + 80, bounds.y + 80);
      await page.waitForTimeout(80);
      await page.mouse.move(1, 1);
      await page.waitForTimeout(80);
      await page.mouse.move(bounds.x + 80, bounds.y + 80);
      await waitForState(card, true);
      await page.mouse.move(1, 1);
      await waitForState(card, false);
      await card.locator('summary').focus();
      await page.keyboard.press('Enter');
      await waitForState(card, true);
      await page.keyboard.press('Escape');
      await waitForState(card, false);
      await page.keyboard.press('Space');
      await waitForState(card, true);
      await page.keyboard.press('Tab');
      await waitForState(card, false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.mouse.move(bounds.x + 80, bounds.y + 80);
      await waitForState(card, true);
      assert.equal(await card.locator('.about-skill-reveal').evaluate(el => el.getAnimations().length), 0);
      assert.equal(await card.locator('.about-skill-surface').evaluate(el => getComputedStyle(el).transform), 'none');
    }
    if (width < 640) {
      const card = cards.first();
      await card.locator('summary').tap();
      await waitForState(card, true);
      assert.ok(await card.locator('li').last().isVisible());
      if (width === 390) await capture(skills, { path: 'hero-animation/about-skills-mobile.png', style: '.topbar {visibility:hidden}' });
      await card.locator('summary').tap();
      await waitForState(card, false);
      if (width === 390) {
        const before = await page.evaluate(() => scrollY), box = await card.boundingBox();
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2, y = box.y + 100;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 6; step++) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 25 }] });
          await page.waitForTimeout(20);
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(150);
        assert.ok(await page.evaluate(() => scrollY) > before + 40);
        assert.equal(await card.locator('details').evaluate(el => el.open), false);
        assert.equal(await page.locator('.about-skill-card.is-active').count(), 0);
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noJS.goto(url, { waitUntil: 'load' });
  await noJS.locator('.about-skill-details summary').first().click();
  assert.ok(await noJS.locator('.about-skill-card li').first().isVisible());
  await noJS.close();
  console.log('PASS: requested copy, compact cards, animated hover/reversal, keyboard, mobile tap/scroll, reduced motion, native no-JS disclosure and seven responsive sizes.');
} finally { await browser.close(); }
