'use strict';

/**
 * Provides some file utilities
 */

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
            return fs.statSync(file).isFile();
        } catch(err) {
            return false;
        }
    },

    /**
     * Checks if a directory exists.
     *
     * @param dir
     * @returns {*}
     */
    directoryExists: function(dir) {
        try {
            return fs.statSync(file).isDirectory();
        } catch(err) {
            return false;
        }
    },

    /**
     * Deletes a file if it exists
     * @param file
     */
    unlinkSync: function(file) {
        if(this.fileExists(file)) {
            fs.unlinkSync(file);
        }
    }
};