import assert from 'node:assert/strict';
import { chromium, browserExecutable, capture } from '../helpers/browser.mjs';

const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
try {
  for (const project of (process.env.PORTFOLIO_PROJECT ? [process.env.PORTFOLIO_PROJECT] : ['project-01', 'project-02', 'project-03', 'project-04'])) {
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
    const errors = [];
    const videoRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('.mp4')) videoRequests.push(request.url()); });
    await page.goto(`${origin}/Project/${project}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const gallery = page.locator('.project-gallery');
    await gallery.scrollIntoViewIfNeeded();
    const before = await gallery.locator('img, video').evaluateAll(images => images.map(image => image.getBoundingClientRect().height));
    await gallery.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.querySelectorAll('.project-gallery .project-media')].every(frame => frame.dataset.imageState === 'ready'));
    const layout = await gallery.evaluate(element => ({
      columns: element.classList.contains('project-gallery--grouped')
        ? [...element.querySelectorAll('.project-gallery-group')].reduce((total, group) => total + Number(getComputedStyle(group).columnCount), 0)
        : Number(getComputedStyle(element).columnCount),
      groups: [...element.querySelectorAll('.project-gallery-group')].map(group => ({
        name: group.dataset.galleryGroup,
        images: [...group.querySelectorAll('img, video')].map(image => ({ src: image.src, x: image.getBoundingClientRect().x }))
      })),
      images: [...element.querySelectorAll('img, video')].map(image => {
        const box = image.getBoundingClientRect();
        const frame = image.closest('figure').getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height, frameHeight: frame.height,
          naturalWidth: image.naturalWidth || Number(image.getAttribute('width')), naturalHeight: image.naturalHeight || Number(image.getAttribute('height')),
          declaredWidth: Number(image.getAttribute('width')), declaredHeight: Number(image.getAttribute('height')) };
      })
    }));
    assert.equal(layout.columns, width < 768 ? 2 : 4);
    assert.equal(new Set(layout.images.map(image => Math.round(image.x))).size, layout.columns);
    assert.ok(layout.images.length > 4, 'Real gallery has multiple rows');
    if (project === 'project-03' || project === 'project-04') {
      const expectedGroups = project === 'project-03' ? ['01-website-crm', '02-studio'] : ['01-website-fanpage', '02-thuc-te'];
      assert.deepEqual(layout.groups.map(group => group.name), expectedGroups);
      for (const group of layout.groups) {
        assert.equal(new Set(group.images.map(image => Math.round(image.x))).size, width < 768 ? 1 : 2);
        assert.ok(group.images.every(image => image.src.includes(`/related/${group.name}/`)));
        assert.equal(group.images.length, project === 'project-03' ? 12 : 8);
      }
      assert.ok(Math.max(...layout.groups[0].images.map(image => image.x)) < Math.min(...layout.groups[1].images.map(image => image.x)), 'Digital work occupies the left columns; real-world media stays on the right');
    }
    for (const [index, image] of layout.images.entries()) {
      assert.ok(Math.abs(image.width / image.height - image.naturalWidth / image.naturalHeight) < .002, 'No crop or distortion');
      assert.ok(Math.abs(image.frameHeight - image.height) < 1, 'Frame follows the full image');
      assert.ok(Math.abs(image.declaredWidth / image.declaredHeight - image.naturalWidth / image.naturalHeight) < .002, 'Natural proportions reserved before decode');
      assert.ok(Math.abs(before[index] - image.height) < 1, 'No height jump after loading');
      const previous = layout.images.slice(0, index).filter(other => Math.abs(other.x - image.x) < 1).at(-1);
      if (previous) assert.ok(image.y >= previous.y + previous.height + 15, 'Images never overlap');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'No horizontal overflow');
    assert.equal(videoRequests.length, 0, 'Video data is not requested before interaction');
    for (const video of await gallery.locator('video').all()) {
      assert.equal(await video.getAttribute('preload'), 'none');
      assert.ok(await video.getAttribute('poster'));
      await video.scrollIntoViewIfNeeded();
      await video.evaluate(async element => { element.muted = true; await element.play(); });
      await page.waitForFunction(element => element.currentTime > .1 && element.readyState >= 2, await video.elementHandle());
      assert.ok(await video.evaluate(element => Math.abs(element.videoWidth / element.videoHeight - Number(element.getAttribute('width')) / Number(element.getAttribute('height'))) < .002), 'Decoded video preserves its full proportions');
      await video.evaluate(element => element.pause());
    }
    assert.deepEqual(errors, []);
    await gallery.locator('img').evaluateAll(images => Promise.all(images.flatMap(image => image.getAnimations().map(animation => animation.finished.catch(() => {})))));
    await capture(gallery, { path: `${project}-masonry-${width}.png` });
    console.log(`PASS: ${project}, ${width}px, ${layout.columns} columns, ${layout.images.length} items without cropping or layout shifts; videos play on demand.`);
    await page.close();
  }
  }
} finally {
  await browser.close();
}
