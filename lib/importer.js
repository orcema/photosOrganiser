'use strict';

var path = require('path');
var util = require('util');
var fs = require('fs');
var ws = require('windows-shortcuts');

var Promise = require('bluebird');
var exif = require('fast-exif');

var EventEmitter = require('events').EventEmitter;

var readdir = Promise.promisify(fs.readdir);
var stat = Promise.promisify(fs.stat);
var mkdirp = Promise.promisify(require('mkdirp'));

const resizeImg = require('resize-img');


var concurrency = require('os').cpus().length*2;

module.exports = function (options) {
	var output = options.output;
	var emitter = options.emitter || new EventEmitter();

	return walk(options.input);

	function walk (sourcePath) {
		return readdir(sourcePath)
			.catch({ code: 'EACCES' }, error => [])
			.then(entries => entries.map(it => path.join(sourcePath, it)))
			// .catch(error => {
			// 	console.error(error);
			// })
			.map(classify, { concurrency })
			// .catch(error => {
			// 	console.error(error);
			// })			
			.then(entries => {
				
				var directories = entries.filter(it => it.isDirectory).map(it => it.path);
				var files = entries.filter(it => it.isFile).map(it => ({ path: it.path, size: it.size }));
				return Promise
					.resolve(files)
					.catch(error => {
						console.error(error);
						throw error;
					})
					.map(understand, { concurrency })
					// .catch(error => {
					// 	console.error(error);
					// })
					.map(execute, { concurrency })
					// .catch(error => {
					// 	console.error(error);
					// })
					.return(directories)
					// .catch(error => {
					// 	console.error(error);
					// })
					.map(walk, { concurrency: 1 })
					// .catch(error => {
					// 	console.error(error);
					// })
					// .catch(error => {
					// 	console.error(error);
					// 	throw error;
					// })
					;
					
			})
			.catch(error => {
				emitter.emit("errorWalk",error);
			});
	}

	function understand (source) {
		return getDestination(source)
			.then(destination => ({ source, destination, command: destination.size == 0 ? 'copy' : 'skip' }))
			.catch(error => (
				{ source, error, command: error.message.includes('Exif') ? 'omit' : 'fail' }
				));
	}

	function execute (it) {
		var command = it.command;
		delete it.command;
		switch (command) {
			case 'fail': return emitter.emit('failed', it);
			case 'omit': return emitter.emit('omitted', it);
			case 'skip': return emitter.emit('skipped', it);
			case 'copy': return pipe(it.source.path, it.destination.path).then(() => emitter.emit('succeeded', it));
			default: throw new Error('Unknown command!');
		}
	}

	function getDestination (source) {
		return exif.read(source.path, 16)
			.then(exif => {
				if (!exif || !exif.image || !exif.image.ModifyDate || !exif.image.Make || !exif.image.Model) {
					throw new Error('Bad Exif!');
				}
				var originalDate = exif.exif && exif.exif.DateTimeOriginal;
				var modifyDate = exif.image.ModifyDate;
				var date = originalDate || modifyDate;
				var make = exif.image.Make.split(/\s+/);
				var model = exif.image.Model.split(/\s+/);
				var camera = uniq(make.concat(model)).join('-').replace(/[^\w\d\-]+/g, '');
				var year = date.getFullYear().toString();
				var month = util.format('%s', lpadz(date.getMonth() + 1));
				// console.log(date.getMonth() + 1,month);
				var day = "D("+util.format('%s', lpadz(date.getDate()))+")#";
				var time =  util.format('%s-%s-%s', lpadz(date.getHours()), lpadz(date.getMinutes()), lpadz(date.getSeconds()));
				var destination = path.join(output, year, month, day + time + "-" + camera + ".jpg");
				//console.log(destination);
				return destination;
			})
			.then(destinationPath => 
				Promise.join(
					mkdirp(path.dirname(destinationPath)),
					stat(destinationPath)
						.then(info => ({ path: destinationPath, size: info.size }))
						.catch({ code: 'ENOENT' }, error => ({ path: destinationPath, size: 0 })),
					(it, info) => info
				)
			)
	}
};

function classify (entryPath) {
	return stat(entryPath)
	.then(info => ({
		path: entryPath,
		isDirectory: info.isDirectory(),
		isFile: info.isFile() && /\.(jpg|JPG)$/.test(entryPath),
		size: info.size
	}))
	.catch({ code: 'ENOENT' }, error => ({}))
	.catch({ code: 'EACCES' }, error => ({}))
	.catch({ code: 'ELOOP' }, error => ({}));
	
}

async function pipe (sourceFilename, destinationFilename) {
	return new Promise(function (resolve, reject) {
		try {
			let destinationFilenameMiniJPG = destinationFilename;
			destinationFilename = destinationFilename.replace(".jpg",".lnk");
			ws.create(destinationFilename,sourceFilename);
			resizeImg(fs.readFileSync(sourceFilename), {width: 200, height: 150}).then(buf => {
				fs.writeFileSync(destinationFilenameMiniJPG, buf);
			})
			resolve();
				
		} catch (error) {
			reject({
					source:{
						path: sourceFilename
					},
					destination:{
						path: destinationFilename
					},
					error: error
			});			
		}
		
	});
}

function uniq (items) {
	var known = {}, unique = [];
	for (var i = 0, l = items.length; i < l; ++i) {
		if (known[items[i]]) {
			continue;
		}
		known[items[i]] = true;
		unique.push(items[i]);
	}
	return unique;
}

function lpadz (it) {
	it = it.toString();
	return it.length === 1 ? '0' + it : it;
}
