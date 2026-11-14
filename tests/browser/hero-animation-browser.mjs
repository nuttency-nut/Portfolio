import { chromium, browserExecutable, capture, artifactDirectory } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/hero-animation-browser.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';


const browser = await chromium.launch({
  executablePath: browserExecutable,
  headless: true,
});
const out = pathToFileURL(artifactDirectory('hero-animation') + '/');
await mkdir(out, { recursive: true });
const report = [];

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1518, height: 826 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 430, height: 932 }, { width: 768, height: 1024 }]) {
    const page = await browser.newPage({ viewport });
    let releaseFonts;
    if (viewport.width === 1440) {
      const fontGate = new Promise(resolve => { releaseFonts = resolve; });
      await page.route('**/fonts.gstatic.com/**', async route => {
        await fontGate;
        await route.continue();
      });
    }
    await page.goto(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    if (releaseFonts) {
      assert.equal(await page.locator('.hero-title').evaluate(el => el.classList.contains('is-ready')), false,
        'The animation must wait while the browser is still loading fonts');
      releaseFonts();
    }
    await page.waitForSelector('.hero-title.is-ready');
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.getAnimations().forEach(animation => animation.pause());
    });

    for (const time of viewport.width > 767 ? [650, 900, 1100, 1300, 1800] : [1800]) {
      const state = await page.evaluate(time => {
        for (const animation of document.getAnimations()) {
          if (animation.effect?.target?.closest('.hero-title')) animation.currentTime = time;
        }
        const bounds = selector => {
          const element = document.querySelector(selector);
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            x: +rect.x.toFixed(1), y: +rect.y.toFixed(1),
            width: +rect.width.toFixed(1), height: +rect.height.toFixed(1),
            right: +rect.right.toFixed(1), translate: style.translate,
            transform: style.transform, fontStyle: style.fontStyle,
            opacity: +style.opacity, clipPath: style.clipPath,
          };
        };
        const letterLeft = (selector, index) => {
          const range = document.createRange();
          range.setStart(document.querySelector(selector).firstChild, index);
          range.setEnd(document.querySelector(selector).firstChild, index + 1);
          return range.getBoundingClientRect().left;
        };
        return {
          name: bounds('.hero-name > span'),
          firstName: bounds('.hero-first-name'),
          lastName: bounds('.hero-name:nth-of-type(2) > span'),
          roles: bounds('.hero-roles'),
          business: bounds('.hero-role--business > span'),
          commerce: bounds('.hero-role--commerce > span'),
          businessI: letterLeft('.hero-role--business > span', 1),
          commerceE: letterLeft('.hero-role--commerce > span', 0),
        };
      }, time);
      report.push({ viewport, time, ...state });
      const center = rect => rect.x + rect.width / 2;
      if (time === 650) assert.equal(state.business.opacity, 0);
      if (time === 900 || time === 1100) {
        assert.ok(Math.abs(center(state.business) - center(state.firstName)) < 1, 'Business rises from the first-name center');
        assert.ok(Math.abs(center(state.commerce) - center(state.firstName)) < 1, 'Commerce rises from the same center');
        assert.equal(state.business.transform, state.commerce.transform, 'Both role lines must rise together');
      }
      if (time === 1300) {
        assert.ok(center(state.business) < center(state.firstName));
        assert.ok(center(state.commerce) < center(state.firstName));
      }
      if (time === 1800) {
        assert.ok(Math.abs(state.business.x - state.name.x) < 1, 'Business stops at the name left edge');
        assert.ok(Math.abs(state.roles.width - state.firstName.width) < 1, 'Role width matches NGUYEN');
        assert.ok(Math.abs(state.commerceE - state.businessI) < 1, 'E stops directly below the i in Kinh');
        assert.equal(state.commerce.fontStyle, 'italic');
        assert.equal(state.name.clipPath, 'none', 'The glyph itself must not have an animated crop');
        assert.ok(state.name.right <= viewport.width, 'The name must remain inside the viewport');
        if (viewport.width <= 1023 && viewport.height > viewport.width) {
          assert.ok(state.commerce.y + state.commerce.height <= viewport.height - 16,
            'Both role lines must fit in the first mobile viewport with bottom clearance');
          assert.ok(state.name.y > viewport.height * (viewport.height <= 740 ? .52 : .60), 'The name must stay below the hanging card');
        }
      }
      const path = new URL(`${viewport.width}-${time}.png`, out);
      await capture(page, { path: path.pathname.slice(1), animations: 'allow' });
    }
    await page.close();
  }
  await writeFile(new URL('report.json', out), JSON.stringify(report, null, 2));
  console.log(`PASS: delayed-font startup, synchronized reveal, E aligned below i, italic finish, ${report.length} real-browser captures.`);
} finally {
  await browser.close();
}
