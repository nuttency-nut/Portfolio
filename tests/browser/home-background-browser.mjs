import assert from 'node:assert/strict';
import { chromium, browserExecutable } from '../helpers/browser.mjs';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  for (const [width, height] of [[320, 568], [390, 844], [430, 932], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    for (const state of ['initial', 'expanded-viewport', 'long-content']) {
      await page.evaluate(state => {
        const hero = document.querySelector('.hero-intro');
        // Emulate the extra viewport height exposed when mobile browser chrome collapses.
        hero.style.minHeight = state === 'expanded-viewport' ? 'calc(100svh + 60px)' : '';
        hero.querySelector('.hero-copy').style.paddingBottom = state === 'long-content' ? '240px' : '';
      }, state);
      const bounds = await page.evaluate(() => {
        const box = selector => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { top: rect.top + scrollY, bottom: rect.bottom + scrollY, width: rect.width };
        };
        return {
          hero: box('.hero-intro'), background: box('.portfolio-background'),
          continuation: box('.home-background-continuation'), heading: box('.work-timeline-heading'),
          viewport: innerHeight, scrollWidth: document.documentElement.scrollWidth,
        };
      });
      assert.ok(Math.abs(bounds.background.top - bounds.hero.top) < 1, 'Background starts with the hero');
      assert.ok(Math.abs(bounds.background.bottom - bounds.hero.bottom) < 1,
        `${width}px ${state}: hero background must cover its complete height without a white strip`);
      assert.ok(Math.abs(bounds.hero.bottom - bounds.continuation.top) < 1, 'The next background begins exactly at the hero boundary');
      assert.ok(bounds.heading.top >= bounds.viewport, 'Section two stays outside the initial viewport');
      assert.equal(bounds.scrollWidth, width);
      console.log(`PASS ${width}x${height} ${state}: continuous background, isolated first screen, no overflow`);
    }
    await page.close();
  }
} finally { await browser.close(); }
