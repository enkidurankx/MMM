// Core tests for fm1-editor: DX7 SysEx encode/decode, checksum, algorithm table. Run: node core.test.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'fm1-editor-v1_16.html'), 'utf8');
const core = html.slice(html.indexOf('/*CORE-START*/'), html.indexOf('/*CORE-END*/'));
const C = new Function(core + `\nreturn {OPF,GLF,RANGE,initVoice,cleanVoice,voiceToVCED,vcedToVoice,vcedIndex,vcedGlobalIndex,packVoice,unpackVoice,checksum,packBank,
  vcedMessage,paramChangeMessage,parseSyx,ALG_FLAGS,algGraph,layoutAlg,opFreq,noteName,bpName,randomVoice,mutateVoice,randomizeOps,randomFx};`)();
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok  -', name); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

ok('param counts: 21 per operator, 19 global, 155 VCED bytes', () => {
  assert.strictEqual(C.OPF.length, 21); assert.strictEqual(C.GLF.length, 19);
  assert.strictEqual(C.voiceToVCED(C.initVoice()).length, 155);
  assert.strictEqual(6 * 21 + 19 + 10, 155);
});
ok('VCED index map: OP6 block first, globals from 126', () => {
  assert.strictEqual(C.vcedIndex(5, 'r1'), 0); assert.strictEqual(C.vcedIndex(0, 'det'), 125);
  assert.strictEqual(C.vcedGlobalIndex('pr1'), 126); assert.strictEqual(C.vcedGlobalIndex('alg'), 134); assert.strictEqual(C.vcedGlobalIndex('trnp'), 144);
  const v = C.initVoice(); v.op[0].ol = 77; v.alg = 12; const a = C.voiceToVCED(v);
  assert.strictEqual(a[C.vcedIndex(0, 'ol')], 77); assert.strictEqual(a[134], 12);
});
ok('random voices survive pack/unpack and VCED round trips bit-exactly (2000 voices)', () => {
  const r = rng(7);
  for (let i = 0; i < 2000; i++) {
    const v = C.randomVoice(r);
    assert.deepStrictEqual(C.unpackVoice(C.packVoice(v)), C.cleanVoice(v), 'packed #' + i);
    assert.deepStrictEqual(C.vcedToVoice(C.voiceToVCED(v)), C.cleanVoice(v), 'vced #' + i);
  }
});
ok('every packed byte stays 7-bit clean (MIDI data bytes)', () => {
  const r = rng(11);
  for (let i = 0; i < 500; i++) for (const b of C.packVoice(C.randomVoice(r))) assert.ok(b >= 0 && b < 128);
});
ok('packed layout of the init voice (hand-checked offsets)', () => {
  const a = C.packVoice(C.initVoice());
  assert.deepStrictEqual([...a.slice(0, 8)], [99, 99, 99, 99, 99, 99, 99, 0]);        // OP6 rates + levels
  assert.strictEqual(a[8], 39);                                                          // breakpoint C3
  assert.strictEqual(a[5 * 17 + 14], 99);                                                // OP1 output level
  assert.strictEqual(a[14], 0);                                                          // OP6 output level
  assert.strictEqual(a[15], (1 << 1) | 0);                                               // coarse 1, ratio mode
  assert.strictEqual(a[12], (7 << 3) | 0);                                               // detune 7, rate scale 0
  assert.strictEqual(a[110], 0); assert.strictEqual(a[111], 8); assert.strictEqual(a[112], 35);
  assert.strictEqual(a[116], (3 << 4) | 1); assert.strictEqual(a[117], 24);
  assert.strictEqual(String.fromCharCode(...a.slice(118, 128)), 'INIT VOICE');
});
ok('bank message: size, header, checksum, terminator', () => {
  const vs = Array.from({ length: 32 }, (_, i) => C.randomVoice(rng(i + 1))); const m = C.packBank(vs);
  assert.strictEqual(m.length, 4104); assert.deepStrictEqual([...m.slice(0, 6)], [0xF0, 0x43, 0x00, 0x09, 0x20, 0x00]); assert.strictEqual(m[4103], 0xF7);
  let s = 0; for (let i = 6; i < 4102; i++) s += m[i]; assert.strictEqual((s + m[4102]) & 0x7F, 0);   // data + checksum = 0 (mod 128)
  assert.strictEqual(C.checksum(new Uint8Array([1, 2, 3])), (128 - 6) & 127);
});
ok('parseSyx: bank, concatenated banks, single voice, raw blobs, bad checksum', () => {
  const vs = Array.from({ length: 32 }, (_, i) => C.randomVoice(rng(100 + i))); const m = C.packBank(vs);
  let p = C.parseSyx(m); assert.strictEqual(p.banks.length, 1); assert.deepStrictEqual(p.banks[0], vs.map(C.cleanVoice)); assert.strictEqual(p.warnings.length, 0);
  const two = new Uint8Array(8208); two.set(m, 0); two.set(m, 4104); assert.strictEqual(C.parseSyx(two).banks.length, 2);
  const one = C.vcedMessage(vs[3]); p = C.parseSyx(one); assert.strictEqual(p.voices.length, 1); assert.deepStrictEqual(p.voices[0], C.cleanVoice(vs[3])); assert.strictEqual(one.length, 163);
  p = C.parseSyx(m.slice(6, 4102)); assert.strictEqual(p.banks.length, 1);                     // raw 4096
  const bad = m.slice(); bad[4102] ^= 0x10; p = C.parseSyx(bad); assert.strictEqual(p.banks.length, 1); assert.ok(p.warnings.some(w => /checksum/.test(w)));
  p = C.parseSyx(new Uint8Array([1, 2, 3])); assert.strictEqual(p.banks.length + p.voices.length, 0); assert.ok(p.warnings.length);
  p = C.parseSyx(new Uint8Array([0xF0, 0x41, 1, 2, 0xF7])); assert.ok(p.warnings.some(w => /non-Yamaha/.test(w)));
});
ok('parameter change message format (F0 43 1n gg pp dd F7)', () => {
  assert.deepStrictEqual([...C.paramChangeMessage(134, 12)], [0xF0, 0x43, 0x10, 1, 6, 12, 0xF7]);
  assert.deepStrictEqual([...C.paramChangeMessage(5, 99, 3)], [0xF0, 0x43, 0x13, 0, 5, 99, 0xF7]);
});
// carriers and feedback operators as in the DX7 algorithm chart
const CARRIERS = {1:[1,3],2:[1,3],3:[1,4],4:[1,4],5:[1,3,5],6:[1,3,5],7:[1,3],8:[1,3],9:[1,3],10:[1,4],11:[1,4],12:[1,3],13:[1,3],14:[1,3],15:[1,3],16:[1],17:[1],18:[1],
  19:[1,4,5],20:[1,2,4],21:[1,2,4,5],22:[1,3,4,5],23:[1,2,4,5],24:[1,2,3,4,5],25:[1,2,3,4,5],26:[1,2,4],27:[1,2,4],28:[1,3,6],29:[1,2,3,5],30:[1,2,3,6],31:[1,2,3,4,5],32:[1,2,3,4,5,6]};
