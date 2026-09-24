(function () {
  'use strict';

  var state = {
    familyName: 'Free Type Foundry',
    glyphs: new Map(),
    selected: null
  };

  var undoStack = [];
  var redoStack = [];
  var editor = null;
  var currentFilter = 'basic';
  var currentSearch = '';

  function $(id) { return document.getElementById(id); }

  function toast(msg, isError) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  function hexLabel(u) {
    return u.toString(16).toUpperCase().padStart(4, '0');
  }

  function filterList() {
    var list = [];
    state.glyphs.forEach(function (g, u) {
      if (currentFilter === 'basic' && (u < 32 || u > 126)) return;
      if (currentFilter === 'latin' && (u < 161 || u > 255)) return;
      if (currentFilter === 'punct') {
        var ok = (u >= 33 && u <= 47) || (u >= 58 && u <= 64) || (u >= 91 && u <= 96) || (u >= 123 && u <= 126);
        if (!ok) return;
      }
      if (currentSearch) {
        var q = currentSearch.trim().toLowerCase();
        var ch = String.fromCharCode(u).toLowerCase();
        if (ch !== q && hexLabel(u).toLowerCase() !== q && g.name.toLowerCase().indexOf(q) === -1) return;
      }
      list.push(g);
    });
    list.sort(function (a, b) { return a.unicode - b.unicode; });
    return list;
  }

  function renderGrid() {
    editor.setGlyphs(state.glyphs, filterList());
  }

  function updateGlyphInfo() {
    var g = state.glyphs.get(state.selected);
    var info = $('glyphInfo');
    $('advanceWidth').value = g ? g.advanceWidth : 620;
    if (!g) {
      info.textContent = 'Sin glifo seleccionado';
      return;
    }
    var pts = 0;
    for (var i = 0; i < g.contours.length; i++) pts += g.contours[i].length;
    var ch = g.unicode === 32 ? 'SP' : (g.unicode < 32 || (g.unicode >= 127 && g.unicode <= 160) || g.unicode === 173 ? '?' : String.fromCharCode(g.unicode));
    info.textContent = 'U+' + hexLabel(g.unicode) + " · '" + ch + "' · " + g.contours.length + ' contornos · ' + pts + ' puntos';
  }

  function selectGlyph(u) {
    state.selected = u;
    editor.selectGlyph(u);
    updateGlyphInfo();
  }

  function pushUndo(before, after, label) {
    if (state.selected == null) return;
    undoStack.push({ unicode: state.selected, before: before, after: after, label: label });
    if (undoStack.length > 200) undoStack.shift();
    redoStack = [];
    updateUndoButtons();
  }

  function undo() {
    var entry = undoStack.pop();
    if (!entry) return;
    redoStack.push(entry);
    var g = state.glyphs.get(entry.unicode);
    if (!g) return;
    g.contours = entry.before.contours;
    g.advanceWidth = entry.before.advanceWidth;
    editor.refreshCellState(entry.unicode);
    if (state.selected === entry.unicode) updateGlyphInfo();
    updateUndoButtons();
    toast('Deshacer: ' + entry.label);
  }

  function redo() {
    var entry = redoStack.pop();
    if (!entry) return;
    undoStack.push(entry);
    var g = state.glyphs.get(entry.unicode);
    if (!g) return;
    g.contours = entry.after.contours;
    g.advanceWidth = entry.after.advanceWidth;
    editor.refreshCellState(entry.unicode);
    if (state.selected === entry.unicode) updateGlyphInfo();
    updateUndoButtons();
    toast('Rehacer: ' + entry.label);
  }

  function updateUndoButtons() {
    $('btnUndo').disabled = !undoStack.length;
    $('btnRedo').disabled = !redoStack.length;
  }

  function newFont() {
    if (state.glyphs.size) {
      var ok = confirm('Esto borrará la fuente actual y creará una nueva en blanco. ¿Continuar?');
      if (!ok) return;
    }
    state.familyName = 'Free Type Foundry';
    state.glyphs = FTImporter.defaultGlyphSet();
    state.selected = null;
    undoStack = [];
    redoStack = [];
    $('familyName').value = state.familyName;
    renderGrid();
    selectGlyph(65);
    updateUndoButtons();
    toast('Nueva fuente en blanco creada');
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        if (!globalThis.opentype) {
          toast('La librería de fuentes no se cargó. Revisa tu conexión.', true);
          return;
        }
        var result = FTImporter.parseFont(e.target.result);
        if (!result.count) {
          toast('La fuente no contiene glifos importables', true);
          return;
        }
        state.familyName = result.familyName;
        state.glyphs = result.glyphs;
        state.selected = null;
        undoStack = [];
        redoStack = [];
        $('familyName').value = state.familyName;
        renderGrid();
        var first = null;
        result.glyphs.forEach(function (g) {
          if (!first && g.contours.length) first = g.unicode;
        });
        if (!first) result.glyphs.forEach(function (g) { if (!first) first = g.unicode; });
        selectGlyph(first != null ? first : 65);
        updateUndoButtons();
        toast('Fuente importada: ' + result.count + ' glifos');
      } catch (err) {
        toast('No se pudo leer la fuente: ' + err.message, true);
      }
    };
    reader.onerror = function () { toast('No se pudo leer el archivo', true); };
    reader.readAsArrayBuffer(file);
  }

  function saveProject() {
    var json = FTExporter.serializeProject(state);
    var blob = new Blob([json], { type: 'application/json' });
    FTExporter.downloadBlob(blob, safeFile(state.familyName) + '.ftf');
    toast('Proyecto guardado');
  }

  function loadProject(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = FTExporter.deserializeProject(e.target.result);
        state.familyName = data.familyName;
        state.glyphs = data.glyphs;
        state.selected = null;
        undoStack = [];
        redoStack = [];
        $('familyName').value = state.familyName;
        renderGrid();
        var first = null;
        data.glyphs.forEach(function (g) {
          if (!first && g.contours.length) first = g.unicode;
        });
        if (!first) data.glyphs.forEach(function (g) { if (!first) first = g.unicode; });
        selectGlyph(first != null ? first : 65);
        updateUndoButtons();
        toast('Proyecto abierto');
      } catch (err) {
        toast('Proyecto no válido: ' + err.message, true);
      }
    };
    reader.onerror = function () { toast('No se pudo leer el archivo', true); };
    reader.readAsText(file);
  }

  function exportTTF() {
    var hasDraw = false;
    state.glyphs.forEach(function (g) {
      if (g.contours.length) hasDraw = true;
    });
    if (!hasDraw) {
      toast('La fuente no tiene ninguna letra dibujada todavía', true);
      return;
    }
    try {
      var font = FTExporter.buildFont(state);
      var ab = font.toArrayBuffer();
      var blob = new Blob([ab], { type: 'font/ttf' });
      FTExporter.downloadBlob(blob, safeFile(state.familyName) + '.ttf');
      toast('TTF exportado: instálalo haciendo doble clic');
    } catch (err) {
      toast('Error al exportar: ' + err.message, true);
    }
  }

  function safeFile(name) {
    return (name || 'free-type-foundry').replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '') || 'free-type-foundry';
  }

  function addGlyph() {
    var input = prompt('Escribe el carácter o su código Unicode (ej: A, ñ o 0041):', '');
    if (input == null) return;
    input = input.trim();
    if (!input) return;
    var u;
    if (/^[0-9a-fA-F]{1,6}$/.test(input)) {
      u = parseInt(input, 16);
    } else {
      u = input.codePointAt(0);
    }
    if (!u || u > 0x10FFFF) { toast('Código no válido', true); return; }
    if (state.glyphs.has(u)) {
      selectGlyph(u);
      toast('El glifo ya existe, seleccionado');
      return;
    }
    state.glyphs.set(u, {
      unicode: u,
      name: FTG.glyphNameFor(u),
      advanceWidth: 620,
      contours: []
    });
    currentFilter = 'all';
    currentSearch = '';
    $('gridSearch').value = '';
    var tabs = $('filterTabs').querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.filter === 'all');
    }
    renderGrid();
    selectGlyph(u);
    toast('Glifo añadido: U+' + hexLabel(u));
  }

  function activateTool(tool) {
    var tools = document.querySelectorAll('.tool[data-tool]');
    for (var i = 0; i < tools.length; i++) {
      tools[i].classList.toggle('active', tools[i].dataset.tool === tool);
    }
    editor.setTool(tool);
  }

  function bindUI() {
    var tools = document.querySelectorAll('.tool[data-tool]');
    for (var i = 0; i < tools.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          activateTool(btn.dataset.tool);
        });
      })(tools[i]);
    }

    $('btnSmooth').addEventListener('click', function () { editor.smoothSelection(); });
    $('btnCurve').addEventListener('click', function () { editor.curveSelection(); });
    $('btnLine').addEventListener('click', function () { editor.lineSelection(); });
    $('btnClear').addEventListener('click', function () {
      var g = state.glyphs.get(state.selected);
      if (g && g.contours.length && confirm('¿Vaciar el glifo seleccionado?')) editor.clearSelectedGlyph();
    });
    $('btnUndo').addEventListener('click', undo);
    $('btnRedo').addEventListener('click', redo);

    $('brushSize').addEventListener('input', function () {
      editor.setBrushSize(parseInt(this.value, 10) || 70);
      $('brushValue').textContent = this.value;
    });

    $('cellSize').addEventListener('input', function () {
      var v = parseInt(this.value, 10) || 140;
      editor.setCellSize(v);
      $('cellSizeValue').textContent = v + 'px';
    });

    $('btnNew').addEventListener('click', newFont);
    $('btnImport').addEventListener('click', function () { $('fileImport').click(); });
    $('btnSave').addEventListener('click', saveProject);
    $('btnLoad').addEventListener('click', function () { $('fileLoad').click(); });
    $('btnExport').addEventListener('click', exportTTF);
    $('btnAddGlyph').addEventListener('click', addGlyph);

    $('fileImport').addEventListener('change', function () {
      importFile(this.files[0]);
      this.value = '';
    });
    $('fileLoad').addEventListener('change', function () {
      loadProject(this.files[0]);
      this.value = '';
    });

    $('familyName').addEventListener('change', function () {
      state.familyName = this.value.trim() || 'Free Type Foundry';
      this.value = state.familyName;
    });

    $('advanceWidth').addEventListener('change', function () {
      var g = state.glyphs.get(state.selected);
      if (!g) return;
      var v = parseInt(this.value, 10);
      if (isNaN(v)) v = 620;
      v = Math.max(0, Math.min(4000, v));
      var before = { advanceWidth: g.advanceWidth, contours: g.contours };
      g.advanceWidth = v;
      this.value = v;
      editor.redraw(g.unicode);
      pushUndo(before, { advanceWidth: g.advanceWidth, contours: g.contours }, 'Avance');
    });

    var tabs = $('filterTabs').querySelectorAll('.tab');
    for (i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          currentFilter = tab.dataset.filter;
          for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle('active', tabs[j] === tab);
          renderGrid();
        });
      })(tabs[i]);
    }

    $('gridSearch').addEventListener('input', function () {
      currentSearch = this.value;
      renderGrid();
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      var key = e.key.toLowerCase();
      var toolMap = { v: 'select', a: 'add', d: 'delete', b: 'draw', l: 'line', e: 'erase' };
      if (toolMap[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        activateTool(toolMap[key]);
        return;
      }
      if (key === 'enter' && editor.tool === 'line' && editor.draft) {
        editor.finishLineDraft();
        return;
      }
      if (key === 'escape') {
        editor.cancelDraft();
        return;
      }
      if (key === '+' || key === '=') {
        var v = editor.cellSize + 12;
        $('cellSize').value = v;
        editor.setCellSize(v);
        $('cellSizeValue').textContent = v + 'px';
        return;
      }
      if (key === '-') {
        var v2 = editor.cellSize - 12;
        $('cellSize').value = v2;
        editor.setCellSize(v2);
        $('cellSizeValue').textContent = v2 + 'px';
        return;
      }
      if (key === '0') {
        $('cellSize').value = 140;
        editor.setCellSize(140);
        $('cellSizeValue').textContent = '140px';
        return;
      }
    });
  }

  function init() {
    editor = new FTGridEditor($('cells'), {
      onTool: function (tool) {
        $('brushControl').hidden = tool !== 'draw';
      },
      onSelect: function (u) {
        state.selected = u;
        updateGlyphInfo();
      },
      onChange: function (before, after, label) {
        pushUndo(before, after, label);
        toast(label + ' · Ctrl+Z deshace');
      },
      onCellSize: function () {}
    });
    bindUI();
    bindKeyboard();
    state.glyphs = FTImporter.defaultGlyphSet();
    renderGrid();
    selectGlyph(65);
    updateUndoButtons();
    var hint = $('boardHint');
    setTimeout(function () {
      hint.style.opacity = '0';
      setTimeout(function () { hint.remove(); }, 700);
    }, 7000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
