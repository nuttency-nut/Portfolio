import assert from 'node:assert/strict';
import { chromium, browserExecutable } from '../helpers/browser.mjs';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
try {
  for (const width of [1440, 390]) {
    for (const path of ['/', '/about/', '/Project/project-01/']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const errors = [], posts = [];
      page.on('pageerror', error => errors.push(error.message));
      let mode = 'pending', release;
      const held = new Promise(resolve => { release = resolve; });
      await page.route('**/api/contact', async route => {
        posts.push(route.request().postDataJSON());
        if (mode === 'pending') { await held; return route.fulfill({ status: 503, json: { ok: false, message: 'Vui lòng thử lại sau.' } }); }
        if (mode === 'network') return route.abort('failed');
        return route.fulfill({ status: 200, json: { ok: true } });
      });
      await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#contact-dialog', { state: 'attached' });
      const hasInline = await page.locator('#contact .contact-form').count();
      if (!hasInline) await page.locator('.nav-links [data-contact-dialog]').evaluate(link => link.click());
      const form = page.locator(hasInline ? '#contact .contact-form' : '#contact-dialog .contact-form');
      const button = form.locator('.contact-submit'), status = form.locator('.contact-status');
      await button.click();
      assert.equal(posts.length, 0, 'Empty required fields never submit');
      await form.locator('[name=name]').fill('Test form portfolio');
      await form.locator('[name=email]').fill('test@example.test');
      await form.locator('[name=message]').fill('Nội dung tiếng Việt <3 🥰');
      await button.click();
      await page.waitForFunction(() => document.querySelector('.contact-form[aria-busy=true]'));
      assert.equal(await button.isDisabled(), true);
      await form.evaluate(element => element.requestSubmit());
      assert.equal(posts.length, 1, 'Pending submission cannot be duplicated');
      assert.equal(posts[0].company_website, '');
      release();
      await page.waitForFunction(() => !document.querySelector('.contact-form[aria-busy=true]'));
      assert.equal(await status.getAttribute('role'), 'alert');
      assert.match(await status.textContent(), /thử lại/);
      assert.equal(await form.locator('[name=name]').inputValue(), 'Test form portfolio');
      mode = 'network';
      await button.click();
      await page.waitForFunction(() => !document.querySelector('.contact-form[aria-busy=true]'));
      assert.match(await status.textContent(), /kết nối/);
      assert.equal(await form.locator('[name=message]').inputValue(), 'Nội dung tiếng Việt <3 🥰');
      mode = 'ok';
      await button.click();
      await page.waitForFunction(() => !document.querySelector('.contact-form[aria-busy=true]'));
      assert.match(await status.textContent(), /đã được gửi đến Duy/);
      assert.equal(await form.locator('[name=name]').inputValue(), '');
      assert.equal(await button.isEnabled(), true);
      if (hasInline) {
        await page.locator('.nav-links [data-contact-dialog]').evaluate(link => link.click());
        const popup = page.locator('#contact-dialog .contact-form');
        await popup.locator('[name=name]').fill('Popup test');
        await popup.locator('[name=email]').fill('popup@example.test');
        await popup.locator('.contact-submit').click();
        await page.waitForFunction(() => document.querySelector('#contact-dialog .contact-status').textContent.includes('đã được gửi'));
      }
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      console.log(`PASS: ${path} ${width}px, inline/popup validation, pending guard, failure retention and confirmed success; API intercepted, no real messages.`);
      await page.close();
    }
  }
  const noJs = await browser.newPage({ javaScriptEnabled: false });
  await noJs.goto(origin + '/about/');
  assert.ok(await noJs.locator('#contact .contact-submit').isDisabled());
  await noJs.close();
} finally {
  await browser.close();
}
