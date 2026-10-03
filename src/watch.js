import { discoverTargets } from './http.js';
import { applyToTarget } from './lifecycle.js';
import { parsePort } from './guards.js';

export function pause(ms, signal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', finish, { once: true });
  });
}
export async function watchSession({ port = 9222, target, signal, resolveSkin, discover = discoverTargets,
  operation = applyToTarget, pause: wait = pause, report = () => {} }) {
  parsePort(port);
  if (!signal) throw new Error('Foreground watch requires a stop signal.');
  const touched = new Map();
  let started = false;
  let retrying = false;
  try {
    while (!signal.aborted) {
      try {
        const skin = await resolveSkin(); // Local edits are validated before replacing CSS.
        const charts = await discover(port, { target });
        for (const chart of charts) {
          if (signal.aborted) break;
          touched.set(chart.id, chart); // Includes any partially completed operation.
          const result = await operation(chart, port, skin);
          if (result.status !== 'unchanged') report(result);
        }
        started = true;
        retrying = false;
      } catch (error) {
        if (signal.aborted) break;
        if (!started) throw error;
        if (!retrying) report({ status: 'retrying' });
        retrying = true;
      }
      await wait(1000, signal);
    }
  } finally {
    if (touched.size) {
      // Fresh metadata avoids using stale sockets after reload. If discovery is
      // unavailable, the old endpoint still has both socket and in-page guards.
      try {
        const current = await discover(port, { target });
        for (const chart of current) if (touched.has(chart.id)) touched.set(chart.id, chart);
        const ids = new Set(current.map(chart => chart.id));
        for (const id of touched.keys()) if (!ids.has(id)) touched.delete(id);
      } catch { /* Best effort guarded cleanup with known chart endpoints. */ }
      let failures = 0;
      for (const chart of touched.values()) {
        try { report(await operation(chart, port, undefined, { action: 'remove' })); }
        catch { failures++; }
      }
      if (failures) throw new Error('Some chart styles could not be removed. Reconnect and run remove; a chart reload or fully quitting the app also clears injected styles.');
    }
  }
}
