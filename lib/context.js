'use strict';

var util = require('util'),
	path = require('path'),
	_module = require('module'),
    EventEmitter = require('events');

function StdOutWritable() {
    EventEmitter.call(this);
    this._reset();
}
util.inherits(StdOutWritable, EventEmitter);

StdOutWritable.prototype._reset = function() {
    var ret = this._buffer;
    this._buffer = '';
    this._ended = false;
    this.removeAllListeners();
    return ret;
};

StdOutWritable.prototype.setDefaultEncoding = function(encoding) {
    this._defaultEncoding = encoding;
};

StdOutWritable.prototype.write = function(chunk, encoding, callback) {
    if(this._ended) {
        this.emit('error', new Error('Write after end'));
        return;
    }

    if(chunk == null) {
        throw new Error('Invalid data');
    }

    if(typeof encoding === 'function') {
        callback = encoding;
        encoding = null;
    }

    if(!encoding) {
        encoding = this._defaultEncoding;
    }

    this._buffer += chunk.toString(encoding);

    if(callback) {
        process.nextTick(function() {
            callback();
        });
    }

    return true;
};

StdOutWritable.prototype.cork = StdOutWritable.prototype.uncork = function() { };
StdOutWritable.prototype.end = function(chunk) {
    if(chunk) {
        this.write.apply(this, arguments);
    }
    this.emit('finish');
    this._ended = true;
};

function Process() {
    this.stdout = new StdOutWritable();
    this.stderr = this.stdout; // Redirect stderr output to stdout
    this.version = process.version;
    this.versions = process.versions;
    this.config = process.config;
    this.arch = process.arch;
    this.platform = process.platform;
    this.nextTick = process.nextTick;
}

function Console(_process) {
    this._process = _process;
}

Console.prototype.log = function(obj) {
    this._process.stdout.write((typeof obj === 'string' ? obj : util.inspect(obj)) + '\n');
};
Console.prototype.info = Console.prototype.log;
Console.prototype.error = Console.prototype.log; // Point to .log since we're not doing anything special with error output. This may change someday.
Console.prototype.warn = Console.prototype.error;

// Basically takes the place of Module.prototype._compile, with some features stripped out
function makeRequire(m, self) {
    function _require(_path) {
        return m.require(_path);
    }

    _require.resolve = function(request) {
        return _module._resolveFilename(request, self);
    };
    _require.cache = _module._cache;
    _require.extensions = _module._extensions;

    return _require;
}

module.exports = function(isolated) {
    var _API_process = new Process();
    var ret = {
        process: _API_process,
        console: new Console(_API_process),
        // Set these to undefined by default
        __dirname: '[unknown]',
        __filename: '[unknown]',

        __render_end: function() { // Called after executing script for a render
            return _API_process.stdout._reset();
        },
        __init_script: function(filename) {
            // Arr, here be a salty sea we sailin'. That's pirate for look out for issues with the below code.
            // Most of the stuff here is handled by NodeJS in the source, and could cause problems that don't exist in other versions.

            if(filename) {
                this.__dirname = path.dirname(filename);
                this.__filename = filename;

                if(isolated) {
                    this.module.filename = this.module.id = filename;
                    this.module.paths = _module._nodeModulePaths(this.__dirname);
                }
            }

            if(isolated) {
                this.module.loaded = true;
                this.require = makeRequire(this.module, this);
            }
        },
        __complete: null,
        complete: function() {
            if(this.__complete) {
                this.__complete();
                this.__complete = null;
            }
        }
    };

    if(isolated) { // If running in an isolated context, define everything that won't already be available
        var _AccessibleClearTimeoutIDs = [];
        ret.Buffer = Buffer;
        ret.setTimeout = function(callback, timeout) {
            var handleID = setTimeout(function() {
                callback();
                clearTimeout(handleID);
            }, timeout);
            _AccessibleClearTimeoutIDs.push(handleID);
            return handleID;
        };
        ret.setInterval = function(callback, timeout) {
            var handleID = setInterval(callback, timeout);
            _AccessibleClearTimeoutIDs.push(handleID);
            return handleID;
        };
        ret.clearTimeout = function(handleID) {
            var index = _AccessibleClearTimeoutIDs.indexOf(handleID);
            if(index !== -1) {
                _AccessibleClearTimeoutIDs.splice(index, 1);
                clearTimeout(handleID);
            }
        };
        ret.module = new _module('[jshtml]');
    }
    else {
        ret.require = require;
    }

    return ret;
};
