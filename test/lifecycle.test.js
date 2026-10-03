import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { applyToTarget } from '../src/lifecycle.js';
import { loadSkin } from '../src/skin.js';
import { domFixture } from './fixtures/dom.js';
import { target } from './cdp.test.js';

test('lifecycle uses only the main chart frame and isolated context, retries a navigation race and always closes', async () => {
  const skin = await loadSkin('polar');
  const calls = [];
  const context = vm.createContext(domFixture());
  let closes = 0, evaluates = 0;
  const client = {
    close() { closes++; },
    async call(method, params) {
      calls.push({ method, params });
      if (method === 'Page.getFrameTree') return { frameTree: { frame: { id: 'frame', url: target.url } } };
      if (method === 'Page.createIsolatedWorld') { assert.equal(params.frameId, 'frame'); assert.equal(params.worldName, 'tv-local-skins-v1'); assert.equal(params.grantUniveralAccess, undefined); return { executionContextId: 42 }; }
      assert.equal(method, 'Runtime.evaluate');
      assert.equal(params.contextId, 42);
      assert.equal(params.returnByValue, true);
      if (++evaluates === 1) return { exceptionDetails: { text: 'PRIVATE' } };
      return { result: { type: 'object', value: vm.runInContext(params.expression, context) } };
    }
  };
  assert.equal((await applyToTarget(target, 9222, skin, { connect: async () => client })).status, 'applied');
  assert.equal(evaluates, 2);
  assert.equal(closes, 1);
  assert.equal((await applyToTarget(target, 9222, undefined, { action: 'remove', connect: async () => client })).status, 'removed');
  assert.equal(closes, 2);
  let worldCreated = false;
  const wrong = { close() { closes++; }, async call(method) { if (method === 'Page.createIsolatedWorld') worldCreated = true; return { frameTree: { frame: { id: 'frame', url: 'https://example.test/' } } }; } };
  await assert.rejects(applyToTarget(target, 9222, skin, { connect: async () => wrong }), /allowed chart/);
  assert.equal(worldCreated, false);
  assert.equal(closes, 3);
});
