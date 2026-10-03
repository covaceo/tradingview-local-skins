import { open } from 'node:fs/promises';

export const PALETTE_KEYS = Object.freeze(['background', 'surface', 'border', 'text', 'muted', 'accent', 'hover']);
export const BUILTINS = Object.freeze(['polar', 'charcoal', 'midnight', 'forest', 'amethyst', 'ocean']);
const LIMIT = 16384;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function exact(value, keys) {
  if (!plain(value) || Object.keys(value).length !== keys.length ||
      Object.keys(value).some(key => !keys.includes(key))) throw new Error('Skin has missing or unknown keys.');
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(s => parseInt(s, 16) / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
export function parseSkin(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > LIMIT) throw new Error('Skin exceeds 16 KiB.');
  let skin;
  try { skin = JSON.parse(source); } catch { throw new Error('Skin must be valid JSON.'); }
  exact(skin, ['version', 'id', 'name', 'palette']);
  if (skin.version !== 1 || typeof skin.id !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(skin.id) ||
      typeof skin.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,59}$/.test(skin.name)) {
    throw new Error('Skin version, id or name is invalid.');
  }
  exact(skin.palette, PALETTE_KEYS);
  for (const color of Object.values(skin.palette)) {
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('Colors must be #RRGGBB.');
  }
  for (const bg of ['background', 'surface', 'hover']) {
    if (contrast(skin.palette.text, skin.palette[bg]) < 4.5 || contrast(skin.palette.muted, skin.palette[bg]) < 3) {
      throw new Error('Palette needs text contrast >=4.5 and muted contrast >=3 on chrome surfaces.');
    }
  }
  return skin;
}
export async function loadSkin(nameOrFile) {
  const path = BUILTINS.includes(nameOrFile) ? new URL(`../skins/${nameOrFile}.json`, import.meta.url) : nameOrFile;
  if (!path) throw new Error('Specify --skin NAME or FILE.');
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(LIMIT + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return parseSkin(buffer.subarray(0, bytesRead).toString('utf8'));
  } finally { await handle.close(); }
}
