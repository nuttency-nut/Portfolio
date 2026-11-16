import assert from 'node:assert/strict';
import { chromium, browserExecutable } from '../helpers/browser.mjs';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  for (const [width, milestone] of [[1440, 4], [1440, 5], [390, 4], [390, 5]]) {
    const mobile = width < 768;
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile });
    const errors = [], missing = [], videoRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin) && response.status() >= 400) missing.push(response.url());
    });
    page.on('request', request => { if (request.url().endsWith('.mp4')) videoRequests.push(request.url()); });
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const album = page.locator('.scroll-story-photo').nth(milestone - 1);
    const video = album.locator('video');
    const mediaHandle = await video.elementHandle();
    assert.equal(await album.locator('button').evaluate(button => button.firstElementChild.tagName), 'VIDEO', 'Video is the front item');
    assert.equal(await album.locator('img').count(), 3);
    assert.equal(await album.locator('img, video').count(), 4);
    assert.equal(videoRequests.length, 0, 'The collapsed album must not download the clip');
    await album.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await album.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    if (!mobile) await album.locator('button').hover();
    await page.waitForFunction(video => !video.paused && video.currentTime > .05 && video.videoWidth > 0, mediaHandle);
    assert.ok(await video.evaluate(element => element.muted && element.loop && element.playsInline && !element.error));
    assert.equal(await video.evaluate(element => getComputedStyle(element).objectFit), 'cover');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await video.evaluate(element => element.paused), true, 'Hidden tabs pause playback');
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(video => !video.paused, mediaHandle);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(video => video.paused, mediaHandle);
    assert.equal(await video.evaluate(element => element.paused), true, 'Reduced motion keeps the poster');
    await page.keyboard.press('Escape');
    await album.locator('button').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(video => !video.paused, mediaHandle);
    await page.keyboard.press('Escape');
    assert.equal(await video.evaluate(element => element.paused), true, 'Closing the album pauses the clip');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (mobile) {
      await page.locator('.scroll-story-photo').first().evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await album.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    } else {
      await page.mouse.move(0, 0);
      await album.locator('button').hover();
    }
    await page.waitForFunction(video => !video.paused, mediaHandle);
    await page.locator('#contact').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(video => video.paused, mediaHandle);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    const response = await page.request.get(new URL(await video.getAttribute('src'), origin + '/').href, { headers: { Range: 'bytes=0-1023' } });
    assert.equal(response.status(), 206);
    assert.equal(response.headers()['content-type'], 'video/mp4');
    assert.equal((await response.body()).length, 1024);
    console.log(`PASS ${width}px milestone ${milestone}: mixed album, decoded media, muted loop, visibility, reduced motion, keyboard, offscreen pause and MP4 range requests`);
    await page.close();
  }
} finally { await browser.close(); }
