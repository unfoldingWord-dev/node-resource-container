'use strict';

let disk = {};

/**
 * Recursively creates a file
 * @param parentDir
 * @param path
 * @param data
 */
function writePath(parentDir, path, data) {
    let files = path.split('/');
    let file = files.shift();

    // init file
    if(!parentDir[file]) parentDir[file] = {
        content: undefined,
        tree: {}
    };

    if(files.length > 0) {
        writePath(parentDir[file].tree, files.join('/'), data);
    } else if(data) {
        parentDir[file].content = data;
    }
}

function writeFileSync(path, contents) {
    contents = contents || null;
    writePath(disk, path, contents);
}

function readPath(parentDir, path) {
    path = path.replace(/\/+/g, '/').replace(/\/+$/, '');
    let files = path.split('/');
    let file = files.shift();

    if(!parentDir[file]) throw new Error('File does not exist');

    if(files.length > 0) {
        return readPath(parentDir[file].tree, files.join('/'));
    } else {
        return parentDir[file];
    }
}

module.exports = {
    writeFileSync: jest.fn(writeFileSync),
    writeFile: jest.fn(function(path, contents, callback) {
        setTimeout(function() {
            writeFileSync(path, contents);
            callback(null);
        }, 0);
    }),
    mkdirSync: jest.fn(function(path, opts) {
        // This is cheating because mkdirSync does not work recursively.
        writePath(disk, path, null);
    }),
    readFileSync: jest.fn(function(path, opts) {
        return readPath(disk, path).content;
    }),
    readdirSync: jest.fn(function(dir) {
        let tree = readPath(disk, dir).tree;
        let files = [];
        for(let key of Object.keys(tree)) {
            files.push(dir.replace(/\/+$/, '') + '/' + key);
        }
        return files;
    }),
    statSync: jest.fn(function(path) {
        let contents = readPath(disk, path).content;
        return {
            isFile: jest.fn(function() {
                return contents !== null && contents !== undefined;
            }),
            isDirectory: jest.fn(function() {
                return contents === null || contents === undefined;
            })
        };
    })
};