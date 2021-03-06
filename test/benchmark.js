'use strict';

var fs = require('fs'),
    jshtml = require('../lib/index.js'),
    colors = require('colors');

function bench(callback, afterEach) { // Bench the absolute amount of cycles that are executed within a specified amount of time
    var startTime,
        diffTime,
        i = 0,
        totalTime = 0,
        runTime = 1e9;

    for(; totalTime < runTime; i++) {
        startTime = process.hrtime();
        callback();
        diffTime = process.hrtime(startTime);
        if(afterEach) {
            afterEach();
        }
        totalTime += diffTime[0] * 1e9 + diffTime[1];
    }

    var cycles = i * (runTime / totalTime);
    return {
        timePerCycle: runTime / cycles,
        cycles: cycles
    };
}

function printBench(name, results) {
    var timeColor;
    if(results.timePerCycle < 1.5e4) {
        timeColor = colors.green;
    }
    else if(results.timePerCycle >= 1.5e4 && results.timePerCycle < 1.5e5) {
        timeColor = colors.yellow;
    }
    else {
        timeColor = colors.red;
    }
    console.log('  ' + name + ':\n   ->' + timeColor(Math.floor(results.timePerCycle)) + ' ns/cycle\n   ->' + timeColor(results.cycles) + ' cycles/s');
}

function runBench(pre, script) {
    if(!script) {
        script = pre;
        pre = null;
    }

    var scriptText = script._script;
    printBench((pre ? pre + ' ' : '') + 'Compile (w/o cache)', bench(function() {
        script.compile();
    }, function() {
        script.setScript(scriptText);
    }));

    printBench((pre ? pre + ' ' : '') + 'Compile (w/cache)', bench(function() {
        script.compile();
    }));

    printBench((pre ? pre + ' ' : '') + 'VM Compile (w/o cache)', bench(function() {
        script.makeFunction();
    }, function() {
        script._function = script._context = undefined;
    }));

    printBench((pre ? pre + ' ' : '') + 'VM Compile (w/cache)', bench(function() {
        script.makeFunction();
    }));

    printBench((pre ? pre + ' ' : '') + 'Render', bench(function() {
        script.render();
    }));
}

var fileList = fs.readdirSync('./test/docs/');
for(var i = 0; i < fileList.length; i++) {
    var filepath = './test/docs/' + fileList[i];
    var script = jshtml.script({
        syntaxCheck: false,
        format: false,
        mangle: false,
        optimize: false,
        minify: false,
        isolate: true
    });

    console.log(colors.bold(filepath));
    script.setScriptFile(filepath);
    runBench(script);

    script.setOptions({
        syntaxCheck: true,
        format: true,
        mangle: true,
        optimize: true,
        minify: true,
        isolate: false
    });

    script.setScriptFile(filepath);
    runBench('Opts', script);
}