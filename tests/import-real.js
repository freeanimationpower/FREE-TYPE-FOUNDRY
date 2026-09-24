var opentype = require('opentype.js');
require('../js/geometry.js');
var G = globalThis.FTG;
var fs = require('fs');

var fontPath = 'C:/Windows/Fonts/arial.ttf';
var buf = fs.readFileSync(fontPath);
var f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
console.log('Familia: ' + f.names.fontFamily.en + ' | upm: ' + f.unitsPerEm + ' | glyphs: ' + f.glyphs.length);

var types = {};
for (var i = 0; i < f.glyphs.length; i++) {
  var g = f.glyphs.get(i);
  if (!g || !g.unicode) continue;
  g.path.commands.forEach(function (c) { types[c.type] = (types[c.type] || 0) + 1; });
}
console.log('Tipos de comandos en el font real:', JSON.stringify(types));

var upm = f.unitsPerEm || 1000;
var scale = 1000 / upm;
var count = 0, contoursOK = 0, sample = null;
for (i = 0; i < f.glyphs.length; i++) {
  var gl = f.glyphs.get(i);
  if (!gl || !gl.unicode) continue;
  var contours = G.commandsToContours(gl.path.commands || [], scale);
  if (contours.length) contoursOK++;
  count++;
  if (!sample && gl.unicode === 65) {
    sample = { contours: contours, adv: gl.advanceWidth * scale };
  }
}
console.log('Glifos con unicode: ' + count + ' | con contornos: ' + contoursOK);
if (sample) {
  console.log('A: contornos=' + sample.contours.length + ' puntos=' + sample.contours.reduce(function (s, c) { return s + c.length; }, 0) + ' avance=' + sample.adv.toFixed(0));
  var b = G.glyphBounds(sample.contours);
  console.log('BBox A: ' + JSON.stringify(b));
}
console.log('IMPORT REAL FONT OK');
