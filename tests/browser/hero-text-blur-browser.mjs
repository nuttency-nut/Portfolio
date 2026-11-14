import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/hero-text-blur-browser.mjs
import assert from 'node:assert/strict';
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.goto(origin + '/');
    await page.waitForSelector('.hero-title.is-ready');
    await page.waitForFunction(() => document.querySelector('.lanyard-canvas')?.style.visibility === 'visible');
    await page.waitForFunction(() => document.querySelector('.hero-description').style.getPropertyValue('--hero-text-mask').startsWith('url'));
    const state = await page.locator('.hero-description').evaluate(async el => {
      const image = new Image();
      image.src = el.style.getPropertyValue('--hero-text-mask').slice(5, -2);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, image.width, image.height).data;
      let coverage = 0;
      for (let i = 3; i < data.length; i += 4) coverage += data[i] / 255;
      const bounds = el.getBoundingClientRect(), ratio = image.width / (bounds.width + 16);
      const node = el.querySelector('.hero-description-source').firstChild;
      const range = document.createRange(), lines = [];
      for (const part of new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(node.textContent)) {
        if (/^\s+$/.test(part.segment)) continue;
        range.setStart(node, part.index); range.setEnd(node, part.index + part.segment.length);
        const rect = range.getBoundingClientRect();
        if (lines.some(line => Math.abs(line.top - rect.top) < 1)) continue;
        const x = Math.floor((rect.left - bounds.left + 8 + rect.width / 2) * ratio);
        const y = Math.floor((rect.top - bounds.top + 8 + rect.height / 2) * ratio);
        lines.push({ top: rect.top, alpha: data[(y * image.width + x) * 4 + 3] });
      }
      return { coverage: coverage / (data.length / 4), corner: data[3], lines,
        blur: getComputedStyle(el, '::before').backdropFilter, bottom: bounds.bottom };
    });
    assert.equal(state.blur, 'blur(12px)');
    assert.ok(state.coverage > .1 && state.coverage < .7, 'The mask follows lettering rather than filling a rectangular panel');
    assert.equal(state.corner, 0);
    assert.ok(state.lines.every(line => line.alpha > 100), 'Every wrapped line must align with its blur mask');
    assert.ok(state.bottom <= viewport.height - 12);
    await capture(page, { path: `hero-animation/glyph-blur-${viewport.width}.png`, fullPage: true });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(origin + '/');
  await page.waitForFunction(() => document.querySelector('.hero-description-typed').textContent.length > 3);
  const mask = await page.locator('.hero-description').evaluate(el => el.style.getPropertyValue('--hero-text-mask'));
  await page.waitForFunction(previous => document.querySelector('.hero-description-typed').textContent.length > 20
    && document.querySelector('.hero-description').style.getPropertyValue('--hero-text-mask') !== previous, mask);
  await page.waitForFunction(() => !document.querySelector('.hero-description').classList.contains('is-typing'));
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.hero-description-typed').textContent.length > 3
    && document.querySelector('.hero-description').style.getPropertyValue('--hero-text-mask').startsWith('url'));
  await page.close();
  console.log('PASS: real background blur, glyph mask alignment on wrapped lines, transparent empty space, typing updates, mobile fit.');
} finally { await browser.close(); }
