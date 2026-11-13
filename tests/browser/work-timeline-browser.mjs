import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';
// Usage: PLAYWRIGHT_MODULE=<absolute path to playwright/index.mjs> node tests/browser/work-timeline-browser.mjs
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: browserExecutable, headless: true,
});
const url = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/';
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', hasTouch: viewport.width < 768, isMobile: viewport.width < 768 });
    await page.goto(url);
    await page.waitForSelector('.work-timeline-mark');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#work').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.work-timeline-item').count(), 5);
    assert.equal(await page.locator('.work-timeline-mark').count(), 5);
    const groups = page.locator('.work-timeline-photos');
    assert.equal(await groups.count(), 5);
    await page.waitForSelector('.work-timeline-photos.is-reached');
    for (const group of await groups.all()) assert.ok(await group.locator('.work-timeline-photo').count() <= 3);
    assert.equal(await groups.nth(1).evaluate(el => el.inert), true, 'Unreached photo controls must stay inaccessible');
    const fan = await groups.first().evaluate(group => [...group.querySelectorAll('button')].map(button => {
      const rect = button.getBoundingClientRect(), style = getComputedStyle(button);
      return { left: rect.left, right: rect.right, top: rect.top, width: style.width, height: style.height };
    }));
    assert.ok(fan.every(photo => photo.width === photo.height), 'Photo frames must be square');
    assert.ok(fan[0].right > fan[1].left && fan[1].right > fan[2].left, 'The photos overlap like a fan');
    assert.ok(fan[1].top < fan[0].top && fan[1].top < fan[2].top, 'The middle photo sits higher');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    await page.waitForFunction(() => document.querySelector('.work-timeline-avatar').naturalWidth > 0);
    await capture(page, { path: `hero-animation/timeline-${viewport.width}.png` });
    const firstPhoto = groups.nth(0).locator('button').first();
    const preview = page.locator('.work-timeline-photo-preview');
    if (viewport.width >= 768) await firstPhoto.hover();
    else await firstPhoto.tap();
    assert.equal(await preview.isVisible(), true);
    const zoom = await preview.boundingBox();
    const thumb = await firstPhoto.boundingBox();
    assert.ok(zoom.width > thumb.width * 3);
    const previewImage = await preview.locator('img').boundingBox();
    assert.ok(Math.abs(previewImage.width - previewImage.height) < 1, 'The enlarged frame is also square');
    assert.ok(zoom.x >= 0 && zoom.x + zoom.width <= viewport.width && zoom.y >= 0 && zoom.y + zoom.height <= viewport.height);
    await capture(page, { path: `hero-animation/timeline-photo-zoom-${viewport.width}.png` });
    if (viewport.width >= 768) await page.mouse.move(1439, 899);
    else await page.locator('.work-timeline-photo-close').tap();
    assert.equal(await preview.isVisible(), false);
    await page.locator('.work-timeline-mark').nth(4).click();
    await page.waitForSelector('.work-timeline-runner.arrived');
    assert.equal(await page.locator('.work-timeline-item.active').count(), 5);
    assert.equal(await page.locator('.work-timeline-photos.is-reached').count(), 5);
    const placement = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('.work-timeline-photos')];
      const marks = [...document.querySelectorAll('.work-timeline-mark')];
      const last = groups.at(-1).getBoundingClientRect(), dot = marks.at(-1).getBoundingClientRect();
      return { lastLeft: last.left, dotCenter: dot.left + dot.width / 2,
        lastY: last.top + last.height / 2, dotY: dot.top + dot.height / 2,
        above: groups.slice(0, -1).every((group, i) => group.getBoundingClientRect().bottom < marks[i].getBoundingClientRect().top) };
    });
    if (viewport.width >= 768) {
      assert.ok(placement.above, 'Earlier photos appear above their milestones');
      assert.ok(placement.lastLeft > placement.dotCenter && Math.abs(placement.lastY - placement.dotY) < 1, 'Final photos appear beside the last milestone');
    } else assert.equal(await groups.evaluateAll(elements => elements.every(el => el.parentElement.classList.contains('work-timeline-item'))), true);
    await groups.nth(4).locator('button').last().scrollIntoViewIfNeeded();
    await page.mouse.move(-10, -10);
    await page.keyboard.press('Escape');
    await capture(page, { path: `hero-animation/timeline-photos-final-${viewport.width}.png` });
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.work-timeline-mark').nth(4).getAttribute('aria-current'), 'step');
    if (viewport.width < 768) assert.equal(await page.locator('.work-timeline').evaluate(el => el.scrollLeft), 0);
    await page.locator('.work-timeline-mark').nth(0).click();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.work-timeline-mark').nth(1).getAttribute('aria-current'), 'step');
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url);
  await page.waitForSelector('.work-timeline-mark');
  const current = () => page.locator('.work-timeline-mark[aria-current="step"]').getAttribute('aria-label');
  const first = await current();
  await page.waitForTimeout(1200);
  assert.equal(await current(), first, 'Do not run through the milestones while the visitor is reading the hero');
  await page.evaluate(() => {
    window.timelineEvents = [];
    const marks = [...document.querySelectorAll('.work-timeline-mark')];
    new MutationObserver(() => {
      window.timelineEvents.push({ index: marks.findIndex(mark => mark.getAttribute('aria-current') === 'step'), time: performance.now() });
    }).observe(document.querySelector('.work-timeline-track'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
  });
  await page.mouse.move(1439, 899);
  await page.locator('#work').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForFunction(() => {
    const track = document.querySelector('.work-timeline-track');
    return parseFloat(track.style.getPropertyValue('--timeline-x')) > parseFloat(track.style.getPropertyValue('--timeline-start'));
  });
  await page.waitForTimeout(450);
  const inTransit = await page.evaluate(() => {
    const marks = [...document.querySelectorAll('.work-timeline-mark')];
    const center = el => { const rect = el.getBoundingClientRect(); return rect.left + rect.width / 2; };
    return { avatar: center(document.querySelector('.work-timeline-runner')), start: center(marks[0]), end: center(marks[1]),
      nextDone: marks[1].classList.contains('done'), nextActive: document.querySelectorAll('.work-timeline-item')[1].classList.contains('active'),
      nextPhotos: document.querySelectorAll('.work-timeline-photos')[1].classList.contains('is-reached') };
  });
  assert.ok(inTransit.avatar > inTransit.start + 10 && inTransit.avatar < inTransit.end - 10, 'Check while the avatar is actually between milestones');
  assert.equal(inTransit.nextDone, false, 'The destination dot must not light up before arrival');
  assert.equal(inTransit.nextActive, false, 'The destination text must not light up before arrival');
  assert.equal(inTransit.nextPhotos, false, 'Photos must wait for actual arrival');
  const pop = await page.locator('.work-timeline-photos').first().evaluate(group => {
    const photos = [...group.querySelectorAll('button')];
    const animations = photos.map(photo => photo.getAnimations().find(animation => animation.animationName === 'work-timeline-photo-pop'));
    for (const animation of animations) { animation.pause(); animation.currentTime = 0; }
    const start = { opacity: +getComputedStyle(photos[0]).opacity, top: photos[0].getBoundingClientRect().top };
    for (const animation of animations) animation.currentTime = 300;
    const middleOpacity = +getComputedStyle(photos[0]).opacity;
    for (const animation of animations) animation.currentTime = 1200;
    return { start, middleOpacity, endOpacity: +getComputedStyle(photos[0]).opacity,
      endTop: photos[0].getBoundingClientRect().top, delays: photos.map(photo => getComputedStyle(photo).animationDelay) };
  });
  assert.equal(pop.start.opacity, 0);
  assert.ok(pop.middleOpacity > 0 && pop.start.top > pop.endTop + 20, 'The photos rise smoothly from below');
  assert.equal(pop.endOpacity, 1);
  assert.deepEqual(pop.delays, ['0s', '0.08s', '0.16s'], 'Each photo pops in with a short stagger');
  await page.waitForFunction(() => window.timelineEvents.length >= 4);
  const trace = await page.evaluate(() => window.timelineEvents.slice(0, 4));
  assert.deepEqual(trace.map(event => event.index), [1, 2, 3, 4], 'The avatar travels forward to the final milestone');
  for (let i = 1; i < trace.length; i++) {
    const gap = trace[i].time - trace[i - 1].time;
    assert.ok(gap >= 900 && gap < 1250, `Each leg should take 1000ms without a hold, observed ${gap}ms`);
  }
  assert.equal(await page.locator('.work-timeline-section').evaluate(el => getComputedStyle(el).getPropertyValue('--timeline-move')), '1000ms');
  assert.equal(await page.locator('.work-timeline-runner').evaluate(el => getComputedStyle(el).transitionTimingFunction), 'linear');
  assert.equal(await page.locator('.work-timeline-heading').evaluate(el => getComputedStyle(el).translate), '0px -16px');
  await page.locator('.work-timeline').hover();
  const count = await page.evaluate(() => window.timelineEvents.length);
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.timelineEvents.length), count, 'The final milestone must not reverse or restart');
  assert.equal(await page.locator('.work-timeline-item.active').count(), 5);
  await page.waitForSelector('.work-timeline-runner.arrived');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.locator('#work').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.timelineEvents.length), count, 'Returning to the section must keep the completed position');
  const hoverPhoto = page.locator('.work-timeline-photos').first().locator('button').first();
  const photoPreview = page.locator('.work-timeline-photo-preview');
  await hoverPhoto.hover();
  const opening = await photoPreview.evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause(); animation.currentTime = 0;
    const start = el.getBoundingClientRect().width;
    animation.currentTime = 160;
    const middle = el.getBoundingClientRect().width;
    animation.currentTime = 320;
    const end = el.getBoundingClientRect().width;
    animation.finish();
    return { start, middle, end };
  });
  assert.ok(opening.start < opening.middle && opening.middle < opening.end, 'Hover zoom must expand smoothly from the thumbnail');
  await page.mouse.move(1439, 899);
  const closing = await photoPreview.evaluate(el => {
    const animation = el.getAnimations()[0];
    animation.pause(); animation.currentTime = 0;
    const start = el.getBoundingClientRect().width;
    animation.currentTime = 90;
    const middle = el.getBoundingClientRect().width;
    animation.finish();
    return { start, middle };
  });
  assert.ok(closing.middle < closing.start, 'Leaving the image must animate the zoom back down');
  await page.waitForFunction(() => document.querySelector('.work-timeline-photo-preview').hidden);
  await hoverPhoto.hover();
  await page.mouse.move(1439, 899);
  await hoverPhoto.hover();
  await page.waitForTimeout(400);
  assert.equal(await photoPreview.isVisible(), true, 'Re-entering during an exit must not let the old animation hide the image');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.work-timeline-photo-preview').hidden);
  await page.close();
  console.log('PASS: animated hover zoom in/out and rapid re-entry, touch zoom, square photo fans, arrival pops, 1-second legs and final stop.');
} finally { await browser.close(); }
