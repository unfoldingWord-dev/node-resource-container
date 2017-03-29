'use strict';

let disk = {};

/**
 * Recursively creates a file
 * @param parentDir
 * @param path
 * @param data
 */
function writePath(parentDir, path, data) {
    path = path.replace(/\/+/g, '/').replace(/\/+$/, '');
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
        parentDir[file].content = data.toString();
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

    if(!parentDir[file]) throw new Error('File does not exist: ' + path);

    if(files.length > 0) {
        try {
            return readPath(parentDir[file].tree, files.join('/'));
        } catch(err) {
            throw new Error('The file does not exist: ' + path);
        }
    } else {
        return parentDir[file];
    }
}

function unlink(parentDir, path) {
    path = path.replace(/\/+/g, '/').replace(/\/+$/, '');
    let files = path.split('/');
    let file = files.shift();

    if(!parentDir[file]) return;

    if(files.length > 0) {
        return unlink(parentDir[file].tree, files.join('/'));
    } else {
        delete parentDir[file];
    }
}

function stat(path, callback) {
    try {
        // check that path exists
        readPath(disk, path);
        let stats = {
            isFile: jest.fn(function() {
                let content = readPath(disk, path).content;
                return content !== null && content !== undefined;
            }),
            isDirectory: jest.fn(function() {
                let content = readPath(disk, path).content;
                return content === null || content === undefined;
            })
        };
        callback(null, stats);
    } catch(err) {
        callback(err, null);
    }
}

module.exports = {
    get __disk() {
        return disk;
    },
    writeFileSync: jest.fn(writeFileSync),
    writeFile: jest.fn(function(path, contents, callback) {
        setTimeout(function() {
            writeFileSync(path, contents);
            callback(null);
        }, 0);
    }),
    stat: jest.fn(stat),
    lstat: jest.fn(stat),
    mkdirSync: jest.fn(function(path, opts) {
        // This is cheating because mkdirSync does not work recursively.
        writePath(disk, path, null);
    }),
    readFileSync: jest.fn(function(path, opts) {
        return readPath(disk, path).content;
    }),
    readdir: jest.fn(function(path, options, callback) {
        if(typeof options === 'function') {
            callback = options;
            options = {};
        }
        try {
            let file = readPath(disk, path);
            callback(null, Object.keys(file.tree));
        } catch(err) {
            callback(err, []);
        }
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
        let contents = null;
        contents = readPath(disk, path).content;
        return {
            isFile: jest.fn(function() {
                return contents !== null && contents !== undefined;
            }),
            isDirectory: jest.fn(function() {
                return contents === null || contents === undefined;
            })
        };
    }),
    unlinkSync: jest.fn(function(path) {
        unlink(disk, path);
    })
};