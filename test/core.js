var assert = require('assert');
var sprezzatura = require("../src/index");
var h = require("../src/h");

describe('sprezzatura', function () {
    var elm, vnode0;
    beforeEach(function (done) {
        if (!global.document) {
            require("js"+"dom").env('<html><body></body></html>', function (err, window) {
                global.document = window.document;
                global.Element = window.Element;
                window.close();
                elm = document.createElement('div');
                vnode0 = elm;
                done();
            });
        } else {
            done();
        }
    });

    it('should HR', function () {
        var vDom = h("hr");
        var dom = sprezzatura.vDomToDom(vDom);
        assert.equal(dom.tagName, 'HR');
    });


});