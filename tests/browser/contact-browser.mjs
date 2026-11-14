import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/contact-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const width of [1440, 1024, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: width >= 768 ? 1100 : 900 }, reducedMotion: 'reduce' });
    const errors = [], submissions = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const target = new URL(request.url());
      if (target.origin === new URL(url).origin && (request.method() === 'POST' || target.searchParams.has('email'))) submissions.push(request.url());
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('#contact');
    const sectionBounds = await section.boundingBox();
    const storyBounds = await page.locator('.scroll-story-container').boundingBox();
    assert.ok(sectionBounds.y >= storyBounds.y + storyBounds.height, 'The contact template follows the story section');
    const hero = await page.locator('.hero-intro').boundingBox();
    assert.ok(Math.abs(sectionBounds.x - hero.x) < 1 && Math.abs(sectionBounds.width - hero.width) < 1);
    const inner = await page.locator('.contact-inner').boundingBox();
    assert.ok(Math.abs(inner.width - hero.width) < 1 && Math.abs(inner.x - hero.x) < 1, 'Image and form fill the same content width as the upper sections');
    const image = page.locator('.contact-photo img');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(el => el.decode());
    const imageBox = await image.boundingBox(), titleBox = await section.locator('.contact-title').boundingBox();
    assert.ok(Math.abs(imageBox.width / imageBox.height - 3 / 4) < .01);
    assert.ok(imageBox.x + imageBox.width < titleBox.x, 'The 3:4 image sits to the left of the title/form composition');
    for (const control of await section.locator('.contact-field input, .contact-field select, .contact-submit').all()) assert.ok((await control.boundingBox()).height >= 44);
    const name = section.getByLabel('Name', { exact: true }), email = section.getByLabel('Email', { exact: true });
    const nameBox = await name.boundingBox(), emailBox = await email.boundingBox();
    if (width > 600) assert.ok(Math.abs(nameBox.y - emailBox.y) < 1 && emailBox.x > nameBox.x);
    else assert.ok(emailBox.y > nameBox.y + nameBox.height);
    assert.equal(await section.getByLabel('How can i help you?', { exact: true }).locator('option').count(), 5);
    assert.equal(await page.getByRole('button', { name: 'Submit', exact: true }).isEnabled(), true);
    await section.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 140, behavior: 'instant' }));
    await name.focus();
    assert.equal(await name.evaluate(el => getComputedStyle(el).outlineWidth), '2px');
    const statusBefore = await section.locator('.contact-status').textContent();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    assert.equal(await name.evaluate(el => el.validity.valueMissing), true);
    assert.equal(await section.locator('.contact-status').textContent(), statusBefore);
    await name.fill('Portfolio preview');
    await email.fill('invalid-email');
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    assert.equal(await email.evaluate(el => el.validity.typeMismatch), true);
    await email.fill('preview@example.test');
    await section.getByLabel('Message', { exact: true }).fill('Bản xem trước của form liên hệ.');
    const before = page.url();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    assert.match(await section.locator('.contact-status').textContent(), /chưa được gửi/);
    assert.equal(page.url(), before, 'Preview submission must not navigate or add a hash');
    assert.equal(await name.inputValue(), 'Portfolio preview');
    assert.deepEqual(submissions, [], 'The preview must not transmit form data');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    if (width < 768) await page.locator('#menuBtn').click();
    const nav = width < 768 ? '#mobileMenu' : '.nav-links';
    await page.locator(`${nav} a[data-contact-dialog]`).click();
    await page.waitForFunction(() => document.querySelector('#contact-dialog').open);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#contact-dialog').open);
    assert.equal(new URL(page.url()).hash, '');
    if (width < 768) assert.equal(await page.locator('#menuBtn').getAttribute('aria-expanded'), 'false');
    if ([1440, 390].includes(width)) await capture(page, { path: `hero-animation/contact-${width}.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.getByRole('button', { name: 'Submit', exact: true }).isDisabled(), true);
  await page.close();
  console.log('PASS: light contact template, desktop/mobile layout, validation and focus, honest preview without transmission, root-URL navigation, no-JS safety.');
} finally {
  await browser.close();
}
