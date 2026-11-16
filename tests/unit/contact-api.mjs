import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import contact from '../../api/contact.js';

const originalFetch = globalThis.fetch;
const originalToken = process.env.ZALO_BOT_TOKEN;
const originalChat = process.env.ZALO_CHAT_ID;
process.env.ZALO_BOT_TOKEN = '123456:test-token';
process.env.ZALO_CHAT_ID = 'test-chat';
const deliveries = [];
let provider = 'ok';
globalThis.fetch = async (url, options) => {
  assert.ok(String(url).startsWith('https://bot-api.zaloplatforms.com/bot'));
  assert.ok(String(url).endsWith('/sendMessage'));
  assert.equal(options.method, 'POST');
  const payload = JSON.parse(options.body);
  assert.equal(payload.chat_id, 'test-chat');
  assert.ok(payload.text.length <= 2000);
  assert.equal(payload.parse_mode, undefined, 'User text is sent as plain text');
  deliveries.push(payload);
  if (provider === 'network') throw new Error('Upstream URL with test-token must not leak');
  if (provider === 'invalid-json') return new Response('broken JSON');
  return Response.json(provider === 'ok' ? { ok: true, result: { message_id: 'test' } } : { ok: false, description: 'Private upstream detail' });
};
const server = createServer(contact);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const host = `127.0.0.1:${port}`;
const valid = { name: 'Nguyễn Duy', email: 'contact@example.test', service: 'Leader vận hành thương mại điện tử', message: 'Xin chào <3 🥰', company_website: '' };
let visitor = 1;
function send(body = valid, { method = 'POST', headers = {} } = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/api/contact', method, headers: {
      Host: host, Origin: `http://${host}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'X-Forwarded-For': `198.51.100.${visitor++}`, ...headers
    } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(text), text }));
    });
    req.on('error', reject);
    req.end(data);
  });
}
try {
  assert.equal((await send(valid, { method: 'GET' })).status, 405);
  assert.equal((await send(valid, { headers: { Origin: 'https://other.example' } })).status, 403);
  assert.equal((await send(valid, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await send('{')).status, 400);
  assert.equal((await send('x'.repeat(9000))).status, 413);
  for (const body of [null, [], { ...valid, name: '  ' }, { ...valid, email: 'invalid' }, { ...valid, service: 'unlisted' }, { ...valid, message: 'x'.repeat(1201) }, { ...valid, company_website: 'spam' }]) assert.equal((await send(body)).status, 400);
  assert.equal(deliveries.length, 0, 'Invalid input never reaches Zalo');
  delete process.env.ZALO_BOT_TOKEN;
  assert.equal((await send()).status, 503);
  assert.equal(deliveries.length, 0);
  process.env.ZALO_BOT_TOKEN = '123456:test-token';
  const success = await send();
  assert.equal(success.status, 200);
  assert.equal(success.body.ok, true);
  assert.equal(success.headers['cache-control'], 'no-store');
  assert.ok(deliveries.at(-1).text.includes('Xin chào <3 🥰'));
  assert.equal((await send({ ...valid, name: 'D'.repeat(100), email: 'a'.repeat(240) + '@test.test', message: 'x'.repeat(1200) })).status, 200);
  for (provider of ['rejected', 'network', 'invalid-json']) {
    const failure = await send();
    assert.equal(failure.status, 502);
    assert.equal(failure.body.ok, false);
    assert.ok(!failure.text.includes('test-token') && !failure.text.includes('Private upstream detail'));
  }
  provider = 'ok';
  const headers = { 'X-Forwarded-For': '203.0.113.99' };
  for (let i = 0; i < 3; i++) assert.equal((await send(valid, { headers })).status, 200);
  const before = deliveries.length;
  const blocked = await send(valid, { headers });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers['retry-after']) > 0);
  assert.equal(deliveries.length, before);
  for (const body of [valid, JSON.stringify(valid)]) {
    let status, content;
    await contact({ method: 'POST', body, headers: { host, origin: `http://${host}`, 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${visitor++}` } }, {
      setHeader() {}, writeHead(code) { status = code; }, end(text) { content = JSON.parse(text); }
    });
    assert.equal(status, 200, 'Vercel pre-parsed JSON body is supported');
    assert.equal(content.ok, true);
  }
  console.log('PASS: Zalo request contract, Unicode/lengths, validation, honeypot, origin, method, unavailable config, provider failures, secret redaction and burst limit; no real messages sent.');
} finally {
  await new Promise(resolve => server.close(resolve));
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.ZALO_BOT_TOKEN; else process.env.ZALO_BOT_TOKEN = originalToken;
  if (originalChat === undefined) delete process.env.ZALO_CHAT_ID; else process.env.ZALO_CHAT_ID = originalChat;
}
