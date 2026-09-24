var opentype = require('opentype.js');
require('../js/geometry.js');
var G = globalThis.FTG;
var fs = require('fs');
var path = require('path');

var glyphs = new Map();
glyphs.set(65, {
  unicode: 65,
  name: 'A',
  advanceWidth: 620,
  contours: [
    [{x:100,y:0,on:true},{x:250,y:700,on:true},{x:400,y:0,on:120>50}],
    [{x:160,y:250,on:true},{x:340,y:250,on:true},{x:300,y:250,on:false}]
  ]
});
glyphs.set(66, {
  unicode: 66,
  name: 'B',
  advanceWidth: 620,
  contours: [[{x:100,y:0,on:true},{x:100,y:700,on:true},{x:400,y:700,on:true},{x:400,y:0,on:true}]]
});
var project = { familyName: 'Mi Fuente Test', glyphs: glyphs };

function buildFont(project) {
  var glyphsArr = [];
  var notdef = new opentype.Glyph({ name: '.notdef', advanceWidth: 500, path: new opentype.Path() });
  glyphsArr.push(notdef);
  var sorted = Array.from(project.glyphs.values()).sort(function (a, b) { return a.unicode - b.unicode; });
  for (var i = 0; i < sorted.length; i++) {
    var g = sorted[i];
    var path = new opentype.Path();
    path.commands = G.contoursToCommands(g.contours);
    glyphsArr.push(new opentype.Glyph({ name: g.name, unicode: g.unicode, advanceWidth: g.advanceWidth, path: path }));
  }
  var font = new opentype.Font({
    familyName: project.familyName,
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: glyphsArr
  });
  font.names = {
    fontFamily: { en: project.familyName },
    fontSubfamily: { en: 'Regular' },
    fullName: { en: project.familyName + ' Regular' },
    postScriptName: { en: project.familyName.replace(/\s+/g, '') + '-Regular' },
    designer: { en: 'Eduardo Fierro Duque' },
    designerURL: { en: 'https://freeanimationpower.org' },
    manufacturer: { en: 'Free Animation Power' },
    manufacturerURL: { en: 'https://freeanimationpower.org' },
    license: { en: 'GPL v3.0' },
    licenseURL: { en: 'https://www.gnu.org/licenses/gpl-3.0.html' },
    version: { en: 'Version 1.000' },
    description: { en: 'Creada con Free Type Foundry' },
    copyright: { en: 'Copyright 2026 Free Animation Power' }
  };
  return font;
}

try {
  var font = buildFont(project);
  var ab = font.toArrayBuffer();
  var buf = Buffer.from(ab);
  fs.writeFileSync(path.join(__dirname, 'test-font.ttf'), buf);
  console.log('TTF escrito: ' + buf.length + ' bytes');

  var reparsed = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  console.log('Re-parse OK. Familia: ' + reparsed.names.fontFamily.en);
  console.log('Glyphs: ' + reparsed.glyphs.length);
  var gA = reparsed.charToGlyph('A');
  var gB = reparsed.charToGlyph('B');
  console.log('charToGlyph(A) existe: ' + !!gA + ' | contornos: ' + gA.path.commands.filter(function(c){return c.type==='Z';}).length);
  console.log('charToGlyph(B) existe: ' + !!gB);
  var adv = reparsed.getAdvanceWidth('A', 1000);
  console.log('Advance A: ' + adv + ' (esperado 620)');
  var bb = reparsed.getPath('A', 0, 0, 1000).getBoundingBox();
  console.log('BBox A: x1=' + bb.x1.toFixed(1) + ' y1=' + bb.y1.toFixed(1) + ' x2=' + bb.x2.toFixed(1) + ' y2=' + bb.y2.toFixed(1));
  var ok = !!gA && !!gB && Math.abs(adv - 620) < 1 && reparsed.names.fontFamily.en === 'Mi Fuente Test';
  console.log(ok ? 'ROUNDTRIP OK' : 'ROUNDTRIP CON PROBLEMAS');
  process.exit(ok ? 0 : 1);
} catch (e) {
  console.log('ERROR: ' + e.stack);
  process.exit(1);
}

