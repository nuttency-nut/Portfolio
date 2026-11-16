import assert from 'node:assert/strict';

const original = { fetch: globalThis.fetch, log: console.log, error: console.error, token: process.env.ZALO_BOT_TOKEN, exitCode: process.exitCode };
const output = [];
console.log = (...args) => output.push(args.join(' '));
console.error = (...args) => output.push(args.join(' '));
process.env.ZALO_BOT_TOKEN = '123456:fake-private-token';
try {
  for (const mode of ['missing-info', 'active-webhook', 'timeout']) {
    const calls = [];
    globalThis.fetch = async url => {
      const method = new URL(url).pathname.split('/').at(-1);
      calls.push(method);
      if (method === 'getWebhookInfo') return Response.json(mode === 'active-webhook' ? { ok: true, result: { url: 'https://example.test/webhook' } } : { ok: false, error_code: 404 });
      assert.equal(method, 'getUpdates', 'The helper must never send a message or change a webhook');
      return Response.json(mode === 'timeout' ? { ok: false, error_code: 408 } : { ok: true, result: { message: { from: { display_name: 'Test User' }, chat: { id: 'test-chat', chat_type: 'PRIVATE' } } } });
    };
    await import(`../../tools/zalo/get-chat-id.mjs?case=${mode}`);
    assert.deepEqual(calls, mode === 'active-webhook' ? ['getWebhookInfo'] : ['getWebhookInfo', 'getUpdates']);
    assert.equal(process.exitCode, original.exitCode);
  }
  assert.ok(output.some(line => line === 'ZALO_CHAT_ID=test-chat'));
  assert.ok(output.some(line => line.includes('Chưa có tin mới')));
  assert.ok(output.every(line => !line.includes('fake-private-token')));
} finally {
  globalThis.fetch = original.fetch;
  console.log = original.log;
  console.error = original.error;
  process.exitCode = original.exitCode;
  if (original.token === undefined) delete process.env.ZALO_BOT_TOKEN; else process.env.ZALO_BOT_TOKEN = original.token;
}
console.log('PASS: missing webhook info falls back to polling; existing webhook stays untouched; polling timeout is informational; no token output or real API calls.');
