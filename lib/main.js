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
    version: 7,
    file_ext: 'ts'
};

const content_dir = 'content';

/**
 * Returns a properly formatted container slug.
 *
 * @param language_slug {string}
 * @param project_slug {string}
 * @param resource_slug {string}
 * @returns {string}
 */
function containerSlug(language_slug, project_slug, resource_slug) {
    if(!language_slug || !project_slug || !resource_slug) throw new Error('Invalid resource container slug parameters');
    return language_slug
        + '_' + project_slug
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
    let toc_yaml = {};
    try {
        config_yaml = fs.readFileSync(path.join(container_directory, content_dir, 'config.yml'));
    } catch (err){
        console.warn(err);
    }
    try {
        toc_yaml = fs.readFileSync(path.join(container_directory, content_dir, 'toc.yml'));
    } catch (err){
        console.warn(err);
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
                package_json.resource.slug);
        },

        /**
         * Returns the type of the resource container
         * @returns {string}
         */
        get type() {
            return package_json.resource.type;
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
        },

        /**
         * Returns the table of contents.
         * This is the toc.yml file under the content/ directory
         *
         * @returns {{}|[]}
         */
        get toc() {
            return toc_yaml;
        }
    };
}

/**
 * Loads a resource container from the disk.
 * Rejects with an error if the container is not supported. Or does not exist, or is not a directory.
 *
 * @param container_directory {string}
 * @returns {Promise<Container>}
 */
