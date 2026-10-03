import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {loadSkin} from '../src/skin.js';import {injectionExpression} from '../src/injection.js';import {STYLE_ID,ROOT_ATTRIBUTE} from '../src/css.js';import {domFixture} from './fixtures/dom.js';

test('reconnecting with a fresh isolated global keeps ownership and reverses the original DOM attribute',async()=>{
 const polar=await loadSkin('polar'),charcoal=await loadSkin('charcoal');
 for(const original of [null,'','existing-value']){
  const shared=domFixture(),doc=shared.document;
  if(original!==null)doc.documentElement.setAttribute(ROOT_ATTRIBUTE,original);
  const unrelated=doc.createElement('style');unrelated.id='foreign-style';unrelated.textContent='body {color:red}';doc.head.appendChild(unrelated);
  const run=(action,skin)=>vm.runInContext(injectionExpression(action,skin),vm.createContext({...shared}));
  assert.equal(run('apply',polar).status,'applied');const owned=doc.getElementById(STYLE_ID);
  assert.equal(run('apply',polar).status,'unchanged','A new CDP connection must adopt our owned style without confusing it with a foreign collision');
  assert.equal(run('apply',charcoal).status,'applied');assert.equal(doc.getElementById(STYLE_ID),owned);
  assert.equal(run('remove').status,'removed');assert.equal(doc.getElementById(STYLE_ID),null);
  assert.equal(doc.documentElement.hasAttribute(ROOT_ATTRIBUTE),original!==null);assert.equal(doc.documentElement.getAttribute(ROOT_ATTRIBUTE),original);
  assert.equal(unrelated.isConnected,true);assert.equal(unrelated.textContent,'body {color:red}');assert.equal(run('remove').status,'absent');
 }
});

test('fresh isolated worlds recover a missing stylesheet and still restore the original root attribute', async () => {
  const skin = await loadSkin('polar');
  for (const original of [null, '', 'prior-value']) {
    const shared = domFixture();
    if (original !== null) shared.document.documentElement.setAttribute(ROOT_ATTRIBUTE, original);
    const run = (action, value) => vm.runInContext(injectionExpression(action, value), vm.createContext({ ...shared }));
    run('apply', skin);
    shared.document.getElementById(STYLE_ID).remove();
    assert.equal(run('apply', skin).status, 'applied');
    assert.equal(run('remove').status, 'removed');
    assert.equal(shared.document.documentElement.getAttribute(ROOT_ATTRIBUTE), original);
    run('apply', skin);
    shared.document.getElementById(STYLE_ID).remove();
    assert.equal(run('remove').status, 'removed');
    assert.equal(shared.document.documentElement.getAttribute(ROOT_ATTRIBUTE), original);
  }
});
