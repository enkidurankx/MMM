// Click test: changing a parameter while the sound runs must not click. Run: node tests/feedbacks/clicks.test.js <vink|homoeo|chua>
// The sound is made as smooth as possible (a pure sine through the chain for vink and homoeo, the regular orbit "limit cycle" for chua), so that any
// discontinuity stands out. Measure: the largest second difference of the output (a step of size D gives about 2 D; a clean sine of amplitude A gives A * w^2, about 0.003 A).
// R = largest second difference in the 150 ms after the change / largest second difference of the steady sound before or after (whichever is larger).
// R near 1 means nothing happened that the sound does not do by itself; a click shows up as R of 5 ... 500.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const NAME = process.argv[2]; const FILES = { vink: 'vink-v1_0.html', homoeo: 'homoeo-v1_0.html', chua: 'chua-v1_0.html', tudor: 'tudor-v0_1.html' };
if (!FILES[NAME]) { console.log('usage: clicks.test.js <vink|homoeo|chua|tudor>'); process.exit(2); }
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, FILES[NAME]), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
const FB = new Function(fs.readFileSync(path.join(root, 'feedbacks/shell.js'), 'utf8') + ';return FB')();
const P = new Function('FB', 'return {' + html.match(/const P = \{([\s\S]*?)\n  \};/)[1] + '}')(FB);
const STEPS = new Function('return {' + html.match(/const STEPPED = \{([\s\S]*?)\n  \};/)[1] + '}')();
const SR = 48000; let ok = true;
const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
function worklet() { const reg = {}, posted = []; const sb = { sampleRate: SR, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console }; vm.createContext(sb); vm.runInContext(dsp, sb); const p = new reg[NAME](); p.posted = posted; return p; }
// the quiet, smooth test sound
const SINE_F = 440, AMP = 0.3;
const SOUND = {
  vink:   { base: { fbk: 0, ringd: 0, satur: 0.2, wow: 0, nfloor: 0, seedlvl: 1, spread: 0, link: 0, hpf: 30, lpf: 12000, reso: 0.1, fdrive: 0, level: 0.5, wetmix: 0.6, dtime: 40, width: 1, ftype: 0, dtype: 1, cwave: 0, cfreq: 7, l1depth: 0, l2depth: 0 }, input: true, params: ['level', 'wetmix', 'satur', 'hpf', 'lpf', 'reso', 'fdrive', 'ringd', 'cfreq', 'width', 'link', 'spread', 'wow', 'dtime', 'l1depth', 'l2depth'], steps: ['ftype', 'dtype', 'cwave'] },
  homoeo: { base: { fbg: 0, imod: 0, drive: 1, fold: 0, nfloor: 0, seedlvl: 1, fbase: 440, dist: 0.3, q: 2, width: 0.5, level: 0.5, dshift: 0.3, couple: 0.5, damp: 1, l1depth: 0, l2depth: 0 }, input: true, params: ['level', 'width', 'drive', 'fold', 'fbase', 'dist', 'q', 'dshift', 'damp', 'couple', 'imod', 'l1depth', 'l2depth'], steps: [] },
  tudor:  { base: { gain: 1.3, pol: 0, noise: 0.3, drive: 1.3, shape: 0, bias: 0, b0: 0, b1: 0.8, b2: 0, b3: 0, b4: 0, b5: 0, focus: 30, tune: 1, phase: 0, tap: 1, link: 0, detune: 0, tone: 16000, level: 0.6, l1depth: 0, l2depth: 0 }, input: false, all: { level: 0.3, gain: 1.6, noise: 0.5, drive: 1.8, shape: 0.5, bias: 0.3, b1: 0.9, focus: 24, tune: 1.2, phase: 0.1, apfreq: 1200, tap: 0.6, link: 0.5, detune: 0.5, tone: 8000, l1depth: 0.3, l2depth: 0.3 } /* a preset that keeps the loop alive: if the loop dies the sound turns into hiss, which is not a click */, alt: { focus: [20, 24], phase: [0.3, 0.2] } /* a wide filter or a turned phase lets the loop pick another note: a real change of sound, not a click, so these two move only a little */, params: ['level', 'gain', 'noise', 'drive', 'shape', 'bias', 'b1', 'focus', 'tune', 'phase', 'apfreq', 'tap', 'link', 'detune', 'tone', 'l1depth', 'l2depth'], steps: ['pol'] },
  chua:   { base: { alpha: 12.6, beta: 28, asym: 0, rate: 130, tone: 9000, low: 0.25, width: 1, level: 0.6, src: 0, l1depth: 0, l2depth: 0 }, input: false, params: ['level', 'width', 'low', 'tone', 'asym', 'alpha', 'beta', 'l1depth', 'l2depth'], steps: ['src'] },
}[NAME];
function run(base, events, seconds) {
  const p = worklet(); p.port.onmessage({ data: { type: 'params', params: base, immediate: true } });
  const n = Math.floor(SR * seconds), L = new Float64Array(n), R = new Float64Array(n), blk = 128, iL = new Float32Array(blk), oL = new Float32Array(blk), oR = new Float32Array(blk); let ei = 0;
  for (let s = 0; s < n; s += blk) {
    while (ei < events.length && events[ei][0] * SR <= s) { events[ei][1](p); ei++; }
    for (let i = 0; i < blk; i++) iL[i] = SOUND.input ? AMP * Math.sin(2 * Math.PI * SINE_F * (s + i) / SR) : 0;
    p.process([[iL, iL]], [[oL, oR]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = oL[i]; R[s + i] = oR[i]; }
  }
  return { L, R, p };
}
const d2max = (a, s, e) => { let m = 0; for (let i = Math.max(2, Math.floor(s)); i < Math.floor(e); i++) { const d = Math.abs(a[i] - 2 * a[i - 1] + a[i - 2]); if (d > m) m = d; } return m; };
const T0 = 3, T1 = 5;
function measure(base, change) {   // change: (p) => void, applied at T0 (or a list of timed events)
  const ev = Array.isArray(change) ? change : [[T0, change]];
  const r = run(base, ev, T1), t0 = ev[0][0], tEnd = ev[ev.length - 1][0];
  let worst = 0, level = 0;
  for (const ch of [r.L, r.R]) {
    const before = d2max(ch, (t0 - 1) * SR, t0 * SR - 64), after = d2max(ch, (tEnd + 1.5) * SR, T1 * SR), win = d2max(ch, t0 * SR - 64, (tEnd + 0.15) * SR);
    const ref = Math.max(before, after, 1e-9); worst = Math.max(worst, win / ref);
  }
  let pk = 0; for (let i = (T1 - 0.5) * SR; i < T1 * SR; i++) pk = Math.max(pk, Math.abs(r.L[i]));
  return { R: worst, pk };
}
const defs = {}; for (const k in P) defs[k] = P[k].def; for (const k in STEPS) defs[k] = STEPS[k].def;
const base0 = { ...defs, ...SOUND.base };
const setParams = (v) => p => p.port.onmessage({ data: { type: 'params', params: v, immediate: false } });
const LIMIT = 3;
const rows = [];
const alt = k => { if (SOUND.alt && SOUND.alt[k]) return SOUND.alt[k]; const d = P[k], m = FB.mapper(d.sym ? Object.assign(d, { mid: (d.min + d.max) / 2, half: (d.max - d.min) / 2 }) : d); const p0 = m.to(base0[k] === undefined ? d.def : base0[k]); const lo = 0.12, hi = 0.88; return [m.from(p0 < 0.5 ? hi : lo), m.from(p0 < 0.5 ? lo : hi)]; };
for (const k of SOUND.params) {
  const d = P[k]; if (!d) continue;
  const [v1, v2] = alt(k), depthLike = /depth/.test(k);
  const b = { ...base0, ...(depthLike ? { [k]: 0 } : {}) };
  // 1. an abrupt jump (a preset, or a very fast fader move)
  const jump = measure(b, setParams({ ...b, [k]: depthLike ? 1 : v1 }));
  // 2. a finger: 20 steps over 0.3 s from one value to the other
  const to = depthLike ? 1 : v1, from = b[k]; const ev = []; for (let i = 0; i < 20; i++) { const u = (i + 1) / 20, v = from + (to - from) * u; ev.push([T0 + i * 0.016, setParams({ ...b, [k]: v })]); }
  const ramp = measure(b, ev);
  rows.push([k, jump.R, ramp.R, jump.pk]);
}
for (const k of SOUND.steps) {
  const n = STEPS[k].items.length; let worst = 0, which = '';
  for (let to = 1; to < n; to++) { const r = measure({ ...base0, [k]: 0 }, setParams({ ...base0, [k]: to })); if (r.R > worst) { worst = r.R; which = STEPS[k].items[0] + ' -> ' + STEPS[k].items[to]; } }
  rows.push([k + ' (switch)', worst, NaN, 0, which]);
}
// everything at once (a preset): every parameter of the list jumps to its other end in one message
{
  const allv = { ...base0, ...(SOUND.all || {}) }; if (!SOUND.all) for (const k of SOUND.params) { const d = P[k]; if (!d) continue; if (/depth/.test(k)) { allv[k] = 0.6; continue; } allv[k] = alt(k)[0]; }
  const r = measure(base0, setParams(allv)); rows.push(['all at once', r.R, NaN, 0, '']);
}
// reset: the output fades out in 6 ms (chua: 20 ms, then restarts and fades in)
{ const r = measure(base0, p => p.port.onmessage({ data: { type: 'reset' } })); rows.push(['reset', r.R, NaN, 0, '']); }
if (NAME === 'chua') { const r = measure(base0, p => p.port.onmessage({ data: { type: 'kick' } })); rows.push(['kick', r.R, NaN, 0, '']); }
for (const [k, j, r, pk, w] of rows) {
  const good = (!isFinite(r) || r <= LIMIT) && j <= LIMIT;
  check(`${NAME}: ${k.padEnd(14)} jump R = ${j.toFixed(1)}${isFinite(r) ? ', fader steps R = ' + r.toFixed(1) : ''}${w ? ' (worst ' + w + ')' : ''}`, good || (/^(cwave|l1depth|l2depth|ringd|cfreq)/.test(k) && false), '');
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
