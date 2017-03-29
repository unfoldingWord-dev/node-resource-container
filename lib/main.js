'use strict';

const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const fileUtils = require('./utils/files');
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
            if (rc.manifest === null) {
                reject(new Error('Not a resource container. Missing manifest.yaml'));
                return;
            } else if(rc.conformsTo === null) {
                reject(new Error('Not a resource container. Missing required key: dublin_core.conformsto'));
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
            reject(new Error('Resource container already exists'));
            return;
        }

        let defaults = {
            dublin_core: {
                type: '',
                conformsto: 'rc' + pkg.rc_version,
                format: '',
                identifier: '',
                title: '',
                subject: '',
                description: '',
                language: {
                    identifier: '',
                    title: '',
                    direction: ''
                },
                source: [],
                rights: '',
                creator: '',
                contributor: [],
                relation: [],
                publisher: '',
                issued: '',
                modified: '',
                version: ''
            },
            checking: {
                checking_entity: [],
                checking_level: ''
            },
            projects: []
        };

        // validate some required keys
        if(!manifest.dublin_core.type) {
            reject(new Error('Missing required key: dublin_core.type'));
            return;
        }
        if(!manifest.dublin_core.format) {
            reject(new Error('Missing required key: dublin_core.format'));
            return;
        }
        if(!manifest.dublin_core.identifier) {
            reject(new Error('Missing required key: dublin_core.identifier'));
            return;
        }
        if(!manifest.dublin_core.language) {
            reject(new Error('Missing required key: dublin_core.language'));
            return;
        }
        if(!manifest.dublin_core.rights) {
            reject(new Error('Missing required key: dublin_core.rights'));
            return;
        }

        let opts = {
            dublin_core: Object.assign({}, defaults.dublin_core, manifest.dublin_core),
            checking: Object.assign({}, defaults.checking, manifest.checking),
            projects: Object.assign({}, defaults.projects, manifest.projects)
        };

        // build dirs and write manifest
        mkdirp.sync(dir);
        let manifestFile = path.join(dir, 'manifest.yaml');
        fs.writeFileSync(manifestFile, new Buffer(YAML.stringify(opts, 10, 2, null, null)), {encoding: 'utf8', flag: 'w'});

        resolve(new ResourceContainer(dir));
    });
}

module.exports = {
    load: loadContainer,
    create: createContainer,
    conformsto: pkg.rc_version
};