'use strict';

const fs = require('fs');
const path = require('path');
const fileUtils = require('./utils/files');
const compressionUtils = require('./utils/compression');
const promiseUtils = require('./utils/promises');
const YAML = require('yamljs');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

/**
 * Details about the container specification
 */
const spec = {
    version: '7.0',
    file_ext: 'ts'
};

/**
 * Returns a properly formatted container slug.
 *
 * @param language_slug {string}
 * @param project_slug {string}
 * @param container_type {string}
 * @param resource_slug {string}
 * @returns {string}
 */
function containerSlug(language_slug, project_slug, container_type, resource_slug) {
    if(!language_slug || !project_slug || !container_type || !resource_slug) throw new Error('Invalid resource container slug parameters');
    return language_slug
        + '_' + project_slug
        + '_' + container_type
        + '_' + resource_slug;
}

/**
 * Represents an instance of a resource container.
 *
 * @param container_directory
 * @param package_json {{}}
 * @constructor
 */
function Container(container_directory, package_json) {
    let config_yaml = {};
    try {
        config_yaml = fs.readFileSync(path.join(container_directory, 'config.yml'));
    } catch (err){
        console.error(err);
    }

    return {
        /**
         * Returns the path to the resource container directory
         * @returns {string}
         */
        get path () {
            return container_directory;
        },

        /**
         * Returns the slug of the resource container
         * @returns {string}
         */
        get slug () {
            return containerSlug(
                package_json.language.slug,
                package_json.project.slug,
                package_json.type,
                package_json.resource.slug);
        },

        /**
         * Returns the type of the resource container
         * @returns {string}
         */
        get type() {
            return package_json.type;
        },

        /**
         * Returns the resource container package information.
         * This is the package.json file
         * @returns {{}}
         */
        get info() {
            return package_json;
        },

        /**
         * Returns the resource container data configuration.
         * This is the config.yml file under the content/ directory
         *
         * @returns {{}}
         */
        get config() {
            return config_yaml;
        }

        // TODO: add more methods
    };
}

/**
 * Loads a resource container from the disk.
 * Rejects with an error if the container is not supported.
 *
 * @param container_directory {string}
 * @returns {Promise<Container>}
 */
function loadContainer(container_directory) {
    return new Promise(function(resolve, reject) {
        let package_json;
        try {
            package_json = JSON.parse(fs.readFileSync(path.join(container_directory, 'package.json'), {encoding: 'utf8'}));
        } catch (err) {}
        if(package_json == null || package_json.package_version == null) {
            reject(new Error('Not a resource container'));
        }
        if (package_json.package_version > spec.version) {
            reject(new Error('Unsupported container version'));
        }
        if(package_json.package_version < spec.version) {
            reject(new Error('Outdated container version'));
        }

        resolve(new Container(container_directory, package_json));
    });
}

/**
 * Creates a new resource container.
 * Rejects with an error if the container exists.
 *
 * @param container_directory {string}
 * @param opts {{}}
 * @returns {Promise<Container>}
 */
function makeContainer(container_directory, opts) {
    return new Promise(function(resolve, reject) {
        if(fileUtils.fileExists(container_directory)) {
            reject(new Error('Container already exists'));
        }

        let package_json = {};
        // TODO: build the container
        reject(new Error('Not implemented yet.'));

        resolve(new Container(container_directory, package_json));
    });
}

/**
 * Opens an archived resource container.
 * If the container is already opened it will be loaded
 *
 * @param container_archive {string}
 * @param container_directory {string}
 * @param opts {{}} extra options such as compression_method (zip or tar)
 * @returns {Promise<Container>}
 */
function openContainer(container_archive, container_directory, opts) {
    opts = opts || { compression_method : 'tar' };
    if(!fileUtils.fileExists(container_archive)) return Promise.reject(new Error('Missing resource container'));
    if(fileUtils.fileExists(container_archive)) {
        return loadContainer(container_directory, opts);
    }
    if(opts.compression_method === 'zip') {
        return compressionUtils.unzip(container_archive, container_directory)
            .then(function(dir) {
                return loadContainer(dir);
            });
    } else {
        return compressionUtils.untar(container_archive, container_directory)
            .then(function(dir) {
                return loadContainer(dir);
            });
    }
}

