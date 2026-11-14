import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const origin = new URL(process.env.PORTFOLIO_URL || 'http://127.0.0.1:4173/').origin;
const routes = JSON.parse(await readFile('tools/routes.json', 'utf8'));
for (const route of routes) {
  const response = await fetch(origin + route.url);
  assert.equal(response.status, 200, route.url);
  assert.ok(response.headers.get('content-type').startsWith('text/html'));
  await response.arrayBuffer();
}
const redirect = await fetch(origin + '/hobby', { redirect: 'manual' });
assert.equal(redirect.status, 302);
assert.equal(redirect.headers.get('location'), '/hobby/');
await redirect.arrayBuffer();
for (const path of ['/about/hobby/', '/.git/config', '/tools/routes.json', '/design-sources/background-icons/facebook-clean.png']) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 404, path);
  await response.arrayBuffer();
}
const song = origin + '/assets/audio/background/cho-anh-chut-thoi-khong-loi.mp3';
const part = await fetch(song, { headers: { Range: 'bytes=0-99' } });
assert.equal(part.status, 206);
assert.match(part.headers.get('content-range'), /^bytes 0-99\/\d+$/);
assert.equal((await part.arrayBuffer()).byteLength, 100);
const head = await fetch(song, { method: 'HEAD', headers: { Range: 'bytes=0-99' } });
assert.equal(head.status, 206);
assert.equal(head.headers.get('content-length'), '100');
assert.equal((await head.arrayBuffer()).byteLength, 0);
assert.equal((await fetch(song, { headers: { Range: 'bytes=999999999-' } })).status, 416);
console.log('PASS: eight routes, /hobby canonical URL, old route absent, source tools private, MP3 byte ranges and HEAD requests.');
