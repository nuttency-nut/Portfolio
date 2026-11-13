import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/project-gallery-browser.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const catalog = `${origin}/Project/`;
try {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width < 768, isMobile: width < 768 });
    const errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(origin)) missing.push(response.url()); });
    await page.goto(catalog, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator('.project-card');
    assert.equal(await cards.count(), 4);
    const titles = await cards.locator('h2').allTextContents();
    const routes = await cards.evaluateAll(nodes => nodes.map(node => node.href));
    assert.equal(new Set(routes).size, 4);
    const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
    if (width < 640) assert.ok(second.y >= first.y + first.height, 'Phone cards form a readable single column');
    else assert.ok(Math.abs(first.y - second.y) < 1 && second.x > first.x + first.width, 'Desktop cards form two columns');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.waitForFunction(() => document.querySelector('.project-card .project-media').dataset.imageState === 'ready');
    if (width === 1440) {
      await cards.first().hover();
      const motion = await cards.first().evaluate(el => {
        const transition = el.getAnimations().find(item => item.transitionProperty === 'transform');
        if (!transition) throw Error('Missing hover transition');
        transition.pause(); transition.currentTime = 0;
        const start = new DOMMatrix(getComputedStyle(el).transform).m42;
        transition.currentTime = 160;
        const middle = new DOMMatrix(getComputedStyle(el).transform).m42;
        transition.finish();
        return { start, middle, end: new DOMMatrix(getComputedStyle(el).transform).m42 };
      });
      assert.ok(motion.start > motion.middle && motion.middle > motion.end, 'Hover lifts the card progressively');
      await page.mouse.move(width - 1, 990);
    }
    if ([1440, 390].includes(width)) await capture(page, { path: `hero-animation/projects-catalog-${width}.png` });
    const detailCount = [1440, 390].includes(width) ? 4 : 1;
    for (let i = 0; i < detailCount; i++) {
      if (i) await page.goto(catalog, { waitUntil: 'domcontentloaded' });
      if (i === 1) { await cards.nth(i).focus(); await page.keyboard.press('Enter'); }
      else await cards.nth(i).click();
      await page.waitForURL(`${routes[i]}/`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('#project-title').innerText(), titles[i]);
      assert.equal(await page.locator('.project-description-copy p').count(), 3);
      assert.equal(await page.locator('.project-gallery img').count(), 4);
      assert.equal(await page.locator('.project-facts > div').count(), 3);
      assert.deepEqual(await page.locator('.topbar-wrap a[aria-current="page"]').allTextContents(), ['Project', 'Project']);
      for (const frame of await page.locator('.project-media').all()) {
        await frame.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => el.dataset.imageState === 'ready', await frame.elementHandle());
        assert.equal(await frame.getAttribute('aria-busy'), 'false');
        assert.ok(await frame.locator('img').evaluate(el => el.naturalWidth > 0));
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      if (i === 0 && [1440, 390].includes(width)) {
        await page.evaluate(() => scrollTo(0, 0));
        await capture(page, { path: `hero-animation/project-detail-${width}.png` });
        await capture(page.locator('.project-gallery'), { path: `hero-animation/project-related-${width}.png` });
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('#project-title').innerText(), titles[i], 'Each static detail route survives refresh');
      await page.locator('.project-back').click();
      await page.waitForURL(catalog);
      assert.equal(await cards.count(), 4);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await page.close();
  }

  const loading = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let releaseImage;
  const held = new Promise(resolve => { releaseImage = resolve; });
  await loading.route('**/assets/images/projects/project-01/cover.svg', async route => { await held; await route.continue(); });
  await loading.goto(catalog, { waitUntil: 'domcontentloaded' });
  await loading.evaluate(() => document.fonts.ready);
  const frame = loading.locator('.project-media').first();
  await loading.waitForFunction(() => document.querySelector('.project-media').classList.contains('is-visible'));
  assert.equal(await frame.getAttribute('data-image-state'), 'loading');
  assert.equal(await frame.locator('.project-skeleton').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await frame.locator('.project-skeleton').evaluate(el => getComputedStyle(el, '::after').animationName), 'project-shimmer');
  const before = await frame.boundingBox();
  await capture(loading, { path: 'hero-animation/project-skeleton.png' });
  await loading.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await loading.waitForFunction(() => !document.querySelector('.project-media').classList.contains('is-visible'));
  assert.equal(await frame.locator('.project-skeleton').evaluate(el => getComputedStyle(el, '::after').animationName), 'none');
  await frame.scrollIntoViewIfNeeded();
  await loading.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await frame.locator('.project-skeleton').evaluate(el => getComputedStyle(el, '::after').animationName), 'none');
  releaseImage();
  await loading.waitForFunction(() => document.querySelector('.project-media').dataset.imageState === 'ready');
  const after = await frame.boundingBox();
  assert.equal(before.width, after.width); assert.equal(before.height, after.height);
  assert.equal(await frame.locator('.project-skeleton').evaluate(el => getComputedStyle(el).visibility), 'hidden');
  await loading.reload({ waitUntil: 'domcontentloaded' });
  await loading.waitForFunction(() => document.querySelector('.project-media').dataset.imageState === 'ready');
  await loading.close();

  const failed = await browser.newPage();
  await failed.route('**/assets/images/projects/project-01/cover.svg', route => route.fulfill({ status: 404, body: '' }));
  await failed.goto(catalog, { waitUntil: 'domcontentloaded' });
  await failed.waitForFunction(() => document.querySelector('.project-media').dataset.imageState === 'error');
  assert.equal(await failed.locator('.project-image-error').first().isVisible(), true);
  assert.equal(await failed.locator('.project-media').first().getAttribute('aria-busy'), 'false');
  assert.equal(await failed.locator('.project-card').count(), 4);
  await failed.close();

  const noJS = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  await noJS.goto(catalog, { waitUntil: 'load' });
  assert.equal(await noJS.locator('.project-card').count(), 4);
  assert.equal(await noJS.locator('.project-media img').first().evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await noJS.locator('.project-skeleton').first().evaluate(el => getComputedStyle(el).visibility), 'hidden');
  await noJS.locator('.project-card').first().click();
  await noJS.waitForURL(/project-01\/$/);
  assert.equal(await noJS.locator('.project-gallery img').count(), 4);
  await noJS.close();
  const extras = Array.from({ length: 5 }, (_, i) => `assets/images/projects/project-01/related/__qa-extra-${i}.svg`);
  try {
    const mock = await readFile('assets/images/projects/project-01/related/anh-01.svg');
    for (const file of extras) await writeFile(file, mock, { flag: 'wx' });
    execFileSync('python', ['scripts/assets/sync_project_images.py']);
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`${origin}/Project/project-01/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('.project-gallery img').count(), 9, 'All folder images render beyond the previous four-image limit');
      assert.equal(await page.locator('.project-gallery-heading .project-note').innerText(), '9 ảnh');
      const gallery = page.locator('.project-gallery');
      assert.equal(await gallery.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), width < 768 ? 2 : 4);
      await gallery.scrollIntoViewIfNeeded();
      await capture(gallery, { path: `hero-animation/project-related-unlimited-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.close();
    }
  } finally {
    for (const file of extras) await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    execFileSync('python', ['scripts/assets/sync_project_images.py']);
  }
  console.log('PASS: four linked cards, responsive list and all detail routes, hover/keyboard, hero/description/gallery, actual loading skeleton/cache/error states, offscreen/reduced motion, no-JS content, no missing assets.');
} finally { await browser.close(); }