/**
 * Closes (archives) a resource container.
 *
 * @param container_directory {string}
 * @param opts {{}} extra options such as compression_method (zip or tar)
 * @returns {Promise<string>} the path to the container archive
 */
function closeContainer(container_directory, opts) {
    opts = opts || { compression_method : 'tar' };
    if(!fileUtils.fileExists(container_directory)) return Promise.reject(new Error('Missing resource container'));
    var container_archive = container_directory + spec.file_ext;
    var compressPromise = Promise.resolve(container_archive);

    // create archive if it's missing
    if(!fileUtils.fileExists(container_archive)) {
        if(opts.compression_method === 'zip') {
            compressPromise = compressionUtils.zip(container_directory, container_archive);
        } else {
            compressPromise = compressionUtils.tar(container_directory, container_archive);
        }
    }
    return compressPromise.then(function(path) {
        rimraf.sync(container_directory);
        return Promise.resolve(path);
    });
}

/**
 * TODO: this will eventually be abstracted to call makeContainer after processing the data
 * Converts a legacy resource into a resource container.
 * Rejects with an error if the container exists.
 *
 * @param data {string} the raw resource data
 * @param dir {string} the destination directory
 * @param props {{language, project, resource, container_type}} properties of the resource content.
 * @param opts {{}} extra options such as compression_method (zip or tar)
 * @returns {Promise.<Container>} the newly converted container
 */