function loadContainer(container_directory) {
    return new Promise(function(resolve, reject) {
        let package_json;
        try {
            if(!fs.statSync(container_directory).isDirectory()) {
                reject(new Error('Not an open resource container'));
                return;
            }
        } catch(err) {
            reject(new Error('The resource container does not exist'));
            return;
        }
        try {
            package_json = JSON.parse(fs.readFileSync(path.join(container_directory, 'package.json'), {encoding: 'utf8'}));
        } catch (err) {
            console.error(err);
        }
        if(package_json == null || package_json.package_version == null) {
            reject(new Error('Not a resource container'));
            return;
        }
        if (package_json.package_version > spec.version) {
            reject(new Error('Unsupported container version'));
            return;
        }
        if(package_json.package_version < spec.version) {
            reject(new Error('Outdated container version'));
            return;
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
            return;
        }

        let package_json = {};
        // TODO: build the container
        reject(new Error('Not implemented yet.'));

        // resolve(new Container(container_directory, package_json));
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
    if(fileUtils.fileExists(container_directory)) {
        return loadContainer(container_directory);
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
 * @returns {Promise<string>} the path to the resource container archive
 */
function closeContainer(container_directory, opts) {
    opts = opts || { compression_method : 'tar' };
    if(!fileUtils.fileExists(container_directory)) return Promise.reject(new Error('Missing resource container'));
    var container_archive = container_directory + '.' + spec.file_ext;
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
 * @param props {{language, project, resource}} properties of the resource content.
 * @param opts {{}} extra options such as compression_method (zip or tar)
 * @returns {Promise.<Container>} the newly converted container
 */
function convertResource(data, dir, props, opts) {
    // validate opts
    if(!props.language || !props.project || !props.resource || !props.resource.type) {
        return Promise.reject(new Error('Missing required parameters'));
    }

    const writeFileSync = promiseUtils.promisify(fs, 'writeFileSync');
    const mimeType = props.project.slug !== 'obs' && props.resource.type === 'book' ? 'text/usfm' : 'text/markdown';
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
                // TRICKY: resource.modified_at comes from the format.modified_at in resource.formats.
                // we assume this to have been normalized before hand.
                modified_at: props.resource.modified_at,
                content_mime_type: mimeType,
                language: props.language,
                project: props.project,
                resource: props.resource,
                chunk_status: []
            };
            return writeFileSync(path.join(dir, 'package.json'), new Buffer(JSON.stringify(packageData, null, 2)));
        })
        .then(function() {
            // license
            // TODO: use a proper license based on the resource license
            return writeFileSync(path.join(dir, 'LICENSE.md'), new Buffer(props.resource.status.license));
        })
        .then(function() {
            // content
            return new Promise(function(resolve, reject) {
                let contentDir = path.join(dir, 'content');
                let config = {};
                let toc = [];

                try {
                    // front matter
                    let frontDir = path.join(contentDir, 'front');
                    mkdirp.sync(frontDir);
                    fs.writeFileSync(path.join(frontDir, 'title.' + chunk_ext), props.project.name);
                    toc.push({
                        chapter: 'front',
                        chunks: ['title']
                    });

                    // main content
                    mkdirp.sync(contentDir);
                    if(props.resource.type === 'book') {
                        config.content = {};
                        if (props.project.slug === 'obs') {
                            // add obs images
                            if(!config.media) config.media = {};
                            config.media.image = {
                                mime_type: 'image/jpg',
                                size: 37620940,
                                url: 'https://api.unfoldingword.org/obs/jpg/1/en/obs-images-360px.zip'
                            };
                        }
                        data = JSON.parse(data);
                        for (let chapter of data.chapters) {
                            let chapterConfig = {};
                            let chapterTOC = {
                                chapter: chapter.number,
                                chunks: []
                            };
                            let chapterDir = path.join(contentDir, chapter.number);
                            mkdirp.sync(chapterDir);
                            if (chapter.title) {
                                // chapterConfig['title'] = {};
                                chapterTOC.chunks.push('title');
                                fs.writeFileSync(path.join(chapterDir, 'title.' + chunk_ext), chapter.title)
                            }
                            for (let frame of chapter.frames) {
                                let frameSlug = frame.id.split('-')[1];
                                if(frameSlug.trim() === '00') {
                                    // fix for chunk 00.txt bug
                                    let firstVerseRange = /<verse\s+number="(\d+(-\d+)?)"\s+style="v"\s*\/>/.exec(frame.text)[1];
                                    // TRICKY: verses can be num-num
                                    if(firstVerseRange) frameSlug = firstVerseRange.split('-')[0];
                                }

                                // build chunk config
                                let questions = [];
                                let notes = [];
                                let images = [];
                                let words = [];
                                // TODO: add questions, notes, and images to the config for the chunk
                                if(props.resource.tw_assignments) {
                                    try {
                                        words = props.resource.tw_assignments[chapter.number][frameSlug];
                                    } catch(e) {}
                                }
                                if(questions.length || notes.length || images.length || words.length) {
                                    chapterConfig[frameSlug] = {};
                                }
                                if(questions.length) {
                                    chapterConfig[frameSlug]['questions'] = questions;
                                }
                                if(notes.length) {
                                    chapterConfig[frameSlug]['notes'] = notes;
                                }
                                if(images.length) {
                                    chapterConfig[frameSlug]['images'] = images;
                                }
                                if(words.length) {
                                    chapterConfig[frameSlug]['words'] = words;
                                }

                                chapterTOC.chunks.push(frameSlug);
                                fs.writeFileSync(path.join(chapterDir, frameSlug + '.' + chunk_ext), frame.text);
                            }
                            if (chapter.ref) {
                                // chapterConfig['reference'] = {};
                                chapterTOC.chunks.push('reference');
                                fs.writeFileSync(path.join(chapterDir, 'reference.' + chunk_ext), chapter.ref)
                            }
                            if(Object.keys(chapterConfig).length) {
                                // TRICKY: only non-empty config
                                config.content[chapter.number] = chapterConfig;
                            }
                            toc.push(chapterTOC);
                        }
                    } else if(props.resource.type === 'help') {
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
                    } else if(props.resource.type === 'dict') {
                        data = JSON.parse(data);
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
                    } else {
                        reject(new Error('Unsupported resource container type ' + props.resource.type));
                        return;
                    }

                    // write config
                    let configPath = path.join(contentDir, 'config.yml');
                    fs.writeFileSync(configPath, new Buffer(YAML.stringify(config, 10, 2, null, null)));
                    // write toc
                    let tocPath = path.join(contentDir, 'toc.yml');
                    fs.writeFileSync(tocPath, new Buffer(YAML.stringify(toc, 10, 2, null, null)));
                } catch(err) {
                    console.error(data);
                    reject(err);
                    return;
                }
                resolve();
            });
        })
        .then(function() {
            if(!props.close) {
                // finish with opened container
                return loadContainer(dir);
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
 * @returns {string} The resource container type
 */
function mimeToType(mime_type) {
    return mime_type.split('+')[1];
}

/**
 * Returns a resource container mime type based on the given container type.
 *
 * @param resource_type {string} the resource container type. e.g. "book", "help" etc.
 * @returns {string} The mime type. e.g. "application/ts+type"
 */
function typeToMime(resource_type) {
    return 'application/ts+' + resource_type;
}

/**
 * Reads the resource container info without opening it.
 * This will however, work on containers that are both open and closed.
 *
 * @param container_path {string} path to the container archive or directory
 * @param opts {{}}
 * @returns {Promise.<{}>} the resource container info (package.json)
 */
function inspectContainer(container_path, opts) {
    return new Promise(function(resolve, reject) {
            if(path.extname(container_path) !== '.' + spec.file_ext) {
                reject(new Error('Invalid resource container file extension'));
                return;
            }
            try {
                resolve(fs.statSync(container_path).isFile());
            } catch(err) {
                reject(new Error('The resource container does not exist at', container_path));
            }
        })
        .then(function(isFile) {
            if(isFile) {
                // TODO: For now we are just opening the container then closing it.
                // Eventually it would be nice if we can inspect the archive without extracting everything.
                let containerDir = path.join(path.dirname(container_path), path.basename(container_path, '.' + spec.file_ext));
                // it may already be open so try to load first
                return loadContainer(containerDir)
                    .then(function(container) {
                        return Promise.resolve(container.info);
                    })
                    .catch(function(err) {
                        return openContainer(container_path, containerDir, opts);
                    })
                    .then(function(container) {
                        return closeContainer(containerDir, opts)
                            .then(function() {
                                return Promise.resolve(container.info);
                            });
                    });
            } else {
                loadContainer(container_path)
                    .then(function(container) {
                        return Promise.resolve(container.info);
                    });
            }
        });
}

module.exports = {
    load: loadContainer,
    make: makeContainer,
    open: openContainer,
    close: closeContainer,
    tools: {
        inspect: inspectContainer,
        convertResource: convertResource,
        makeSlug: containerSlug,
        mimeToType: mimeToType,
        typeToMime: typeToMime,
        spec: spec
    }
};