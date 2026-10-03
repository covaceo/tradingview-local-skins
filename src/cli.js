#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { BUILTINS, loadSkin } from './skin.js';
import { parsePort } from './guards.js';
import { discoverTargets } from './http.js';
import { applyToTarget } from './lifecycle.js';
import { planLaunch, launchApp } from './launcher.js';
import { watchSession, pause } from './watch.js';

export const CDP_WARNING = 'Local debugging lets other local processes fully control the logged-in app. This cosmetic tool does not make CDP read-only. Fully quit TradingView yourself to close the debugging endpoint.';
const HELP = `TradingView Local Skins v0.1 (Node >=22)
  node src/cli.js list
  node src/cli.js validate --skin FILE
  node src/cli.js doctor [--port PORT]
  node src/cli.js launch --skin NAME/FILE [--app EXECUTABLE] [--port PORT]
  node src/cli.js apply --skin NAME/FILE [--port PORT] [--target ID]
  node src/cli.js watch --skin NAME/FILE [--port PORT] [--target ID]
  node src/cli.js remove [--port PORT] [--target ID]
Default port: 9222. launch/watch run in the foreground; Ctrl+C removes owned styles.
${CDP_WARNING}`;
const OPTIONS = {
  list: [], validate: ['skin'], doctor: ['port'], launch: ['skin', 'app', 'port'],
  apply: ['skin', 'port', 'target'], watch: ['skin', 'port', 'target'], remove: ['port', 'target']
};
export function parseArgs(args) {
  if (args.length === 1 && ['help', '--help', '-h'].includes(args[0])) return { command: 'help' };
  const [command, ...rest] = args;
  if (!Object.hasOwn(OPTIONS, command)) throw new Error('Specify a supported command. Run node src/cli.js --help.');
  const options = { command };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i].startsWith('--') ? rest[i].slice(2) : '';
    const value = rest[i + 1];
    if (!OPTIONS[command].includes(key) || Object.hasOwn(options, key) || !value || value.startsWith('--')) throw new Error('Unknown, duplicate or missing command option. Run --help.');
    options[key] = value;
  }
  if (OPTIONS[command].includes('port')) options.port = parsePort(options.port ?? 9222);
  if (OPTIONS[command].includes('skin') && !options.skin) throw new Error('Specify --skin NAME or FILE.');
  if (options.target !== undefined && !/^[A-Za-z0-9_-]{1,160}$/.test(options.target)) throw new Error('Invalid target ID.');
  return options;
}
export function reportOperation(result, write) {
  if (result.status === 'retrying') { write('Watch is retrying: check the local skin file, chart readiness and loopback debugging endpoint.'); return; }
  if (!result.coverage) { write(`Skin ${result.status}.`); return; }
  const regions = Object.entries(result.coverage).map(([name, region]) => `${name}=${region.painted}/${region.visible}/${region.matched}`).join(', ');
  write(`Skin ${result.status}; CSS coverage (painted/visible/matched): ${regions}. Native visual success remains unverified; confirm the chrome manually.`);
}
export async function runCLI(args, { write = console.log, load = loadSkin, discover = discoverTargets, operation = applyToTarget,
  plan = planLaunch, launch = launchApp, watch = watchSession, wait = pause, signal: suppliedSignal } = {}) {
  const options = parseArgs(args);
  if (options.command === 'help') { write(HELP); return; }
  if (options.command === 'list') { for (const name of BUILTINS) { const skin = await load(name); write(`${skin.id}: ${skin.name}`); } return; }
  if (options.command === 'validate') { await load(options.skin); write('Valid v1 skin; colors and readability checks passed.'); return; }
  if (options.command === 'doctor') {
    const targets = await discover(options.port);
    write(`Ready: ${targets.length} allowed chart page(s) on loopback port ${options.port}; DOM selector coverage has not been tested.`);
    return;
  }
  write(CDP_WARNING);
  if (['apply', 'remove'].includes(options.command)) {
    const skin = options.command === 'apply' ? await load(options.skin) : undefined;
    const targets = await discover(options.port, { target: options.target });
    for (const target of targets) reportOperation(await operation(target, options.port, skin, { action: options.command }), write);
    return;
  }
  await load(options.skin); // No launch until the supplied skin passes validation.
  const controller = suppliedSignal ? null : new AbortController();
  const signal = suppliedSignal ?? controller.signal;
  const stop = () => controller.abort();
  if (controller) { process.on('SIGINT', stop); process.on('SIGTERM', stop); }
  try {
    if (signal.aborted) return;
    if (options.command === 'launch') {
      const launchPlan = await plan({ port: options.port, app: options.app });
      if (signal.aborted) return;
      await launch(launchPlan);
      const deadline = Date.now() + 15000;
      let ready = false;
      for (let attempts = 0; attempts < 20 && Date.now() < deadline && !signal.aborted; attempts++) {
        try { await discover(options.port); ready = true; break; }
        catch { await wait(500, signal); }
      }
      if (signal.aborted) return;
      if (!ready) throw new Error('No allowed chart became ready. If an already-running instance ignored the debugging flag, fully quit TradingView yourself and retry launch. Otherwise open a chart in the official app and check the chosen loopback port.');
    }
    write('Foreground skin session; Ctrl+C removes owned styles.');
    await watch({ port: options.port, target: options.target, signal, resolveSkin: () => load(options.skin),
      discover, operation, report: result => reportOperation(result, write) });
  } finally {
    if (controller) { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node >=22 is required.');
    await runCLI(process.argv.slice(2));
  } catch (error) {
    console.error(error.code ? 'Local operation failed. Check file paths and permissions; run --help.' : error.message);
    process.exitCode = 1;
  }
}
