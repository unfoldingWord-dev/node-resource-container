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

    it('should load a single book RC', () => {
        let container_path = 'res/container';

        fs.writeFileSync(container_path);
        fs.writeFileSync(container_path + '/manifest.yaml', JSON.stringify({
            dublin_core: {
                type: 'book',
                conformsto: rcTool.version,
                format: 'text/usfm',
                identifier: 'en-ulb',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
            },
            projects: [{
                identifier: 'gen',
                title: 'Genesis',
                versification: 'kjv',
                sort: 1,
                path: './content',
                categories: [
                    'bible-ot'
                ]
            }]
        }));
        fs.writeFileSync(container_path + '/content/config.yaml', '---');
        fs.writeFileSync(container_path + '/content/01/01.usfm', '1:1');
        fs.writeFileSync(container_path + '/content/01/02.usfm', '1:2');
        fs.writeFileSync(container_path + '/content/01/03.usfm', '1:3');
        fs.writeFileSync(container_path + '/content/02/01.usfm', '2:1');
        fs.writeFileSync(container_path + '/content/02/02.usfm', '2:2');

        return rcTool.load(container_path)
            .then(function(container) {
                expect(container.path).toEqual(container_path);
                expect(container.chapters().length).toEqual(2);
                expect(container.chunks('01').length).toEqual(3);
                expect(container.chunks('02').length).toEqual(2);
                expect(container.readChunk('01', '03')).toEqual('1:3');
            });
    });

    it('should load a multi book RC', () => {
        let container_path = 'res/big_container';

        fs.writeFileSync(container_path);
        fs.writeFileSync(container_path + '/manifest.yaml', JSON.stringify({
            dublin_core: {
                type: 'book',
                conformsto: rcTool.version,
                format: 'text/usfm',
                identifier: 'en-ulb',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
            },
            projects: [
                {
                    identifier: 'gen',
                    title: 'Genesis',
                    versification: 'kjv',
                    sort: 1,
                    path: './gen',
                    categories: [
                        'bible-ot'
                    ]
                },
                {
                    identifier: 'exo',
                    title: 'Exodus',
                    versification: 'kjv',
                    sort: 1,
                    path: './exo',
                    categories: [
                        'bible-ot'
                    ]
                }
            ]
        }));

        fs.writeFileSync(container_path + '/gen/01/01.usfm', 'gen 1:1');
        fs.writeFileSync(container_path + '/gen/01/02.usfm', 'gen 1:2');
        fs.writeFileSync(container_path + '/gen/01/03.usfm', 'gen 1:3');
        fs.writeFileSync(container_path + '/gen/02/01.usfm', 'gen 2:1');
        fs.writeFileSync(container_path + '/gen/02/02.usfm', 'gen 2:2');

        fs.writeFileSync(container_path + '/exo/01/01.usfm', 'exo 1:1');
        fs.writeFileSync(container_path + '/exo/01/02.usfm', 'exo 1:2');
        fs.writeFileSync(container_path + '/exo/01/03.usfm', 'exo 1:3');
        fs.writeFileSync(container_path + '/exo/02/01.usfm', 'exo 2:1');
        fs.writeFileSync(container_path + '/exo/02/02.usfm', 'exo 2:2');

        return rcTool.load(container_path)
            .then(function(container) {
                expect(container.projectCount).toEqual(2);
                expect(container.path).toEqual(container_path);

                expect(container.chapters('gen').length).toEqual(2);
                expect(container.chunks('gen', '01').length).toEqual(3);
                expect(container.chunks('gen', '02').length).toEqual(2);
                expect(container.readChunk('gen', '01', '03')).toEqual('gen 1:3');

                expect(container.chapters('exo').length).toEqual(2);
                expect(container.chunks('exo', '01').length).toEqual(3);
                expect(container.chunks('exo', '02').length).toEqual(2);
                expect(container.readChunk('exo', '01', '03')).toEqual('exo 1:3');

                try {
                    expect(container.chapters().length).toEqual(-1);
                } catch (err) {
                    expect(err).not.toEqual(null);
                }
            });
    });

    it('should fail to load a missing rc', () => {
        let container_path = 'res/missing_container';

        fs.writeFileSync(container_path);

        return rcTool.load(container_path)
            .then(function(container) {
                expect(container).toEqual(null);
            })
            .catch(function(err) {
                expect(err).not.toEqual(null);
            });
    });

    it('should update an rc', () => {
        let container_path = 'res/updated_container';
        let chunkText = 'Hello world!';

        fs.writeFileSync(container_path);
        fs.writeFileSync(container_path + '/manifest.yaml', JSON.stringify({
            dublin_core: {
                type: 'book',
                conformsto: rcTool.version,
                format: 'text/usfm',
                identifier: 'en-ulb',
                language: {
                    identifier: 'en',
                    title: 'English',
                    direction: 'ltr'
                },
            },
            projects: [{
                identifier: 'gen',
                title: 'Genesis',
                versification: 'kjv',
                sort: 1,
                path: './content',
                categories: [
                    'bible-ot'
                ]
            }]
        }));
        fs.writeFileSync(container_path + '/content/config.yaml', '---');
        fs.writeFileSync(container_path + '/content/01/01.usfm', '1:1');
        fs.writeFileSync(container_path + '/content/01/02.usfm', '1:2');
        fs.writeFileSync(container_path + '/content/01/03.usfm', '1:3');
        fs.writeFileSync(container_path + '/content/02/01.usfm', '2:1');
        fs.writeFileSync(container_path + '/content/02/02.usfm', '2:2');

        return rcTool.load(container_path)
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
                conformsto: 'rc0.2'
            }
        };

        return rcTool.create(dir, manifest)
            .then(function (container) {
                expect(container.conformsTo).toEqual(rcTool.version);
                expect(container.type).toEqual('book');
            });
    });

});