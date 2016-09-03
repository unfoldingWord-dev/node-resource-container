'use strict';

const fs = require('fs');
const Bzip2 = require('compressjs').Bzip2;
const AdmZip = require('adm-zip');
const archiver = require('archiver');
const rimraf = require('rimraf');
const path = require('path');
const tar = require('tar-fs');

module.exports = {
    /**
     * Zips up a directory.
     *
     * @param sourceDir {string} the directory to be zipped
     * @param destFile {string} the output file
     * @param opts {{}}
     * @returns {Promise.<string>} path to the archive
     */
    zip: function(sourceDir, destFile, opts) {
        opts = opts || { archive_path: '/' };
        return new Promise(function (resolve, reject) {
            try {
                var archive = archiver.create('zip', {
                    zlib: {
                        level: 9
                    }
                });
                var output = fs.createWriteStream(destFile);
                output.on('finish', function () {
                    resolve(destFile);
                });
                archive.pipe(output);
                archive.directory(sourceDir, opts.archive_path);
                archive.finalize();
            } catch(err) {
                reject(err);
            }
        });
    },


    /**
     * Extracts a zip to a directory.
     * This will fail if the destination already exists.
     *
     * @param sourceFile {string}
     * @param destDir {string}
     * @returns {Promise.<string>} path to the destination
     */
    unzip: function(sourceFile, destDir) {
        return new Promise(function(resolve, reject) {
            var zip = new AdmZip(sourceFile);
            try {
                zip.extractAllTo(destDir);
                resolve(destDir);
            } catch(err) {
                reject(err);
            }
        });
    },

    /**
     * Create a Bzip2 compressed tar of a directory.
     *
     * @param sourceDir {string} the directory to be compressed
     * @param destFile {string} the output file
     * @param opts {{}}
     * @returns {Promise.<string>} path to the archive
     */
    tar: function(sourceDir, destFile, opts) {
        opts = opts || { archive_path: '/' };
        return new Promise(function(resolve, reject) {
            // pack
            var tempFile = destFile + '.tmp.tar';
            try {
                var archive = archiver.create('tar');
                var output = fs.createWriteStream(tempFile);
                output.on('finish', function () {
                    resolve(tempFile);
                });
                archive.pipe(output);
                archive.directory(sourceDir, opts.archive_path);
                archive.finalize();
            } catch (err) {
                reject(err);
            }
        })
            .then(function(tempFile) {
                // compress
                try {
                    var data = new Buffer(fs.readFileSync(tempFile), 'utf8');
                    var compressed = new Buffer(Bzip2.compressFile(data));
                    fs.writeFileSync(destFile, compressed);
                    return destFile;
                } catch(err) {
                    throw err;
                } finally {
                    rimraf.sync(tempFile);
                }
            });
    },

    /**
     * Extracts a tar to a directory.
     *
     * @param sourceFile {string}
     * @param destDir {string}
     * @returns {Promise.<string>} path to the destination
     */
    untar: function(sourceFile, destDir) {
        return new Promise(function(resolve, reject) {
            // expand
            var tempFile = sourceFile + '.tmp.tar';
            try {
                var data = new Buffer(fs.readFileSync(sourceFile));
                var expanded = Bzip2.decompressFile(data);
                fs.writeFileSync(tempFile, new Buffer(expanded));
                resolve(tempFile);
            } catch(err) {
                reject(err);
            }
        }).then(function(tempFile) {
            // un-pack
            return new Promise(function(resolve, reject) {
                try {
                    var rs = fs.createReadStream(tempFile);
                    rs.pipe(tar.extract(destDir).on('finish', function() {
                        rimraf.sync(tempFile);
                        resolve(destDir);
                    }));
                } catch (err) {
                    rimraf.sync(tempFile);
                    reject(err);
                }
            });
        });
    },

    /**
     * Reads a path within a tar archive.
     *
     * @param sourceFile {string} the path to the tar file
     * @param path {string} the path inside the tar file to read
     * @returns {Promise.<ReadStream>} the contents of the path in the tar file
     */
    readtar: function(sourceFile, path) {
        return new Promise(function(resolve, reject) {
            reject('not implemented');
        });
    }
};