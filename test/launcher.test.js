import test from 'node:test';
import assert from 'node:assert/strict';
import { planLaunch, launchApp } from '../src/launcher.js';
import { EventEmitter } from 'node:events';

test('launcher plans discover Windows MSIX/LocalAppData and macOS bundles with argument-safe loopback flags', async () => {
  const flags = ['--remote-debugging-port=9222', '--remote-debugging-address=127.0.0.1'];
  const files = new Set(['C:\\Package Space\\TradingView.exe']);
  const io = {
    stat: async path => { if (!files.has(path)) throw Error('missing'); return { isFile: () => true }; },
    execFile: async (exe, args, options) => {
      assert.equal(exe, 'powershell.exe');
      assert.ok(args.includes('-NoProfile'));
      assert.ok(args.at(-1).includes('Get-AppxPackage -Name TradingView.Desktop'));
      assert.doesNotMatch(args.at(-1), /\$env|Cookie|Credential|Start-Process/);
      assert.equal(options.windowsHide, true);
      return { stdout: JSON.stringify({ Name: 'TradingView.Desktop', InstallLocation: 'C:\\Package Space' }) };
    }
  };
  assert.deepEqual(await planLaunch({ platform: 'win32', port: 9222 }, io), { executable: 'C:\\Package Space\\TradingView.exe', args: flags });
  files.clear(); files.add('C:\\Local\\Programs\\TradingView\\TradingView.exe');
  assert.equal((await planLaunch({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Local' } }, { ...io, execFile: async () => ({ stdout: '[]' }) })).executable, 'C:\\Local\\Programs\\TradingView\\TradingView.exe');
  files.clear(); files.add('C:\\Override & space\\TradingView.exe');
  assert.deepEqual(await planLaunch({ platform: 'win32', app: 'C:\\Override & space\\TradingView.exe' }, { ...io, execFile: async () => { throw Error('must not discover'); } }), { executable: 'C:\\Override & space\\TradingView.exe', args: flags });
  await assert.rejects(planLaunch({ platform: 'win32', app: 'C:\\missing.exe' }, io), /real executable file/);
  const macFiles = new Set(['/Applications/TradingView.app/Contents/Info.plist', '/Applications/TradingView.app/Contents/MacOS/Official App']);
  const macIO = {
    stat: async path => { if (!macFiles.has(path)) throw Error('missing'); return { isFile: () => true }; },
    execFile: async (exe, args) => { assert.equal(exe, '/usr/libexec/PlistBuddy'); assert.deepEqual(args, ['-c', 'Print :CFBundleExecutable', '/Applications/TradingView.app/Contents/Info.plist']); return { stdout: 'Official App\n' }; }
  };
  assert.equal((await planLaunch({ platform: 'darwin', home: '/synthetic' }, macIO)).executable, '/Applications/TradingView.app/Contents/MacOS/Official App');
  macFiles.clear(); macFiles.add('/synthetic/Applications/TradingView.app/Contents/MacOS/TradingView');
  assert.equal((await planLaunch({ platform: 'darwin', home: '/synthetic' }, macIO)).executable, '/synthetic/Applications/TradingView.app/Contents/MacOS/TradingView');
  await assert.rejects(planLaunch({ platform: 'linux' }, io), /Windows and macOS/);
});

test('explicit launch boundary uses arrays without a shell, detached process or security weakening', async () => {
  const plan = { executable: 'C:\\Synthetic & Space\\TradingView.exe', args: ['--remote-debugging-port=9222', '--remote-debugging-address=127.0.0.1'] };
  let unref = false;
  const child = new EventEmitter(); child.unref = () => { unref = true; };
  await launchApp(plan, (executable, args, options) => {
    assert.equal(executable, plan.executable); assert.deepEqual(args, plan.args);
    assert.deepEqual(options, { shell: false, windowsHide: true, stdio: 'ignore', detached: false });
    queueMicrotask(() => child.emit('spawn'));
    return child;
  });
  assert.equal(unref, true);
  await assert.rejects(launchApp(plan, () => { throw Error('private path'); }), /launch failed/);
});