const FB = {1:6,2:2,3:6,4:6,5:6,6:6,7:6,8:4,9:2,10:3,11:6,12:2,13:6,14:6,15:2,16:6,17:2,18:3,19:6,20:3,21:3,22:6,23:6,24:6,25:6,26:6,27:3,28:5,29:6,30:5,31:6,32:6};
ok('algorithm table: carrier sets match the DX7 chart for all 32', () => {
  for (let a = 0; a < 32; a++) assert.deepStrictEqual(C.algGraph(a).carriers, CARRIERS[a + 1], 'algorithm ' + (a + 1));
});
ok('algorithm table: feedback operator matches the DX7 chart for all 32', () => {
  for (let a = 0; a < 32; a++) { const g = C.algGraph(a); assert.ok(g.fbTo != null, 'alg ' + (a + 1)); assert.strictEqual(g.fbTo, FB[a + 1], 'alg ' + (a + 1)); }
});
ok('algorithm table: graphs are acyclic, every operator reaches a carrier, no operator modulates itself', () => {
  for (let a = 0; a < 32; a++) { const g = C.algGraph(a); const dest = {}; for (let o = 1; o <= 6; o++) dest[o] = [];
    for (const [s, d] of g.edges) { assert.notStrictEqual(s, d); assert.ok(s > d, 'modulators are always higher-numbered in DX7 (alg ' + (a + 1) + ')'); dest[s].push(d); }
    for (let o = 1; o <= 6; o++) { let x = o, guard = 0; while (!g.carriers.includes(x) || dest[x].length) { if (!dest[x].length) assert.fail('op ' + o + ' dead end in alg ' + (a + 1)); x = dest[x][0]; if (++guard > 7) assert.fail('cycle'); }
      assert.ok(g.carriers.includes(x)); } }
});
ok('algorithm layout: every operator placed once, no overlapping boxes (all 32)', () => {
  for (let a = 0; a < 32; a++) { const L = C.layoutAlg(a), seen = new Set();
    for (let o = 1; o <= 6; o++) { assert.ok(L.x[o] !== undefined && L.level[o] !== undefined, 'alg ' + (a + 1) + ' op ' + o); const k = L.x[o] + ',' + L.level[o]; assert.ok(!seen.has(k), 'overlap in alg ' + (a + 1)); seen.add(k); } }
});
ok('carriers sit on the bottom row of the layout', () => {
  for (let a = 0; a < 32; a++) { const L = C.layoutAlg(a); for (const c of C.algGraph(a).carriers) if (!L.g.edges.some(([s]) => s === c)) assert.strictEqual(L.level[c], 0, 'alg ' + (a + 1)); }
});
ok('ratio / fixed frequency / note names', () => {
  const o = { m: 0, fc: 1, ff: 0 }; assert.strictEqual(C.opFreq(o).value, 1); assert.strictEqual(C.opFreq({ m: 0, fc: 0, ff: 0 }).value, 0.5);
  assert.ok(Math.abs(C.opFreq({ m: 0, fc: 3, ff: 50 }).value - 4.5) < 1e-9);
  assert.ok(C.opFreq({ m: 1, fc: 1, ff: 0 }).fixed); assert.strictEqual(C.opFreq({ m: 1, fc: 2, ff: 0 }).value, 100);
  assert.strictEqual(C.bpName(39), 'C3'); assert.strictEqual(C.bpName(0), 'A-1'); assert.strictEqual(C.bpName(99), 'C8'); assert.strictEqual(C.noteName(60), 'C3');
});
ok('randomVoice / mutateVoice stay inside every parameter range (1000 each)', () => {
  const r = rng(5), inR = v => { for (const f of C.GLF) assert.ok(v[f] >= 0 && v[f] <= C.RANGE[f], f); for (const o of v.op) for (const f of C.OPF) assert.ok(o[f] >= 0 && o[f] <= C.RANGE[f], f); assert.ok(v.name.length <= 10); };
  for (let i = 0; i < 1000; i++) { const v = C.randomVoice(r); inR(v); inR(C.mutateVoice(v, r, 0.6)); }
});
ok('random voices are playable: at least one carrier audible, carriers decay to 0', () => {
  const r = rng(9); for (let i = 0; i < 300; i++) { const v = C.randomVoice(r), g = C.algGraph(v.alg);
    assert.ok(g.carriers.some(c => v.op[c - 1].ol > 60)); for (const c of g.carriers) assert.strictEqual(v.op[c - 1].l4, 0); }
});
ok('mutate is gentle: most parameters unchanged at the default amount', () => {
  const r = rng(3), v = C.randomVoice(r); let same = 0, tot = 0; const m = C.mutateVoice(v, r);
  for (let i = 0; i < 6; i++) for (const f of C.OPF) { tot++; if (m.op[i][f] === v.op[i][f]) same++; }
  assert.ok(same / tot > 0.6, same + '/' + tot);
});
ok('randomizeOps: only the chosen operators change; algorithm, feedback, LFO, pitch EG, name stay; stays in range and audible', () => {
  const r = rng(21), v = C.randomVoice(r), before = JSON.stringify(v);
  const all = C.randomizeOps(v, r); assert.strictEqual(JSON.stringify(v), before, 'source untouched');
  for (const k of ['alg', 'fb', 'lfs', 'lfw', 'pr1', 'pl4', 'trnp', 'name']) assert.strictEqual(all[k], v[k], k);
  const one = C.randomizeOps(v, r, [2]); for (let i = 0; i < 6; i++) if (i !== 2) assert.deepStrictEqual(one.op[i], v.op[i], 'op' + (i + 1));
  for (let t = 0; t < 500; t++) { const x = C.randomizeOps(C.randomVoice(r), r), g = C.algGraph(x.alg); const b = C.voiceToVCED(x);
    assert.ok(b.every(n => n >= 0 && n < 128)); assert.ok(g.carriers.some(c => x.op[c - 1].ol >= 82), 'a carrier is audible'); }
});

