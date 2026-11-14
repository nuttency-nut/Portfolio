import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/project-navigation-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
try {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [], missingAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && response.url().startsWith(origin) && /\.(css|js|svg|mp3)(\?|$)/.test(response.url())) missingAssets.push(response.url());
    });
    const clickNav = async name => {
      if (width < 768) await page.locator('#menuBtn').click();
      await page.locator(width < 768 ? '#mobileMenu' : '.nav-links').getByRole('link', { name, exact: true }).click();
    };
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.topbar-wrap a[data-scroll-target="work"]').count(), 0);
    assert.equal(await page.locator('.topbar-wrap a[href="/Project"]').count(), 2);
    assert.equal(await page.locator('.topbar-wrap a[href="/about"]').count(), 2);
    await page.evaluate(() => { document.documentElement.dataset.homeDocument = 'true'; });
    await clickNav('Project');
    await page.waitForURL(/\/Project\/?$/);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('#project-title').innerText(), 'Project');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.homeDocument), undefined, 'Project opens a separate document');
    assert.equal(await page.locator('.hero-intro').count(), 0);
    assert.deepEqual(await page.locator('.topbar-wrap a[aria-current="page"]').allTextContents(), ['Project', 'Project']);
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(await page.locator('.site-footer').count(), 1);
    assert.equal(await page.locator('.music-audio').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    const title = await page.locator('#project-title').boundingBox(), bar = await page.locator('.topbar').boundingBox();
    assert.ok(title.y > bar.y + bar.height, 'The page title clears the fixed topbar');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#project-title').isVisible(), true, 'Direct loads and refresh work');
    await clickNav('About');
    await page.waitForURL(/\/about\/?$/);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('#about-title').isVisible(), true);
    assert.deepEqual(await page.locator('.topbar-wrap a[aria-current="page"]').allTextContents(), ['About', 'About']);
    assert.equal(await page.locator('.project-grid').count(), 0);
    assert.equal(await page.locator('.site-footer').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    const aboutTitle = await page.locator('#about-title').boundingBox(), aboutBar = await page.locator('.topbar').boundingBox();
    assert.ok(aboutTitle.y > aboutBar.y + aboutBar.height);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#about-title').isVisible(), true, 'About direct loads and refresh work');
    if ([1440, 390].includes(width)) {
      await page.evaluate(() => document.fonts.ready);
      await capture(page, { path: `hero-animation/about-${width}.png` });
    }
    await clickNav('Project');
    await page.waitForURL(/\/Project\/?$/);
    if ([1440, 390].includes(width)) {
      await page.evaluate(() => document.fonts.ready);
      await capture(page, { path: `hero-animation/project-${width}.png` });
      await clickNav('Contact');
      await page.waitForFunction(() => document.querySelector('#contact-dialog').open);
      assert.match(new URL(page.url()).pathname, /\/Project\/?$/);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#contact-dialog').open);
      assert.equal(new URL(page.url()).hash, '');
      assert.equal(await page.evaluate(() => sessionStorage.getItem('portfolio-scroll-target')), null);
      await clickNav('Home');
      await page.waitForURL(`${origin}/`);
      await page.waitForLoadState('load');
      assert.ok(await page.evaluate(() => scrollY) < 10);
      assert.deepEqual(await page.locator('.topbar-wrap a[aria-current="page"]').allTextContents(), ['Home', 'Home']);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(missingAssets, []);
    await page.close();
  }
  console.log('PASS: Home/Project/About routes, refresh/direct loads, active navigation, responsive menu, Contact popup, shared assets, no overflow or missing assets.');
} finally { await browser.close(); }
