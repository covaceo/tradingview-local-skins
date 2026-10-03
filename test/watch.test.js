import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { watchSession } from '../src/watch.js';
import { injectionExpression } from '../src/injection.js';
import { loadSkin } from '../src/skin.js';
import { STYLE_ID } from '../src/css.js';
import { domFixture } from './fixtures/dom.js';
import { target } from './cdp.test.js';

test('foreground watch discovers new charts, recovers reloads and cleans current owned styles on abort', async () => {
  const skin = await loadSkin('polar');
  const controller = new AbortController();
  const other = { ...target, id: 'chart-2', webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/chart-2' };
  const contexts = new Map([[target.id, vm.createContext(domFixture())]]);
  let ticks = 0;
  const statuses = [];
  const discover = async () => ticks === 0 ? [target] : [target, other];
  const operation = async (chart, port, value, options = {}) => {
    const result = vm.runInContext(injectionExpression(options.action ?? 'apply', value), contexts.get(chart.id));
    statuses.push(result.status);
    return result;
  };
  await watchSession({ port: 9222, signal: controller.signal, resolveSkin: async () => skin, discover, operation,
    pause: async () => {
      ticks++;
      if (ticks === 1) {
        contexts.set(target.id, vm.createContext(domFixture()));
        contexts.set(other.id, vm.createContext(domFixture()));
      }
      if (ticks === 3) controller.abort();
    }
  });
  assert.deepEqual(statuses, ['applied', 'applied', 'applied', 'unchanged', 'unchanged', 'removed', 'removed']);
  for (const context of contexts.values()) assert.equal(context.document.getElementById(STYLE_ID), null);
  await assert.rejects(watchSession({ signal: new AbortController().signal, resolveSkin: async () => skin, discover: async () => { throw Error('Open a TradingView chart'); } }), /Open a TradingView chart/);
});

test('Ctrl+C during initial discovery exits cleanly even if the pending request fails', async () => {
  const controller = new AbortController();
  await watchSession({ signal: controller.signal, resolveSkin: () => loadSkin('polar'), discover: async () => { controller.abort(); throw Error('closed during stop'); } });
});
