import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSkin } from '../src/skin.js';

export const skin = { version: 1, id: 'polar', name: 'Polar', palette: {
  background: '#101722', surface: '#182234', border: '#41516a',
  text: '#e2e8f0', muted: '#aab8cd', accent: '#609cff', hover: '#263750'
} };

test('strict palette parser accepts a complete skin and rejects unsafe or malformed input', () => {
  assert.deepEqual(parseSkin(JSON.stringify(skin)), skin);
  for (const value of [
    { ...skin, css: 'body{}' }, { ...skin, version: 2 }, { ...skin, id: '../bad' },
    { ...skin, name: '<script>' }, { ...skin, palette: { ...skin.palette, text: 'red' } },
    { ...skin, palette: { ...skin.palette, url: 'https://evil.test' } },
    { ...skin, palette: { ...skin.palette, text: '#101722' } }
  ]) assert.throws(() => parseSkin(JSON.stringify(value)));
  for (const value of ['null', '[]', '{"__proto__":{}}', '{', ' '.repeat(16385)]) {
    assert.throws(() => parseSkin(value));
  }
});
