(function (global) {
  'use strict';

  function buildFont(project) {
    var glyphs = [];
    var notdef = new opentype.Glyph({
      name: '.notdef',
      advanceWidth: 500,
      path: new opentype.Path()
    });
    glyphs.push(notdef);
    var sorted = Array.from(project.glyphs.values()).sort(function (a, b) {
      return a.unicode - b.unicode;
    });
    for (var i = 0; i < sorted.length; i++) {
      var g = sorted[i];
      var path = new opentype.Path();
      path.commands = FTG.contoursToCommands(g.contours);
      var og = new opentype.Glyph({
        name: g.name,
        unicode: g.unicode,
        advanceWidth: g.advanceWidth || 600,
        path: path
      });
      glyphs.push(og);
    }
    var family = (project.familyName || 'Free Type Foundry').trim() || 'Free Type Foundry';
    var font = new opentype.Font({
      familyName: family,
      styleName: 'Regular',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: glyphs
    });
    font.names = {
      fontFamily: { en: family },
      fontSubfamily: { en: 'Regular' },
      fullName: { en: family + ' Regular' },
      postScriptName: { en: family.replace(/\s+/g, '') + '-Regular' },
      designer: { en: 'Eduardo Fierro Duque' },
      designerURL: { en: 'https://freeanimationpower.org' },
      manufacturer: { en: 'Free Animation Power' },
      manufacturerURL: { en: 'https://freeanimationpower.org' },
      license: { en: 'GPL v3.0' },
      licenseURL: { en: 'https://www.gnu.org/licenses/gpl-3.0.html' },
      version: { en: 'Version 1.000' },
      description: { en: 'Creada con Free Type Foundry' },
      copyright: { en: 'Copyright ' + new Date().getFullYear() + ' Free Animation Power' }
    };
    return font;
  }

  function serializeProject(project) {
    var glyphs = [];
    project.glyphs.forEach(function (g) {
      glyphs.push({
        unicode: g.unicode,
        name: g.name,
        advanceWidth: g.advanceWidth,
        contours: g.contours.map(function (c) {
          return c.map(function (p) { return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, p.on ? 1 : 0]; });
        })
      });
    });
    return JSON.stringify({
      app: 'freetypefoundry',
      version: 1,
      savedAt: new Date().toISOString(),
      familyName: project.familyName,
      glyphs: glyphs
    });
  }

  function deserializeProject(json) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!data || data.app !== 'freetypefoundry' || !Array.isArray(data.glyphs)) {
      throw new Error('Archivo de proyecto no válido');
    }
    var glyphs = new Map();
    for (var i = 0; i < data.glyphs.length; i++) {
      var g = data.glyphs[i];
      if (typeof g.unicode !== 'number') continue;
      glyphs.set(g.unicode, {
        unicode: g.unicode,
        name: g.name || FTG.glyphNameFor(g.unicode),
        advanceWidth: g.advanceWidth || 620,
        contours: (g.contours || []).map(function (c) {
          return c.map(function (p) { return { x: p[0], y: p[1], on: !!p[2] }; });
        })
      });
    }
    return {
      familyName: data.familyName || 'Free Type Foundry',
      glyphs: glyphs
    };
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 400);
  }

  global.FTExporter = {
    buildFont: buildFont,
    serializeProject: serializeProject,
    deserializeProject: deserializeProject,
    downloadBlob: downloadBlob
  };
})(typeof window !== 'undefined' ? window : globalThis);
