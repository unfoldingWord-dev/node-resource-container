'use strict';

var fs = require('fs');


module.exports = {
    sync: jest.fn(function(path) {
        fs.writeFileSync(path);
    })
};