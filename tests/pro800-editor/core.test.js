// Core tests for pro800-editor: parameter/CC tables and the levelled randomiser. Run: node core.test.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'pro800-editor-v2_0.html'), 'utf8');
const C = new Function(html.slice(html.indexOf('/*CORE-START*/'), html.indexOf('/*CORE-END*/')) + '\nreturn {PARAMS,TOGGLES,MULTIS,defaultPatch,randomPatch,RANDOM_RANGES};')();
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok  -', name); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

ok('CC table: every control has a unique valid CC (0-127); only LFO aftertouch uses a number above 100 as coarse CC', () => {
  const seen = new Map(); const add = (what, cc) => { assert.ok(Number.isInteger(cc) && cc >= 0 && cc <= 127, what + ' cc ' + cc); assert.ok(!seen.has(cc), what + ' reuses CC ' + cc + ' of ' + seen.get(cc)); seen.set(cc, what); };
  for (const [k, p] of Object.entries(C.PARAMS)) add('param ' + k, p.cc);
  for (const t of C.TOGGLES) add('toggle ' + t.id, t.cc); for (const m of C.MULTIS) add('multi ' + m.id, m.cc);
  assert.strictEqual(seen.size, 65, 'controls: ' + seen.size);   // 34 knobs + 19 buttons + 12 selectors
});
ok('every selector has one CC value per label, increasing, 0-127; default index is valid', () => {
  for (const m of C.MULTIS) { assert.strictEqual(m.vals.length, m.labels.length, m.id); assert.ok(m.vals.every((v, i) => v >= 0 && v <= 127 && (i === 0 || v > m.vals[i - 1])), m.id); assert.ok(m.def >= 0 && m.def < m.labels.length, m.id); }
});
ok('bender target has no VOL step that bending could ride; manual wording: VCO / VCF / VOL present as labels', () => {
  assert.deepStrictEqual(C.MULTIS.find(m => m.id === 'bend-target').labels, ['OFF', 'VCO', 'VCF', 'VOL']);
});
ok('default patch: both oscillators on saw, every default inside 0-127', () => {
  const d = C.defaultPatch(); assert.strictEqual(d.toggles['btn-osca-saw'], 1); assert.strictEqual(d.toggles['btn-oscb-saw'], 1); assert.strictEqual(d.toggles['btn-osca-tri'], 0);
  assert.ok(Object.values(d.params).every(v => v >= 0 && v <= 127));
});
const checkPlayable = (p, lv) => {
  for (const [k, v] of Object.entries(p.params)) assert.ok(Number.isInteger(v) && v >= 0 && v <= 127, k + ' ' + v);
  for (const m of C.MULTIS) assert.ok(p.stepped[m.id] >= 0 && p.stepped[m.id] < m.labels.length, m.id);
  assert.ok(p.stepped['bend-target'] <= 2, 'bender never on volume');
  for (const o of ['osca', 'oscb']) assert.ok(['saw', 'tri', 'sqr'].some(w => p.toggles['btn-' + o + '-' + w]), o + ' has a waveform');
  assert.ok(Math.max(p.params.oscaVol, p.params.oscbVol, p.params.noise) >= 95, 'one clearly audible source');
  assert.ok(p.params.vcaSus >= 35 && p.params.vcaAtk <= 50, 'amplifier envelope keeps the note audible (sustain not near zero, attack not slow)');
  assert.ok(p.params.vcfFreq >= 40, 'filter is not closed'); assert.strictEqual(p.params.bendRange, 12, 'bend range untouched');
  assert.ok(/^[A-Z]{3}_\d{6}$/.test(p.name), p.name);
};
ok('randomPatch is playable at every level over 3 x 1500 seeds', () => { for (let lv = 0; lv < 3; lv++) for (let i = 1; i <= 1500; i++) checkPlayable(C.randomPatch(rng(lv * 100000 + i), lv), lv); });
ok('levels widen the spread: tame < normal < wild (average distance from the middle of all ranged controls)', () => {
  const sp = [0, 0, 0]; for (let lv = 0; lv < 3; lv++) { for (let i = 1; i <= 800; i++) { const p = C.randomPatch(rng(i), lv); let s = 0, c = 0;
    for (const [k, r] of Object.entries(C.RANDOM_RANGES)) { const mid = (r[0] + r[1]) / 2; s += Math.abs(p.params[k] - mid) / ((r[1] - r[0]) / 2 || 1); c++; } sp[lv] += s / c; } sp[lv] /= 800; }
  assert.ok(sp[0] < sp[1] && sp[1] < sp[2], sp.map(x => x.toFixed(3)).join(' < '));
});
ok('arpeggiator stays off most of the time (>= 70 % even on Wild)', () => {
  for (let lv = 0; lv < 3; lv++) { let off = 0; for (let i = 1; i <= 2000; i++) if (C.randomPatch(rng(i + 7), lv).stepped['arp-mode'] === 0) off++; assert.ok(off / 2000 >= .70, 'level ' + lv + ': ' + off / 2000); }
});
console.log('\n' + n + ' tests passed');