function convertResource(data, dir, props, opts) {
    // validate opts
    if(!props.language || !props.project || !props.resource || !props.container_type) {
        return Promise.reject(new Error('Missing required parameters'));
    }

    const writeFile = promiseUtils.promisify(fs, 'writeFile');
    const mimeType = props.project.slug !== 'obs' && props.container_type === 'book' ? 'text/usfm' : 'text/markdown';
    const chunk_ext = mimeType === 'text/usfm' ? 'usfm' : 'md';

    return new Promise(function(resolve, reject) {
            if(fileUtils.fileExists(path.join(dir + '.' + spec.file_ext))) {
                reject(new Error('Resource container already exists'));
            } else {
                // clean opened container
                rimraf.sync(dir);
                resolve();
            }
        })
        .then(function() {
            // package
            mkdirp.sync(dir);
            let packageData = {
                package_version: spec.version,
                type: props.container_type,
                modified_at: props.resource.modified_at,
                content_mime_type: mimeType,
                language: props.language,
                project: props.project,
                resource: props.resource,
                chunk_status: []
            };
            return writeFile(path.join(dir, 'package.json'), new Buffer(JSON.stringify(packageData, null, 2)));
        })
        .then(function() {
            // license
            // TODO: use a proper license based on the resource license
            return writeFile(path.join(dir, 'LICENSE.md'), new Buffer(props.resource.status.license));
        })
        .then(function() {
            // content
            return new Promise(function(resolve, reject) {
                try {
                    let contentDir = path.join(dir, 'content');
                    mkdirp.sync(contentDir);
                    if(props.container_type === 'book') {
                        if (props.project.slug === 'obs') {
                            // add obs images
                            let configPath = path.join(contentDir, 'config.yml');
                            let config = {};
                            try {
                                let configBytes = fs.readFileSync(configPath);
                                config = YAML.parse(configBytes.toString());
                            } catch (err) {}
                            if(!config['media']) config['media'] = {};
                            config['media']['image'] = {
                                mime_type: 'image/jpg',
                                size: 37620940,
                                url: 'https://api.unfoldingword.org/obs/jpg/1/en/obs-images-360px.zip'
                            };
                            fs.writeFileSync(configPath, new Buffer(YAML.stringify(config, 4)));
                        }
                        data = JSON.parse(data);
                        for (let chapter of data.chapters) {
                            let chapterDir = path.join(contentDir, chapter.number);
                            mkdirp.sync(chapterDir);
                            if (chapter.ref) {
                                fs.writeFileSync(path.join(chapterDir, '_reference.' + chunk_ext), chapter.ref)
                            }
                            if (chapter.title) {
                                fs.writeFileSync(path.join(chapterDir, '_title.' + chunk_ext), chapter.title)
                            }
                            for (let frame of chapter.frames) {
                                fs.writeFileSync(path.join(chapterDir, frame.id.split('-')[1] + '.' + chunk_ext), frame.text);
                            }
                        }
                    } else if(props.container_type === 'help') {
                        if(props.resource.slug === 'tn') {
                            data = JSON.parse(data);
                            for(let chunk of data) {
                                if(!chunk.tn) continue;
                                let slugs = chunk.id.split('-');
                                if(slugs.length !== 2) continue;

                                let chapterDir = path.join(contentDir, slugs[0]);
                                mkdirp.sync(chapterDir);
                                let body = '';
                                for(let note of chunk.tn) {
                                    body += '\n\n#' + note.ref + '\n\n' + note.text;
                                }
                                fs.writeFileSync(path.join(chapterDir, slugs[1] + '.' + chunk_ext), body.trim());
                            }
                        } else if(props.resource.slug == 'tq') {
                            data = JSON.parse(data);
                            for(let chapter of data) {
                                if(!chapter.cq) continue;
                                let chapterDir = path.join(contentDir, chapter.id);
                                mkdirp.sync(chapterDir);
                                let normalizedChunks = {};
                                for(let question of chapter.cq) {
                                    let text = '\n\n#' + question.q + '\n\n' + question.a;
                                    for(let slug of question.ref) {
                                        let slugs = slug.split('-');
                                        if(slugs.length !== 2) continue;

                                        if(!normalizedChunks[slugs[1]]) normalizedChunks[slugs[1]] = '';
                                        normalizedChunks[slugs[1]] += text;
                                    }
                                }
                                for(let chunk in normalizedChunks) {
                                    fs.writeFileSync(path.join(chapterDir, chunk + '.' + chunk_ext), normalizedChunks[chunk].trim())
                                }
                            }
                        }
                    } else if(props.container_type === 'dict') {
                        data = JSON.parse(data);
                        let config = {};
                        for(let word of data) {
                            if(!word.id) continue;
                            let wordDir = path.join(contentDir, word.id);
                            mkdirp.sync(wordDir);
                            let body = '#' + word.term + '\n\n' + word.def;
                            fs.writeFileSync(path.join(wordDir, '01.' + chunk_ext), body);

                            if((word.aliases && word.aliases.length)
                                || (word.cf && word.cf.length)
                                || (word.ex && word.ex.length)) {
                                config[word.id] = {};

                                if(word.cf) {
                                    for (let related of word.cf) {
                                        if (!config[word.id]['see_also']) config[word.id]['see_also'] = [];
                                        config[word.id]['see_also'].push(related);
                                    }
                                }
                                if(word.aliases) {
                                    for (let alias of word.aliases) {
                                        if (!config[word.id]['aliases']) config[word.id]['aliases'] = [];
                                        config[word.id]['aliases'].push(alias);
                                    }
                                }
                                if(word.ex) {
                                    for (let example of word.ex) {
                                        if (!config[word.id]['examples']) config[word.id]['examples'] = [];
                                        config[word.id]['examples'].push(example.ref);
                                    }
                                }
                            }
                        }
                        fs.writeFileSync(path.join(contentDir, 'config.yml'), new Buffer(YAML.stringify(config, 4)));
                    } else {
                        reject(new Error('Unsupported resource container type ' + props.container_type));
                    }
                } catch(err) {
                    console.error(data);
                    reject(err);
                }
                resolve();
            });
        })
        .then(function() {
            if(!props.close) {
                // finish with opened container
                return openContainer(dir, opts);
            } else {
                // finish with closed container
                return closeContainer(dir, opts);
            }
        })
        .catch(function(err) {
            // clean up after an error
            rimraf.sync(dir);
            return Promise.reject(err);
        });
}

/**
 * Retrieves the resource container type by parsing the resource container mime type.
 *
 * @param mime_type {string} a mime type value e.g. "application/ts+book". where the type is "book"
 * @returns {string}
 */
function mimeToType(mime_type) {
    return mime_type.split('+')[1];
}

/**
 * Returns a resource container mime type based on the given container type.
 *
 * @param container_type {string} the resource container type. e.g. "book", "help" etc.
 * @returns {string} The mime type. e.g. "application/ts+type"
 */
function typeToMime(container_type) {
    return 'application/ts+' + type;
}

module.exports = {
    load: loadContainer,
    make: makeContainer,
    open: openContainer,
    close: closeContainer,
    tools: {
        convertResource: convertResource,
        makeSlug: containerSlug,
        mimeToType: mimeToType,
        typeToMime: typeToMime,
        spec: spec
    }
};