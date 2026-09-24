(function (global) {
  'use strict';

  var HIT_PX = 7;
  var WIN = { minX: -100, maxX: 1080, minY: -300, maxY: 860 };
  var HOVER_ON = '#ff3300';
  var HOVER_OFF = '#ff5c33';
  var SELECT_PT = '#ff4200';

  function GridEditor(container, callbacks) {
    this.container = container;
    this.cb = callbacks || {};
    this.tool = 'select';
    this.brushSize = 70;
    this.cellSize = 140;
    this.selection = null;
    this.hover = null;
    this.draft = null;
    this.stroke = null;
    this.drag = null;
    this._before = null;
    this._dirty = false;
    this._cells = new Map();
    this._io = null;
    this._bind();
  }

  GridEditor.prototype.k = function () {
    return this.cellSize / 1000;
  };

  GridEditor.prototype.metrics = function () {
    var k = this.k();
    return {
      k: k,
      w: Math.round((WIN.maxX - WIN.minX) * k),
      h: Math.round((WIN.maxY - WIN.minY) * k)
    };
  };

  GridEditor.prototype.worldToLocal = function (p) {
    var k = this.k();
    return { x: (p.x - WIN.minX) * k, y: (WIN.maxY - p.y) * k };
  };

  GridEditor.prototype.localToWorld = function (s) {
    var k = this.k();
    return { x: s.x / k + WIN.minX, y: WIN.maxY - s.y / k };
  };

  GridEditor.prototype.snapshot = function (g) {
    return {
      advanceWidth: g.advanceWidth,
      contours: g.contours.map(function (c) {
        return c.map(function (p) { return { x: p.x, y: p.y, on: p.on }; });
      })
    };
  };

  GridEditor.prototype.setGlyphs = function (glyphs, list) {
    this._glyphs = glyphs;
    this._list = list;
    this._cells.clear();
    this.container.innerHTML = '';
    this.selection = null;
    this.hover = null;
    this.draft = null;
    this.stroke = null;
    this.drag = null;
    var m = this.metrics();
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      var cell = document.createElement('div');
      cell.className = 'gcell' + (g.contours.length ? '' : ' empty');
      cell.dataset.u = String(g.unicode);
      var cv = document.createElement('canvas');
      cv.width = Math.round(m.w * (global.devicePixelRatio || 1));
      cv.height = Math.round(m.h * (global.devicePixelRatio || 1));
      cv.style.width = m.w + 'px';
      cv.style.height = m.h + 'px';
      var lbl = document.createElement('div');
      lbl.className = 'glabel';
      var u = g.unicode;
      lbl.textContent = u === 32 ? '␣' : (u >= 33 && u <= 126 ? String.fromCharCode(u) : String.fromCharCode(u));
      var hx = document.createElement('div');
      hx.className = 'ghex';
      hx.textContent = u.toString(16).toUpperCase().padStart(4, '0');
      cell.appendChild(cv);
      cell.appendChild(lbl);
      cell.appendChild(hx);
      cell.title = 'U+' + hx.textContent + ' · ' + g.name;
      this.container.appendChild(cell);
      this._cells.set(u, { cell: cell, canvas: cv, glyph: g });
    }
    this.container.style.gridTemplateColumns = 'repeat(6, ' + m.w + 'px)';
    this._setupLazyDraw();
  };

  GridEditor.prototype._setupLazyDraw = function () {
    var self = this;
    if (this._io) this._io.disconnect();
    if (!('IntersectionObserver' in global)) {
      this._cells.forEach(function (entry) { self.drawCell(entry); });
      return;
    }
    this._io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        var u = parseInt(entries[i].target.dataset.u, 10);
        var entry = self._cells.get(u);
        if (entry && !entry.drawn) {
          self.drawCell(entry);
          self._io.unobserve(entries[i].target);
        }
      }
    }, { root: this.container.parentElement, rootMargin: '120px' });
    this._cells.forEach(function (entry) {
      self._io.observe(entry.cell);
    });
  };

  GridEditor.prototype.redraw = function (u) {
    var entry = this._cells.get(u);
    if (entry) this.drawCell(entry);
  };

  GridEditor.prototype.refreshCellState = function (u) {
    var entry = this._cells.get(u);
    if (!entry) return;
    entry.cell.classList.toggle('empty', !entry.glyph.contours.length);
    this.drawCell(entry);
  };

  GridEditor.prototype.drawCell = function (entry) {
    var ctx = entry.canvas.getContext('2d');
    var dpr = global.devicePixelRatio || 1;
    var k = this.k();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
    ctx.setTransform(dpr * k, 0, 0, -dpr * k, -WIN.minX * dpr * k, WIN.maxY * dpr * k);
    entry.drawn = true;
    this._renderGuides(ctx, entry);
    this._renderGlyph(ctx, entry);
    this._renderSelection(ctx, entry);
    this._renderDraft(ctx, entry);
    this._renderStroke(ctx, entry);
  };

  GridEditor.prototype._renderGuides = function (ctx, entry) {
    var k = this.k();
    var lines = [
      { y: 0, color: 'rgba(255,66,0,0.85)', width: 1.3 },
      { y: 500, color: 'rgba(47,107,255,0.4)', width: 0.8 },
      { y: 700, color: 'rgba(18,183,106,0.4)', width: 0.8 },
      { y: 800, color: 'rgba(122,117,98,0.4)', width: 0.8 },
      { y: -200, color: 'rgba(122,117,98,0.4)', width: 0.8 }
    ];
    ctx.setLineDash([]);
    for (var i = 0; i < lines.length; i++) {
      ctx.strokeStyle = lines[i].color;
      ctx.lineWidth = lines[i].width / k;
      ctx.beginPath();
      ctx.moveTo(WIN.minX, lines[i].y);
      ctx.lineTo(WIN.maxX, lines[i].y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(122,117,98,0.35)';
    ctx.lineWidth = 0.8 / k;
    ctx.beginPath();
    ctx.moveTo(0, WIN.minY);
    ctx.lineTo(0, WIN.maxY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(47,107,255,0.7)';
    ctx.lineWidth = 1.1 / k;
    ctx.setLineDash([7 / k, 5 / k]);
    ctx.beginPath();
    ctx.moveTo(entry.glyph.advanceWidth, WIN.minY);
    ctx.lineTo(entry.glyph.advanceWidth, WIN.maxY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  GridEditor.prototype._renderGlyph = function (ctx, entry) {
    var g = entry.glyph;
    if (!g.contours.length) return;
    var k = this.k();
    var path = this._buildPath(g.contours);
    ctx.fillStyle = '#000000';
    ctx.fill(path, 'evenodd');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4 / k;
    ctx.lineJoin = 'round';
    ctx.stroke(path);

    if (this.tool === 'erase' && this.hover && this.hover.u === entry.glyph.unicode && this.hover.type === 'segment') {
      var hc = g.contours[this.hover.contourIdx];
      var hi = this.hover.segIdx;
      var ha = hc[hi];
      var hni = (hi + 1) % hc.length;
      var hb = hc[hni];
      ctx.strokeStyle = '#ff4200';
      ctx.lineWidth = 6 / k;
      ctx.setLineDash([7 / k, 5 / k]);
      ctx.beginPath();
      if (hb.on) {
        ctx.moveTo(ha.x, ha.y);
        ctx.lineTo(hb.x, hb.y);
      } else {
        var hnni = (hi + 2) % hc.length;
        ctx.moveTo(ha.x, ha.y);
        ctx.quadraticCurveTo(hb.x, hb.y, hc[hnni].x, hc[hnni].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.selection && this.selection.u === entry.glyph.unicode && this.selection.type === 'segment') {
      var sc = g.contours[this.selection.contourIdx];
      var sIdx = this.selection.segIdx;
      var a = sc[sIdx];
      var ni = (sIdx + 1) % sc.length;
      var b = sc[ni];
      ctx.strokeStyle = '#ff3300';
      ctx.lineWidth = 5 / k;
      ctx.beginPath();
      if (b.on) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      } else {
        var nni = (sIdx + 2) % sc.length;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(b.x, b.y, sc[nni].x, sc[nni].y);
      }
      ctx.stroke();
    }

    var half = 4.6 / k;
    for (var ci = 0; ci < g.contours.length; ci++) {
      var contour = g.contours[ci];
      for (var pi = 0; pi < contour.length; pi++) {
        var p = contour[pi];
        var isSel = this.selection && this.selection.u === entry.glyph.unicode && this.selection.type === 'point' &&
          this.selection.contourIdx === ci && this.selection.ptIdx === pi;
        var isHov = this.hover && this.hover.u === entry.glyph.unicode && this.hover.type === 'point' &&
          this.hover.contourIdx === ci && this.hover.ptIdx === pi;
        if (p.on) {
          ctx.fillStyle = isSel ? SELECT_PT : (isHov ? HOVER_ON : '#ffffff');
          ctx.strokeStyle = isSel ? SELECT_PT : '#070706';
          ctx.lineWidth = 1.3 / k;
          ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2);
          ctx.strokeRect(p.x - half, p.y - half, half * 2, half * 2);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.6 / k, 0, Math.PI * 2);
          ctx.fillStyle = isSel ? SELECT_PT : (isHov ? HOVER_OFF : '#ff3300');
          ctx.fill();
          ctx.strokeStyle = isSel ? SELECT_PT : '#070706';
          ctx.lineWidth = 1.1 / k;
          ctx.stroke();
          var n = contour.length;
          var prev = contour[(pi - 1 + n) % n];
          var next = contour[(pi + 1) % n];
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 0.9 / k;
          ctx.setLineDash([3.5 / k, 3.5 / k]);
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  };

  GridEditor.prototype._buildPath = function (contours) {
    var path = new Path2D();
    for (var k = 0; k < contours.length; k++) {
      var contour = contours[k];
      var n = contour.length;
      if (n < 2) continue;
      var i = 0;
      while (i < n && !contour[i].on) i++;
      if (i >= n) continue;
      path.moveTo(contour[i].x, contour[i].y);
      var idx = i, guard = 0;
      while (guard++ <= n + 1) {
        var a = contour[idx];
        var ni = (idx + 1) % n;
        var b = contour[ni];
        if (b.on) {
          if (ni === i) break;
          path.lineTo(b.x, b.y);
          idx = ni;
        } else {
          var nni = (idx + 2) % n;
          path.quadraticCurveTo(b.x, b.y, contour[nni].x, contour[nni].y);
          idx = nni;
          if (idx === i) break;
        }
        if (idx === i) break;
      }
      path.closePath();
    }
    return path;
  };

  GridEditor.prototype._renderSelection = function (ctx, entry) {
    void ctx;
    void entry;
  };

  GridEditor.prototype._renderDraft = function (ctx, entry) {
    if (!this.draft || this.draft.u !== entry.glyph.unicode) return;
    var k = this.k();
    var pts = this.draft.pts;
    ctx.strokeStyle = '#2f6bff';
    ctx.lineWidth = 1.5 / k;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (pts.length > 2) ctx.closePath();
    ctx.stroke();
    for (i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 3.2 / k, 0, Math.PI * 2);
      ctx.fillStyle = '#2f6bff';
      ctx.fill();
    }
  };

  GridEditor.prototype._renderStroke = function (ctx, entry) {
    if (!this.stroke || this.stroke.u !== entry.glyph.unicode || this.stroke.samples.length < 2) return;
    var samples = this.stroke.samples;
    ctx.strokeStyle = 'rgba(7,7,6,0.5)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.brushSize * (0.25 + 0.75 * (samples[0].pressure || 0.5));
    ctx.beginPath();
    ctx.moveTo(samples[0].x, samples[0].y);
    for (var i = 1; i < samples.length; i++) ctx.lineTo(samples[i].x, samples[i].y);
    ctx.stroke();
  };

  GridEditor.prototype.setTool = function (tool) {
    this.tool = tool;
    this.draft = null;
    this.stroke = null;
    if (this.cb.onTool) this.cb.onTool(tool);
  };

  GridEditor.prototype.setBrushSize = function (v) {
    this.brushSize = v;
  };

  GridEditor.prototype.setCellSize = function (px) {
    this.cellSize = Math.max(70, Math.min(320, px));
    var m = this.metrics();
    var self = this;
    this._cells.forEach(function (entry) {
      entry.canvas.width = Math.round(m.w * (global.devicePixelRatio || 1));
      entry.canvas.height = Math.round(m.h * (global.devicePixelRatio || 1));
      entry.canvas.style.width = m.w + 'px';
      entry.canvas.style.height = m.h + 'px';
      entry.drawn = false;
    });
    if (this.container.style) {
      this.container.style.gridTemplateColumns = 'repeat(6, ' + m.w + 'px)';
    }
    this._setupLazyDraw();
    if (this.cb.onCellSize) this.cb.onCellSize(px);
  };

  GridEditor.prototype.selectGlyph = function (u) {
    this.selection = null;
    this._cells.forEach(function (entry) {
      entry.cell.classList.toggle('active', entry.glyph.unicode === u);
    });
    var entry = this._cells.get(u);
    if (entry && entry.cell.scrollIntoView) {
      entry.cell.scrollIntoView({ block: 'nearest' });
    }
    if (this.cb.onSelect) this.cb.onSelect(u);
  };

  GridEditor.prototype._bind = function () {
    var self = this;
    this.container.addEventListener('pointerdown', function (e) { self._onDown(e); });
    this.container.addEventListener('pointermove', function (e) { self._onMove(e); });
    global.addEventListener('pointerup', function (e) { self._onUp(e); });
    this.container.addEventListener('dblclick', function (e) { self._onDblClick(e); });
  };

  GridEditor.prototype._entryFromEvent = function (e) {
    var cell = e.target && e.target.closest ? e.target.closest('.gcell') : null;
    if (!cell) return null;
    var u = parseInt(cell.dataset.u, 10);
    return this._cells.get(u) || null;
  };

  GridEditor.prototype._evLocal = function (e, entry) {
    var rect = entry.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  GridEditor.prototype._hitPoint = function (entry, lx, ly) {
    var g = entry.glyph;
    var best = null, bestD = HIT_PX;
    for (var ci = 0; ci < g.contours.length; ci++) {
      var contour = g.contours[ci];
      for (var pi = 0; pi < contour.length; pi++) {
        var s = this.worldToLocal(contour[pi]);
        var d = Math.hypot(s.x - lx, s.y - ly);
        if (d < bestD) {
          bestD = d;
          best = { contourIdx: ci, ptIdx: pi };
        }
      }
    }
    return best;
  };

  GridEditor.prototype._hitSegment = function (entry, lx, ly, radius) {
    var g = entry.glyph;
    var best = null, bestD = radius || HIT_PX;
    for (var ci = 0; ci < g.contours.length; ci++) {
      var contour = g.contours[ci];
      FTG.eachSegment(contour, function (a, ctrl, b, segIdx) {
        var d, t = 0;
        if (ctrl) {
          var minD = Infinity;
          for (var i = 0; i <= 24; i++) {
            var tt = i / 24;
            var qp = FTG.quadPoint(a, ctrl, b, tt);
            var sp = this.worldToLocal(qp);
            var dd = Math.hypot(sp.x - lx, sp.y - ly);
            if (dd < minD) { minD = dd; t = tt; }
          }
          d = minD;
        } else {
          var sa = this.worldToLocal(a);
          var sb = this.worldToLocal(b);
          d = FTG.distToSegment({ x: lx, y: ly }, sa, sb);
          var dx = sb.x - sa.x, dy = sb.y - sa.y;
          var l2 = dx * dx + dy * dy;
          t = l2 ? ((lx - sa.x) * dx + (ly - sa.y) * dy) / l2 : 0;
          t = Math.max(0, Math.min(1, t));
        }
        if (d < bestD) {
          bestD = d;
          best = { contourIdx: ci, segIdx: segIdx, t: t };
        }
      }.bind(this));
    }
    return best;
  };

  GridEditor.prototype._onDown = function (e) {
    if (e.button !== 0) return;
    var entry = this._entryFromEvent(e);
    if (!entry) return;
    var u = entry.glyph.unicode;
    this.selectGlyph(u);
    var loc = this._evLocal(e, entry);
    var w = this.localToWorld(loc);
    this.selection = null;

    if (this.tool === 'draw') {
      this._before = this.snapshot(entry.glyph);
      this._dirty = false;
      this.stroke = { u: u, samples: [{ x: w.x, y: w.y, pressure: e.pressure !== undefined ? e.pressure : 0.5 }] };
      entry.canvas.setPointerCapture(e.pointerId);
      this.redraw(u);
      return;
    }

    if (this.tool === 'line') {
      if (!this.draft || this.draft.u !== u) {
        this._before = this.snapshot(entry.glyph);
        this._dirty = false;
        this.draft = { u: u, pts: [{ x: w.x, y: w.y }] };
      } else {
        this.draft.pts.push({ x: w.x, y: w.y });
      }
      entry.canvas.setPointerCapture(e.pointerId);
      this._dirty = true;
      this.redraw(u);
      return;
    }

    var hitPt = this._hitPoint(entry, loc.x, loc.y);

    if (this.tool === 'add') {
      var seg = this._hitSegment(entry, loc.x, loc.y);
      if (seg) {
        this._before = this.snapshot(entry.glyph);
        this._dirty = true;
        var newIdx = FTG.insertPointOnSegment(entry.glyph.contours[seg.contourIdx], seg.segIdx, seg.t, w);
        this.selection = { u: u, type: 'point', contourIdx: seg.contourIdx, ptIdx: newIdx };
        this.redraw(u);
        this._commit(entry.glyph, 'Añadir punto');
      }
      return;
    }

    if (this.tool === 'delete') {
      if (hitPt) {
        this._before = this.snapshot(entry.glyph);
        this._dirty = true;
        var dc = entry.glyph.contours[hitPt.contourIdx];
        var res = FTG.removePointAt(dc, hitPt.ptIdx);
        if (!res.length) entry.glyph.contours.splice(hitPt.contourIdx, 1);
        else entry.glyph.contours[hitPt.contourIdx] = res;
        var delEntry = this._cells.get(u);
        if (delEntry) delEntry.cell.classList.toggle('empty', !entry.glyph.contours.length);
        this.redraw(u);
        this._commit(entry.glyph, 'Borrar punto');
      }
      return;
    }

    if (this.tool === 'erase') {
      var eseg = this._hitSegment(entry, loc.x, loc.y, 4.5);
      if (eseg) {
        this._before = this.snapshot(entry.glyph);
        this._dirty = true;
        entry.glyph.contours.splice(eseg.contourIdx, 1);
        var erEntry = this._cells.get(u);
        if (erEntry) erEntry.cell.classList.toggle('empty', !entry.glyph.contours.length);
        this.hover = null;
        this.redraw(u);
        this._commit(entry.glyph, 'Borrar contorno');
      }
      return;
    }

    if (hitPt) {
      this.selection = { u: u, type: 'point', contourIdx: hitPt.contourIdx, ptIdx: hitPt.ptIdx };
      this._before = this.snapshot(entry.glyph);
      this._dirty = false;
      this.drag = { u: u, kind: 'point', contourIdx: hitPt.contourIdx, ptIdx: hitPt.ptIdx, lastX: w.x, lastY: w.y, moved: false };
      entry.canvas.setPointerCapture(e.pointerId);
      this.redraw(u);
      return;
    }

    var seg2 = this._hitSegment(entry, loc.x, loc.y);
    if (seg2) {
      this.selection = { u: u, type: 'segment', contourIdx: seg2.contourIdx, segIdx: seg2.segIdx };
      this._before = this.snapshot(entry.glyph);
      this._dirty = false;
      this.drag = { u: u, kind: 'contour', contourIdx: seg2.contourIdx, lastX: w.x, lastY: w.y, moved: false };
      entry.canvas.setPointerCapture(e.pointerId);
      this.redraw(u);
      return;
    }
    this.redraw(u);
  };

  GridEditor.prototype._onMove = function (e) {
    var entry = this._entryFromEvent(e);
    if (!entry) return;
    var u = entry.glyph.unicode;
    var loc = this._evLocal(e, entry);
    var w = this.localToWorld(loc);

    if (this.stroke && this.stroke.u === u) {
      var last = this.stroke.samples[this.stroke.samples.length - 1];
      if (Math.hypot(w.x - last.x, w.y - last.y) > 1.5 / this.k()) {
        this.stroke.samples.push({ x: w.x, y: w.y, pressure: e.pressure !== undefined ? e.pressure : 0.5 });
      }
      this.redraw(u);
      return;
    }

    if (this.drag && this.drag.u === u && this.drag.kind === 'point') {
      var g = entry.glyph;
      var contour = g.contours[this.drag.contourIdx];
      var ptIdx = this.drag.ptIdx;
      var p = contour[ptIdx];
      var dx = w.x - this.drag.lastX;
      var dy = w.y - this.drag.lastY;
      if (dx !== 0 || dy !== 0) this.drag.moved = true;
      p.x += dx;
      p.y += dy;
      if (p.on) {
        var n = contour.length;
        var prev = contour[(ptIdx - 1 + n) % n];
        var next = contour[(ptIdx + 1) % n];
        if (!prev.on) { prev.x += dx; prev.y += dy; }
        if (!next.on) { next.x += dx; next.y += dy; }
      }
      this.drag.lastX = w.x;
      this.drag.lastY = w.y;
      this._dirty = true;
      this.redraw(u);
      return;
    }

    if (this.drag && this.drag.u === u && this.drag.kind === 'contour') {
      var cc = entry.glyph.contours[this.drag.contourIdx];
      var dxc = w.x - this.drag.lastX;
      var dyc = w.y - this.drag.lastY;
      if (dxc !== 0 || dyc !== 0) this.drag.moved = true;
      for (var i = 0; i < cc.length; i++) {
        cc[i].x += dxc;
        cc[i].y += dyc;
      }
      this.drag.lastX = w.x;
      this.drag.lastY = w.y;
      this._dirty = true;
      this.redraw(u);
      return;
    }

    var hitPt = this._hitPoint(entry, loc.x, loc.y);
    var newHover = null;
    if (this.tool === 'erase') {
      var eseg = this._hitSegment(entry, loc.x, loc.y, 10);
      newHover = eseg ? { u: u, type: 'segment', contourIdx: eseg.contourIdx, segIdx: eseg.segIdx } : null;
    } else if (hitPt) {
      newHover = { u: u, type: 'point', contourIdx: hitPt.contourIdx, ptIdx: hitPt.ptIdx };
    }
    var changed = !newHover !== !this.hover ||
      (newHover && this.hover && (newHover.u !== this.hover.u ||
        newHover.type !== this.hover.type ||
        newHover.contourIdx !== this.hover.contourIdx ||
        (newHover.ptIdx !== undefined && newHover.ptIdx !== this.hover.ptIdx) ||
        (newHover.segIdx !== undefined && newHover.segIdx !== this.hover.segIdx)));
    if (changed) {
      var prevU = this.hover ? this.hover.u : null;
      this.hover = newHover;
      this.redraw(u);
      if (prevU != null && prevU !== u) this.redraw(prevU);
    }
  };

  GridEditor.prototype._onUp = function (e) {
    var entry = this._entryFromEvent(e);
    if (this.stroke) {
      var g = this._glyphs.get(this.stroke.u);
      var contour = FTG.strokeToContour(this.stroke.samples, this.brushSize);
      this.stroke = null;
      if (g && contour) g.contours.push(contour);
      this._dirty = true;
      if (g) {
        var stEntry = this._cells.get(g.unicode);
        if (stEntry) stEntry.cell.classList.toggle('empty', !g.contours.length);
        this.redraw(g.unicode);
        this._commit(g, 'Dibujar');
      }
      return;
    }
    if (this.drag) {
      var u2 = this.drag.u;
      var moved = this.drag.moved;
      this.drag = null;
      if (moved) {
        var g2 = this._glyphs.get(u2);
        this._dirty = true;
        if (g2) this._commit(g2, 'Mover');
      } else {
        this._before = null;
      }
      return;
    }
    void entry;
  };

  GridEditor.prototype._onDblClick = function (e) {
    if (this.tool === 'line' && this.draft && this.draft.pts.length >= 3) {
      this.finishLineDraft();
      e.preventDefault();
    }
  };

  GridEditor.prototype.finishLineDraft = function () {
    if (!this.draft) return;
    var pts = this.draft.pts;
    var u = this.draft.u;
    this.draft = null;
    var g = this._glyphs.get(u);
    if (g && pts.length >= 3) {
      g.contours.push(FTG.normalizeContour(pts.map(function (p) { return { x: p.x, y: p.y, on: true }; })));
      this._dirty = true;
      var en = this._cells.get(u);
      if (en) en.cell.classList.toggle('empty', !g.contours.length);
      this.redraw(u);
      this._commit(g, 'Contorno');
    }
  };

  GridEditor.prototype.cancelDraft = function () {
    if (this.draft) {
      var u = this.draft.u;
      this.draft = null;
      this._before = null;
      this.redraw(u);
    }
  };

  GridEditor.prototype._commit = function (g, label) {
    if (!this._dirty) { this._before = null; return; }
    var after = this.snapshot(g);
    if (this.cb.onChange) this.cb.onChange(this._before, after, label);
    this._before = null;
    this._dirty = false;
  };

  GridEditor.prototype.smoothSelection = function () {
    if (!this.selection || this.selection.type !== 'point') return;
    var g = this._glyphs.get(this.selection.u);
    if (!g) return;
    this._before = this.snapshot(g);
    this._dirty = true;
    FTG.smoothAt(g.contours[this.selection.contourIdx], this.selection.ptIdx);
    this.redraw(this.selection.u);
    this._commit(g, 'Suavizar');
  };

  GridEditor.prototype.curveSelection = function () {
    if (!this.selection || this.selection.type !== 'segment') return;
    var g = this._glyphs.get(this.selection.u);
    if (!g) return;
    this._before = this.snapshot(g);
    if (FTG.setSegmentCurved(g.contours[this.selection.contourIdx], this.selection.segIdx, true)) {
      this._dirty = true;
      this.redraw(this.selection.u);
      this._commit(g, 'Convertir a curva');
    } else {
      this._before = null;
    }
  };

  GridEditor.prototype.lineSelection = function () {
    if (!this.selection || this.selection.type !== 'segment') return;
    var g = this._glyphs.get(this.selection.u);
    if (!g) return;
    this._before = this.snapshot(g);
    if (FTG.setSegmentCurved(g.contours[this.selection.contourIdx], this.selection.segIdx, false)) {
      this._dirty = true;
      this.redraw(this.selection.u);
      this._commit(g, 'Convertir a recta');
    } else {
      this._before = null;
    }
  };

  GridEditor.prototype.clearSelectedGlyph = function () {
    if (!this.selection) return;
    var g = this._glyphs.get(this.selection.u);
    if (!g) return;
    this._before = this.snapshot(g);
    this._dirty = true;
    g.contours = [];
    this.selection = null;
    var entry = this._cells.get(g.unicode);
    if (entry) entry.cell.classList.add('empty');
    this.redraw(g.unicode);
    this._commit(g, 'Vaciar glifo');
  };

  GridEditor.prototype.selectedUnicode = function () {
    return this.selection ? this.selection.u : null;
  };

  global.FTGridEditor = GridEditor;
})(typeof window !== 'undefined' ? window : globalThis);

