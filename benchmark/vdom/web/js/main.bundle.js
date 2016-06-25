(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var benchmark = require('vdom-benchmark-base');
var sprezzatura = require('../../../../src/index');
var h = require('../../../../src/h');

var NAME = 'sprezzatura';
var VERSION = '0.1.0';

var elm = null;

function convertToVnodes(nodes) {
    var n, i, children = [];
    for (i = 0; i < nodes.length; ++i) {
        n = nodes[i];
        if (n.children !== null) {
            children.push(h('div', {key: n.key}, convertToVnodes(n.children)));
        } else {
            children.push(h('span', {key: n.key}, n.key));
        }
    }
    return children;
}

function BenchmarkImpl(container, a, b) {
    this.container = container;
    this.a = a;
    this.b = b;
    this.vnode = null;
}

BenchmarkImpl.prototype.setUp = function() {
};

BenchmarkImpl.prototype.tearDown = function() {
    var next = h('div');
    sprezzatura.updateDom(this.vnode, next, elm, elm.parentNode);
    this.vnode = next;
};

BenchmarkImpl.prototype.render = function() {
    this.vnode = h('div', convertToVnodes(this.a));
    elm = sprezzatura.vDomToDom(h('div', convertToVnodes(this.a)));
    this.container.appendChild(elm);
};

BenchmarkImpl.prototype.update = function() {
    var next = h('div', convertToVnodes(this.b));
    sprezzatura.updateDom(this.vnode, next, elm, elm.parentNode);
    this.vnode = next;
};

document.addEventListener('DOMContentLoaded', function(e) {
    benchmark(NAME, VERSION, BenchmarkImpl);
}, false);
},{"../../../../src/h":7,"../../../../src/index":8,"vdom-benchmark-base":6}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.REMOVE = exports.MOVE = exports.UPDATE = exports.CREATE = undefined;

var _bitVector = require('bit-vector');

/**
 * Actions
 */

var CREATE = 0; /**
                 * Imports
                 */

var UPDATE = 1;
var MOVE = 2;
var REMOVE = 3;

/**
 * dift
 */

function dift(prev, next, effect, key) {
  var pStartIdx = 0;
  var nStartIdx = 0;
  var pEndIdx = prev.length - 1;
  var nEndIdx = next.length - 1;
  var pStartItem = prev[pStartIdx];
  var nStartItem = next[nStartIdx];

  // List head is the same
  while (pStartIdx <= pEndIdx && nStartIdx <= nEndIdx && equal(pStartItem, nStartItem)) {
    effect(UPDATE, pStartItem, nStartItem, nStartIdx);
    pStartItem = prev[++pStartIdx];
    nStartItem = next[++nStartIdx];
  }

  // The above case is orders of magnitude more common than the others, so fast-path it
  if (nStartIdx > nEndIdx && pStartIdx > pEndIdx) {
    return;
  }

  var pEndItem = prev[pEndIdx];
  var nEndItem = next[nEndIdx];
  var movedFromFront = 0;

  // Reversed
  while (pStartIdx <= pEndIdx && nStartIdx <= nEndIdx && equal(pStartItem, nEndItem)) {
    effect(MOVE, pStartItem, nEndItem, pEndIdx - movedFromFront + 1);
    pStartItem = prev[++pStartIdx];
    nEndItem = next[--nEndIdx];
    ++movedFromFront;
  }

  // Reversed the other way (in case of e.g. reverse and append)
  while (pEndIdx >= pStartIdx && nStartIdx <= nEndIdx && equal(nStartItem, pEndItem)) {
    effect(MOVE, pEndItem, nStartItem, nStartIdx);
    pEndItem = prev[--pEndIdx];
    nStartItem = next[++nStartIdx];
    --movedFromFront;
  }

  // List tail is the same
  while (pEndIdx >= pStartIdx && nEndIdx >= nStartIdx && equal(pEndItem, nEndItem)) {
    effect(UPDATE, pEndItem, nEndItem, nEndIdx);
    pEndItem = prev[--pEndIdx];
    nEndItem = next[--nEndIdx];
  }

  if (pStartIdx > pEndIdx) {
    while (nStartIdx <= nEndIdx) {
      effect(CREATE, null, nStartItem, nStartIdx);
      nStartItem = next[++nStartIdx];
    }

    return;
  }

  if (nStartIdx > nEndIdx) {
    while (pStartIdx <= pEndIdx) {
      effect(REMOVE, pStartItem);
      pStartItem = prev[++pStartIdx];
    }

    return;
  }

  var created = 0;
  var pivotDest = null;
  var pivotIdx = pStartIdx - movedFromFront;
  var keepBase = pStartIdx;
  var keep = (0, _bitVector.createBv)(pEndIdx - pStartIdx);

  var prevMap = keyMap(prev, pStartIdx, pEndIdx + 1, key);

  for (; nStartIdx <= nEndIdx; nStartItem = next[++nStartIdx]) {
    var oldIdx = prevMap[key(nStartItem)];

    if (isUndefined(oldIdx)) {
      effect(CREATE, null, nStartItem, pivotIdx++);
      ++created;
    } else if (pStartIdx !== oldIdx) {
      (0, _bitVector.setBit)(keep, oldIdx - keepBase);
      effect(MOVE, prev[oldIdx], nStartItem, pivotIdx++);
    } else {
      pivotDest = nStartIdx;
    }
  }

  if (pivotDest !== null) {
    (0, _bitVector.setBit)(keep, 0);
    effect(MOVE, prev[pStartIdx], next[pivotDest], pivotDest);
  }

  // If there are no creations, then you have to
  // remove exactly max(prevLen - nextLen, 0) elements in this
  // diff. You have to remove one more for each element
  // that was created. This means once we have
  // removed that many, we can stop.
  var necessaryRemovals = prev.length - next.length + created;
  for (var removals = 0; removals < necessaryRemovals; pStartItem = prev[++pStartIdx]) {
    if (!(0, _bitVector.getBit)(keep, pStartIdx - keepBase)) {
      effect(REMOVE, pStartItem);
      ++removals;
    }
  }

  function equal(a, b) {
    return key(a) === key(b);
  }
}

