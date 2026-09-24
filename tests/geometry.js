require('../js/geometry.js');
var G = globalThis.FTG;
var ok = 0, bad = 0;
function assert(name, cond) { if (cond) { ok++; } else { bad++; console.log('FALLO: ' + name); } }

var tri = [{x:0,y:0,on:true},{x:100,y:0,on:true},{x:50,y:80,on:true}];
assert('normalize tri mantiene 3', G.normalizeContour(tri).length === 3);

var quad = [{x:0,y:0,on:true},{x:50,y:100,on:false},{x:100,y:0,on:true}];
var nq = G.normalizeContour(quad);
assert('normalize quad mantiene 3', nq.length === 3);
assert('primer punto on', nq[0].on === true);

var imp = [{x:0,y:0,on:true},{x:50,y:100,on:false},{x:60,y:80,on:false},{x:100,y:0,on:100>50}];
var ni = G.normalizeContour(imp);
var offCount = 0;
for (var i=0;i<ni.length;i++) { if (!ni[i].on) { var prev = ni[(i-1+ni.length)%ni.length], next = ni[(i+1)%ni.length]; assert('off con vecinos on', prev.on && next.on); offCount++; } }
assert('off-off resuelto con punto implicito', offCount >= 1 && ni.length >= 4);

var segs = [];
G.eachSegment(nq, function(a,c,b,idx){ segs.push({a:a,c:c,b:b,idx:idx}); });
assert('2 segmentos en quad de 3 pts', segs.length === 2);

var cmds = G.contoursToCommands([nq]);
var back = G.commandsToContours(cmds, 1);
assert('roundtrip commands -> 1 contorno', back.length === 1);

var cont2 = [{x:0,y:0,on:true},{x:100,y:0,on:true},{x:100,y:100,on:true}];
var before = cont2.length;
G.insertPointOnSegment(cont2, 0, 0.5, null);
assert('insert punto en recta: +1', cont2.length === before + 1);
assert('insert on', cont2[1].on === true);
assert('insert en medio', Math.abs(cont2[1].x - 50) < 0.01);

var cont3 = [{x:0,y:0,on:true},{x:50,y:100,on:false},{x:100,y:0,on:100>50}];
G.insertPointOnSegment(cont3, 0, 0.5, null);
assert('split quad: 5 puntos', cont3.length === 5);

var cont4 = [{x:0,y:0,on:true},{x:100,y:0,on:true},{x:100,y:100,on:true},{x:0,y:100,on:true}];
var removed = G.removePointAt(cont4, 1);
assert('remove punto', removed.length === 3);

var samples = [];
for (var s=0; s<12; s++) samples.push({x: s*10, y: 50, pressure: 0.5});
var stroke = G.strokeToContour(samples, 40);
assert('stroke a contorno', stroke && stroke.length >= 4);

var cCurve = [{x:0,y:0,on:true},{x:100,y:0,on:true},{x:100,y:100,on:true}];
var changed = G.setSegmentCurved(cCurve, 0, true);
assert('setCurved cambia', changed && !cCurve[1].on && cCurve.length === 4);
G.setSegmentCurved(cCurve, 0, false);
assert('setRecta revierte', cCurve.length === 3 && cCurve[1].on);

var nameA = G.glyphNameFor(65), nameEsp = G.glyphNameFor(32), nameU = G.glyphNameFor(225);
assert('nombre A', nameA === 'A');
assert('nombre space', nameEsp === 'space');
assert('nombre uni00E1', nameU === 'uni00E1');

console.log('OK: ' + ok + ' | FALLOS: ' + bad);
process.exit(bad ? 1 : 0);
