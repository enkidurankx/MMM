// DSP tests for vink-v0_1.html: the AudioWorklet code is extracted from the page and run in Node with a stub of the worklet globals.
// Part 1 compares it sample by sample with the Max device's GenExpr (../../native/max-for-live/vink-loop/VINK.genexpr, FX slot off).
// Part 2 repeats the behaviour checks (sustain, balance, reset, bounds) on the web version. This proves the port, not the browser.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../vink-v0_1.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
const gen = fs.readFileSync(path.join(__dirname, '../../native/max-for-live/vink-loop/VINK.genexpr'), 'utf8');
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }

function worklet(sr) {
  let cls; const posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m), onmessage: null }; } },
    registerProcessor: (n, c) => { cls = c; }, Math, Float64Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const p = new cls(); p.posted = posted; return p;
}
function setParams(p, params) { p.port.onmessage({ data: { type: 'params', params, immediate: true } }); }
function runWeb(params, seconds, input, opts = {}) {
  const sr = opts.sr || 48000, p = worklet(sr); setParams(p, params);
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), blk = 128;
  const iL = new Float32Array(blk), iR = new Float32Array(blk), oL = new Float32Array(blk), oR = new Float32Array(blk);
  let bad = 0, t0 = process.hrtime.bigint();
  for (let s = 0; s < n; s += blk) {
    if (opts.at) for (const [t, fn] of opts.at) if (s <= Math.floor(t * sr) && Math.floor(t * sr) < s + blk) fn(p);
    for (let i = 0; i < blk; i++) { const v = input ? input(s + i) : 0; iL[i] = v; iR[i] = v; }
    p.process([[iL, iR]], [[oL, oR]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = oL[i]; R[s + i] = oR[i]; if (!isFinite(oL[i]) || !isFinite(oR[i])) bad++; }
  }
  return { L, R, bad, p, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
}
// ---- reference: the GenExpr transpile (same approach as native/max-for-live/vink-loop/test_vink.js) ----
function compileGen(sr) {
  const params = {}, hist = {}, data = {};
  let body = gen.replace(/^\s*Param\s+(\w+)\(\s*([-\d.]+)[^)]*\)\s*;.*$/gm, (_, n, d) => { params[n] = +d; return ''; });
  body = body.replace(/History\s+(\w+)\(\s*([-\d.]+)\s*\)\s*;/g, (_, n, d) => { hist[n] = +d; return ''; });
  body = body.replace(/Data\s+(\w+)\(\s*(\d+)\s*\)\s*;/g, (_, n, s) => { data[n] = +s; return ''; });
  body = body.replace(/\/\/.*$/gm, '');
  const reserved = new Set([...Object.keys(params), ...Object.keys(hist), ...Object.keys(data), 'out1', 'out2']), locals = new Set();
  for (const m of body.matchAll(/(?:^|[;{}])\s*([A-Za-z_]\w*)\s*=(?!=)/g)) if (!reserved.has(m[1])) locals.add(m[1]);
  const helpers = { peek: (d, i) => d[i] || 0, poke: (d, v, i) => { d[i] = v; }, mod: (a, b) => a - b * Math.floor(a / b), floor: Math.floor, tanh: Math.tanh, exp: Math.exp,
    log: Math.log, pow: Math.pow, abs: Math.abs, min: Math.min, max: Math.max, sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt,
    noise: (() => { let s = 987654321; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; })() };
  const D = {}, H = { ...hist }, P = { ...params };
  for (const [n, s] of Object.entries(data)) D[n] = new Float64Array(s);
  const fn = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, mod, floor, tanh, exp, log, pow, abs, min, max, sin, cos, tan, sqrt, noise} = helpers;
    const {${Object.keys(data).join(',')}} = D;
    return function(in1, in2) { let out1 = 0, out2 = 0; let ${[...locals].join(', ')};
      const {${Object.keys(params).join(',')}} = P; let {${Object.keys(hist).join(',')}} = H;
      ${body}
      Object.assign(H, {${Object.keys(hist).join(',')}}); return [out1, out2]; };`);
  return { step: fn(P, H, D, sr, helpers), P };
}
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const rms = (a, s, e) => { let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const db = x => 20 * Math.log10(x + 1e-30);
const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

// ===== 1. equivalence with the Max device =====
// Noise-free settings (no noise floor, no wow, no noise carriers, no BBD hiss) make both versions deterministic.
const noiseless = { nfloor: 0, wow: 0, seedlvl: 0.8, level: 0.5, wetmix: 1, fbk: 0.9, ringd: 0.6, satur: 0.4, link: 0.35, width: 1, spread: 0.3, hpf: 80, lpf: 8000, dtime: 140, reso: 0.2 };
const noiseIn = (() => { const a = new Float64Array(SR * 2); let s = 4242; for (let i = 0; i < a.length; i++) a[i] = 0.4 * (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1) * (i < 9600 ? 1 : 0.05) + 0.05 * Math.sin(i * 0.03); return a; })();
for (const [name, extra] of [
  ['CLEAN filter', { ftype: 0 }], ['LADDER filter', { ftype: 1, reso: 0.5 }], ['MS-20 filter', { ftype: 2, reso: 0.5 }], ['SOFT filter', { ftype: 3 }],
  ['triangle carrier', { cwave: 1 }], ['saw carrier', { cwave: 2 }], ['square carrier', { cwave: 3 }], ['cross-feed carrier', { cwave: 7 }],
  ['digital delay', { dtype: 1 }], ['ping-pong delay', { dtype: 3 }], ['filter drive + saturation', { fdrive: 0.7, satur: 0.9 }], ['link 0, width 0.3', { link: 0, width: 0.3 }],
]) {
  const params = { ...noiseless, ...extra }, ref = compileGen(SR); Object.assign(ref.P, params, { fxtype: 0 });
  const web = runWeb(params, 2, i => noiseIn[i]); let md = 0, mr = 0;
  for (let i = 0; i < SR * 2; i++) { const [l, r] = ref.step(noiseIn[i], noiseIn[i]); md = Math.max(md, Math.abs(l - web.L[i]), Math.abs(r - web.R[i])); mr = Math.max(mr, Math.abs(l)); }
  check(`same as the Max device: ${name}`, md < 2e-4 * Math.max(1, mr) && mr > 0.01, `max diff ${md.toExponential(1)} (peak ${mr.toFixed(3)})`);
}
// noisy parts (S&H, smooth random, noise carrier, BBD hiss, wow, noise floor): compare the level statistically
for (const [name, extra] of [['S&H carrier', { cwave: 4 }], ['smooth-random carrier', { cwave: 5 }], ['noise carrier', { cwave: 6 }], ['BBD delay', { dtype: 2 }], ['wow 1 + noise floor', { wow: 1, nfloor: 0.4 }]]) {
  const params = { ...noiseless, ...extra }, ref = compileGen(SR); Object.assign(ref.P, params, { fxtype: 0 });
  const web = runWeb(params, 2, i => noiseIn[i]), rl = new Float64Array(SR * 2);
  for (let i = 0; i < SR * 2; i++) rl[i] = ref.step(noiseIn[i], noiseIn[i])[0];
  const a = db(rms(web.L, SR * 0.5, SR * 2)), b = db(rms(rl, SR * 0.5, SR * 2));
  // tolerance 5 dB: with a random carrier the level of one 1.5 s window depends on the noise sequence (measured: the web version alone spreads -19.3 ... -14.6 dB over 8 seeds)
  check(`level matches the Max device: ${name}`, Math.abs(a - b) < 5 && a > -60, `web ${a.toFixed(1)} dB, Max ${b.toFixed(1)} dB`);
}

// ===== 2. behaviour of the web version =====
const burstAt = t => ['at', [[0, p => p.port.onmessage({ data: { type: 'burst' } })]]];
const withBurst = { at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })]] };
{
  const r = runWeb({}, 14, null, withBurst);   // factory defaults, burst only
  check('defaults + burst: the loop sustains (> -40 dB rms after 8 s)', db(rms(r.L, SR * 10, SR * 14)) > -40, `${db(rms(r.L, SR * 10, SR * 14)).toFixed(1)} dB`);
  check('defaults: output bounded <= level 0.5 and finite', peak(r.L) <= 0.5001 && peak(r.R) <= 0.5001 && r.bad === 0, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  const l = db(rms(r.L, SR * 10, SR * 14)), rr = db(rms(r.R, SR * 10, SR * 14));
  check('defaults: left and right within 6 dB (no sticking to one side)', Math.abs(l - rr) < 6, `L ${l.toFixed(1)}, R ${rr.toFixed(1)} dB`);
}
for (const [name, extra] of [['CLEAN', { ftype: 0 }], ['LADDER', { ftype: 1 }], ['MS-20', { ftype: 2 }], ['SOFT', { ftype: 3 }], ['TAPE', { dtype: 0 }], ['DIGITAL', { dtype: 1 }], ['BBD', { dtype: 2 }], ['PING-PONG', { dtype: 3 }]]) {
  const r = runWeb({ ...extra, fbk: 1.2 }, 12, null, withBurst), l = db(rms(r.L, SR * 8, SR * 12)), rr = db(rms(r.R, SR * 8, SR * 12));
  check(`${name} holds a loop and stays balanced`, l > -45 && rr > -45 && Math.abs(l - rr) < 8 && r.bad === 0, `L ${l.toFixed(1)}, R ${rr.toFixed(1)} dB`);
}
for (let w = 0; w < 8; w++) {
  const r = runWeb({ cwave: w, fbk: 1.3, ringd: 0.7 }, 12, null, withBurst);
  check(`carrier ${['SINE', 'TRI', 'SAW', 'SQR', 'S&H', 'RAND', 'NOISE', 'CROSS'][w]}: alive and bounded`, db(rms(r.L, SR * 8, SR * 12)) > -50 && peak(r.L) <= 0.5001 && r.bad === 0, `${db(rms(r.L, SR * 8, SR * 12)).toFixed(1)} dB`);
}
{ // reset: silence within 2 ms, stays empty without a noise floor, a burst restarts it
  const r = runWeb({ nfloor: 0, fbk: 1.2 }, 9, null, { at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })], [4, p => p.port.onmessage({ data: { type: 'reset' } })], [7, p => p.port.onmessage({ data: { type: 'burst' } })]] });
  const t = SR * 4, alive = rms(r.L, SR * 3.5, SR * 3.99);
  check('before reset the loop is alive', db(alive) > -40, `${db(alive).toFixed(1)} dB`);
  check('RESET silences the output within 3 ms', peak(r.L.subarray(t + 144, t + 150 + 200)) < 1e-9 && peak(r.R.subarray(t + 144, t + 350)) < 1e-9, `peak ${peak(r.L.subarray(t + 144, t + 350)).toExponential(1)}`);
  check('after RESET the loop stays empty (noise floor 0)', peak(r.L.subarray(SR * 5, SR * 7)) < 1e-9, `peak ${peak(r.L.subarray(SR * 5, SR * 7)).toExponential(1)}`);
  check('a burst restarts it after RESET', db(rms(r.L, SR * 8, SR * 9)) > -45, `${db(rms(r.L, SR * 8, SR * 9)).toFixed(1)} dB`);
}
{ // worst case
  for (const cm of [0, 7]) {
    const r = runWeb({ fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, cwave: cm, level: 1, dtime: 30, lpf: 16000, hpf: 20, ftype: 1, fdrive: 1 }, 6, () => 3 * rnd(), withBurst);
    check(`worst case (${cm ? 'cross-feed' : 'sine'}, loud noise in): finite and <= 1.0`, r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  }
  const r = runWeb({ wetmix: 0, level: 0 }, 1, i => 1.5 * Math.sin(i * 0.05));
  check('a very loud dry signal never hard-clips (soft knee above 0.9)', peak(r.L) <= 1.0001 && peak(r.L) > 0.9, `peak ${peak(r.L).toFixed(3)}`);
}
{ // control changes while running: no click, no NaN (delay time sweep and filter switching)
  const sweep = [];
  for (let k = 0; k < 40; k++) sweep.push([2 + k * 0.1, p => p.port.onmessage({ data: { type: 'params', params: { dtime: 60 + (k % 2) * 300, ftype: k % 4, dtype: (k >> 1) % 4, cwave: k % 8, lpf: 1500 + 400 * k } } })]);
  const r = runWeb({ fbk: 1.1 }, 8, null, { at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })], ...sweep] });
  let worst = 0; for (let i = SR * 3; i < SR * 7; i++) worst = Math.max(worst, Math.abs(r.L[i] - r.L[i - 1]));
  check('switching filter, delay type, carrier and delay time while running stays finite and bounded', r.bad === 0 && peak(r.L) <= 0.5001 && peak(r.R) <= 0.5001, `peak ${peak(r.L).toFixed(3)}, largest sample step ${worst.toFixed(3)}`);
}
{ // cost: one block of 128 samples must fit well inside its 2.67 ms
  const r = runWeb({}, 20, null, withBurst), perBlock = r.ms / (SR * 20 / 128);
  console.log(`info  CPU: ${perBlock.toFixed(3)} ms per 128-sample block at 48 kHz (budget 2.667 ms) = ${(perBlock / 2.667 * 100).toFixed(0)} % of one core in Node on this machine`);
  check('fits the real-time budget with margin (< 50 %)', perBlock < 1.33, `${(perBlock / 2.667 * 100).toFixed(0)} %`);
}
{ // 44.1 and 96 kHz
  for (const sr of [44100, 96000]) {
    const r = runWeb({}, 12, null, { sr, at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })]] });
    const e = db(rms(r.L, sr * 8, sr * 12));
    check(`sample rate ${sr}: the default loop sustains`, e > -40 && r.bad === 0 && Math.abs(e - db(rms(r.R, sr * 8, sr * 12))) < 6, `${e.toFixed(1)} dB`);
  }
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
