import { isChartURL } from './guards.js';
import { renderCSS, STYLE_ID, ROOT_ATTRIBUTE, SELECTORS } from './css.js';

// Only this hardcoded DOM program is sent to the named isolated world. JSON
// palettes supply values, never executable source or user-provided CSS.
function domProgram(input, allowedChart) {
  if (!allowedChart(location.href)) throw new Error('Page is no longer an allowed chart.');
  const root = document.documentElement;
  if (!root || !document.head) throw new Error('Chart DOM is not ready.');
  const key = '__tvLocalSkinsOwnedV1';
  let state = globalThis[key];
  const existing = document.getElementById(input.styleId);
  function pack(saved, id = saved.id) {
    return `v1:${id}:` + JSON.stringify({ version: 1, previousPresent: saved.previousPresent, previousValue: saved.previousValue, id });
  }
  function unpack(raw) {
    if (typeof raw !== 'string' || raw.length > 131072) return null;
    const prefix = raw.match(/^v1:[a-z][a-z0-9-]{0,39}:/)?.[0];
    if (!prefix) return null;
    let saved;
    try { saved = JSON.parse(raw.slice(prefix.length)); } catch { return null; }
    if (!saved || Object.keys(saved).sort().join(',') !== 'id,previousPresent,previousValue,version' ||
        saved.version !== 1 || typeof saved.previousPresent !== 'boolean' ||
        (saved.previousPresent ? typeof saved.previousValue !== 'string' || saved.previousValue.length > 16384 : saved.previousValue !== null) ||
        typeof saved.id !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(saved.id) || pack(saved) !== raw) return null;
    return saved;
  }
  // Durable metadata lives only on our owned style and root attribute, so
  // reconnecting or losing the style still preserves the original attribute.
  if (!state && existing?.tagName === 'STYLE' && existing.getAttribute('data-tv-local-skins-owner') === 'v1') {
    const saved = unpack(existing.getAttribute('data-tv-local-skins-state'));
    if (saved) {
      state = { ...saved, style: existing };
      globalThis[key] = state;
    }
  }
  if (existing && (!state || existing !== state.style)) throw new Error('Owned style ID collision.');
  if (!state && !existing) {
    const saved = unpack(root.getAttribute(input.attribute));
    if (saved) {
      state = { ...saved, style: document.createElement('style') };
      state.style.id = input.styleId;
      state.style.setAttribute('data-tv-local-skins-owner', 'v1');
      globalThis[key] = state;
    }
  }
  if (input.action === 'remove') {
    if (!state) return { status: 'absent' };
    state.style.remove();
    if (root.getAttribute(input.attribute) === pack(state)) {
      if (state.previousPresent) root.setAttribute(input.attribute, state.previousValue);
      else root.removeAttribute(input.attribute);
    }
    delete globalThis[key];
    return { status: 'removed' };
  }
  // An explicit reapply may take the owned attribute back from another actor.
  // Preserve that actor's latest value, including absence, as the new baseline.
  if (state && root.getAttribute(input.attribute) !== pack(state)) {
    const currentValue = root.getAttribute(input.attribute);
    if ((currentValue?.length ?? 0) > 16384) throw new Error('Owned root attribute is too large to preserve.');
    state.previousPresent = root.hasAttribute(input.attribute);
    state.previousValue = currentValue;
  }
  if (!state) {
    if ((root.getAttribute(input.attribute)?.length ?? 0) > 16384) throw new Error('Owned root attribute is too large to preserve.');
    state = {
      style: document.createElement('style'),
      previousPresent: root.hasAttribute(input.attribute),
      previousValue: root.getAttribute(input.attribute), id: null
    };
    state.style.id = input.styleId;
    state.style.setAttribute('data-tv-local-skins-owner', 'v1');
    globalThis[key] = state;
  }
  const attributeValue = pack(state, input.id);
  const changed = !state.style.isConnected || state.style.textContent !== input.css || root.getAttribute(input.attribute) !== attributeValue;
  if (changed) {
    state.style.textContent = input.css;
    state.style.setAttribute('data-tv-local-skins-state', attributeValue);
    if (!state.style.isConnected) document.head.appendChild(state.style);
    root.setAttribute(input.attribute, attributeValue);
    state.id = input.id;
  }
  const coverage = {};
  const rgb = 'rgb(' + input.background.slice(1).match(/../g).map(hex => parseInt(hex, 16)).join(', ') + ')';
  for (const [name, selector] of Object.entries(input.selectors)) {
    const nodes = document.querySelectorAll(selector);
    let visible = 0, painted = 0;
    for (const element of Array.from(nodes).slice(0, 100)) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width > 0 && rect.height > 0 && style.visibility === 'visible' && style.display !== 'none') {
        visible++;
        if (style.backgroundColor === rgb) painted++;
      }
    }
    coverage[name] = { matched: Math.min(nodes.length, 100), visible, painted };
  }
  return { status: changed ? 'applied' : 'unchanged', coverage };
}
export function injectionExpression(action, skin) {
  if (!['apply', 'remove'].includes(action)) throw new Error('Invalid skin operation.');
  const input = { action, styleId: STYLE_ID, attribute: ROOT_ATTRIBUTE };
  if (action === 'apply') Object.assign(input, { css: renderCSS(skin), id: skin.id, background: skin.palette.background, selectors: SELECTORS });
  // Escaping is serialization, not interpolation of skin source into JS.
  return `(${domProgram.toString()})(${JSON.stringify(input)}, (${isChartURL.toString()}))`;
}