ok('randomiser levels: tame < normal < wild in spread, all playable (audible carrier, capped fast modulators, bounded params)', () => {
  const r = rng(77), caps = [60, 75, 90], spread = [0, 0, 0];
  for (let lv = 0; lv < 3; lv++) for (let t = 0; t < 600; t++) { const v = C.randomVoice(r, lv), g = C.algGraph(v.alg), b = C.voiceToVCED(v);
    assert.ok(b.every(n => n >= 0 && n < 128)); assert.ok(g.carriers.some(c => v.op[c - 1].ol >= 82 && v.op[c - 1].l1 === 99), 'audible carrier');
    v.op.forEach((o, i) => { if (!g.carriers.includes(i + 1) && o.fc >= 7) assert.ok(o.ol <= caps[lv], 'fast modulator capped at level ' + lv); });
    assert.ok(v.fb <= [4, 7, 7][lv] || lv > 0); spread[lv] += v.op.reduce((a, o) => a + o.ol, 0) / 6 + v.fb * 3; }
  assert.ok(spread[0] < spread[1] && spread[1] < spread[2] + 1, 'wider with level: ' + spread.map(x => (x / 600).toFixed(1)).join(' < '));
});
ok('randomFx: 24 CC values inside the FM-1 ranges; the filter never closes the sound', () => {
  const max = [1, 2, 107, 10, 1, 2, 100, 100, 1, 100, 100, 100, 1, 100, 100, 100, 1, 100, 100, 100, 1, 100, 100, 100], r = rng(5);
  for (let lv = 0; lv < 3; lv++) for (let t = 0; t < 500; t++) { const f = C.randomFx(r, lv); assert.strictEqual(f.length, 24);
    f.forEach((x, i) => assert.ok(Number.isInteger(x) && x >= 0 && x <= max[i], 'cc' + i + '=' + x));
    if (f[1] !== 2) assert.ok(f[2] >= 55, 'low/band-pass cutoff stays open'); else assert.ok(f[2] <= 35, 'high-pass only mild'); assert.ok(f[12] === 0 || f[13] <= 70); }
});

console.log('\n' + n + ' tests passed');
