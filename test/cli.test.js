import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, runCLI } from '../src/cli.js';
import { loadSkin } from '../src/skin.js';
import { target } from './cdp.test.js';

test('CLI commands validate options, render safe doctor output and dispatch real operations', async () => {
  assert.deepEqual(parseArgs(['apply', '--skin', 'polar', '--port', '9222', '--target', 'chart-1']), { command: 'apply', skin: 'polar', port: 9222, target: 'chart-1' });
  for (const args of [[], ['wat'], ['apply'], ['list', '--port', '9222'], ['apply', '--skin', 'polar', '--skin', 'charcoal'], ['remove', '--app', 'x'], ['doctor', '--port', 'evil'], ['watch', '--skin'], ['apply', '--skin', 'polar', '--target', '../x']]) assert.throws(() => parseArgs(args));
  const lines = [];
  const dependencies = { write: line => lines.push(line), discover: async () => [{ ...target, title: 'PRIVATE ACCOUNT TITLE' }] };
  await runCLI(['list'], dependencies);
  assert.ok(lines.join('\n').includes('polar'));
  await runCLI(['validate', '--skin', 'polar'], dependencies);
  assert.ok(lines.join('\n').includes('Valid'));
  await runCLI(['doctor'], dependencies);
  const doctor = lines.at(-1);
  assert.ok(doctor.includes('1 allowed chart'));
  assert.doesNotMatch(doctor, /PRIVATE|chart-1|https:|devtools/);
  let action;
  await runCLI(['remove'], { ...dependencies, operation: async (chart, port, skin, options) => { assert.equal(chart.id, target.id); assert.equal(port, 9222); assert.equal(skin, undefined); action = options.action; return { status: 'removed' }; } });
  assert.equal(action, 'remove');
  const skin = await loadSkin('polar');
  await runCLI(['apply', '--skin', 'polar'], { ...dependencies, operation: async (chart, port, value) => { assert.deepEqual(value, skin); return { status: 'applied', coverage: { header: { matched: 0, visible: 0, painted: 0 } } }; } });
  assert.ok(lines.at(-1).includes('unverified'));
});

test('launch validates skin first, explicitly launches then waits for readiness and enters foreground watch', async () => {
  const controller = new AbortController();
  const events = [];
  let probes = 0;
  const skin = await loadSkin('polar');
  const dependencies = {
    signal: controller.signal, write: () => {},
    load: async () => { events.push('load'); return skin; },
    plan: async options => { events.push('plan'); assert.equal(options.port, 9222); return { executable: '/synthetic/TradingView', args: [] }; },
    launch: async () => { events.push('launch'); },
    discover: async () => { events.push('probe'); if (++probes === 1) throw Error('not ready'); return [target]; },
    wait: async () => { events.push('wait'); },
    watch: async options => { events.push('watch'); assert.equal(options.signal, controller.signal); assert.equal((await options.resolveSkin()).id, 'polar'); }
  };
  await runCLI(['launch', '--skin', 'polar'], dependencies);
  assert.deepEqual(events, ['load', 'plan', 'launch', 'probe', 'wait', 'probe', 'watch', 'load']);
  events.length = 0;
  await runCLI(['watch', '--skin', 'polar'], dependencies);
  assert.deepEqual(events, ['load', 'watch', 'load']);
  events.length = 0;
  await assert.rejects(runCLI(['launch', '--skin', 'bad'], { ...dependencies, load: async () => { throw Error('Invalid skin'); } }), /Invalid skin/);
  assert.deepEqual(events, []);
  await assert.rejects(runCLI(['launch', '--skin', 'polar'], { ...dependencies, discover: async () => { throw Error('closed'); }, wait: async () => {} }), /fully quit/);
  controller.abort();
  events.length = 0;
  await runCLI(['launch', '--skin', 'polar'], dependencies);
  assert.deepEqual(events, ['load']);
});
