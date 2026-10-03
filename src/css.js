import { parseSkin } from './skin.js';

export const ROOT_ATTRIBUTE = 'data-tv-local-skins-v1';
export const STYLE_ID = 'tv-local-skins-v1';
// Upstream DOM is not a stable API. Keep these four regions auditable; do not
// add broad descendant/text rules, chart selectors, dialogs or native chrome.
export const SELECTORS = Object.freeze({
  header: '.layout__area--top, .layout__area--top .header-chart-panel',
  tools: '.layout__area--left, .layout__area--left #drawing-toolbar',
  sidebar: '.layout__area--right, .layout__area--right .widgetbar-tabs, .layout__area--right .widgetbar-pages',
  bottom: '.layout__area--bottom, .layout__area--bottom .bottom-widgetbar-content'
});
export function renderCSS(value) {
  const skin = parseSkin(JSON.stringify(value));
  const p = skin.palette;
  const scope = `html[${ROOT_ATTRIBUTE}^="v1:${skin.id}:"]`;
  return Object.values(SELECTORS).map(selector => `${scope} :is(${selector}) {
  background-color: ${p.background} !important;
  border-color: ${p.border} !important;
  --tv-color-platform-background: ${p.background};
  --tv-color-pane-background: ${p.surface};
  --tv-color-toolbar-button-background-hover: ${p.hover};
  --tv-color-toolbar-button-background-active: ${p.surface};
  --tv-color-toolbar-button-text: ${p.text};
  --tv-color-toolbar-button-text-hover: ${p.text};
  --tv-color-toolbar-button-text-active: ${p.accent};
  --tv-color-toolbar-divider-background: ${p.border};
  --tv-color-toolbar-button-text-disabled: ${p.muted};
}`).join('\n');
}
