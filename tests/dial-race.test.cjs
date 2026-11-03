const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('repeated mutations and detached dials cannot paint stale animation targets', () => {
  for (const detached of [false, true]) {
    const frames = []; let observe; let paints = 0;
    const w = {isConnected: true, dataset: {dial:'sleep', to:'0'},
      hasAttribute: k => k === 'data-to' && w.dataset.to !== undefined,
      removeAttribute: () => {delete w.dataset.to;},
      style: {setProperty: () => paints++}, classList:{toggle(){}},
      querySelector: () => null, querySelectorAll: () => []};
    vm.runInNewContext(fs.readFileSync('js/dial.js','utf8'), {
      dayCard(){}, S:{}, document:{body:{},addEventListener(){},querySelectorAll:()=>[w]},
      MutationObserver:class {constructor(cb){observe=cb;} observe(){}},
      requestAnimationFrame: cb => frames.push(cb)
    });
    observe(); observe(); w.isConnected = !detached;
    assert.doesNotThrow(() => {while(frames.length) frames.shift()();});
    assert.equal(paints, detached ? 0 : 3);
  }
});
