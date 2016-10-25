var rc = require('../');
var rimraf = require('rimraf');
var ncp = require('ncp').ncp;
var mkdirp = require('mkdirp');
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
            // stage files
            return new Promise(function(resolve, reject) {
                mkdirp.sync('mocha_tests/out/');
                ncp('mocha_tests/en_gen_tn', 'mocha_tests/out/en_gen_tn', function(err) {
                    if(err) {
                        reject(err)
                    } else {
                        resolve();
                    }
                });
            }).then(function() {
                return rc.close('mocha_tests/out/en_gen_tn', { compression_method : 'tar', clean : false });
            });
        });

        it('should not close a missing container', function() {
            return rc.open('mocha_test/missing', 'mocha_tests/out/missing.tsrc')
                .catch(function(err) {
                    assert.equal('Error: Missing resource container', err);
                });
        });
    });

    describe('re-open container', function() {
        it('should close a container then re-open it successfully', function() {
            this.timeout(10000);
            // stage files
            return new Promise(function(resolve, reject) {
                mkdirp.sync('mocha_tests/out/');
                ncp('mocha_tests/en_gen_tn', 'mocha_tests/out/en_gen_tn.openme', function(err) {
                    if(err) {
                        reject(err)
                    } else {
                        resolve();
                    }
                });
            }).then(function() {
                return rc.close('mocha_tests/out/en_gen_tn.openme', { compression_method : 'tar', clean : false });
            }).then(function(path) {
                return rc.open(path, 'mocha_tests/out/en_gen_tn.reopened');
            }).then(function(container) {
                assert.notEqual(null, container);
                assert.equal('mocha_tests/out/en_gen_tn.reopened', container.path);
            });
        });
    });
});