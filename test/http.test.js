import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverTargets } from '../src/http.js';

const target = { id: 'chart-1', type: 'page', url: 'https://www.tradingview.com/chart/', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/chart-1' };
function response(body, status = 200) {
  const result = new Response(body, { status });
  Object.defineProperty(result, 'url', { value: 'http://127.0.0.1:9222/json/list' });
  return result;
}
test('HTTP discovery uses only bounded loopback requests, safe redirects and sanitized failures', async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    assert.equal(url, 'http://127.0.0.1:9222/json/list');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.ok(options.signal instanceof AbortSignal);
    return response(JSON.stringify([target]));
  };
  assert.deepEqual(await discoverTargets(9222, { fetcher }), [target]);
  await assert.rejects(discoverTargets('evil', { fetcher }));
  assert.equal(calls, 1);
  for (const body of ['{}', '[{}]', 'not json', ' '.repeat(1048577)]) {
    await assert.rejects(discoverTargets(9222, { fetcher: async () => response(body) }));
  }
  await assert.rejects(discoverTargets(9222, { fetcher: async () => response('[]', 302) }), /HTTP/);
  await assert.rejects(discoverTargets(9222, { fetcher: async () => { throw Error('SECRET URL'); } }), error => !error.message.includes('SECRET') && /fully quit/.test(error.message));
  await assert.rejects(discoverTargets(9222, { timeout: 15, fetcher: () => new Promise(() => {}) }), /timed out/);
  await assert.rejects(discoverTargets(9222, { timeout: 15, fetcher: async () => response(new ReadableStream({ start() {} })) }), /timed out/);
});
