[![Build Status](https://img.shields.io/travis/bryanwayb/js-html.svg)](https://travis-ci.org/bryanwayb/js-html) [![Release Version](https://img.shields.io/npm/v/js-html.svg)](https://www.npmjs.com/package/js-html) [![Code Coverage](https://img.shields.io/codecov/c/github/bryanwayb/js-html.svg)](https://codecov.io/github/bryanwayb/js-html) [![Codacy Grade](https://img.shields.io/codacy/d22a37360df842f9aeb3a9705379647a.svg)](https://www.codacy.com/app/bryanwayb/js-html) [![License](https://img.shields.io/npm/l/js-html.svg)](https://github.com/bryanwayb/js-html/blob/master/LICENSE) 

JavaScript template engine for mixing actual JavaScript and text/markup.

```html
<html>
	<body>
		<?js process.stdout.write('Hello, World from JsHtml!'); ?>
	</body>
</html>
```
****
Usage
==
JsHtml script syntax is fairly straightforward.

`<?js` opens a code block, `?>` closes it. A whitespace character *must* follow the opening tag, but is not required before the closing tag. (e.g. `<?jsvar test=0;?>` is invalid, but `<?js var test=0;?>` is okay).

When a code block is only going to be used to output a variable you can use `<?js: ?>` syntax. Everything contained inside one of these blocks is directly passed to the output function. Spaces are *not required* for this open tag since `:` is used to separate the `<?js`tag and the code block.

There are a few different methods provided of interfacing with JsHtml scripts. Here's one way showing a quick example of the engine in use:

Template
--
```html
<html>
	<head>
		<title><?js:title?></title>
	<head>
	<body>
		<ul><?js
				for(var i = 0; i < 10; i++) {
					?>
						<li>#<?js:i?></li><?js
				}
			?>
		</ul>
	</body>
</html>
```
Script
--
```javascript
var jshtml = require('js-html');

var script = jshtml.script({
	context: {
		title: 'Example'
	}
});
script.setScriptFile('./example.html');
console.log(script.render());
```
Render Output
--
```html
<html>
	<head>
		<title>Example</title>
	<head>
	<body>
		<ul>
						<li>#0</li>
						<li>#1</li>
						<li>#2</li>
						<li>#3</li>
						<li>#4</li>
						<li>#5</li>
						<li>#6</li>
						<li>#7</li>
						<li>#8</li>
						<li>#9</li>
		</ul>
	</body>
</html>
```
****
API
==
**jshtml.compile(script)** - Takes input JsHtml script string and returns JavaScript string.

**jshtml.render(script, [options], [callback])** - Quick method for rendering JsHtml script. *This should only be used for one time uses.* If a script will be called multiple times use the `jshtml.script` object instead (see below).

**jshtml.cache([cache], script, [options])** - This is the same as **jshtml.script()** below, except when you'd rather not manage the script objects yourself. Returns a `jshtml.script` object.

The `cache` parameter is an identifier used to store the script object. When not provided instead used the script string (so be careful when using this).

**jshtml.script([script], [options])** - Create a `jshtml.script` object. This will cache compiled scripts, contexts, and vm functions and it's use it highly recommended when performance over multiple renders is required.
Options and their defaults:
```javascript
{
	syntaxCheck: true,
	format: false,
	mangle: false,
	optimize: false,
	minify: false,
	context: undefined,
	filename: undefined,
	isolate: true
}
```
Probably the only options that need explanations are `context`, `filename`, and `isolate`.

`context` expects an object and allows for passing of additional global variables that JsHtml scripts can use. This also allows for some scripts to share context objects, depending on what variables to make available to them.

`filename` sets the name of the file to be used when running the JsHtml script. This should be set to an absolute path and is useful for scripts that require `__dirname` or `__filename` to be set.

`isolate` is a bool that, when `true`, will execute the JsHtml script in a separate context from the calling context, at the cost of a slight amount of execution overhead by the JavaScript engine. If speed is important and context separation isn't a worry, you can disable this.

**jshtml.script().setOptions(options)** - Set options (see above) for the `jshtml.script` object.

**jshtml.script().setScript(script)** - Sets the script string to use for compilation. This calls **jshtml.script().clear()** before setting the new script string.

**jshtml.script().setScriptFile** - Quick method for synchronously loading a file as a script. Automatically sets the `filename` option.

**jshtml.script().clear()** - Completely reset the script object. This will clear any compiled/uncompiled script, compiled functions, and context. It will only keep the options set either at creation or with **jshtml.script().setOptions()**.

**jshtml.script().compile()** - Similar to **jshtml.compile()**, except this will be cached and adds a few more options to be used along with it (such as reformatting script output, minification, etc...).

**jshtml.script().makeFunction()** - This will compile the currently set script (if it hasn't been already), create a context (again, if it hasn't), and will return `function([callback])` that can be called to render the compiled script.

If a callback parameter isn't supplied, the script will be ran synchronously and the return value will be the rendered script. Conversely, passing a callback with an argument for the rendered string will set the script to be ran asynchronously. JsHtml scripts that run asynchronously will need to call `this.complete();` when they are finished rendering. Otherwise the callbacks will never be returned.

Here's a simple example with an async JsHtml script:
```
Hello<?js process.nextTick(function() {
    this.complete();
}); ?>, World
```

**jshtml.script().render([callback])** - A shortcut for calling `function([callback])` returned by **jshtml.script().makeFunction()**. 

****
CLI Usage
==
Command line use has also been provided. Personally I find it useful for testing a script before I incorporate it into a project.
```bash
$ jshtml --help
Usage: js-html [files] [options] .. or
       js-html [options] -- [files]

Options

    -r, --render   Render the compiled output instead of stopping after
                   compilation.
    -o, --out      Write output to file instead of stdout.
    --syntax       Enables syntax checking.
    --format       By default compiled code has no formatting applied. This
                   switch enables formatting. Implies --syntax.
    --mangle       Turns on obfuscation for compiled code. Implies --format.
    --optimize     Enables compiled script optimization. Implies --format.
    --minify       Minify compiled output. Implies --mangle.
    -v, --version  Prints the version/author info in the output header
    -h, --help     Prints this help information.

```

Notice that I used `jshtml`, but the help says `js-html`. You can use both as they are both registered to the same command. This was done since the project name is registered as `js-html`, but referred to as `jshtml`.

****
How It Works
==
The engine itself is pretty simple, practically to the point where it's almost unfair to call it an engine at all and more of an extension library. There are 4 stages to rendering a script: compilation, context initialization, runtime compilation, and lastly execution/rendering.

Input scripts are compiled directly to JavaScript code, with the text sections being passed as strings to the `process.stdout.write` function. Take the following input:
```html
This <?js:'is'?> a "simple" <?js process.stdout.write('example');
```
Without any post-compilation formatting, this get's compiled into:
```javascript
process.stdout.write(('This ')+('is')+(' a \"simple\" ')); process.stdout.write('example');
```
The JavaScript sections go completely untouched by the compiler. After the compilation, syntax errors are checked by default (although this can be disabled by setting the `jshtml.script()` object options).

The next step is to create the execution context. Similar to how `require()` works, the JsHtml script object calls its `makeFunction()` method which will initialize the context for the script to execute in.

If the `isolate` option is set to `true`, the created context is the only scope the script is allowed to access. This makes it so the JsHtml script being executed will not have access to anything from the calling scope unless it is passed specifically. This also means that separate JsHtml scripts do not share a scope with each other unless they are given a shared context object.

After the context creation comes VM compilation. This is where the compiled script is turned from a script string into an executable JavaScript function. This is done using the `vm` functions provided by NodeJS.

Finally, if both context generation and VM compilation are successful, the script can be executed and the rendered results returned.
****
Installing
==
**npm**
```Bash
npm install js-html
```

**git**
```Bash
git clone https://github.com/bryanwayb/js-html.git && cd js-html && npm install
```
****
Running Tests And Benchmark
==
JsHtml has been configured for numerous tests to test compatibility with a specific NodeJS version. These test not only ensure basic functionality will be available, but also security in separation of contexts.

**Note:** NodeJS version 0.11.6 and lower fail tests because contexts are not properly separated in those versions. Passing the `{ isolate: true }` will not yield the expected results. This problem was fixed in 0.11.7 and later.

If you would like to run these tests run the below command while in the modules root directory:
```bash
npm test
```

Benchmarking can also be performed to view how fast the test scripts will execute under different hardware and operating systems (as well as between versions).

```bash
npm run bench
```