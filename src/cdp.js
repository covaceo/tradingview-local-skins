import { isChartURL, validateSocket, assertDirectNetworking } from './guards.js';

const MESSAGE_LIMIT = 2 * 1048576;
export async function connectCDP(target, port, { socketFactory = url => new WebSocket(url), timeout = 3000 } = {}) {
  assertDirectNetworking();
  if (target.type !== 'page' || !isChartURL(target.url)) throw new Error('Refused unrelated CDP target.');
  const url = validateSocket(target.webSocketDebuggerUrl, port, target.id);
  let socket;
  try { socket = socketFactory(url); } catch { throw new Error('Could not open loopback CDP socket.'); }
  let sequence = 0;
  let closed = false;
  let openTimer;
  const pending = new Map();
  let resolveOpen, rejectOpen;
  const opened = new Promise((resolve, reject) => { resolveOpen = resolve; rejectOpen = reject; });
  function fail(message) {
    if (closed) return;
    closed = true;
    clearTimeout(openTimer);
    const error = new Error(message);
    rejectOpen(error);
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    pending.clear();
    socket.removeEventListener('open', onOpen);
    socket.removeEventListener('message', onMessage);
    socket.removeEventListener('close', onClose);
    socket.removeEventListener('error', onError);
    try { socket.close(); } catch { /* Already closed. */ }
  }
  function onOpen() { clearTimeout(openTimer); resolveOpen(); }
  function onClose() { fail('CDP socket closed.'); }
  function onError() { fail('CDP socket error.'); }
  function onMessage(event) {
    if (typeof event.data !== 'string' || Buffer.byteLength(event.data) > MESSAGE_LIMIT) return fail('Invalid or oversized CDP message.');
    let data;
    try { data = JSON.parse(event.data); } catch { return fail('Invalid CDP JSON message.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('Invalid CDP response shape.');
    if (data.id === undefined) return; // Events carry no application contents into our output.
    if (!Number.isSafeInteger(data.id)) return fail('Invalid CDP response ID.');
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    clearTimeout(entry.timer);
    if (data.error) entry.reject(new Error(`CDP request failed (${Number.isInteger(data.error.code) ? data.error.code : 'unknown'}).`));
    else if (!data.result || typeof data.result !== 'object' || Array.isArray(data.result)) entry.reject(new Error('Invalid CDP result.'));
    else entry.resolve(data.result);
  }
  socket.addEventListener('open', onOpen);
  socket.addEventListener('message', onMessage);
  socket.addEventListener('close', onClose);
  socket.addEventListener('error', onError);
  openTimer = setTimeout(() => fail('CDP socket connection timed out.'), timeout);
  await opened;
  return {
    get pendingCount() { return pending.size; },
    call(method, params = {}) {
      if (closed) return Promise.reject(new Error('CDP socket closed.'));
      if (!['Page.getFrameTree', 'Page.createIsolatedWorld', 'Runtime.evaluate'].includes(method)) return Promise.reject(new Error('Unsupported CDP method.'));
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP request timed out.')); }, timeout);
        pending.set(id, { resolve, reject, timer });
        try { socket.send(JSON.stringify({ id, method, params })); }
        catch { fail('CDP send failed.'); }
      });
    },
    close() { fail('CDP socket closed.'); }
  };
}
