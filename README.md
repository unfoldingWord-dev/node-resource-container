# resource-container
A utility for interacting with Door43 Resource Containers. This follows the specification at http://resource-container.readthedocs.io/en/v0.2/.

> NOTE: this tool is written using the ES6 standard.

## What is an RC?
A Resource Container (RC) is a modular/portable package of translation data.

## Installation
```
npm install resource-container
```

## Usage
To get started you must first load an RC. Then you can read/write as needed.

```js
let rctool = require('resource-container');

console.log('This tool conforms to RC version ' + rctool.conformsto);

rclib.load('/path/to/resource/container/dir')
    .then(function(rc) {
        // some attributes have dedicated properties
        console.log(rc.type);
        
        // other attributes are accessible from the manifest
        console.log(rc.manifest.dublin_core.rights);
        
        // read
        let chapter01title = rc.readChunk('01', 'title');
        
        // write
        rc.writeChunk('front', 'title', 'Some book title');
    });
```

### Multiple Projects

It is possible for an RC to contain multiple projects.
In such cases methods like writing and reading chunks will
throw an error telling you to specify the project.

```js
// assume rc contains the projects: gen, exo.

// this throws an error
rc.readChunk('01', 'title');

// you can check how many projects are in an rc
console.log(rc.projectCount);

// this works as expected
let chapter01title = rc.readChunk('gen', '01', 'title');

```

### Strict Mode

By default the tool will operate in strict mode when loading an RC. 
This will perform some checks to ensure the RC is valid.
If you need to look at an RC regardless of it's validity
you can disable strict mode by passing in `false`.

```js

rctool.load('/invalid/rc/dir/', false)
    .then(function(rc) {
        // do stuff with the invalid rc
    });

```

### Creating an RC

This tool also allows you to create a brand new RC.

> NOTE: currently you must specify the complete manifest manually.
> This might change a little in the future.

```js
let manifest = {
    ...
};

rctool.create('/my/rc/dir/', manifest)
    .then(function(rc) {
        // do stuff with your new rc
    });
```