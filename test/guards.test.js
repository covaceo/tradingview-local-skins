import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePort, isChartURL, validateSocket, selectTargets, assertDirectNetworking } from '../src/guards.js';

test('target guards reject remote, ambiguous, credential-bearing and unrelated endpoints', () => {
  assert.equal(parsePort('9222'), 9222);
  for (const port of ['0', '65536', '1e3', '9222evil', ' 9222', 1.5, null, true]) assert.throws(() => parsePort(port));
  for (const url of ['https://www.tradingview.com/chart/', 'https://tradingview.com/chart/Ab_c-1/?x=1']) assert.equal(isChartURL(url), true);
  for (const url of ['http://www.tradingview.com/chart/', 'https://tradingview.com.evil.test/chart/',
    'https://evil@tradingview.com/chart/', 'https://tradingview.com:443/chart/', 'https://tradingview.com/chart/../account/',
    'https://tradingview.com/chart/%2e%2e/', 'https://tradingview.com/chart/\\account/',
    'https://tradingview.com/accounts/', 'file:///chart/', 'https://TRADINGVIEW.com/chart/']) assert.equal(isChartURL(url), false);
  const socket = 'ws://127.0.0.1:9222/devtools/page/chart-1';
  assert.equal(validateSocket(socket, 9222, 'chart-1'), socket);
  for (const url of ['ws://localhost:9222/devtools/page/chart-1', 'ws://127.0.0.1:9223/devtools/page/chart-1',
    'wss://127.0.0.1:9222/devtools/page/chart-1', 'ws://user@127.0.0.1:9222/devtools/page/chart-1',
    socket + '?x=1', socket + '#x', 'ws://127.0.0.1:9222/devtools/browser/chart-1',
    'ws://127.0.0.1:9222/devtools/page/other', 'ws://127.1:9222/devtools/page/chart-1']) {
    assert.throws(() => validateSocket(url, 9222, 'chart-1'));
  }
  const target = { id: 'chart-1', type: 'page', url: 'https://www.tradingview.com/chart/', webSocketDebuggerUrl: socket };
  assert.deepEqual(selectTargets([target, { id: 'other', type: 'page', url: 'https://example.test/' }], 9222), [target]);
  assert.throws(() => selectTargets([target], 9222, 'other'));
  assert.throws(() => selectTargets([{ ...target, type: 'iframe' }], 9222));
  assert.throws(() => selectTargets([], 9222), /Open a TradingView chart/);
  assert.throws(() => selectTargets([{ ...target, webSocketDebuggerUrl: socket + '?x' }], 9222));
});

test('normal encoded chart query parameters are allowed while encoded paths stay refused', () => {
  assert.equal(isChartURL('https://www.tradingview.com/chart/Ab_c/?symbol=NASDAQ%3AAAPL#view'), true);
  assert.equal(isChartURL('https://www.tradingview.com/chart/%41/'), false);
});

test('loopback networking refuses Node environment-proxy activation', () => {
  assert.doesNotThrow(() => assertDirectNetworking({ env: { HTTP_PROXY: 'http://proxy.invalid', NODE_USE_ENV_PROXY: '0' }, execArgv: [] }));
  for (const options of [
    { env: { NODE_USE_ENV_PROXY: '1' }, execArgv: [] },
    { env: { NODE_OPTIONS: '--use-env-proxy' }, execArgv: [] },
    { env: {}, execArgv: ['--use-env-proxy'] }
  ]) assert.throws(() => assertDirectNetworking(options), /proxy/);
});
