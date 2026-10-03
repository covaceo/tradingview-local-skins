import { parsePort, selectTargets, assertDirectNetworking } from './guards.js';

const LIMIT = 1048576;
export async function discoverTargets(port = 9222, { fetcher = globalThis.fetch, timeout = 3000, target } = {}) {
  assertDirectNetworking();
  const url = `http://127.0.0.1:${parsePort(port)}/json/list`;
  const controller = new AbortController();
  let reader;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Loopback CDP discovery timed out.')); }, timeout);
  });
  const request = (async () => {
    let response;
    try { response = await fetcher(url, { redirect: 'error', credentials: 'omit', signal: controller.signal }); }
    catch { throw new Error(`Cannot reach loopback CDP on port ${port}. Explicitly launch with debugging enabled; if already running, fully quit TradingView yourself and retry.`); }
    if (response.status !== 200 || response.url !== url || response.redirected) throw new Error('Refused CDP HTTP response or redirect.');
    if (Number(response.headers.get('content-length')) > LIMIT || !response.body) throw new Error('CDP response exceeds body limit or is empty.');
    reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMIT) throw new Error('CDP response exceeds 1 MiB body limit.');
      chunks.push(Buffer.from(value));
    }
    let list;
    try { list = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('CDP returned invalid JSON.'); }
    return selectTargets(list, port, target);
  })();
  try { return await Promise.race([request, deadline]); }
  finally {
    clearTimeout(timer);
    controller.abort();
    if (reader) void reader.cancel().catch(() => {});
  }
}
