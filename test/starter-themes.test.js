import test from 'node:test';import assert from 'node:assert/strict';import {BUILTINS,loadSkin} from '../src/skin.js';
test('six starter themes are listed and each loads as a valid shareable palette',async()=>{
 const expected=['polar','charcoal','midnight','forest','amethyst','ocean'];
 assert.deepEqual([...BUILTINS],expected);
 const surfaces=new Set();for(const id of expected){const skin=await loadSkin(id);assert.equal(skin.id,id);surfaces.add(skin.palette.surface)}
 assert.equal(surfaces.size,expected.length,'Starter themes must have distinct surfaces');
});
