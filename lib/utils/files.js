'use strict';

const fs = require('fs');

module.exports = {

    /**
     * Checks if a file exists.
     *
     * @param file {string}
     * @returns {boolean}
     */
    fileExists: function(file) {
        try {
            fs.statSync(file);
            return true;
        } catch(err) {
            return false;
        }
    }
};