function isUndefined(val) {
  return typeof val === 'undefined';
}

function keyMap(items, start, end, key) {
  var map = {};

  for (var i = start; i < end; ++i) {
    map[key(items[i])] = i;
  }

  return map;
}

/**
 * Exports
 */

exports.default = dift;
exports.CREATE = CREATE;
exports.UPDATE = UPDATE;
exports.MOVE = MOVE;
exports.REMOVE = REMOVE;
},{"bit-vector":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Use typed arrays if we can
 */

var FastArray = typeof Uint32Array === 'undefined' ? Array : Uint32Array;

/**
 * Bit vector
 */

function createBv(sizeInBits) {
  return new FastArray(Math.ceil(sizeInBits / 32));
}

function setBit(v, idx) {
  var r = idx % 32;
  var pos = (idx - r) / 32;

  v[pos] |= 1 << r;
}

function clearBit(v, idx) {
  var r = idx % 32;
  var pos = (idx - r) / 32;

  v[pos] &= ~(1 << r);
}

function getBit(v, idx) {
  var r = idx % 32;
  var pos = (idx - r) / 32;

  return !!(v[pos] & 1 << r);
}

/**
 * Exports
 */

exports.createBv = createBv;
exports.setBit = setBit;
exports.clearBit = clearBit;
exports.getBit = getBit;
},{}],4:[function(require,module,exports){
'use strict';

var Executor = require('./executor');

function Benchmark() {
  this.running = false;
  this.impl = null;
  this.tests = null;
  this.reportCallback = null;
  this.enableTests = false;

  this.container = document.createElement('div');

  this._runButton = document.getElementById('RunButton');
  this._iterationsElement = document.getElementById('Iterations');
  this._reportElement = document.createElement('pre');

  document.body.appendChild(this.container);
  document.body.appendChild(this._reportElement);

  var self = this;

  this._runButton.addEventListener('click', function(e) {
    e.preventDefault();

    if (!self.running) {
      var iterations = parseInt(self._iterationsElement.value);
      if (iterations <= 0) {
        iterations = 10;
      }

      self.run(iterations);
    }
  }, false);

  this.ready(true);
}

Benchmark.prototype.ready = function(v) {
  if (v) {
    this._runButton.disabled = '';
  } else {
    this._runButton.disabled = 'true';
  }
};

Benchmark.prototype.run = function(iterations) {
  var self = this;
  this.running = true;
  this.ready(false);

  new Executor(self.impl, self.container, self.tests, 1, function() { // warmup
    new Executor(self.impl, self.container, self.tests, iterations, function(samples) {
      self._reportElement.textContent = JSON.stringify(samples, null, ' ');
      self.running = false;
      self.ready(true);
      if (self.reportCallback != null) {
        self.reportCallback(samples);
      }
    }, undefined, false).start();
  }, undefined, this.enableTests).start();
};

module.exports = Benchmark;

},{"./executor":5}],5:[function(require,module,exports){
'use strict';

function render(nodes) {
  var children = [];
  var j;
  var c;
  var i;
  var e;
  var n;

  for (i = 0; i < nodes.length; i++) {
    n = nodes[i];
    if (n.children !== null) {
      e = document.createElement('div');
      c = render(n.children);
      for (j = 0; j < c.length; j++) {
        e.appendChild(c[j]);
      }
      children.push(e);
    } else {
      e = document.createElement('span');
      e.textContent = n.key.toString();
      children.push(e);
    }
  }

  return children;
}

function testInnerHtml(testName, nodes, container) {
  var c = document.createElement('div');
  var e = document.createElement('div');
  var children = render(nodes);
  for (var i = 0; i < children.length; i++) {
    e.appendChild(children[i]);
  }
  c.appendChild(e);
  if (c.innerHTML !== container.innerHTML) {
    console.log('error in test: ' + testName);
    console.log('container.innerHTML:');
    console.log(container.innerHTML);
    console.log('should be:');
    console.log(c.innerHTML);
  }
}


function Executor(impl, container, tests, iterations, cb, iterCb, enableTests) {
  if (iterCb === void 0) iterCb = null;

  this.impl = impl;
  this.container = container;
  this.tests = tests;
  this.iterations = iterations;
  this.cb = cb;
  this.iterCb = iterCb;
  this.enableTests = enableTests;

  this._currentTest = 0;
  this._currentIter = 0;
  this._renderSamples = [];
  this._updateSamples = [];
  this._result = [];

  this._tasksCount = tests.length * iterations;

  this._iter = this.iter.bind(this);
}

Executor.prototype.start = function() {
  this._iter();
};

Executor.prototype.finished = function() {
  this.cb(this._result);
};

Executor.prototype.progress = function() {
  if (this._currentTest === 0 && this._currentIter === 0) {
    return 0;
  }

  var tests = this.tests;
  return (this._currentTest * tests.length + this._currentIter) / (tests.length * this.iterataions);
};

Executor.prototype.iter = function() {
  if (this.iterCb != null) {
    this.iterCb(this);
  }

  var tests = this.tests;

  if (this._currentTest < tests.length) {
    var test = tests[this._currentTest];

    if (this._currentIter < this.iterations) {
      var e, t;
      var renderTime, updateTime;

      e = new this.impl(this.container, test.data.a, test.data.b);
      e.setUp();

      t = window.performance.now();
      e.render();
      renderTime = window.performance.now() - t;

      if (this.enableTests) {
        testInnerHtml(test.name + 'render()', test.data.a, this.container);
      }

      t = window.performance.now();
      e.update();
      updateTime = window.performance.now() - t;

      if (this.enableTests) {
        testInnerHtml(test.name + 'update()', test.data.b, this.container);
      }

      e.tearDown();

      this._renderSamples.push(renderTime);
      this._updateSamples.push(updateTime);

      this._currentIter++;
    } else {
      this._result.push({
        name: test.name + ' ' + 'render()',
        data: this._renderSamples.slice(0)
      });

      this._result.push({
        name: test.name + ' ' + 'update()',
        data: this._updateSamples.slice(0)
      });

      this._currentTest++;

      this._currentIter = 0;
      this._renderSamples = [];
      this._updateSamples = [];
    }

    setTimeout(this._iter, 0);
  } else {
    this.finished();
  }
};

module.exports = Executor;

},{}],6:[function(require,module,exports){
'use strict';

var Benchmark = require('./benchmark');
var benchmark = new Benchmark();

function initFromScript(scriptUrl, impl) {
  var e = document.createElement('script');
  e.src = scriptUrl;

  e.onload = function() {
    benchmark.tests = window.generateBenchmarkData().units;
    benchmark.ready(true);
  };

  document.head.appendChild(e);
}

function initFromParentWindow(parent, name, version, id) {
  window.addEventListener('message', function(e) {
    var data = e.data;
    var type = data.type;

    if (type === 'tests') {
      benchmark.tests = data.data;
      benchmark.reportCallback = function(samples) {
        parent.postMessage({
          type: 'report',
          data: {
            name: name,
            version: version,
            samples: samples
          },
          id: id
        }, '*');
      };
      benchmark.ready(true);

      parent.postMessage({
        type: 'ready',
        data: null,
        id: id
      }, '*');
    } else if (type === 'run') {
      benchmark.run(data.data.iterations);
    }
  }, false);

  parent.postMessage({
    type: 'init',
    data: null,
    id: id
  }, '*');
}

function init(name, version, impl) {
  // Parse Query String.
  var qs = (function(a) {
    if (a == "") return {};
    var b = {};
    for (var i = 0; i < a.length; ++i) {
      var p=a[i].split('=', 2);
      if (p.length == 1) {
        b[p[0]] = "";
      } else {
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
    }
    return b;
  })(window.location.search.substr(1).split('&'));

  if (qs['name'] !== void 0) {
    name = qs['name'];
  }

  if (qs['version'] !== void 0) {
    version = qs['version'];
  }

  var type = qs['type'];

  if (qs['test'] !== void 0) {
    benchmark.enableTests = true;
    console.log('tests enabled');
  }

  var id;
  if (type === 'iframe') {
    id = qs['id'];
    if (id === void 0) id = null;
    initFromParentWindow(window.parent, name, version, id);
  } else if (type === 'window') {
    if (window.opener != null) {
      id = qs['id'];
      if (id === void 0) id = null;
      initFromParentWindow(window.opener, name, version, id);
    } else {
      console.log('Failed to initialize: opener window is NULL');
    }
  } else {
    var testsUrl = qs['data']; // url to the script generating test data
    if (testsUrl !== void 0) {
      initFromScript(testsUrl);
    } else {
      console.log('Failed to initialize: cannot load tests data');
    }
  }

  benchmark.impl = impl;
}

// performance.now() polyfill
// https://gist.github.com/paulirish/5438650
// prepare base perf object
if (typeof window.performance === 'undefined') {
  window.performance = {};
}
if (!window.performance.now){
  var nowOffset = Date.now();
  if (performance.timing && performance.timing.navigationStart) {
    nowOffset = performance.timing.navigationStart;
  }
  window.performance.now = function now(){
    return Date.now() - nowOffset;
  };
}

module.exports = init;

},{"./benchmark":4}],7:[function(require,module,exports){
module.exports = function (tagName, attributes, childs) {
    if (attributes instanceof Array) {
        childs = attributes;
        attributes = {};
    } else if (typeof (attributes) == "string") {
        childs = [attributes];
        attributes = {};
    }
    return [tagName, attributes || {}, childs || []];
};
},{}],8:[function(require,module,exports){
var dift = require('dift')


// Js types
var STRING          = 'string'
var NUMBER          = 'number'
var FUNCTION        = 'function'

// Props
var KEY             = 'key'
var VALUE           = 'value'
var CHECKED         = 'checked'
var SELECTED        = 'selected'
var DISABLED        = 'disabled'
var FOCUS           = 'focus'
var ON              = 'on'
var EMPTYSTRING     = ''

// Html
var VOID_ELEMENTS = { area:1, base:1, br:1, col:1, command:1, embed:1, hr:1, img:1, input:1, keygen:1, link:1, meta:1, param:1, source:1, track:1, wbr:1 }

// vDomType
var VATOM   = 0
var VNODE   = 1
var VCHILD  = 2
var VNULL   = 3


/*
vAtom :: 
    String
    Number

vNode :: 
    [String] 
    [String, { attrs }] 
    [String, { attrs }, [vDom ...]] 

vChild ::
    [Function, { params }, vNode?]

vDom :: 
    vAtom
    vNode
    vChild
    vNull
*/


// vDom -> vDomType
function getType (vDom) {

    if (vDom instanceof Array) {
        return typeof vDom[0] === FUNCTION ? VCHILD : VNODE

    } else if (typeof vDom === STRING || typeof vDom === NUMBER) {
        return VATOM

    } else {
        return VNULL
    }
}


// vDom -> int -> key
function keyOf (v, i) {
    return (v instanceof Array && v[1] && v[1].key) || i
}


// [vDom] -> [{ key: *, vDom: vDom, pos: i }]
function groupChildren (vDoms, DChildren) {
    var res = []
    var v
    var i
    for (i = 0; i < vDoms.length; i++) {
        v = vDoms[i]
        if (!(v === false || v === undefined || v === null)) {
            res.push({ key: keyOf(v, i), vDom: v, element: DChildren && DChildren[i] })
        }
    }
    return res
}


// vDom -> key
function getKey (v) { 
    return v.key 
}


// [vDom] -> [vDom] -> domNode -> domNode
function updateChildren (currentChildren, nextChildren, D) {

    dift.default(

        groupChildren(currentChildren, D.childNodes),
        groupChildren(nextChildren),

        function effect (type, current, next, pos) {

            switch (type){
                case dift.CREATE: // null, new, posToCreate
                    D.insertBefore(vDomToDom(next.vDom), D.childNodes[pos] || null)
                    break

                case dift.UPDATE: // old, new, null
                    updateDom(current.vDom, next.vDom, current.element, D)
                    break

                case dift.MOVE: // old, new, newPos
                    D.insertBefore(
                        updateDom(current.vDom, next.vDom, current.element, D), 
                        current.element
                    )
                    break

                case dift.REMOVE: // null, old, null
                    D.removeChild(current.element)
                    break
            }
        },

        getKey
    )

    return D
}


// vDom -> vDom -> domNode -> domNode -> domNode
function updateDom (current, next, D, DParent) {

    if (D === undefined) { throw new Error('No dom node to update') }

    if (current === next) { return }
    
    var currentExists = current !== undefined
    var nextExists    = next !== undefined

    if (!currentExists && nextExists) {
        DParent.appendChild(vDomToDom(next))

    } else if (currentExists && !nextExists) {
        DParent.removeChild(D)

    } else if (currentExists && nextExists) {

        var currentType   = getType(current)
        var nextType      = getType(next)

        if (shouldExploreFurther(current, next, currentType, nextType)) {

            switch (nextType) {

                case VNODE:
                    updateAttributes(current[1] || {}, next[1] || {}, D)
                    updateChildren(current[2] || [], next[2] || [], D)
                    break

                case VCHILD:
                    if (!next[0].shouldUpdate || next[0].shouldUpdate(current[1], next[1])) {
                        next[2] = next[0](next[1])
                        updateAttributes(current[2][1] || {}, next[2][1] || {}, D)
                        updateChildren(current[2][2] || [], next[2][2] || [], D)

                    } else {
                        next[2] = current[2]
                    }
                    break
            }

        } else if (current !== next) {
            DParent.replaceChild(vDomToDom(next), D)
        }
    }

    return D
}


// vDom -> vDom -> domNode -> domNode
function updateAttributes (currentAttrs, nextAttrs, D) {

    var a
    var currentVal
    var nextVal
    var evt
    var currentEvts = currentAttrs[ON]
    var nextEvts    = nextAttrs[ON]

    for (a in currentAttrs) { // remove all those not in B from A

        currentVal = currentAttrs[a]
        nextVal = nextAttrs[a]

        if (nextVal === undefined || nextVal === null || nextVal === false) {

            switch (a) {
                case ON:
                case KEY:
                    break
                case CHECKED:
                case DISABLED:
                case SELECTED:
                    D[a] = false
                    break
                case VALUE:
                    D.value = EMPTYSTRING
                    break
                case FOCUS:
                    D.blur()
                    break
                default:
                    D.removeAttribute(a)
                    break    
            }
        }
    } 

    for (a in nextAttrs) { // set all those in B to A

        currentVal = currentAttrs[a]
        nextVal = nextAttrs[a]

        if (!(nextVal === undefined || nextVal === null || nextVal === false) && 
            nextVal !== currentVal &&
            typeof nextVal !== FUNCTION) {

            switch (a) {
                case ON:
                case KEY:
                    break  
                case CHECKED:
                case DISABLED:
                case SELECTED:
                case VALUE:
                    D[a] = nextVal
                    break 
                case FOCUS:
                    D.focus()
                    break
                default:
                    D.setAttribute(a, nextVal)
                    break
            }
        }
    }

    // update event listeners
    if (currentEvts && !nextEvts) {
        for (evt in currentEvts) {
             D.removeEventListener(evt, currentEvts[evt])
        }

    } else if (!currentEvts && nextEvts) {
        for (evt in nextEvts) {
             D.addEventListener(evt, nextEvts[evt])
        }

    } else if (currentEvts && nextEvts) {
        for (evt in currentEvts) {
            if (!nextEvts[evt]) { 
                D.removeEventListener(evt, currentEvts[evt]) 
            }
        }
        for (evt in nextEvts) {
            if (!currentEvts[evt] && currentEvts[evt] !== nextEvts[evt]) { 
                D.addEventListener(evt, nextEvts[evt]) 
            }
        }
    }

    return D
}


// vDom -> vDom -> vType -> vType -> bool
function shouldExploreFurther (current, next, currentType, nextType) {
    return currentType === nextType &&
            (currentType === VNODE || currentType === VCHILD) &&
            current[0] === next[0]
}


// vDom -> HtmlString
function vDomToHtmlString (vDom) {

    switch (getType(vDom)) {

        case VCHILD:
            vDom[2] = vDom[0](vDom[1])
            return vNodeToHtmlString(vDom[2])

        case VNODE:
            return vNodeToHtmlString(vDom)

        case VATOM:
            return vDom

        default:
            return ''
    }
}


// vDom -> HtmlString
function vNodeToHtmlString (vDom) {

    var tag = vDom[0]
    var attrs = vDom[1]
    var val
    var children = vDom[2]
    var a
    var attrPairs = []
    var c
    var res

    for (a in attrs) {
        val = attrs[a]
        if (!(val === undefined || val === null || val === false) && a !== KEY && a !== ON) { 
            attrPairs.push(a + '="' + val + '"') 
        }
    }

    res = '<' + [tag].concat(attrPairs).join(' ') + '>'

    if (!VOID_ELEMENTS[tag]) {
        for (c = 0; c < children.length; c++) { 
            if (!(c === undefined || c === null || c === false)) {
                res += vDomToHtmlString(children[c]) 
            }
        }
        res += '</' + tag + '>'
    }

    return res
}


// vDom -> domNode
function vDomToDom (vDom) {

    switch (getType(vDom)) {

        case VATOM:
            return document.createTextNode(vDom)

        case VNODE:
        case VCHILD: // child rendering is handled by vDomToHtmlString
            var el = document.createElement('div')
            el.innerHTML = vDomToHtmlString(vDom)
            var dom = el.firstChild
            bindEvents(vDom, dom)
            return dom

        case VNULL:
            throw new Error('Null vdom')
    }
}



// vDom -> domNode -> _
function bindEvents (vDom, D) {

    var vType = getType(vDom)
    var vNode
    var evts
    var evt
    var child
    var children

    if (vType === VATOM || vType === VNULL) { return }

    vNode = vType === VCHILD ? vDom[2] : vDom
    evts = vNode[1][ON]
    children = vNode[2]

    if (evts) {
        for (evt in evts) {
             D.addEventListener(evt, evts[evt])
        }
    }

    if (children) {
        for (child = 0; child < children.length; child++) {
            bindEvents(children[child], D.childNodes[child])
        }
    }
}


module.exports = {
    vDomToHtmlString: vDomToHtmlString,
    vDomToDom: vDomToDom,
    updateDom: updateDom
}

},{"dift":2}]},{},[1]);
