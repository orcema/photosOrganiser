#!/usr/bin/env node

'use strict';

var EventEmitter = require('events').EventEmitter;
var importer = require('../lib/importer');
var colors = require('colors');
var fs = require('fs');
var path = require('path');

var input = process.argv[2];
var output = process.argv[3];

var emitter = new EventEmitter();
var logFile = "";

validatePaths();

var programName = path.basename(process.argv[1]).replace(".js","");
logFile = path.join(output, programName + "_Log_" + new Date().toISOString().replace(/:/g,"-").replace(/\./g,"-") + ".csv");

fs.appendFileSync(logFile,"timeStamp,action,src,dst,details" + "\n" );

emitter.on('skipped', it => {
	let txtToLog = new Date().toISOString()+`,skipped,${it.source.path},${it.destination.path},exist`;
	console.log(txtToLog.gray)
	fs.appendFileSync(logFile, txtToLog + "\n" );
});

emitter.on('omitted', it => {
	let txtToLog = new Date().toISOString()+`,omitted,${it.source.path},"",${it.error.message} -- ${it.error.stack}`;
	console.log(txtToLog.yellow);
	txtToLog = new Date().toISOString()+`,omitted,${it.source.path},"",${it.error.message}`;
	fs.appendFileSync(logFile, txtToLog+ "\n");
});

emitter.on('failed', it => {
	let txtToLog = new Date().toISOString()+`,failed,"","",${it.message} - ${it.stack}`;
	console.log(txtToLog.red);
	fs.appendFileSync(logFile, txtToLog+ "\n");
});
	
emitter.on('succeeded', it => {
	let txtToLog = new Date().toISOString()+`,success,${it.source.path},${it.destination.path},copied`;
	console.log(txtToLog.green);
	fs.appendFileSync(logFile, txtToLog+ "\n");
});

emitter.on('errorWalk', it => {
	let txtToLog = new Date().toISOString()+`,failed,${it.source.path},${it.destination.path},${it.error}`;
	console.log(txtToLog.red);
	fs.appendFileSync(logFile, txtToLog+ "\n");
});

importer({
	input: input || '.',
	output: output || '.',
	emitter
}).return(0).then(retval =>{
	console.log(new Date().toISOString()+" : finished");
	process.exit;
}).catch(error => {
	console.error(`import stopped due to unexpected err:${error} stack:${error.stack}`.red);
	process.exit(-1);
});



function validatePaths() {
	if (!input) {
		console.error('input path is missing'.red);
		console.log('usage: photo /path/to/import/from /path/to/export/to'.cyan);
		process.exit(-1);
	}
	if (!output) {
		console.error('output path is missing'.red);
		console.log('usage: photo /path/to/import/from /path/to/export/to'.cyan);
		process.exit(-1);
	}
	input = input.trim();
	let inputExists = fs.existsSync(input);
	if (!inputExists) {
		console.error('input folder doesn\'t exist'.red);
		process.exit(-1);
	}
	output = output.trim();
	let outputExists = fs.existsSync(output);
	if (!outputExists) {
		console.error('outuput folder doesn\'t exist'.red);
		process.exit(-1);
	}
}

