import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadSkin } from '../src/skin.js';
import { renderCSS, STYLE_ID, ROOT_ATTRIBUTE, SELECTORS } from '../src/css.js';
import { injectionExpression } from '../src/injection.js';
import { domFixture } from './fixtures/dom.js';

test('trusted DOM injection applies once, replaces only owned CSS and reverses original attribute state', async () => {
  const polar = await loadSkin('polar');
  const charcoal = await loadSkin('charcoal');
  for (const original of [null, '', 'existing-value']) {
    const context = vm.createContext(domFixture());
    const doc = context.document;
    if (original !== null) doc.documentElement.setAttribute(ROOT_ATTRIBUTE, original);
    const unrelated = doc.createElement('style');
    unrelated.id = 'unrelated'; unrelated.textContent = 'body {color:red}'; doc.head.appendChild(unrelated);
    const region = doc.createElement('div'); region.selector = SELECTORS.header; doc.head.appendChild(region);
    const apply = skin => vm.runInContext(injectionExpression('apply', skin), context);
    assert.equal(apply(polar).status, 'applied');
    const owned = doc.getElementById(STYLE_ID);
    assert.equal(owned.textContent, renderCSS(polar));
    assert.equal(apply(polar).status, 'unchanged');
    assert.equal(apply(charcoal).status, 'applied');
    assert.equal(doc.getElementById(STYLE_ID), owned);
    assert.equal(owned.textContent, renderCSS(charcoal));
    owned.remove();
    assert.equal(apply(polar).status, 'applied');
    assert.equal(apply(polar).coverage.header.visible, 1);
    assert.equal(vm.runInContext(injectionExpression('remove'), context).status, 'removed');
    assert.equal(doc.getElementById(STYLE_ID), null);
    assert.equal(doc.documentElement.getAttribute(ROOT_ATTRIBUTE), original);
    assert.equal(doc.documentElement.hasAttribute(ROOT_ATTRIBUTE), original !== null);
    assert.equal(unrelated.textContent, 'body {color:red}');
    assert.equal(vm.runInContext(injectionExpression('remove'), context).status, 'absent');
  }
  const collision = vm.createContext(domFixture());
  const style = collision.document.createElement('style'); style.id = STYLE_ID; collision.document.head.appendChild(style);
  assert.throws(() => vm.runInContext(injectionExpression('apply', polar), collision), /collision/);
  const wrongPage = vm.createContext(domFixture('https://example.test/'));
  assert.throws(() => vm.runInContext(injectionExpression('apply', polar), wrongPage), /allowed chart/);
  assert.equal(wrongPage.document.getElementById(STYLE_ID), null);
  assert.throws(() => injectionExpression('apply', { ...polar, name: '";evil()' }));
});

test('removal keeps later foreign root changes and refuses to touch a replacement foreign style', async () => {
  const skin = await loadSkin('polar');
  const context = vm.createContext(domFixture());
  vm.runInContext(injectionExpression('apply', skin), context);
  context.document.documentElement.setAttribute(ROOT_ATTRIBUTE, 'foreign-change');
  assert.equal(vm.runInContext(injectionExpression('remove'), context).status, 'removed');
  assert.equal(context.document.documentElement.getAttribute(ROOT_ATTRIBUTE), 'foreign-change');
  vm.runInContext(injectionExpression('apply', skin), context);
  context.document.getElementById(STYLE_ID).remove();
  const foreign = context.document.createElement('style'); foreign.id = STYLE_ID; foreign.textContent = 'foreign'; context.document.head.appendChild(foreign);
  assert.throws(() => vm.runInContext(injectionExpression('remove'), context), /collision/);
  assert.equal(foreign.isConnected, true);
  assert.equal(foreign.textContent, 'foreign');
  context.location.href = 'https://www.tradingview.com/accounts/';
  assert.throws(() => vm.runInContext(injectionExpression('remove'), context), /allowed chart/);
});
