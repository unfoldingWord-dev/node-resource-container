'use strict';

const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const fileUtils = require('./utils/files');
const promiseUtils = require('./utils/promises');
const YAML = require('yamljs');
const rimraf = require('rimraf');
const assert = require("assert");
const mkdirp = require('mkdirp');
const compareVersions = require('compare-versions');
const ResourceContainer = require('./rc');


/**
 * Loads a resource container from the disk.
 *
 * When strict mode is enabled this will reject with an error if validation fails.
 *
 * @param dir {string} the RC directory
 * @param strict {boolean} default is true. When false the RC will not be validated before resolving.
 * @returns {Promise<RC>}
 */
function loadContainer(dir, strict) {
    if(typeof strict !== 'boolean') strict = true;

    return new Promise(function(resolve, reject) {
        let rc = new ResourceContainer(dir);

        if(strict) {
            if (rc.manifest == null || rc.conformsTo == null) {
                reject(new Error('Not a resource container'));
                return;
            }
            if (compareVersions(rc.conformsTo, pkg.rc_version) === 1) {
                reject(new Error('Unsupported resource container version. Found ' + rc.conformsTo + ' but expected ' + pkg.rc_version));
                return;
            }
            if (compareVersions(rc.conformsTo, pkg.rc_version) === -1) {
                reject(new Error('Outdated resource container version. Found ' + rc.conformsTo + ' but expected ' + pkg.rc_version));
                return;
            }
        }

        resolve(rc);
    });
}

/**
 * Creates a new resource container.
 * Rejects with an error if the container exists.
 *
 * @param dir {string} the directory of the rc
 * @param manifest {{}} the manifest that will be injected into the rc
 * @returns {Promise<RC>}
 */
function createContainer(dir, manifest) {
    return new Promise(function(resolve, reject) {
        if(fileUtils.fileExists(dir)) {
            reject(new Error('Container already exists'));
            return;
        }

        // build dirs and write manifest
        mkdirp.sync(dir);
        let manifestFile = path.join(dir, 'manifest.yaml');
        fs.writeFileSync(manifestFile, new Buffer(YAML.stringify(manifest, 10, 2, null, null)));

        resolve(new ResourceContainer(dir));
    });
}

/**
 * TODO: this will eventually be abstracted to call createContainer after processing the data
 * Converts a legacy resource into a resource container.
 * Rejects with an error if the container exists.
 *
 * @param data {string} the raw resource data
 * @param dir {string} the destination directory
 * @param props {{language, project, resource}} properties of the resource content.
 * @returns {Promise.<RC>} the newly converted container
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
                package_version: pkg.rc_version,
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

module.exports = {
    load: loadContainer,
    create: createContainer,
    conformsto: pkg.rc_version
};