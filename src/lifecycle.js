import { connectCDP } from './cdp.js';
import { isChartURL } from './guards.js';
import { injectionExpression } from './injection.js';
import { SELECTORS } from './css.js';

function validateResult(value, action) {
  const statuses = action === 'apply' ? ['applied', 'unchanged'] : ['removed', 'absent'];
  if (!value || !statuses.includes(value.status)) throw new Error('Invalid skin operation result.');
  if (action === 'remove') return { status: value.status };
  const coverage = {};
  for (const key of Object.keys(SELECTORS)) {
    const region = value.coverage?.[key];
    if (!region || !['matched', 'visible', 'painted'].every(name => Number.isInteger(region[name]) && region[name] >= 0 && region[name] <= 100) ||
        region.visible > region.matched || region.painted > region.visible) throw new Error('Invalid CSS coverage result.');
    coverage[key] = { matched: region.matched, visible: region.visible, painted: region.painted };
  }
  return { status: value.status, coverage };
}
export async function applyToTarget(target, port, skin, { action = 'apply', connect = connectCDP } = {}) {
  const expression = injectionExpression(action, skin);
  const client = await connect(target, port);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { frameTree } = await client.call('Page.getFrameTree');
      const frame = frameTree?.frame;
      if (!frame || !isChartURL(frame.url) || typeof frame.id !== 'string' || !frame.id || frame.parentId) {
        throw new Error('Main frame is no longer an allowed chart.');
      }
      try {
        const { executionContextId } = await client.call('Page.createIsolatedWorld', { frameId: frame.id, worldName: 'tv-local-skins-v1' });
        if (!Number.isSafeInteger(executionContextId) || executionContextId < 1) throw new Error('Invalid isolated context.');
        const result = await client.call('Runtime.evaluate', { expression, contextId: executionContextId, returnByValue: true });
        if (result.exceptionDetails) throw new Error('DOM injection failed or page navigated.');
        return validateResult(result.result?.value, action);
      } catch (error) { if (attempt === 1) throw error; }
    }
  } finally { client.close(); }
}
