'use strict';

const fs = require('fs');
const fileUtils = require('./utils/files');
const path = require('path');
const YAML = require('yamljs');
const assert = require("assert");
const mkdirp = require('mkdirp');

/**
 * Attempts to read a yaml file. If it cannot be read null will be returned.
 * @param path
 * @return {null}
 */
function readYAML(path) {
    if(fileUtils.fileExists(path)) {
        try {
            return YAML.parse(fs.readFileSync(path), {encoding: 'utf8'});
        } catch(e) {
            console.log(e);
        }
    }
    return null;
}

/**
 * Represents an instance of a resource container.
 *
 * @param dir {string}
 * @constructor
 */
function RC(dir) {
    let self = this;
    self.manifest = {};
    self.dir = dir;

    if(typeof self.dir !== 'string') throw new Error('Missing string parameter: dir');

    // load the manifest
    let manifestFile = path.join(self.dir, 'manifest.yaml');
    if(fileUtils.fileExists(manifestFile)) self.manifest = YAML.parse(fs.readFileSync(manifestFile, {encoding: 'utf8'}));

    return {

        get language () {
            return self.manifest.dublin_core.language;
        },

        get resource () {
            return self.manifest.dublin_core;
        },

        /**
         * Retrieves a project from the RC.
         *
         * You can exclude the parameter if the RC has only one project.
         *
         * @param identifier {string}
         * @returns {{}}
         */
        project: function (identifier) {
            if(identifier) {
                for(let p of self.manifest.projects) {
                    if(p.identifier === identifier) return p;
                }
            } else {
                if (self.manifest.projects.length === 1) {
                    return self.manifest.projects[0];
                } else if(self.manifest.projects.length > 1) {
                    throw new Error('Multiple projects found. Specify the project identifier.');
                }
            }
            return null;
        },

        /**
         * Returns a list of project identifiers in this rc.
         * @return {Array}
         */
        get projectIds() {
            let list = [];
            for(let p of self.manifest.projects) {
                list.push(p.identifier);
            }
            return list;
        },

        /**
         * Returns the number of projects contained in this RC.
         * @returns {Number}
         */
        get projectCount() {
            return Object.keys(self.manifest.projects).length;
        },

        /**
         * Returns the version of the RC spec used in this container.
         * This will strip off the 'rc' prefix.
         *
         * @returns {string} the RC version e.g. '0.2'
         */
        get conformsTo() {
            try {
                return self.manifest.dublin_core.conformsto.replace(/^rc/, '');
            } catch (err) {
                return null;
            }
        },

        /**
         * Returns an array of chapters in this resource container.
         *
         * You can exclude the parameter if this RC has only one project.
         *
         * @param project_identifier {string} the project who's chapters will be returned.
         * @return [string] an array of chapter identifiers
         */
        chapters: function (project_identifier) {
            let p = this.project(project_identifier);
            if(!p) return [];

            let dir = path.join(self.dir, p.path);
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
         * Returns an array of chunks in the chapter.
         *
         * You can provide a single parameter (chapter) if this RC has only one project.
         *
         * @param project_identifier {string} the project who's chunks will be returned
         * @param chapter_identifier {string} the chapter who's chunks will be returned
         * @return [string] an array of chunk identifiers
         */
        chunks: function (project_identifier, chapter_identifier) {
            if(typeof chapter_identifier === 'undefined') {
                chapter_identifier = project_identifier;
                project_identifier = null;
            }

            let p = this.project(project_identifier);
            if(!p) return [];

            let dir = path.join(self.dir, p.path, chapter_identifier);
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
         *
         * You can exclude the project parameter if this RC has only one project
         *
         * @param project_identifier {string} the project who's chunk will be read
         * @param chapter_identifier {string} the chapter who's chunk will be read
         * @param chunk_identifier {string} the chunk to read
         * @return {string} the contents of the chunk
         */
        readChunk: function(project_identifier, chapter_identifier, chunk_identifier) {
            if(typeof chunk_identifier === 'undefined') {
                chunk_identifier = chapter_identifier;
                chapter_identifier = project_identifier;
                project_identifier = null;
            }

            let p = this.project(project_identifier);
            if(!p) return [];

            let file = path.join(self.dir, p.path, chapter_identifier, chunk_identifier + '.' + this.chunkExt);
            if(fileUtils.fileExists(file)) {
                return fs.readFileSync(file, {encoding: 'utf8'});
            } else {
                return '';
            }
        },

        /**
         * Writes content to a chunk.
         * The path will be created if it does not already exist.
         *
         * You can exclude the project_identifier parameter if this RC has only one project
         *
         * @param project_identifier {string} the project who's chunk will be written to
         * @param chapter_identifier {string} the chapter who's chunk will be written to
         * @param chunk_identifier {string} the chunk that will be created
         * @param content {string} the content to be written to the chunk
         */
        writeChunk: function(project_identifier, chapter_identifier, chunk_identifier, content) {
            if(typeof content === 'undefined') {
                content = chunk_identifier;
                chunk_identifier = chapter_identifier;
                chapter_identifier = project_identifier;
                project_identifier = null;
            }

            let p = this.project(project_identifier);
            if(!p) return;

            let file = path.join(self.dir, p.path, chapter_identifier, chunk_identifier + '.' + this.chunkExt);
            if(content === '') {
                fs.unlinkSync(file);
            } else {
                mkdirp.sync(path.dirname(file));
                fs.writeFileSync(file, content, {encoding: 'utf8', flag: 'w'});
            }
        },

        /**
         * Returns the file extension to use for content files (chunks)
         * @returns {*}
         */
        get chunkExt() {
            // TODO: 1/26/17 I'd rather not hard code the file extensions in here.
            // it would be better if the library can just figure it out.
            switch(self.manifest.dublin_core.format) {
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
            return self.dir;
        },

        /**
         * Convenience property to get the type of the resource container.
         *
         * @returns {string}
         */
        get type() {
            return self.manifest.dublin_core.type;
        },

        /**
         * Returns the resource container manifest.
         *
         * @returns {{}}
         */
        get manifest() {
            return self.manifest;
        },

        /**
         * Returns the project configuration
         * This is the config.yml file under the content/ directory
         *
         * @param project_identifier string the project who's config will be returned
         * @returns {{}}
         */
        config(project_identifier) {
            let p = this.project(project_identifier);
            if(!p) return null;

            let file = path.join(self.dir, p.path, 'config.yml');
            return readYAML(file);
        },

        /**
         * Returns the project table of contents.
         * This is the toc.yml file under the content/ directory
         *
         * @param project_identifier string the project who's toc will be returned
         * @returns {{}|[]}
         */
         toc(project_identifier) {
            let p = this.project(project_identifier);
            if(!p) return null;

            let file = path.join(self.dir, p.path, 'toc.yml');
            return readYAML(file);
        },

        /**
         * Creates a toc yaml file for the project.
         *
         * You can exclude the project_identifier if this RC has only one project.
         *
         * @param project_identifier
         * @param content {string} the toc to be written. if empty the toc file will be removed.
         */
        writeTOC(project_identifier, content) {
            if(typeof content === 'undefined') {
                content = project_identifier;
                project_identifier = null;
            }

            let p = this.project(project_identifier);
            if(!p) return;

            let file = path.join(self.dir, p.path, 'toc.yml');
            if(content === '') {
                fs.unlinkSync(file);
            } else {
                mkdirp.sync(path.dirname(file));
                fs.writeFileSync(file, new Buffer(YAML.stringify(content, 10, 2, null, null)), {encoding: 'utf8', flag: 'w'});
            }
        },

        /**
         * Creates a config yaml file for the project.
         *
         * You can exclude the project_identifier if this RC has only one project.
         *
         * @param project_identifier
         * @param content {string} the config to be written. if empty the config file will be removed.
         */
        writeConfig(project_identifier, content) {
            if(typeof content === 'undefined') {
                content = project_identifier;
                project_identifier = null;
            }

            let p = this.project(project_identifier);
            if(!p) return;

            let file = path.join(self.dir, p.path, 'config.yml');
            if(content === '') {
                fs.unlinkSync(file);
            } else {
                mkdirp.sync(path.dirname(file));
                fs.writeFileSync(file, new Buffer(YAML.stringify(content, 10, 2, null, null)), {encoding: 'utf8', flag: 'w'});
            }
        }
    };
}

module.exports = RC;