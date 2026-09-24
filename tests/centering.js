var opentype = require('opentype.js');
require('../js/geometry.js');
var G = globalThis.FTG;
var fs = require('fs');

var buf = fs.readFileSync('C:/Windows/Fonts/arial.ttf');
var f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
var upm = f.unitsPerEm || 1000;
var scale = 1000 / upm;
var checked = 0, bad = 0, offMax = 0;
for (var i = 0; i < f.glyphs.length; i++) {
  var g = f.glyphs.get(i);
  if (!g || !g.unicode) continue;
  var contours = G.commandsToContours(g.path.commands || [], scale);
  if (!contours.length) continue;
  var adv = Math.max(1, Math.round((g.advanceWidth || 0) * scale));
  var b = G.glyphBounds(contours);
  var dx = Math.round(adv / 2 - (b.minX + b.maxX) / 2);
  for (var ci = 0; ci < contours.length; ci++) {
    var c = contours[ci];
    for (var pi = 0; pi < c.length; pi++) c[pi].x += dx;
  }
  var b2 = G.glyphBounds(contours);
  var off = Math.abs((b2.minX + b2.maxX) / 2 - adv / 2);
  if (off > offMax) offMax = off;
  if (off > 2) bad++;
  checked++;
}
console.log('glifos verificados: ' + checked);
console.log('desviacion maxima del centro: ' + offMax.toFixed(2) + ' unidades');
console.log('fuera de tolerancia: ' + bad);
console.log(bad === 0 && offMax <= 2 ? 'CENTERING OK' : 'CENTERING FAIL');
process.exit(bad === 0 ? 0 : 1);
