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