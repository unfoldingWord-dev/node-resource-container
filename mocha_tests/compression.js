var rc = require('../');
var rimraf = require('rimraf');
var assert = require('assert');
describe('Container Manipulation', function() {

    beforeEach(function() {
        rimraf.sync('mocha_tests/out');
    });

    describe('open container', function() {
        it('should return a container object when opening a valid archive', function() {
            return rc.open('mocha_tests/en_gen_ulb.tsrc', 'mocha_tests/out/en_gen_ulb');
        });

        it('should return a container object when opening a valid directory', function() {
            return rc.open('mocha_tests/en_gen_tnb.tsrc', 'mocha_tests/en_gen_tn')
                .then(function(container) {
                    assert.notEqual(null, container);
                    assert.equal('mocha_tests/en_gen_tn', container.path);
                });
        });

        it('should not open a missing container', function() {
            return rc.open('mocha_test/missing.tsrc', 'mocha_tests/missing')
                .catch(function(err) {
                    assert.equal('Error: Missing resource container', err);
                });
        });
    });

    describe('close container', function() {
        it('should return the archive path after successfully closing a container', function() {
            return rc.close('mocha_tests/en_gen_tn', 'mocha_tests/out/en_gen_tn.closed.tsrc', { compression_method : 'tar', clean : false });
        });

        it('should not close a missing container', function() {
            return rc.open('mocha_test/missing', 'mocha_tests/missing.tsrc')
                .catch(function(err) {
                    assert.equal('Error: Missing resource container', err);
                });
        });
    });
});