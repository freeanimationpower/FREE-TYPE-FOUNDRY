(function (global) {
  'use strict';

  function parseFont(buffer) {
    var font = opentype.parse(buffer);
    var upm = font.unitsPerEm || 1000;
    var scale = 1000 / upm;
    var glyphs = new Map();
    var i, g;
    for (i = 0; i < font.glyphs.length; i++) {
      g = font.glyphs.get(i);
      if (!g) continue;
      var u = g.unicode;
      if (u == null || u === 0 || u === undefined) continue;
      if (glyphs.has(u)) continue;
      var contours = FTG.commandsToContours(g.path.commands || [], scale);
      glyphs.set(u, {
        unicode: u,
        name: g.name || FTG.glyphNameFor(u),
        advanceWidth: Math.max(1, Math.round((g.advanceWidth || 0) * scale)),
        contours: contours
      });
    }
    var familyName = 'Fuente importada';
    if (font.names && font.names.fontFamily && font.names.fontFamily.en) {
      familyName = font.names.fontFamily.en;
    } else if (font.names && font.names.fullName && font.names.fullName.en) {
      familyName = font.names.fullName.en;
    }
    return { familyName: familyName, glyphs: glyphs, count: glyphs.size };
  }

  function defaultGlyphSet() {
    var glyphs = new Map();
    var ranges = [];
    var u;
    for (u = 32; u <= 126; u++) ranges.push(u);
    for (u = 161; u <= 255; u++) ranges.push(u);
    for (var i = 0; i < ranges.length; i++) {
      u = ranges[i];
      glyphs.set(u, {
        unicode: u,
        name: FTG.glyphNameFor(u),
        advanceWidth: 620,
        contours: []
      });
    }
    return glyphs;
  }

  global.FTImporter = {
    parseFont: parseFont,
    defaultGlyphSet: defaultGlyphSet
  };
})(typeof window !== 'undefined' ? window : globalThis);
