'use strict';

module.exports = {

    /**
     * Executes a function as a promise for every item in a list.
     *
     * @param visit {function} the function to execute
     * @param onFail {function} error callback
     * @param opts {{}} options for setting progress listener or compactness
     * @returns {Promise.<[]>} results from function
     */
    chain: function (visit, onFail, opts) {
        var fail = onFail ? onFail : utils.ret(false),
            config = opts || { compact: true };

        return function (list) {
            var p = Promise.resolve(false),
                results = [];

            list.forEach(function (l, i) {
                p = p.then(visit.bind(null, l))
                    .catch(function (err) {
                        return fail(err, l);
                    })
                    .then(function (result) {
                        results.push(result);
                        if(config.onProgress) config.onProgress(list.length, i + 1, l);
                    });
            });

            return p.then(function () {
                return config.compact ? results.filter(Boolean) : results;
            });
        };
    },

    /**
     *
     * @param obj
     * @param visit
     * @param filter
     * @returns {*}
     */
    mapObject: function (obj, visit, filter) {
        var keys = Object.getOwnPropertyNames(obj);

        if (filter) {
            keys = keys.filter(function (key) {
                return filter(obj[key], key, obj);
            });
        }

        return keys.reduce(function (a, key) {
            a[key] = visit(obj[key], key, obj);
            return a;
        }, {});
    },

    /**
     * Turns a standard callback method into a promise-style method.
     *  Assumes standard node.js style:
     *      someFunction(arg1, arg2, function(err, data) { ... })
     *
     *  This will pass the proper number of arguments and convert
     *      the callback structure to a Promise.
     *
     * e.g. var readdir = promisify(fs, 'readdir'),
     *          readdir('something').then(someFunction);
     *
     *      var rm = promisify(rimraf),
     *          rm('something').then(someFunction);
     *
     * @param module
     * @param fn
     * @returns {function.<Promise>} a new function that returns a promise
     */
    promisify: function (module, fn) {
        var hasModule = typeof module !== 'function',
            f = hasModule ? module[fn] : module,
            mod = hasModule ? module : null;

        return function () {
            var args = [],
                i = arguments.length - 1;

            /**
             *  Don't pass an arguments list that has undefined values at the end.
             *      This is so the callback for function gets passed in the right slot.
             *
             *      If the function gets passed:
             *          f(arg1, arg2, undefined, cb)
             *
             *      ...it will think it got an undefined cb.
             *
             *      We instead want it to get passed:
             *          f(arg1, arg2, cb)
             *
             *      Before:    [arg1, null, undefined, arg2, undefined, undefined]
             *      After:     [arg1, null, undefined, arg2]
             */
            while (i >= 0 && typeof arguments[i] === 'undefined') {
                --i;
            }
            while (i >= 0) {
                args.unshift(arguments[i]);
                --i;
            }

            return new Promise(function (resolve, reject) {
                try {
                    resolve(f.apply(mod, args));
                } catch (err) {
                    reject(err);
                }
            });
        };
    },

    /**
     * Calls promisify on all valid functions on a module.
     *  Ignores certain properties on a modules so the return values is not polluted.
     *  (This can be configured by passing in a filter function via opts.isValid.)
     *
     *  E.g.    var myFs = promisifyAll(fs),
     *              myFs.readdir('somedir').then(doSomething);
     *
     * @param module
     * @param opts
     * @returns
     */
    promisifyAll: function (module, opts) {
        var config = opts || {},
            isValid = config.isValid || function (f, fn, mod) {
                    /**
                     * Filter out functions that aren't 'public' and aren't 'methods' and aren't asynchronous.
                     *  This is mostly educated guess work based on de facto naming standards for js.
                     *
                     * e.g.
                     *      valid:        'someFunctionName' or 'some_function_name' or 'someFunctionAsync'
                     *      not valid:    'SomeConstructor' or '_someFunctionName' or 'someFunctionSync'
                     *
                     *  As there may be exceptions to these rules for certain modules,
                     *   you can pass in a function via opts.isValid which will override this.
                     */
                    return typeof f === 'function' && fn[0] !== '_' && fn[0].toUpperCase() !== fn[0] && !fn.endsWith('Sync');
                };

        return utils.mapObject(module, function (f, fn, mod) {
            return utils.promisify(mod, fn);
        }, isValid);
    },

    /**
     * Creates a function that returns the data when called.
     *  E.g.
     *      var myData = 'bob';
     *      var getData = ret(myData);
     *      getData(); // returns 'bob'
     *
     * Useful in Promises:
     *
     *  Before:
     *      var myData = 'bob';
     *
     *      somePromise.then(function (doesntMatter) {
         *          return myData;
         *      });
     *
     *  After:
     *      var myData = 'bob';
     *
     *      somePromise.then(ret(myData));
     */
    ret: function (data) {
        return function () {
            return data;
        };
    }
};