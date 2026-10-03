import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {assertDirectNetworking} from '../src/guards.js';import {loadSkin} from '../src/skin.js';import {injectionExpression} from '../src/injection.js';import {ROOT_ATTRIBUTE} from '../src/css.js';import {domFixture} from './fixtures/dom.js';
test('quoted Node proxy options are refused before opening loopback transport',()=>{
 for(const options of ['"--use-env-proxy"','  "--use-env-proxy"  ','--trace-warnings "--use-env-proxy"'])assert.throws(()=>assertDirectNetworking({env:{NODE_OPTIONS:options},execArgv:[]}),/proxy/);
});
test('watch reapply preserves later foreign root changes as the removal baseline across fresh globals',async()=>{
 const skin=await loadSkin('polar');
 for(const foreign of [null,'','foreign-change']){
  const shared=domFixture(),root=shared.document.documentElement;root.setAttribute(ROOT_ATTRIBUTE,'original-value');
  const run=action=>vm.runInContext(injectionExpression(action,action==='apply'?skin:undefined),vm.createContext({...shared}));
  run('apply');if(foreign===null)root.removeAttribute(ROOT_ATTRIBUTE);else root.setAttribute(ROOT_ATTRIBUTE,foreign);
  assert.equal(run('apply').status,'applied');assert.equal(run('remove').status,'removed');
  assert.equal(root.hasAttribute(ROOT_ATTRIBUTE),foreign!==null);assert.equal(root.getAttribute(ROOT_ATTRIBUTE),foreign,'Reapply must not discard a later foreign change');
 }
});
