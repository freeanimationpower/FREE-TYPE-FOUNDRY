var opentype = require('opentype.js');
var fs = require('fs');
var path = require('path');
var buf = fs.readFileSync(path.join(__dirname, 'test-font.ttf'));
var f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
var gA = f.charToGlyph('A');
console.log('Comandos de A (y-up esperado: triángulo 0..700):');
gA.path.commands.forEach(function (c) { console.log(JSON.stringify(c)); });

