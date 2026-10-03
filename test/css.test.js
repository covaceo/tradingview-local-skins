import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSkin } from '../src/skin.js';
import { renderCSS, SELECTORS, ROOT_ATTRIBUTE, STYLE_ID } from '../src/css.js';

test('built-in skins render scoped chrome-only CSS without trading or layout overrides', async () => {
  for (const name of ['polar', 'charcoal']) {
    const skin = await loadSkin(name);
    const css = renderCSS(skin);
    assert.equal(STYLE_ID, 'tv-local-skins-v1');
    assert.equal(ROOT_ATTRIBUTE, 'data-tv-local-skins-v1');
    for (const selector of Object.values(SELECTORS)) assert.ok(css.includes(selector));
    assert.ok(css.includes(`[${ROOT_ATTRIBUTE}^="v1:${skin.id}:"]`));
    assert.ok(css.includes(skin.palette.background));
    assert.ok(css.includes('--tv-color-toolbar-button-text'));
    assert.doesNotMatch(css, /display\s*:|visibility\s*:|pointer-events|position\s*:|z-index|canvas|iframe|\*|url\(|@import/);
    assert.doesNotMatch(css, /(?:^|[;{\s])color\s*:/m);
  }
  assert.throws(() => renderCSS({ palette: { background: 'url(evil)' } }));
});

test('chrome CSS reaches the observed painted drawing toolbar with every selector still root-scoped', async () => {
  const css = renderCSS(await loadSkin('polar'));
  assert.match(css, /html\[data-tv-local-skins-v1\^="v1:polar:"\] :is\([^)]*\.layout__area--left #drawing-toolbar/);
});
