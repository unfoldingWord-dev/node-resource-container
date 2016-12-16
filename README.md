# resource-container
A utility for managing Door43 Resource Containers. This follows the specification at http://resource-container.readthedocs.io/en/v0.1/.

Specifically, this library allows  you to interact with Resource Containers at an abstract level hiding most of the specification implementation.

## Resource Containers
A Resource Container is a modular/portable package of translation data.

> NOTE: v0.1 of the Resource Container specification includes a spec for a file extension.
> a **closed** Resource Container is a compressed archive with this extension.
> An **open** Resource Container is the un-compressed directory.
> Be sure to use the `open` and `close` methods as needed.
> The compression and consequently the file extension will be deprecated in v0.2 at which point
> clients will be responsible for extracting archives prior to using the resource-container library.

## Installation
```
npm install resource-container
```

## Usage
There are a number of different methods available. If you need a complete list read the source.
For the most part you'll be interested in the `load` method.

```js
let rclib = require('resource-container');

// just for fun... print the version of the resource container spec that is supported.
console.log(rclib.tools.spec.version);

// load an open container
rclib.load('/path/to/resource/container/dir')
    .then(function(container) {
        // do stuff with your container!
    });

// open a compressed (closed) container
rclib.open('/path/to/resource/container/archive.tsrc', '/output/container/dir')
    .then(function(container) {
        // do stuff with your container!
    });
```

Once you have your resource container object you can do all sorts of fun things

```js
// access language, project, resource info like the slug etc.
console.log(container.language.slug);
console.log(container.project.slug);
console.log(container.resource.slug);

// get chapter slugs (un-ordered). see toc for ordered.
var chapterSlugs = container.chapters();

// get chunk slugs (un-ordered). see toc for ordered.
var chunkSlugs = container.chunks(chapterSlugs[0]);

// read chunk data
var chunk = container.readChunk(chapterSlugs[0], chunkSlugs[0]);

// TODO: we need need to support writing a chunk
// container.writeChunk('01', '01', 'In the beginning...');

// get the manifest
var manifest = container.info();

// get the data configuration (map of associated data)
var config = contianer.config();

// get the table of contents (for ordered chapters and chunks)
var toc = container.toc();

```