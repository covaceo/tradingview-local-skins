import { stat } from 'node:fs/promises';
import { execFile as execFileCallback, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { homedir } from 'node:os';
import { parsePort } from './guards.js';

const execFile = promisify(execFileCallback);
const boundaryOptions = { timeout: 3000, maxBuffer: 65536, windowsHide: true, encoding: 'utf8' };
async function isFile(filename, io) {
  try { return (await io.stat(filename)).isFile(); } catch { return false; }
}
export async function planLaunch({ platform = process.platform, env = process.env, home = homedir(), app, port = 9222 } = {}, io = { stat, execFile }) {
  port = parsePort(port);
  if (!['win32', 'darwin'].includes(platform)) throw new Error('Desktop launch supports Windows and macOS only.');
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const args = [`--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1'];
  if (app !== undefined) {
    if (typeof app !== 'string' || app.includes('\0') || !paths.isAbsolute(app) ||
        (platform === 'win32' && !/\.exe$/i.test(app)) || !(await isFile(app, io))) throw new Error('--app must be an absolute path to a real executable file.');
    return { executable: app, args };
  }
  const candidates = [];
  if (platform === 'win32') {
    try {
      // Fixed script: no interpolated paths/variables, package metadata only.
      const { stdout } = await io.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        'Get-AppxPackage -Name TradingView.Desktop | Select-Object Name, InstallLocation | ConvertTo-Json -Compress'], boundaryOptions);
      const packages = JSON.parse(stdout || '[]');
      for (const pkg of Array.isArray(packages) ? packages : [packages]) {
        if (pkg?.Name === 'TradingView.Desktop' && typeof pkg.InstallLocation === 'string' && paths.isAbsolute(pkg.InstallLocation)) {
          candidates.push(paths.join(pkg.InstallLocation, 'TradingView.exe'), paths.join(pkg.InstallLocation, 'app', 'TradingView.exe'));
        }
      }
    } catch { /* Fall back to the normal per-user install or explicit override. */ }
    if (env.LOCALAPPDATA && paths.isAbsolute(env.LOCALAPPDATA)) candidates.push(
      paths.join(env.LOCALAPPDATA, 'Programs', 'TradingView', 'TradingView.exe'),
      paths.join(env.LOCALAPPDATA, 'TradingView', 'TradingView.exe'));
  } else {
    for (const bundle of ['/Applications/TradingView.app', paths.join(home, 'Applications', 'TradingView.app')]) {
      const known = paths.join(bundle, 'Contents', 'MacOS', 'TradingView');
      if (await isFile(known, io)) return { executable: known, args };
      const plist = paths.join(bundle, 'Contents', 'Info.plist');
      if (!(await isFile(plist, io))) continue;
      try {
        const { stdout } = await io.execFile('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', plist], boundaryOptions);
        const name = stdout.trim();
        if (/^[A-Za-z0-9 ._-]{1,100}$/.test(name) && !/^\.{1,2}$/.test(name)) candidates.push(paths.join(bundle, 'Contents', 'MacOS', name));
      } catch { /* Explicit executable override remains available. */ }
    }
  }
  for (const candidate of candidates) if (await isFile(candidate, io)) return { executable: candidate, args };
  throw new Error('Official TradingView executable not found. Supply --app with its absolute executable path.');
}
export async function launchApp(plan, spawnProcess = spawn) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawnProcess(plan.executable, plan.args, { shell: false, windowsHide: true, stdio: 'ignore', detached: false }); }
    catch { reject(new Error('TradingView launch failed. Check --app and executable permissions.')); return; }
    child.once('error', () => reject(new Error('TradingView launch failed. Check --app and executable permissions.')));
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}
