var rc = require('../');
var rimraf = require('rimraf');
var assert = require('assert');
describe('Container Manipulation', function() {

    beforeEach(function() {
        // rimraf.sync('mocha_tests/out');
    });

    describe('open container', function() {
        it('should return a container object when opening a valid archive', function() {
            return rc.open('mocha_tests/en_gen_ulb.tsrc', 'mocha_tests/out/en_gen_ulb');
        });

        it('should return a container object when opening a valid directory', function() {
            return rc.open('mocha_tests/en_gen_tnb.tsrc', 'mocha_tests/en_gen_tn');
        });
    });
});