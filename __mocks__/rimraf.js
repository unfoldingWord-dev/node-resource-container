'use strict';

var rimraf = jest.fn(function(p, options, cb) {

});
rimraf.sync = jest.fn(function(p, options) {

});

module.exports = rimraf;