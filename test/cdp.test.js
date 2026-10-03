import test from 'node:test';
import assert from 'node:assert/strict';
import { connectCDP } from '../src/cdp.js';

export class FakeSocket extends EventTarget {
  constructor() { super(); this.sent = []; this.closed = false; }
  send(data) { this.sent.push(JSON.parse(data)); }
  close() { this.closed = true; this.dispatchEvent(new Event('close')); }
  open() { this.dispatchEvent(new Event('open')); }
  reply(data) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) })); }
}
export const target = { id: 'chart-1', type: 'page', url: 'https://www.tradingview.com/chart/', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/chart-1' };

test('CDP connection guards socket creation and resolves, rejects and cleans pending calls', async () => {
  let created = 0;
  const socket = new FakeSocket();
  const factory = url => { created++; assert.equal(url, target.webSocketDebuggerUrl); queueMicrotask(() => socket.open()); return socket; };
  await assert.rejects(connectCDP({ ...target, webSocketDebuggerUrl: 'ws://evil.test/' }, 9222, { socketFactory: factory }));
  assert.equal(created, 0);
  const client = await connectCDP(target, 9222, { socketFactory: factory, timeout: 30 });
  const first = client.call('Page.getFrameTree');
  socket.reply({ id: socket.sent.at(-1).id, result: { ok: true } });
  assert.deepEqual(await first, { ok: true });
  const failure = client.call('Runtime.evaluate');
  socket.reply({ id: socket.sent.at(-1).id, error: { code: -32000, message: 'PRIVATE DETAIL' } });
  await assert.rejects(failure, error => /-32000/.test(error.message) && !error.message.includes('PRIVATE'));
  await assert.rejects(client.call('Page.getFrameTree'), /timed out/);
  assert.equal(client.pendingCount, 0);
  const closing = client.call('Page.getFrameTree');
  socket.close();
  await assert.rejects(closing, /closed/);
  assert.equal(client.pendingCount, 0);
  await assert.rejects(client.call('Page.getFrameTree'), /closed/);
  client.close();
  const neverOpen = new FakeSocket();
  await assert.rejects(connectCDP(target, 9222, { socketFactory: () => neverOpen, timeout: 15 }), /timed out/);
  assert.equal(neverOpen.closed, true);
});

test('CDP rejects socket errors and hostile messages without retaining calls or listeners', async () => {
  for (const scenario of ['error', 'json', 'shape', 'id', 'oversize', 'send']) {
    const socket = new FakeSocket();
    const client = await connectCDP(target, 9222, { socketFactory: () => { queueMicrotask(() => socket.open()); return socket; }, timeout: 50 });
    if (scenario === 'send') socket.send = () => { throw Error('PRIVATE'); };
    const pending = client.call('Page.getFrameTree');
    if (scenario === 'error') socket.dispatchEvent(new Event('error'));
    if (scenario === 'json') socket.dispatchEvent(new MessageEvent('message', { data: '{' }));
    if (scenario === 'shape') socket.reply(null);
    if (scenario === 'id') socket.reply({ id: '1', result: {} });
    if (scenario === 'oversize') socket.dispatchEvent(new MessageEvent('message', { data: ' '.repeat(2097153) }));
    await assert.rejects(pending, error => !error.message.includes('PRIVATE'));
    assert.equal(client.pendingCount, 0);
    assert.equal(socket.closed, true);
  }
  const socket = new FakeSocket();
  const client = await connectCDP(target, 9222, { socketFactory: () => { queueMicrotask(() => socket.open()); return socket; } });
  await assert.rejects(client.call('TradingView.placeOrder'), /Unsupported CDP method/);
  assert.equal(socket.sent.length, 0);
  client.close();
});
