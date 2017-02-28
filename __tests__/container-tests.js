'use strict';

jest.mock('fs');
jest.mock('rimraf');
jest.mock('mkdirp');
jest.unmock('compare-versions');
jest.unmock('../lib/utils/files');
jest.unmock('yamljs');
jest.unmock('../lib/utils/promises');
jest.unmock('../lib/main');
jest.unmock('../lib/rc');

describe('Container', () => {
    let fs;
    let rcTool;
    let fileUtils;

    beforeEach(() => {
        fs = require('fs');
        rcTool = require('../');
        fileUtils = require('../lib/utils/files');
    });

    /**
     * Generates a new rc
     * @param dir string the rc directory
     * @param multi bool indicates if multiple projects should exist in it
     */
    function makeRC(dir, multi) {
        multi = multi || false;

        let manifest = {
            dublin_core: {
                type: 'book',
                conformsto: 'rc0.2',
                format: 'text/usfm',
                identifier: 'en-ulb',
                title: 'Unlocked Literal Bible',
                subject: 'Bible translation',
                description: 'The Unlocked Literal Bible is an open-licensed version of the Bible that is intended to provide a form-centric translation of the Bible.',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
                source: [{
                    language: 'en',
                    identifier: 'en-asv',
                    version: '1990'
                }],
                rights: 'CC BY-SA 4.0',
                creator: 'Wycliffe Associates',
                contributor: [
                    'Wycliffe Associates'
                ],
                relation: [
                    'en-udb',
                    'en-tn'
                ],
                publisher: 'Door43',
                issued: '2015-12-17',
                modified: '2015-12-22',
                version: '3'
            },
            checking: {
                checking_entity: [
                    'Wycliffe Associates',
                ],
                checking_level: '3'
            },
            projects: [{
                identifier: 'gen',
                title: 'Genesis',
                versification: 'kjv',
                sort: 1,
                path: './gen',
                categories: [
                    'bible-ot'
                ]
            }]
        };

        fs.writeFileSync(dir);

        fs.writeFileSync(dir + '/gen/01/01.usfm', 'gen 1:1');
        fs.writeFileSync(dir + '/gen/01/02.usfm', 'gen 1:2');
        fs.writeFileSync(dir + '/gen/01/03.usfm', 'gen 1:3');
        fs.writeFileSync(dir + '/gen/02/01.usfm', 'gen 2:1');
        fs.writeFileSync(dir + '/gen/02/02.usfm', 'gen 2:2');

        if(multi) {
            manifest.projects.push({
                identifier: 'exo',
                title: 'Exodus',
                versification: 'kjv',
                sort: 2,
                path: './exo',
                categories: [
                    'bible-ot'
                ]
            });

            fs.writeFileSync(dir + '/exo/01/01.usfm', 'exo 1:1');
            fs.writeFileSync(dir + '/exo/01/02.usfm', 'exo 1:2');
            fs.writeFileSync(dir + '/exo/01/03.usfm', 'exo 1:3');
            fs.writeFileSync(dir + '/exo/02/01.usfm', 'exo 2:1');
            fs.writeFileSync(dir + '/exo/02/02.usfm', 'exo 2:2');
        }

        fs.writeFileSync(dir + '/manifest.yaml', JSON.stringify(manifest));
    }

    it('should load a single book RC', () => {
        let rc_dir = 'res/container';

        makeRC(rc_dir);

        return rcTool.load(rc_dir)
            .then(function(container) {
                expect(container.path).toEqual(rc_dir);
                expect(container.chapters().length).toEqual(2);
                expect(container.chunks('01').length).toEqual(3);
                expect(container.chunks('02').length).toEqual(2);
                expect(container.readChunk('01', '03')).toEqual('gen 1:3');
            });
    });

    it('should load a multi book RC', () => {
        let dir = 'res/big_container';

        makeRC(dir, true);

        return rcTool.load(dir)
            .then(function(container) {
                expect(container.projectCount).toEqual(2);
                expect(container.path).toEqual(dir);

                expect(container.chapters('gen').length).toEqual(2);
                expect(container.chunks('gen', '01').length).toEqual(3);
                expect(container.chunks('gen', '02').length).toEqual(2);
                expect(container.readChunk('gen', '01', '03')).toEqual('gen 1:3');

                expect(container.chapters('exo').length).toEqual(2);
                expect(container.chunks('exo', '01').length).toEqual(3);
                expect(container.chunks('exo', '02').length).toEqual(2);
                expect(container.readChunk('exo', '01', '03')).toEqual('exo 1:3');
            });
    });

    it('should fail to load a missing rc', () => {
        let dir = 'res/missing_container';

        fs.writeFileSync(dir);

        return rcTool.load(dir)
            .then(function(container) {
                expect(container).toEqual(null);
            })
            .catch(function(err) {
                expect(err.message).toEqual('Not a resource container. Missing required key: dublin_core.conformsto');
            });
    });

    it('should load a missing rc when not in strict mode', () => {
        let dir = 'res/missing_container';

        fs.writeFileSync(dir);

        return rcTool.load(dir, false)
            .then(function(container) {
                expect(container).not.toEqual(null);
            });
    });

    it('should update an rc', () => {
        let dir = 'res/updated_container';
        let chunkText = 'Hello world!';

        makeRC(dir);

        return rcTool.load(dir)
            .then(function(container) {
                container.writeChunk('02', '03', chunkText);
                container.writeChunk('03', '01', chunkText);
                return Promise.resolve(container);
            })
            .then(function(updatedrc) {
                expect(updatedrc.readChunk('02', '03')).toEqual(chunkText);
                expect(updatedrc.readChunk('03', '01')).toEqual(chunkText);
            });
    });

    it('should create a new rc', () => {
        let dir = 'res/new_rc';
        let manifest = {
            dublin_core: {
                type: 'book',
                format: 'text/usfm',
                identifier: 'en-me',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
                rights: 'CC BY-SA 4.0'
            }
        };

        return rcTool.create(dir, manifest)
            .then(function (container) {
                expect(container.conformsTo).toEqual(rcTool.conformsto);
                expect(container.type).toEqual('book');
            });
    });

    it('should not open an rc that is too old', () => {
        let container_path = 'res/container';

        fs.writeFileSync(container_path);
        fs.writeFileSync(container_path + '/manifest.yaml', JSON.stringify({
            dublin_core: {
                type: 'book',
                conformsto: 'rc0.1',
                format: 'text/usfm',
                identifier: 'en-ulb',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
            },
            projects: []
        }));

        return rcTool.load(container_path)
            .then(function(container) {
                expect(container).toEqual(null);
            })
            .catch(function(err) {
                expect(err.message).toEqual('Outdated resource container version. Found 0.1 but expected ' + rcTool.conformsto);
            });
    });

    it('should not open an rc that is too new', () => {
        let container_path = 'res/container';

        fs.writeFileSync(container_path);
        fs.writeFileSync(container_path + '/manifest.yaml', JSON.stringify({
            dublin_core: {
                type: 'book',
                conformsto: 'rc999.1',
                format: 'text/usfm',
                identifier: 'en-ulb',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
            },
            projects: []
        }));

        return rcTool.load(container_path)
            .then(function(container) {
                expect(container).toEqual(null);
            })
            .catch(function(err) {
                expect(err.message).toEqual('Unsupported resource container version. Found 999.1 but expected ' + rcTool.conformsto);
            });
    });

    it('should throw an error when not specifying project in multi-project rc', () => {
        let dir = 'res/big_container';

        makeRC(dir, true);

        return rcTool.load(dir)
            .then(function(container) {
                try {
                    expect(container.chapters().length).toEqual(-1);
                } catch (err) {
                    expect(err.message).toEqual('Multiple projects found. Specify the project identifier.');
                }

                try {
                    expect(container.chunks('01').length).toEqual(-1);
                } catch (err) {
                    expect(err.message).toEqual('Multiple projects found. Specify the project identifier.');
                }

                try {
                    expect(container.readChunk('01', '01').length).toEqual(-1);
                } catch (err) {
                    expect(err.message).toEqual('Multiple projects found. Specify the project identifier.');
                }

                try {
                    expect(container.writeChunk('01', '01', 'test').length).toEqual(-1);
                } catch (err) {
                    expect(err.message).toEqual('Multiple projects found. Specify the project identifier.');
                }
            });
    });

});