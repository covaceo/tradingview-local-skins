export function parsePort(value = 9222) {
  if (!['string', 'number'].includes(typeof value) || !/^[1-9][0-9]{0,4}$/.test(String(value)) || Number(value) > 65535) {
    throw new Error('Port must be an integer from 1 to 65535.');
  }
  return Number(value);
}
export function assertDirectNetworking({ env = process.env, execArgv = process.execArgv } = {}) {
  if (env.NODE_USE_ENV_PROXY === '1' || (env.NODE_OPTIONS ?? '').includes('--use-env-proxy') ||
      execArgv.some(arg => /^--use-env-proxy(?:=|$)/.test(arg))) {
    throw new Error('Refused environment-proxy networking. Run Node without --use-env-proxy or NODE_USE_ENV_PROXY=1 so CDP stays direct loopback.');
  }
}
export function isChartURL(value) {
  if (typeof value !== 'string' || value.length > 8192 || !/^https:\/\/(?:www\.)?tradingview\.com\/chart\//.test(value) || /[\\\s]/.test(value)) return false;
  try {
    const url = new URL(value);
    const rawPath = value.split(/[?#]/, 1)[0];
    return /^\/chart\/(?:[A-Za-z0-9_-]+\/?)?$/.test(url.pathname) && !/%|\/\.\.?\//.test(rawPath);
  } catch { return false; }
}
export function validateSocket(value, port, id) {
  const expected = `ws://127.0.0.1:${parsePort(port)}/devtools/page/${id}`;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(id) || value !== expected) {
    throw new Error('Refused CDP socket: expected matching numeric loopback port and page ID.');
  }
  return expected;
}
export function selectTargets(value, port, id) {
  parsePort(port);
  if (!Array.isArray(value) || value.length > 256) throw new Error('Invalid CDP target list.');
  const seen = new Set();
  const targets = [];
  for (const target of value) {
    if (!target || typeof target !== 'object' || Array.isArray(target) ||
        typeof target.id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(target.id) || seen.has(target.id) ||
        typeof target.type !== 'string' || typeof target.url !== 'string' || target.url.length > 8192) {
      throw new Error('Invalid CDP target shape.');
    }
    seen.add(target.id);
    if (target.type !== 'page' || !isChartURL(target.url)) continue;
    validateSocket(target.webSocketDebuggerUrl, port, target.id);
    if (id === undefined || target.id === id) targets.push(target);
  }
  if (!targets.length) throw new Error(id === undefined ? 'Open a TradingView chart in the explicitly debug-enabled Desktop app.' : 'Requested target is unavailable or is not an allowed TradingView chart.');
  return targets;
}
