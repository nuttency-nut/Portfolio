import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, browserExecutable } from '../helpers/browser.mjs';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const routes = JSON.parse(await readFile('tools/routes.json', 'utf8'));
const browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
try {
  const page = await browser.newPage({ javaScriptEnabled: false, userAgent: 'facebookexternalhit/1.1' });
  for (const route of routes) {
    const response = await page.goto(origin + route.url, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    assert.ok((await response.text()).includes('property="og:image"'), 'Sharing metadata exists in raw HTML');
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://anhduy.info' + route.url);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), 'https://anhduy.info' + route.url);
    assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), await page.title());
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    assert.equal(image, 'https://anhduy.info/assets/images/shared/social-preview-v1.jpg');
    assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'), image);
    assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
    assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute('content'), '1280');
    assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute('content'), '720');
    assert.ok(await page.locator('meta[property="og:image:alt"]').getAttribute('content'));
  }
  const imageResponse = await fetch(origin + '/assets/images/shared/social-preview-v1.jpg');
  assert.equal(imageResponse.status, 200);
  assert.match(imageResponse.headers.get('content-type'), /^image\/jpeg/);
  assert.ok((await imageResponse.arrayBuffer()).byteLength < 200_000);
  const size = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/assets/images/shared/social-preview-v1.jpg';
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  assert.deepEqual(size, [1280, 720]);
  console.log('PASS: all 8 routes expose absolute sharing URLs/titles without JavaScript; public JPEG decodes at 1280x720 and stays below 200 KB.');
} finally {
  await browser.close();
}
