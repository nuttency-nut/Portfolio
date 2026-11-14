import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/topbar-music-browser.mjs
import assert from 'node:assert/strict';

const executablePath = browserExecutable;
const browser = await chromium.launch({ executablePath, headless: true, args: ['--autoplay-policy=document-user-activation-required'] });
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
// A silent local WAV exercises the real media element without needing the user's song.
const wav = Buffer.alloc(44 + 16000 * 2 * 3);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const probeGain = (page, ignoreVolume = false) => page.addInitScript(ignore => {
  const create = AudioContext.prototype.createGain;
  AudioContext.prototype.createGain = function (...args) {
    const gain = create.apply(this, args);
    window.__musicGain = gain;
    return gain;
  };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    window.__firstGainOnPlay ??= window.__musicGain?.gain.value;
    return play.apply(this, args);
  };
  if (ignore) Object.defineProperty(HTMLMediaElement.prototype, 'volume', { configurable: true, get: () => 1, set: () => {} });
}, ignoreVolume);
try {
  for (const width of [320, 390, 430, 768, 1024, 1440]) {
    console.log(`Checking music controls at ${width}px`);
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await probeGain(page, width === 390);
    let audioRequests = 0;
    await page.route('**/audio/background/*.mp3', route => { audioRequests++; return route.fulfill({ contentType: 'audio/wav', body: wav }); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.__firstGainOnPlay !== undefined);
    const player = page.locator('.topbar-music'), button = player.locator('button');
    assert.equal(await player.locator('audio').evaluate(el => el.paused), true);
    assert.equal(await button.getAttribute('aria-pressed'), 'false', 'A blocked autoplay is not shown as playing');
    assert.ok(Math.abs(await page.evaluate(() => window.__firstGainOnPlay) - .4) < .0001, 'The 40% gain is applied before the first play attempt');
    assert.equal(await page.locator('.topbar .logo').count(), 0);
    assert.equal(await page.locator('.topbar .socials a').count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    const control = await button.boundingBox(), linked = await page.locator('.topbar .socials a').first().boundingBox();
    assert.ok(control.width >= 44 && control.height >= 44 && control.x + control.width < linked.x);
    const metadata = await player.locator('.music-title-window').boundingBox();
    assert.ok(metadata.width >= 40 && metadata.x >= 0 && metadata.x + metadata.width <= width, 'Song metadata stays readable and inside the bar');
    assert.equal(await player.getAttribute('data-overflow'), 'true', 'The selected song title scrolls on desktop and mobile');
    if (width >= 768) {
      const nav = await page.locator('.nav-links').boundingBox();
      const bar = await page.locator('.topbar').boundingBox();
      assert.ok(Math.abs(nav.x - bar.x - 24) < 1, 'Navigation starts at the left content inset');
      assert.ok(nav.x + nav.width < control.x);
    } else {
      await page.locator('#menuBtn').click();
      assert.equal(await page.locator('#mobileMenu').isVisible(), true);
      await page.waitForFunction(() => document.querySelector('.topbar-music').dataset.playing === 'true');
      assert.ok(await player.locator('audio').evaluate(el => !el.paused), 'First touch/click unlocks blocked autoplay');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobileMenu').isVisible(), false);
      await button.click();
    }
    await button.click();
    await page.waitForFunction(() => document.querySelector('.music-audio').currentTime > .05);
    await page.waitForFunction(() => document.querySelector('.topbar-music').dataset.playing === 'true');
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await button.getAttribute('aria-busy'), null);
    assert.ok(audioRequests > 0);
    assert.ok(Math.abs(await page.evaluate(() => window.__musicGain.gain.value) - .4) < .0001);
    assert.equal(await page.evaluate(() => window.__musicGain.context.state), 'running');
    await button.click();
    assert.equal(await player.locator('audio').evaluate(el => el.paused), true);
    await page.waitForFunction(() => document.querySelector('.topbar-music').dataset.playing === 'false');
    assert.equal(await button.getAttribute('aria-pressed'), 'false');
    if (width >= 768) await page.locator('.nav-links a').first().click();
    else { await page.locator('#menuBtn').click(); await page.keyboard.press('Escape'); }
    assert.equal(await player.locator('audio').evaluate(el => el.paused), true, 'Later clicks do not override a manual pause');
    if ([320, 390, 1440].includes(width)) await capture(page, { path: `hero-animation/topbar-music-${width}.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await player.locator('.music-title-track').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.route('**/missing-song.mp3', route => route.fulfill({ status: 404, body: '' }));
    await player.locator('audio').evaluate(el => { el.src = '/missing-song.mp3'; });
    await button.click();
    await page.waitForFunction(() => Boolean(document.querySelector('.music-audio').error));
    assert.equal(await button.getAttribute('aria-pressed'), 'false');
    assert.equal(await player.locator('.music-status').isVisible(), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
} finally { await browser.close(); }

const allowed = await chromium.launch({ executablePath, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await allowed.newPage();
  await probeGain(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.music-audio').currentTime > .1 && document.querySelector('.topbar-music').dataset.playing === 'true');
  assert.ok(Math.abs(await page.evaluate(() => window.__firstGainOnPlay) - .4) < .0001);
  assert.equal(await page.evaluate(() => window.__musicGain.context.state), 'running');
  assert.equal(await page.locator('.music-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('.music-toggle').click();
  assert.equal(await page.locator('.music-audio').evaluate(el => el.paused), true);
  console.log('PASS: real MP3 autoplay when allowed, blocked autoplay unlocks on first click/touch, 40% gain before playback (including ignored element volume), manual pause remains paused, responsive layout and error states.');
} finally { await allowed.close(); }
