var fastExif = require('fast-exif');

fastExif.read(process.argv[2], 16).then(console.log)