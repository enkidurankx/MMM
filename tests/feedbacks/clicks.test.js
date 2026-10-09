// Click test: changing a parameter while the sound runs must not click. Run: node tests/feedbacks/clicks.test.js <vink|homoeo>
// The sound is made as smooth as possible (a pure sine through the chain for vink and homoeo, ), so that any
// discontinuity stands out. Measure: the largest second difference of the output (a step of size D gives about 2 D; a clean sine of amplitude A gives A * w^2, about 0.003 A).
// R = largest second difference in the 150 ms after the change / largest second difference of the steady sound before or after (whichever is larger).
// R near 1 means nothing happened that the sound does not do by itself; a click shows up as R of 5 ... 500.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const NAME = process.argv[2]; const FILES = { vink: 'vink-v1_2.html', homoeo: 'homoeo-v1_2.html', serge: 'serge-v0_3.html', lattice: 'lattice-v0_4.html', lichen: 'lichen-v0_3.html', creak: 'creak-v0_4.html', entropy: 'entropy-v0_4.html', knot: 'knot-v0_4.html' };
if (!FILES[NAME]) { console.log('usage: clicks.test.js <vink|homoeo|serge|lattice|knot|lichen|creak|entropy>'); process.exit(2); }
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
  vink:   { base: { weather: 0, fbk: 0, ringd: 0, satur: 0.2, wow: 0, nfloor: 0, seedlvl: 1, spread: 0, link: 0, hpf: 30, lpf: 12000, reso: 0.1, fdrive: 0, level: 0.5, wetmix: 0.6, dtime: 40, width: 1, ftype: 0, dtype: 1, cwave: 0, cfreq: 7, l1depth: 0, l2depth: 0 }, input: true, params: ['weather', 'level', 'wetmix', 'satur', 'hpf', 'lpf', 'reso', 'fdrive', 'ringd', 'cfreq', 'width', 'link', 'spread', 'wow', 'dtime', 'l1depth', 'l2depth'], steps: ['ftype', 'dtype', 'cwave'] },
  homoeo: { base: { weather: 0, fbg: 0, imod: 0, drive: 1, fold: 0, nfloor: 0, seedlvl: 1, fbase: 440, dist: 0.3, q: 2, width: 0.5, level: 0.5, dshift: 0.3, couple: 0.5, damp: 1, l1depth: 0, l2depth: 0 }, input: true, params: ['weather', 'level', 'width', 'drive', 'fold', 'fbase', 'dist', 'q', 'dshift', 'damp', 'couple', 'imod', 'l1depth', 'l2depth'], steps: [] },
  serge:  { base: { strike: 0.5, fold: 1.6, stages: 1, spread: 0.5, skew: 0, body: 0, focus: 150, bright: 0.2, edge: 0, glide: 0, damp: 0.1, tone: 16000, level: 0.5, width: 0, hold: 0, pol: 0, l1depth: 0, l2depth: 0 }, input: false, init: p => p.port.onmessage({ data: { type: 'note', on: true, note: 48, vel: 1 } }), alt: { fold: [1.4, 1.9], stages: [1, 1.4], spread: [0.5, 0.8], skew: [0, 0.3], focus: [150, 110], bright: [0.2, 0.35], edge: [0, 0.3], glide: [0, 0.2], damp: [0.1, 0.2] } /* a harder loop, another body or a polarity change makes the voice lock to another mode: a real change of sound, so these move only a little */, all: { level: 0.4, fold: 1.8, stages: 1.2, spread: 0.6, skew: 0.2, focus: 120, bright: 0.3, edge: 0.2, width: 0.5, tone: 9000, damp: 0.15, l1depth: 0.2, l2depth: 0.05 }, params: ['level', 'fold', 'stages', 'spread', 'skew', 'focus', 'bright', 'edge', 'width', 'tone', 'damp', 'l1depth', 'l2depth'], steps: ['hold'] },
  lattice: { base: { pitch: 110, set: 0, size: 16, regen: 1.3, focus: 400, drive: 1, couple: 0, topo: 0, twist: 0, fatigue: 0, rival: 0, tire: 12, pull: 0, drift: 0, hiss: 0, width: 0, tone: 16000, level: 0.5, l1depth: 0, l2depth: 0 }, input: false, init: p => { p.port.onmessage({ data: { type: 'touch', id: 1, kind: 'down', x: 0.1, y: 0.1, vel: 1 } }); p.port.onmessage({ data: { type: 'touch', id: 1, kind: 'up' } }); }, alt: { regen: [1.3, 1.4], couple: [0, 0.2], rival: [0, 0.2], fatigue: [0, 0.2], pull: [0, 0.2], drift: [0, 0.3], pitch: [110, 125], focus: [400, 300], drive: [1, 1.6], twist: [0, 0.3] } /* these set the cells against each other: a real change of the pattern, so they move only a little */, all: { level: 0.4, couple: 0.15, regen: 1.35, focus: 300, drive: 1.3, fatigue: 0.1, rival: 0.1, pull: 0.1, drift: 0.1, tone: 9000, size: 15, l1depth: 0.1, l2depth: 0.03 }, params: ['level', 'regen', 'focus', 'drive', 'couple', 'twist', 'fatigue', 'rival', 'pull', 'drift', 'pitch', 'size', 'tone', 'width', 'l1depth', 'l2depth'], steps: ['set', 'topo'] },
  lichen: { base: { growth: 0.03, decay: 0.055, spread: 1, speed: 10, density: 24, order: 0, pitch: 110, warp: 0, tilt: -3, shimmer: 0, jitter: 0, grit: 0, spores: 0, regulate: 0, weather: 0, width: 0, tone: 16000, level: 0.5, l1depth: 0, l2depth: 0 }, input: false,
    alt: { growth: [0.03, 0.034], decay: [0.055, 0.058], spread: [1, 1.3], speed: [10, 40], lowcut: [60, 20], highcut: [12000, 20000] } /* these set the field against itself: a real change of the pattern, so they move only a little */,
    all: { level: 0.4, growth: 0.032, decay: 0.056, spread: 1.1, speed: 20, density: 30, pitch: 130, warp: 0.3, tilt: -6, shimmer: 0.5, jitter: 0.5, grit: 0.3, spores: 0.5, regulate: 0.5, weather: 0.5, width: 0.8, tone: 9000, l1depth: 0.2, l2depth: 0.05 },
    params: ['level', 'growth', 'decay', 'spread', 'speed', 'density', 'pitch', 'warp', 'tilt', 'lowcut', 'highcut', 'shimmer', 'jitter', 'grit', 'spores', 'regulate', 'weather', 'width', 'tone', 'l1depth', 'l2depth'], steps: ['order'] },
  creak: { floor: 8e-3, base: { pressure: 0.5, speed: 0.25, grip: 1.8, rough: 0, pitch: 140, stiff: 2, aspect: 1.3, warp: 0, density: 32, damp: 3, regen: 0.9, tension: 0, radiate: 0, auto: 0, regulate: 0, weather: 0, width: 0, tone: 16000, level: 0.5, l1depth: 0, l2depth: 0 }, input: false,
    init: p => { p.port.onmessage({ data: { type: 'strike', x: 0.3, y: 0.4, amp: 1 } }); },
    alt: { pressure: [0.5, 0.55], speed: [0.25, 0.28], grip: [1.8, 1.9], damp: [3, 4], regen: [0.9, 0.95], pitch: [140, 150], stiff: [2, 2.15], aspect: [1.3, 1.4] } /* these change the plate itself: a real change of the sound, so they move only a little */,
    all: { level: 0.4, pressure: 0.55, speed: 0.28, grip: 1.9, rough: 0.2, pitch: 150, stiff: 2.1, aspect: 1.35, warp: 0.1, density: 28, damp: 4, regen: 0.95, tension: 0.2, radiate: 0.3, auto: 0.3, regulate: 0.3, weather: 0.3, width: 0.5, tone: 9000, l1depth: 0.1, l2depth: 0.03 },
    params: ['level', 'pressure', 'speed', 'grip', 'rough', 'pitch', 'stiff', 'aspect', 'warp', 'density', 'damp', 'regen', 'tension', 'radiate', 'auto', 'regulate', 'weather', 'width', 'tone', 'l1depth', 'l2depth'], steps: [] },
  entropy: { base: { seed: 0.5, pitch: 220, spread: 0, fm: 0, spark: 0, fold: 0.5, bias: 0, wander: 0, shape: 0, arate: 97, am: 0, tobias: 0, life: 0, bitrate: 96000, error: 0, loss: 0, bitflip: 0, roam: 0, frame: 3, kind: 1, fb: 0, delay: 0.06, regulate: 0, drift: 0, weather: 0, wet: 0.5, width: 0, tone: 16000, level: 0.5, l1depth: 0, l2depth: 0 }, input: false,
    alt: { fold: [0.65, 0.5], bias: [0.08, 0], shape: [0.15, 0], pitch: [240, 220], seed: [0.55, 0.5], delay: [0.065, 0.06], bitrate: [90000, 96000], fb: [0.3, 0], error: [0.3, 0], wet: [0.6, 0.5], width: [0.3, 0], arate: [110, 97], life: [0.2, 0], drift: [0.2, 0], weather: [0.2, 0], roam: [0.2, 0], tobias: [0.1, 0], am: [0.3, 0], squash: [0.8, 0.5] } /* these change the sound itself, so they move only a little; loss, bit flips and sparks are holes and bursts by design and are not in this test */,
    all: { level: 0.4, seed: 0.55, pitch: 240, fold: 0.6, bias: 0.05, shape: 0.1, arate: 110, am: 0.2, tobias: 0.05, life: 0.1, bitrate: 90000, error: 0.1, fb: 0.2, delay: 0.065, regulate: 0.3, drift: 0.1, weather: 0.1, roam: 0.1, wet: 0.6, width: 0.3, tone: 9000, squash: 0.6, l1depth: 0.1, l2depth: 0.03 },
    params: ['level', 'seed', 'pitch', 'fold', 'bias', 'shape', 'arate', 'am', 'tobias', 'life', 'bitrate', 'error', 'fb', 'delay', 'regulate', 'drift', 'weather', 'roam', 'wet', 'width', 'tone', 'squash', 'l1depth', 'l2depth'], steps: [] },
  knot:   { base: { weather: 0, clean: 0.5, pitch: 110, set: 0, detune: 0, count: 1, lock: 0, mod: 0, ring: 0, self: 0, links: 0, twist: 0, fold: 0, skew: 0, adapt: 0, evolve: 8, wander: 0, width: 0, tone: 16000, level: 0.5, l1depth: 0, l2depth: 0 }, input: false, alt: { pitch: [110, 125], detune: [0, 0.3] }, all: { level: 0.4, mod: 0.2, ring: 0.1, self: 0.05, fold: 0.1, skew: 0.1, tone: 9000, width: 0.3, pitch: 118, l1depth: 0.1, l2depth: 0.02 }, params: ['clean', 'weather', 'level', 'mod', 'ring', 'self', 'fold', 'skew', 'tone', 'width', 'pitch', 'l1depth', 'l2depth'], steps: ['set', 'links'] },
}[NAME];
function run(base, events, seconds) {
  const p = worklet(); p.port.onmessage({ data: { type: 'params', params: base, immediate: true } }); if (SOUND.init) SOUND.init(p);
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
    // SOUND.floor: a smooth sound has a tiny steady second difference, and a ratio to it punishes smoothness (creak: 8e-3; its steady sound had 6e-3 before the friction force was smoothed; no single parameter of the all-at-once jump passes 1.2, the sum is a preset-sized change of the sound)
    const ref = Math.max(before, after, SOUND.floor || 1e-9); worst = Math.max(worst, win / ref);
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
for (const [k, j, r, pk, w] of rows) {
  const good = (!isFinite(r) || r <= LIMIT) && j <= LIMIT;
  check(`${NAME}: ${k.padEnd(14)} jump R = ${j.toFixed(1)}${isFinite(r) ? ', fader steps R = ' + r.toFixed(1) : ''}${w ? ' (worst ' + w + ')' : ''}`, good || (/^(cwave|l1depth|l2depth|ringd|cfreq)/.test(k) && false), '');
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
