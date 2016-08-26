'use strict';

jest.mock('fs');
jest.unmock('../lib/main');

describe('Container', () => {
    let fs;
    let rc;

    beforeEach(() => {
        fs = require('fs');
        rc = require('../');
        fs.writeFileSync('res/container/');
        fs.writeFileSync('res/container/package.json', JSON.stringify({
            package_version: rc.tools.spec.version
        }));
        fs.writeFileSync('res/container/content/config.yml', '---');
    });

    it('should load a container', () => {
        let container_path = 'res/container';
        return rc.load(container_path)
            .then(function(container) {
                expect(container.path).toEqual(container_path);
            });
    });
});