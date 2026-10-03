// A small DOM boundary fixture, not a DOM/parser reimplementation. The real
// hardcoded injection program runs in vm; native Desktop verification is separate.
export function domFixture(url = 'https://www.tradingview.com/chart/') {
  const elements = [];
  class Element {
    constructor(tagName) { this.tagName = tagName.toUpperCase(); this.attributes = new Map(); this.textContent = ''; this.id = ''; this.isConnected = false; }
    hasAttribute(name) { return this.attributes.has(name); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.isConnected = true; if (!elements.includes(child)) elements.push(child); return child; }
    remove() { this.isConnected = false; }
    getBoundingClientRect() { return { width: 100, height: 40 }; }
  }
  const root = new Element('html');
  root.isConnected = true;
  const head = new Element('head');
  const document = {
    documentElement: root, head,
    createElement: tag => new Element(tag),
    getElementById: id => elements.find(element => element.id === id && element.isConnected) ?? null,
    querySelectorAll: selector => elements.filter(element => element.selector === selector && element.isConnected)
  };
  return { document, URL, location: { href: url }, getComputedStyle: () => ({ backgroundColor: 'rgb(16, 23, 34)', visibility: 'visible', display: 'block' }) };
}
