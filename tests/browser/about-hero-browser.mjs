import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<path to playwright/index.mjs> node tests/browser/about-hero-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
try {
  for (const [width, height] of [[1440, 1000], [1024, 1000], [768, 1000], [640, 1000], [390, 1000], [320, 1000], [1024, 600], [1280, 620], [1366, 650], [1440, 720], [1536, 780], [1920, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true });
    const errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(origin)) missing.push(response.url()); });
    await page.goto(`${origin}/about/`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const heading = page.locator('#about-title'), lead = page.locator('.about-lead').first(), portrait = page.locator('.about-portrait');
    const textBox = await page.locator('.about-hero-copy').boundingBox(), photoBox = await portrait.boundingBox();
    const bar = await page.locator('.topbar').boundingBox();
    assert.ok(textBox.y > bar.y + bar.height, 'Hero clears the fixed topbar');
    const alias = page.locator('.about-second-name');
    assert.equal(await alias.getAttribute('aria-label'), 'second name: Trần Anh Quốc');
    if (width === 1440 && height === 1000) {
      const fontSession = await page.context().newCDPSession(page);
      await fontSession.send('DOM.enable');
      await fontSession.send('CSS.enable');
      const { root } = await fontSession.send('DOM.getDocument');
      const { nodeId } = await fontSession.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.about-second-name text' });
      const { fonts } = await fontSession.send('CSS.getPlatformFontsForNode', { nodeId });
      assert.ok(fonts.length > 0 && fonts.every(font => font.isCustomFont && font.familyName === 'Dancing Script'), 'Every letter and Vietnamese accent uses Dancing Script');
      await fontSession.detach();
    }
    const aliasBox = await alias.boundingBox(), nameBox = await page.locator('.about-title-name').boundingBox();
    assert.ok(aliasBox.x >= 0 && aliasBox.x + aliasBox.width <= width, `Handwritten name stays in viewport at ${width}×${height}`);
    assert.ok(aliasBox.y > bar.y + bar.height, 'Handwritten name clears the topbar');
    const arrowY = aliasBox.y + aliasBox.height * 52 / 80;
    assert.ok(Math.abs(aliasBox.x - nameBox.x - nameBox.width - 8) < 1 && arrowY >= nameBox.y && arrowY <= nameBox.y + nameBox.height, 'Curved arrow points at Duy');
    if (width >= 768) assert.ok(photoBox.x > textBox.x + textBox.width, 'Desktop retains text-left/photo-right layout');
    else assert.ok(photoBox.y >= textBox.y + textBox.height + 39, 'Mobile stacks portrait below copy');
    const expectedHeading = width >= 1024 ? height <= 740 ? Math.max(36, Math.min(width * .032, 44)) : Math.max(38, Math.min(width * .035, 56)) : width >= 768 ? Math.max(44, Math.min(width * .04, 64)) : width >= 640 ? 56 : 44;
    assert.ok(Math.abs(await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize)) - expectedHeading) < .1);
    assert.ok(await heading.evaluate(el => getComputedStyle(el).fontFamily.includes('Oswald')));
    assert.ok(await lead.evaluate(el => getComputedStyle(el).fontFamily.includes('Be Vietnam Pro')));
    assert.equal(await lead.evaluate(el => getComputedStyle(el).fontSize), width >= 1024 && height <= 740 ? '16px' : '18px');
    const photo = page.locator('.about-photo');
    const frame = await photo.boundingBox();
    assert.ok(Math.abs(frame.width / frame.height - .8) < .01, 'Portrait retains 4:5 frame');
    assert.ok(await photo.locator('img').evaluate(el => el.complete && el.naturalWidth > 0));
    const tag = await page.locator('.about-name-tag').boundingBox();
    assert.ok(tag.x >= 0 && tag.x + tag.width <= width, 'Rotated name tag stays inside the viewport');
    if (width >= 1024 && height <= 900) {
      const actions = await page.locator('.about-actions').boundingBox();
      assert.ok(actions.y + actions.height <= height - 12, `Project button fits the first viewport at ${width}×${height}`);
      assert.ok(photoBox.y > bar.y + bar.height && photoBox.y + photoBox.height <= height - 12, `Entire portrait fits ${width}×${height}`);
      assert.ok(tag.y + tag.height <= height, `Name tag fits ${width}×${height}`);
      assert.ok(photoBox.width >= 300, 'Portrait retains a useful size even on 600px-high laptop viewports');
    }
    const values = page.locator('.about-stat-value');
    assert.deepEqual(await values.evaluateAll(items => items.map(el => el.getAttribute('aria-label') || el.textContent)), ['2022', '3+', '4+', '99+']);
    const expectedStatSize = width >= 1024 ? height <= 740 ? 40 : Math.max(40, Math.min(width * .036, 56)) : width >= 768 ? 64 : 44;
    assert.ok(Math.abs(await values.first().evaluate(el => parseFloat(getComputedStyle(el).fontSize)) - expectedStatSize) < .1);
    const stats = page.locator('.about-stat'), first = await stats.nth(0).boundingBox(), third = await stats.nth(2).boundingBox();
    assert.ok(await stats.last().locator('.about-stat-description').evaluate(el => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
      return el.getBoundingClientRect().height <= lineHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    }), 'Teamwork caption fits on one full line');
    assert.ok(width >= 768 ? Math.abs(first.y - third.y) < 1 : third.y > first.y + first.height - 1);
    if (width >= 1024) {
      const statsBox = await page.locator('.about-stats').boundingBox();
      const actions = await page.locator('.about-actions').boundingBox();
      assert.ok(statsBox.y > actions.y + actions.height, 'Statistics sit below the buttons');
      assert.ok(statsBox.x + statsBox.width < photoBox.x, 'Statistics share the left column, beside the full-height portrait');
      assert.ok(statsBox.y + statsBox.height <= height + 1, `All four complete statistics fit ${width}×${height}`);
      assert.ok(await page.locator('.site-footer').evaluate(el => el.getBoundingClientRect().top) >= height - 1, 'Footer follows the complete first screen');
    }
    assert.equal(await page.locator('.about-template-note').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    if ((width === 1440 && height === 1000) || width === 390 || (width === 1366 && height === 650)) {
      await page.waitForTimeout(1300);
      await page.waitForFunction(() => !document.querySelector('.about-stat-value.is-counting'));
      assert.ok(await page.locator('.about-marker').evaluate(el => new DOMMatrix(getComputedStyle(el, '::before').transform).m11 > .99), 'Pastel marker finishes drawing');
      await capture(page, { path: `hero-animation/about-hero-${width}x${height}.png`, fullPage: height === 1000 });
    }
    if (width === 1440 && height === 1000) {
      await page.locator('.about-primary').click();
      await page.waitForURL(/\/Project\/?$/);
      assert.equal(await page.locator('.project-card').count(), 4);
    } else if (width === 390) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.about-marker').evaluate(el => getComputedStyle(el, '::before').animationName), 'none');
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await page.close();
  }
  const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await noJS.goto(`${origin}/about/`, { waitUntil: 'load' });
  assert.equal(await noJS.locator('#about-title').isVisible(), true);
  assert.equal(await noJS.locator('.about-stat').count(), 4);
  assert.equal(await noJS.locator('.about-photo img').evaluate(el => el.naturalWidth > 0), true);
  await noJS.close();
  console.log('PASS: complete first-viewport laptop hero including all 4 statistics (1024×600 to 1920×900), visible project button/photo/name tag, mobile layout, project link, reduced motion, no-JS, no overflow or missing assets.');
} finally { await browser.close(); }
