import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { loadSkin } from '../src/skin.js';

test('file loader reads bounded local JSON and rejects directories, huge files and executable palette input', async () => {
  const folder = new URL('../.qa/skin-file-fixtures/', import.meta.url);
  await mkdir(folder, { recursive: true });
  try {
    const polar = await loadSkin('polar');
    const file = new URL('custom.json', folder);
    await writeFile(file, JSON.stringify({ ...polar, id: 'custom', name: 'Custom' }));
    assert.equal((await loadSkin(file)).id, 'custom');
    await writeFile(file, JSON.stringify(polar) + ' '.repeat(16385));
    await assert.rejects(loadSkin(file), /16 KiB/);
    await writeFile(file, JSON.stringify({ ...polar, palette: { ...polar.palette, accent: '";globalThis.pwned=1;//' } }));
    await assert.rejects(loadSkin(file), /#RRGGBB/);
    await assert.rejects(loadSkin(folder));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
