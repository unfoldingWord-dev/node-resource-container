'use strict';

const fs = require('fs');
const path = require('path');
const fileUtils = require('./utils/files');
const compressionUtils = require('./utils/compression');
const promiseUtils = require('./utils/promises');
const YAML = require('yamljs');
const rimraf = require('rimraf');
const assert = require("assert");
const mkdirp = require('mkdirp');
const compareVersions = require('compare-versions');

/**
 * Details about the container specification
 */
const spec = {
    version: '0.1',
    file_ext: 'tsrc',
    base_mime_type: 'application/tsrc'
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

    assert(container_directory, 'resource-container: missing container_directory');
    assert.equal(typeof container_directory, 'string', 'resource-container: container_directory should be a string');

    try {
        let configFile = path.join(container_directory, content_dir, 'config.yml');
        if(fileUtils.fileExists(configFile)) config_yaml = YAML.parse(fs.readFileSync(configFile, {encoding: 'utf8'}));
    } catch (err){
        console.warn(err);
    }
    try {
        let tocFile = path.join(container_directory, content_dir, 'toc.yml');
        if(fileUtils.fileExists(tocFile)) toc_yaml = YAML.parse(fs.readFileSync(tocFile, {encoding: 'utf8'}));
    } catch (err){
        console.warn(err);
    }

    assert(package_json, 'resource-container: missing package json');
    assert(package_json.language, 'resource-container: missing language');
    assert(package_json.project, 'resource-container: missing project');
    assert(package_json.resource, 'resource-container: missing resource');
    assert(package_json.resource.type, 'resource-container: missing resource type');

    return {

        get language () {
            return package_json.language;
        },

        get project () {
            return package_json.project;
        },

        get resource () {
            return package_json.resource;
        },

        /**
         * Returns an array of chapters in this resource container
         */
        chapters: function () {
            let dir = path.join(container_directory, content_dir);
            return fs.readdirSync(dir).filter(function(file) {
                try {
                    return fs.statSync(file).isDirectory();
                } catch (err) {
                    console.log(err);
                    return false;
                }
            });
        },

        /**
         * Returns an array of chunks in the chapter
         */
        chunks: function (chapterSlug) {
            let dir = path.join(container_directory, content_dir, chapterSlug);
            return fs.readdirSync(dir).filter(function(file) {
                try {
                    return fs.statSync(file).isFile();
                } catch (err) {
                    console.log(err);
                    return false;
                }
            });
        },

        /**
         * Returns the contents of a chunk.
         * If the chunk does not exist or there is an exception an empty string will be returned.
         * @param chapterSlug
         * @param chunkSlug
         * @returns string the contents of the chunk
         */
        readChunk: function(chapterSlug, chunkSlug) {
            let file = path.join(container_directory, content_dir, chapterSlug, chunkSlug + '.' + this.chunkExt);
            return fs.readFileSync(file, {encoding: 'utf8'});
        },

        /**
         * Returns the file extension to use for content files (chunks)
         * @returns {*}
         */
        get chunkExt() {
            switch(package_json['content_mime_type']) {
                case 'text/usx':
                    return 'usx';
                case 'text/usfm':
                    return 'usfm';
                case 'text/markdown':
                    return 'md';
                default:
                    return 'txt';
            }
        },

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
         * Returns the type of the resource container.
         * Shorthand for info.resource.type
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
        if (compareVersions(package_json.package_version, spec.version) === 1) {
            reject(new Error('Unsupported container version'));
            return;
        }
        if(compareVersions(package_json.package_version, spec.version) === -1) {
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
    if(fileUtils.fileExists(container_directory)) {
        return loadContainer(container_directory);
    }
    if(!fileUtils.fileExists(container_archive)) return Promise.reject(new Error('Missing resource container'));
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
    opts = opts || { compression_method : 'tar', clean : true };
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
        // remove directory
        if(opts.clean) rimraf.sync(container_directory);
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
 * @returns {Promise.<Container>} the newly converted container
 */
function convertResource(data, dir, props) {
    // validate opts
    if(!props.language || !props.project || !props.resource || !props.resource.type) {
        return Promise.reject(new Error('Missing required parameters'));
    }

    const writeFileSync = promiseUtils.promisify(fs, 'writeFileSync');
    // TRICKY: the old content was in usx.
    const mimeType = props.project.slug !== 'obs' && props.resource.type === 'book' ? 'text/usx' : 'text/markdown';
    const chunk_ext = mimeType === 'text/usx' ? 'usx' : 'md';

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
            // package.json
            mkdirp.sync(dir);
            let packageData = {
                package_version: spec.version,
                modified_at: props.modified_at,
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
                    if(props.resource.type !== 'help' && props.resource.type !== 'dict') {
                        // TRICKY: helps do not have a translatable title
                        let frontDir = path.join(contentDir, 'front');
                        mkdirp.sync(frontDir);
                        fs.writeFileSync(path.join(frontDir, 'title.' + chunk_ext), props.project.name.trim());
                        toc.push({
                            chapter: 'front',
                            chunks: ['title']
                        });
                    }

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
                            chapter.number = normalizeSlug(chapter.number);
                            let chapterConfig = {};
                            let chapterTOC = {
                                chapter: chapter.number,
                                chunks: []
                            };
                            let chapterDir = path.join(contentDir, chapter.number);
                            mkdirp.sync(chapterDir);

                            // chapter title
                            chapterTOC.chunks.push('title');
                            if (chapter.title) {
                                fs.writeFileSync(path.join(chapterDir, 'title.' + chunk_ext), chapter.title);
                            } else {
                                var title = localizeChapterTitle(props.language.slug, chapter.number);
                                fs.writeFileSync(path.join(chapterDir, 'title.' + chunk_ext), title);
                            }

                            // frames
                            for (let frame of chapter.frames) {
                                let frameSlug = normalizeSlug(frame.id.split('-')[1].trim());
                                if(frameSlug.trim() === '00') {
                                    // fix for chunk 00.txt bug
                                    let firstVerseRange = /<verse\s+number="(\d+(-\d+)?)"\s+style="v"\s*\/>/.exec(frame.text)[1];
                                    // TRICKY: verses can be num-num
                                    if(firstVerseRange) frameSlug = normalizeSlug(firstVerseRange.split('-')[0]);
                                }

                                // build chunk config
                                let questions = [];
                                let notes = [];
                                let images = [];
                                let words = [];
                                // TODO: add questions, notes, and images to the config for the chunk
                                if(props.tw_assignments) {
                                    try {
                                        let temp = props.tw_assignments[chapter.number][frameSlug];
                                        words = temp ? temp : words;
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

                            // chapter reference
                            if (chapter.ref) {
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
                                let chapterSlug = normalizeSlug(slugs[0]);
                                let chunkSlug = normalizeSlug(slugs[1]);

                                // fix for chunk 00.txt bug
                                if(chunkSlug === '00') continue;

                                let chapterDir = path.join(contentDir, chapterSlug);
                                mkdirp.sync(chapterDir);
                                let body = '';
                                for(let note of chunk.tn) {
                                    body += '\n\n#' + note.ref + '\n\n' + note.text;
                                }
                                if(body.trim() !== '') {
                                    fs.writeFileSync(path.join(chapterDir, chunkSlug + '.' + chunk_ext), body.trim());
                                }
                            }
                        } else if(props.resource.slug == 'tq') {
                            data = JSON.parse(data);
                            for(let chapter of data) {
                                if(!chapter.cq) continue;
                                chapter.id = normalizeSlug(chapter.id);
                                let chapterDir = path.join(contentDir, chapter.id);
                                mkdirp.sync(chapterDir);
                                let normalizedChunks = {};
                                for(let question of chapter.cq) {
                                    let text = '\n\n#' + question.q + '\n\n' + question.a;
                                    for(let slug of question.ref) {
                                        let slugs = slug.split('-');
                                        if(slugs.length !== 2) continue;
                                        let chapterSlug = normalizeSlug(slugs[0]);
                                        let chunkSlug = normalizeSlug(slugs[1]);

                                        if(!normalizedChunks[chunkSlug]) normalizedChunks[chunkSlug] = '';
                                        normalizedChunks[chunkSlug] += text;
                                    }
                                }
                                for(let chunk in normalizedChunks) {
                                    fs.writeFileSync(path.join(chapterDir, chunk + '.' + chunk_ext), normalizedChunks[chunk].trim())
                                }
                            }
                        } else {
                            reject(new Error('Unsupported resource ' + props.resource.slug));
                            return;
                        }
                    } else if(props.resource.type === 'dict') {
                        data = JSON.parse(data);
                        for(let word of data) {
                            if(!word.id) continue;
                            let wordDir = path.join(contentDir, word.id);
                            mkdirp.sync(wordDir);
                            let body = '#' + word.term + '\n\n' + word.def;
                            fs.writeFileSync(path.join(wordDir, '01.' + chunk_ext), body);

                            config[word.id] = {
                                def_title: word.def_title
                            };

                            if(word.cf) {
                                let foundIds = {}; // track found related id's so we don't get duplicates
                                for (let related of word.cf) {
                                    if (!config[word.id]['see_also']) config[word.id]['see_also'] = [];
                                    let parts = related.split('|');
                                    let id = parts[0].toLowerCase();
                                    if(!foundIds[id]) {
                                        foundIds[id] = true;
                                        config[word.id]['see_also'].push(id);
                                    }
                                }
                            }
                            if(word.aliases) {
                                for (let alias of word.aliases) {
                                    if (!config[word.id]['aliases']) config[word.id]['aliases'] = [];
                                    let aliases = alias.split(',');
                                    for(let a of aliases) {
                                        config[word.id]['aliases'].push(a.trim());
                                    }
                                }
                            }
                            if(word.ex) {
                                for (let example of word.ex) {
                                    if (!config[word.id]['examples']) config[word.id]['examples'] = [];
                                    config[word.id]['examples'].push(example.ref);
                                }
                            }
                        }
                    } else if (props.resource.type === 'man') {
                        config.content = {};
                        data = JSON.parse(data);

                        let tocMap = {};

                        for(let article of data.articles) {
                            let articleConfig = {
                                recommended: [],
                                dependencies: []
                            };
                            let articleTOC = {

                            };

                            // TRICKY: fix the id's
                            article.id = article.id.replace(/\_/g, '-');
                            if(article.recommend) {
                                article.recommend.forEach(function (id) {
                                    articleConfig.recommended.push(id.replace(/\_/g, '-'));
                                });
                            }
                            if(article.depend) {
                                article.depend.forEach(function (id) {
                                    articleConfig.dependencies.push(id.replace(/\_/g, '-'));
                                });
                            }

                            let articleDir = path.join(contentDir, article.id);
                            mkdirp.sync(articleDir);

                            // article title
                            fs.writeFileSync(path.join(articleDir, 'title.' + chunk_ext), article.title);

                            // article sub-title
                            fs.writeFileSync(path.join(articleDir, 'sub-title.' + chunk_ext), article.question);

                            // article body
                            fs.writeFileSync(path.join(articleDir, '01.' + chunk_ext), article.text);

                            if(articleConfig.recommended.length || articleConfig.dependencies.length) {
                                // TRICKY: only non-empty config
                                config.content[article.id] = articleConfig;
                            }

                            articleTOC['chapter'] = article.id;
                            articleTOC['chunks'] = [
                                'title',
                                'sub-title',
                                '01'
                            ];
                            tocMap[article.id] = articleTOC;
                        }

                        // build toc from what we see in the api
                        let tocRegex = /\[[^\[\]]*\]\s*\(([^\(\)]*)\)/g;
                        let match = tocRegex.exec(data.toc);
                        while(match != null) {
                            let key = match[1].replace(/\_/g, '-');
                            let val = tocMap[key];
                            if (val) toc.push(val);

                            match = tocRegex.exec(data.toc);
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
            return loadContainer(dir);
        })
        .catch(function(err) {
            // clean up after an error
            rimraf.sync(dir);
            return Promise.reject(err);
        });
}

/**
 * Returns a localized chapter title. e.g. "Chapter 1"
 * If the language does not have a match a default localization will be used.
 *
 * If chapter_number is a number it will be parsed as an int to strip leading 0's
 *
 * @param language_slug the language into which the chapter title will be localized
 * @param chapter_number the chapter number that is being localized
 */
function localizeChapterTitle(language_slug, chapter_number) {
    var translations = {
        'ar': 'الفصل %',
        'en': 'Chapter %',
        'ru': 'Глава %',
        'hu': '%. fejezet',
        'sr-Latin': 'Поглавље %',
        'default': 'Chapter %'
    };
    var title = translations[language_slug];
    if(!title) title = translations['default'];
    var num = parseInt(chapter_number);
    if (isNaN(num)) num = chapter_number;
    return title.replace('%', num);
}

/**
 * Pads a slug to 2 significant digits.
 * Examples:
 * '1'    -> '01'
 * '001'  -> '01'
 * '12'   -> '12'
 * '123'  -> '123'
 * '0123' -> '123'
 * Words are not padded:
 * 'a' -> 'a'
 * '0word' -> '0word'
 * And as a matter of consistency:
 * '0'  -> '00'
 * '00' -> '00'
 *
 * @param slug
 * @returns {*}
 */
function normalizeSlug(slug) {
    if(typeof slug !== 'string') throw new Error('slug must be a string');
    if(slug === '') throw new Error('slug cannot be an empty string');
    if(isNaN(Number(slug))) return slug;
    slug = slug.replace(/^(0+)/, '').trim();
    while(slug.length < 2) {
        slug = '0' + slug;
    }
    return slug;
}

/**
 * Retrieves the resource container type by parsing the resource container mime type.
 *
 * @param mime_type {string} a mime type value e.g. "application/tsrc+book". where the type is "book"
 * @returns {string} The resource container type
 */
function mimeToType(mime_type) {
    return mime_type.split('+')[1];
}

/**
 * Returns a resource container mime type based on the given container type.
 *
 * @param resource_type {string} the resource container type. e.g. "book", "help" etc.
 * @returns {string} The mime type. e.g. "application/tsrc+type"
 */
function typeToMime(resource_type) {
    return spec.base_mime_type + '+' + resource_type;
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
                return openContainer(container_path, containerDir, opts)
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
        localizeChapterTitle: localizeChapterTitle,
        normalizeSlug: normalizeSlug,
        spec: spec
    }
};