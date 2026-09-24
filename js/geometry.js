(function (global) {
  'use strict';

  function clonePt(p) { return { x: p.x, y: p.y, on: !!p.on }; }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  function distToSegment(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  function quadPoint(a, c, b, t) {
    var u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
    };
  }

  function normalizeContour(pts) {
    var n = pts.length;
    if (n < 2) return pts.map(clonePt);
    var raw = [];
    var i, p, q;
    for (i = 0; i < n; i++) {
      p = pts[i];
      q = pts[(i + 1) % n];
      raw.push(clonePt(p));
      if (!p.on && !q.on) raw.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, on: true });
    }
    while (raw.length && !raw[0].on) raw.push(raw.shift());
    var res = [];
    for (i = 0; i < raw.length; i++) {
      p = raw[i];
      var last = res[res.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.05) continue;
      res.push(p);
    }
    if (res.length > 2) {
      var f = res[0], l = res[res.length - 1];
      if (f.on && l.on && Math.hypot(f.x - l.x, f.y - l.y) < 0.05) res.pop();
    }
    return res;
  }

  function eachSegment(contour, fn) {
    var n = contour.length;
    if (n < 2) return;
    var i = 0;
    while (i < n && !contour[i].on) i++;
    if (i >= n) return;
    var idx = i, guard = 0;
    while (guard++ <= n + 1) {
      var a = contour[idx];
      var ni = (idx + 1) % n;
      var b = contour[ni];
      if (b.on) {
        fn(a, null, b, idx, ni);
        idx = ni;
      } else {
        var nni = (idx + 2) % n;
        fn(a, b, contour[nni], idx, nni);
        idx = nni;
      }
      if (idx === i) break;
    }
  }

  function contourBounds(contour) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < contour.length; i++) {
      var p = contour[i];
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function glyphBounds(contours) {
    if (!contours.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    var b = null;
    for (var i = 0; i < contours.length; i++) {
      var cb = contourBounds(contours[i]);
      if (!b) { b = cb; continue; }
      if (cb.minX < b.minX) b.minX = cb.minX;
      if (cb.minY < b.minY) b.minY = cb.minY;
      if (cb.maxX > b.maxX) b.maxX = cb.maxX;
      if (cb.maxY > b.maxY) b.maxY = cb.maxY;
    }
    return b;
  }

  function cubicToQuadratic(p0, c1, c2, p3, tol, out) {
    var q = {
      x: (3 * c1.x + 3 * c2.x - p0.x - p3.x) / 4,
      y: (3 * c1.y + 3 * c2.y - p0.y - p3.y) / 4
    };
    var cm = {
      x: (p0.x + 3 * c1.x + 3 * c2.x + p3.x) / 8,
      y: (p0.y + 3 * c1.y + 3 * c2.y + p3.y) / 8
    };
    var qm = {
      x: (p0.x + 2 * q.x + p3.x) / 4,
      y: (p0.y + 2 * q.y + p3.y) / 4
    };
    if (Math.hypot(cm.x - qm.x, cm.y - qm.y) <= tol) {
      out.push({ p0: p0, c: q, p1: p3 });
      return;
    }
    var p01 = mid(p0, c1), p12 = mid(c1, c2), p23 = mid(c2, p3);
    var p012 = mid(p01, p12), p123 = mid(p12, p23), m = mid(p012, p123);
    cubicToQuadratic(p0, p01, p012, m, tol, out);
    cubicToQuadratic(m, p123, p23, p3, tol, out);
  }

  function commandsToContours(commands, scale) {
    var contours = [];
    var cur = null;
    var i, c, j;
    for (i = 0; i < commands.length; i++) {
      c = commands[i];
      if (c.type === 'M') {
        cur = [{ x: c.x * scale, y: c.y * scale, on: true }];
        contours.push(cur);
      } else if (c.type === 'L' && cur) {
        cur.push({ x: c.x * scale, y: c.y * scale, on: true });
      } else if (c.type === 'Q' && cur) {
        cur.push({ x: c.x1 * scale, y: c.y1 * scale, on: false });
        cur.push({ x: c.x * scale, y: c.y * scale, on: true });
      } else if (c.type === 'C' && cur) {
        var start = cur[cur.length - 1];
        var quads = [];
        cubicToQuadratic(
          start,
          { x: c.x1 * scale, y: c.y1 * scale },
          { x: c.x2 * scale, y: c.y2 * scale },
          { x: c.x * scale, y: c.y * scale },
          0.5, quads
        );
        for (j = 0; j < quads.length; j++) {
          cur.push({ x: quads[j].c.x, y: quads[j].c.y, on: false });
          cur.push({ x: quads[j].p1.x, y: quads[j].p1.y, on: true });
        }
      }
    }
    var result = [];
    for (i = 0; i < contours.length; i++) {
      var cont = contours[i];
      if (cont.length >= 2) {
        var f = cont[0], l = cont[cont.length - 1];
        if (Math.hypot(f.x - l.x, f.y - l.y) < 0.05) cont.pop();
      }
      var norm = normalizeContour(cont);
      if (norm.length >= 3) result.push(norm);
    }
    return result;
  }

  function contoursToCommands(contours) {
    var cmds = [];
    var k, contour;
    for (k = 0; k < contours.length; k++) {
      contour = contours[k];
      var n = contour.length;
      if (n < 2) continue;
      var i = 0;
      while (i < n && !contour[i].on) i++;
      if (i >= n) continue;
      var startIdx = i;
      cmds.push({ type: 'M', x: contour[i].x, y: contour[i].y });
      var idx = i, guard = 0;
      while (guard++ <= n + 1) {
        var a = contour[idx];
        var ni = (idx + 1) % n;
        var b = contour[ni];
        if (b.on) {
          if (ni === startIdx) break;
          cmds.push({ type: 'L', x: b.x, y: b.y });
          idx = ni;
        } else {
          var nni = (idx + 2) % n;
          cmds.push({ type: 'Q', x1: b.x, y1: b.y, x: contour[nni].x, y: contour[nni].y });
          idx = nni;
          if (idx === startIdx) break;
        }
        if (idx === startIdx) break;
      }
      cmds.push({ type: 'Z' });
    }
    return cmds;
  }

  function splitQuad(a, c, b, t) {
    var c1 = lerp(a, c, t);
    var c2 = lerp(c, b, t);
    var m = lerp(c1, c2, t);
    return { c1: c1, m: m, c2: c2 };
  }

  function insertPointOnSegment(contour, segIdx, t, pos) {
    var a = contour[segIdx];
    var ni = (segIdx + 1) % contour.length;
    var b = contour[ni];
    if (b.on) {
      var m = pos || lerp(a, b, t);
      contour.splice(ni, 0, { x: m.x, y: m.y, on: true });
      return ni;
    }
    var ctrl = contour[ni];
    var endIdx = (segIdx + 2) % contour.length;
    var end = contour[endIdx];
    var sp = splitQuad(a, ctrl, end, t);
    contour.splice(ni, 1, { x: sp.c1.x, y: sp.c1.y, on: false });
    contour.splice(ni + 1, 0, { x: sp.m.x, y: sp.m.y, on: true });
    contour.splice(ni + 2, 0, { x: sp.c2.x, y: sp.c2.y, on: false });
    return ni + 1;
  }

  function removePointAt(contour, ptIdx) {
    contour.splice(ptIdx, 1);
    var n = contour.length;
    if (n < 3) return [];
    return normalizeContour(contour);
  }

  function smoothAt(contour, ptIdx) {
    var n = contour.length;
    var p = contour[ptIdx];
    var prev = contour[(ptIdx - 1 + n) % n];
    var next = contour[(ptIdx + 1) % n];
    if (!prev.on && next.on) {
      prev.x = 2 * p.x - next.x;
      prev.y = 2 * p.y - next.y;
    } else if (prev.on && !next.on) {
      next.x = 2 * p.x - prev.x;
      next.y = 2 * p.y - prev.y;
    } else if (!prev.on && !next.on) {
      prev.x = 2 * p.x - next.x;
      prev.y = 2 * p.y - next.y;
    }
  }

  function segmentCurved(contour, segIdx) {
    var ni = (segIdx + 1) % contour.length;
    return !contour[ni].on;
  }

  function setSegmentCurved(contour, segIdx, curved) {
    var ni = (segIdx + 1) % contour.length;
    var isCurved = !contour[ni].on;
    if (curved === isCurved) return false;
    if (curved) {
      var a = contour[segIdx];
      var nni = (segIdx + 2) % contour.length;
      var b = contour[nni];
      contour.splice(ni, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: false });
    } else {
      contour.splice(ni, 1);
    }
    return true;
  }

  function simplifyClosed(pts, tol) {
    var n = pts.length;
    if (n < 3) return pts.slice();
    var ring = pts.concat([pts[0]]);
    var keep = new Array(ring.length).fill(false);
    keep[0] = true;
    keep[ring.length - 1] = true;
    var stack = [[0, ring.length - 1]];
    while (stack.length) {
      var seg = stack.pop();
      var s = seg[0], e = seg[1];
      var maxD = 0, maxI = -1;
      for (var i = s + 1; i < e; i++) {
        var d = distToSegment(ring[i], ring[s], ring[e]);
        if (d > maxD) { maxD = d; maxI = i; }
      }
      if (maxD > tol) {
        keep[maxI] = true;
        stack.push([s, maxI], [maxI, e]);
      }
    }
    var out = [];
    for (i = 0; i < n; i++) if (keep[i]) out.push(pts[i]);
    return out;
  }

  function chaikin(pts) {
    var n = pts.length;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      out.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    return out;
  }

  function strokeToContour(samples, brushSize) {
    if (samples.length < 2) return null;
    var n = samples.length;
    var left = [], right = [], i;
    for (i = 0; i < n; i++) {
      var p = samples[i];
      var prev = samples[Math.max(0, i - 1)];
      var next = samples[Math.min(n - 1, i + 1)];
      var dx = next.x - prev.x, dy = next.y - prev.y;
      var len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      var nx = -dy, ny = dx;
      var pressure = typeof p.pressure === 'number' ? p.pressure : 0.5;
      var w = brushSize * (0.25 + 0.75 * pressure) / 2;
      left.push({ x: p.x + nx * w, y: p.y + ny * w });
      right.push({ x: p.x - nx * w, y: p.y - ny * w });
    }
    var ring = left.concat(right.slice().reverse());
    var simple = simplifyClosed(ring, 1.5);
    if (simple.length < 3) return null;
    var sm = chaikin(simple);
    var out = [];
    for (i = 0; i < sm.length; i++) {
      out.push({ x: sm[i].x, y: sm[i].y, on: i % 2 === 0 });
    }
    return normalizeContour(out);
  }

  function glyphNameFor(u) {
    if (u === 32) return 'space';
    if (u >= 33 && u <= 126) return String.fromCharCode(u);
    return 'uni' + u.toString(16).toUpperCase().padStart(4, '0');
  }

  global.FTG = {
    dist: dist,
    lerp: lerp,
    mid: mid,
    distToSegment: distToSegment,
    quadPoint: quadPoint,
    normalizeContour: normalizeContour,
    eachSegment: eachSegment,
    contourBounds: contourBounds,
    glyphBounds: glyphBounds,
    commandsToContours: commandsToContours,
    contoursToCommands: contoursToCommands,
    insertPointOnSegment: insertPointOnSegment,
    removePointAt: removePointAt,
    smoothAt: smoothAt,
    segmentCurved: segmentCurved,
    setSegmentCurved: setSegmentCurved,
    simplifyClosed: simplifyClosed,
    chaikin: chaikin,
    strokeToContour: strokeToContour,
    glyphNameFor: glyphNameFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
