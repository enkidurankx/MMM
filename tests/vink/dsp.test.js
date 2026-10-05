// DSP tests for vink-v1_0.html: the AudioWorklet code is extracted from the page and run in Node with a stub of the worklet globals.
// Part 1 compares it sample by sample with the Max device's GenExpr (../../native/max-for-live/vink-loop/VINK.genexpr, FX slot off).
// Part 2 repeats the behaviour checks (sustain, balance, reset, bounds) on the web version. This proves the port, not the browser.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../vink-v1_0.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
const gen = fs.readFileSync(path.join(__dirname, '../../native/max-for-live/vink-loop/VINK.genexpr'), 'utf8');
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }

function worklet(sr, name = 'vink') {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } },
    registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const p = new reg[name](); p.posted = posted; return p;
}
const lastMeter = p => { const m = p.posted.filter(x => x.type === 'meter'); return m[m.length - 1]; };
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
const info = s => console.log("info " + s);
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
// ===== 3. LFOs: LFO 1 -> delay time (+-1 octave at depth 1), LFO 2 -> carrier frequency (+-2 octaves at depth 1) =====
function advanceTo(p, seconds, inputFn) {   // process silence until `seconds` have passed, returns the processor
  const blk = 128, z = new Float32Array(blk), o1 = new Float32Array(blk), o2 = new Float32Array(blk);
  for (let s = 0; s < Math.round(seconds * SR); s += blk) p.process([[z, z]], [[o1, o2]]);
  return p;
}
for (const [shape, name] of [[0, 'sine'], [1, 'triangle']]) {
  const p = worklet(SR); setParams(p, { l1rate: 0.25, l1depth: 1, l1shape: shape, l2rate: 0.25, l2depth: 0.5, l2shape: shape, dtime: 100, cfreq: 50 });
  advanceTo(p, 1.0);   // 1 s of a 4 s period = quarter: the peak
  const peakDt = lastMeter(p).dt, peakCf = lastMeter(p).cf;
  advanceTo(p, 2.0);   // t = 3 s: the trough
  const lowDt = lastMeter(p).dt, lowCf = lastMeter(p).cf;
  check(`LFO 1 (${name}) swings the delay time x2 at the peak and x0.5 at the trough`, Math.abs(peakDt / 200 - 1) < 0.02 && Math.abs(lowDt / 50 - 1) < 0.02, `${peakDt.toFixed(1)} / ${lowDt.toFixed(1)} ms (want 200 / 50)`);
  check(`LFO 2 (${name}) swings the carrier x2 at the peak and x0.5 at the trough (depth 0.5)`, Math.abs(peakCf / 100 - 1) < 0.02 && Math.abs(lowCf / 25 - 1) < 0.02, `${peakCf.toFixed(1)} / ${lowCf.toFixed(1)} Hz (want 100 / 25)`);
}
{ // drift: smooth random, bounded, no jumps, and it really wanders
  const p = worklet(SR); setParams(p, { l1rate: 0.5, l1depth: 1, l1shape: 2, dtime: 100 });
  const blk = 128, z = new Float32Array(blk), o1 = new Float32Array(blk), o2 = new Float32Array(blk); let prev = null, maxStep = 0, lo = 9, hi = -9, wrongs = 0;
  for (let s = 0; s < SR * 60; s += blk) { p.process([[z, z]], [[o1, o2]]); const v = p.lfo1.v; if (prev !== null) maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; lo = Math.min(lo, v); hi = Math.max(hi, v); if (Math.abs(v) > 1.0001) wrongs++; }
  check('LFO drift: bounded to +-1 octave, no jumps (largest block step < 0.01 octave), uses most of the range', wrongs === 0 && maxStep < 0.01 && hi - lo > 1.2, `range ${lo.toFixed(2)} ... ${hi.toFixed(2)} octave, largest step ${maxStep.toFixed(4)}`);
}
{ // through the audio path: delay impulse and ring-modulator sidebands at the LFO peak (period 100 s, peak at 25 s)
  const common = { fbk: 0, ringd: 0, satur: 0, wow: 0, nfloor: 0, seedlvl: 1, spread: 0, link: 0, hpf: 20, lpf: 16000, level: 1, wetmix: 1, dtime: 100, l1rate: 0.01, l1depth: 1, l1shape: 0 };
  const imp = Math.round(SR * 25), r = runWeb(common, 25.6, i => i === imp ? 0.5 : 0);
  let pk = 0, pi = 0; for (let i = imp; i < r.L.length; i++) if (Math.abs(r.L[i]) > pk) { pk = Math.abs(r.L[i]); pi = i; }
  const ms = (pi - imp) / SR * 1000;
  check('LFO 1 through the audio path: an impulse sent at the peak comes back after about 2 x the delay time', Math.abs(ms - 200) < 8, `${ms.toFixed(1)} ms (want ~200, base 100)`);
  const ring = { ...common, l1depth: 0, ringd: 1, cfreq: 100, dtime: 40, l2rate: 0.01, l2depth: 0.5, l2shape: 0 };
  const r2 = runWeb(ring, 25.6, i => 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR));
  const g = (a, f) => { const w = 2 * Math.PI * f / SR; let re = 0, im = 0; const s0 = Math.round(SR * 25.1), e0 = Math.round(SR * 25.55); for (let i = s0; i < e0; i++) { re += a[i] * Math.cos(w * i); im += a[i] * Math.sin(w * i); } return 2 * Math.hypot(re, im) / (e0 - s0); };
  const a800 = g(r2.L, 800), a1200 = g(r2.L, 1200), a900 = g(r2.L, 900), a1100 = g(r2.L, 1100);
  check('LFO 2 through the audio path: carrier x2 at the peak (sidebands at 800 / 1200 Hz, not 900 / 1100)', a800 > 0.05 && a1200 > 0.05 && a900 < 0.15 * a800 && a1100 < 0.15 * a1200, `800:${a800.toFixed(3)} 1200:${a1200.toFixed(3)} 900:${a900.toFixed(3)} 1100:${a1100.toFixed(3)}`);
}
{ // everything at once, worst case: bounded and finite, no clicks beyond the loop's own level
  const r = runWeb({ fbk: 1.4, ringd: 1, satur: 0.6, l1rate: 1, l1depth: 1, l1shape: 2, l2rate: 1, l2depth: 1, l2shape: 1, cwave: 0, dtime: 300, cfreq: 500 }, 20, () => 0.2 * rnd(), withBurst);
  check('LFOs at full depth and 1 Hz: finite and <= level', r.bad === 0 && peak(r.L) <= 0.5001 && peak(r.R) <= 0.5001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  const l = db(rms(r.L, SR * 10, SR * 20)), rr = db(rms(r.R, SR * 10, SR * 20));
  check('LFOs at full depth: the loop still sounds, left and right within 8 dB', l > -50 && Math.abs(l - rr) < 8, `L ${l.toFixed(1)}, R ${rr.toFixed(1)} dB`);
}
// ===== 4. delay down to 5 ms, and the recorder =====
{
  const q = { fbk: 0, ringd: 0, satur: 0, wow: 0, nfloor: 0, seedlvl: 1, spread: 0, link: 0, hpf: 20, lpf: 16000, level: 1, wetmix: 1 };
  for (const [want, set] of [[5, 5], [5, 1], [12, 12]]) {
    const r = runWeb({ ...q, dtime: set }, 0.3, i => i === 4800 ? 0.5 : 0);
    let pk = 0, pi = 0; for (let i = 4800; i < r.L.length; i++) if (Math.abs(r.L[i]) > pk) { pk = Math.abs(r.L[i]); pi = i; }
    const ms = (pi - 4800) / SR * 1000;
    check(`delay time ${set} ms${set < 5 ? ' (clamped to the 5 ms minimum)' : ''}: an impulse comes back after ${want} ms`, Math.abs(ms - want) < 0.5, `${ms.toFixed(2)} ms`);
  }
  const r = runWeb({ dtime: 5, fbk: 1.2, ringd: 0.6 }, 10, null, withBurst);
  check('5 ms delay with feedback: the loop holds, finite and bounded (a pitched comb)', r.bad === 0 && peak(r.L) <= 0.5001 && db(rms(r.L, SR * 6, SR * 10)) > -50, `${db(rms(r.L, SR * 6, SR * 10)).toFixed(1)} dB`);
  const p = worklet(SR); setParams(p, { dtime: 5, l1depth: 1, l1rate: 0.5, l1shape: 0 }); advanceTo(p, 1.5);   // 1.5 s of a 2 s period = the trough: 5 ms x 0.5 = 2.5 ms wanted
  check('LFO 1 at its trough wants 2.5 ms; the delay is clamped to 5 ms inside', Math.abs(lastMeter(p).dt - 2.5) < 0.05 && Math.abs(p.coef.tau / SR * 1000 - 5) < 1e-6, `wanted ${lastMeter(p).dt.toFixed(2)} ms, used ${(p.coef.tau / SR * 1000).toFixed(2)} ms`);
}
{ // recorder: every frame arrives exactly once, in order, left and right kept apart; stop flushes the rest and ends the processor
  const p = worklet(SR, 'vink-rec'), total = 4096 * 2 + 1000, blk = 128;
  let n = 0; const L = new Float32Array(blk), R = new Float32Array(blk), out = [new Float32Array(blk), new Float32Array(blk)];
  while (n < total) { for (let i = 0; i < blk; i++) { L[i] = (n + i) / 100000; R[i] = -(n + i) / 100000; } p.process([[L, R]], [out]); n += blk; }
  p.port.onmessage({ data: { type: 'stop' } });
  const chunks = p.posted.filter(m => m.type === 'chunk'), done = p.posted.filter(m => m.type === 'done').length;
  const frames = chunks.reduce((a, c) => a + c.l.length, 0); let okOrder = true, k = 0;
  for (const c of chunks) for (let i = 0; i < c.l.length; i++, k++) if (Math.abs(c.l[i] - k / 100000) > 1e-6 || Math.abs(c.r[i] + k / 100000) > 1e-6) okOrder = false;
  check('recorder: all frames arrive once, in order, left/right kept apart', frames === n && okOrder && done === 1, `${frames} of ${n} frames, ${chunks.length} chunks, done x${done}`);
  check('recorder: after stop the processor ends (returns false)', p.process([[L, R]], [out]) === false);
  const m = worklet(SR, 'vink-rec'); m.process([[L]], [out]); m.port.onmessage({ data: { type: 'stop' } });
  const mc = m.posted.filter(x => x.type === 'chunk')[0];
  check('recorder: a mono input is recorded on both channels', mc && mc.l.length === blk && mc.l.every((v, i) => v === mc.r[i] && v === L[i]));
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
function goertzelAmp(a, s, e, f, sr) { const w = 2 * Math.PI * f / sr; let re = 0, im = 0; for (let i = s; i < e; i++) { re += a[i] * Math.cos(w * i); im += a[i] * Math.sin(w * i); } return 2 * Math.hypot(re, im) / (e - s); }
// ===== 5. LFOs up to the audio range (1 kHz): per sample, so they make sidebands instead of aliasing =====
{ // the phase runs per sample at the right speed: 187 blocks of 128 samples
  const blocks = 187, n = blocks * 128, p = worklet(SR); setParams(p, { l1rate: 523.25, l2rate: 997 });
  const z = new Float32Array(128), o1 = new Float32Array(128), o2 = new Float32Array(128); for (let b = 0; b < blocks; b++) p.process([[z, z]], [[o1, o2]]);
  const want1 = (523.25 * n / SR) % 1, want2 = (997 * n / SR) % 1, d = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  check('LFO phase advances per sample: 523.25 Hz and 997 Hz (audio range) after 0.5 s are exactly where they should be', d(p.lfo1.ph, want1) < 1e-6 && d(p.lfo2.ph, want2) < 1e-6, `phase ${p.lfo1.ph.toFixed(6)} / ${p.lfo2.ph.toFixed(6)} (want ${want1.toFixed(6)} / ${want2.toFixed(6)})`);
}
{ // LFO 2 on the carrier at audio rate: frequency modulation of the carrier adds sidebands that a slow LFO does not
  const base = { fbk: 0, ringd: 1, satur: 0, wow: 0, nfloor: 0, seedlvl: 1, spread: 0, link: 0, hpf: 20, lpf: 16000, level: 1, wetmix: 1, dtime: 20, cfreq: 100, cwave: 0, l2depth: 0.5, l2shape: 0 };
  const sig = i => 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR);
  const slow = runWeb({ ...base, l2rate: 0.01 }, 1.2, sig), fast = runWeb({ ...base, l2rate: 150 }, 1.2, sig), s0 = Math.round(SR * 0.4), e0 = Math.round(SR * 1.2);
  const E = (r, f) => { const a = goertzelAmp(r.L, s0, e0, f, SR); return a * a; };
  const conc = r => { let tot = 0, ln = 0; for (let f = 600; f <= 1400; f += 2) { const e = E(r, f); tot += e; if (Math.abs(f - 900) <= 8 || Math.abs(f - 1100) <= 8) ln += e; } return ln / tot; };
  info(`share of the energy in the two carrier lines (900 / 1100 Hz): slow LFO ${(100 * conc(slow)).toFixed(0)} %, LFO at 150 Hz ${(100 * conc(fast)).toFixed(0)} %`);
  check('LFO 2 at 150 Hz frequency-modulates the carrier (100 Hz, +-1 octave): the ring modulation is two clean lines (900 / 1100 Hz) with a slow LFO and spread into many sidebands with the audio-rate one', conc(slow) > 0.7 && conc(fast) < 0.35, `${(100 * conc(slow)).toFixed(0)} % -> ${(100 * conc(fast)).toFixed(0)} %`);
  const base2 = { fbk: 0, ringd: 0, satur: 0, wow: 0, nfloor: 0, seedlvl: 1, spread: 0, link: 0, hpf: 20, lpf: 16000, level: 1, wetmix: 1, dtime: 100, l1depth: 0.05, l1shape: 0 };
  const dslow = runWeb({ ...base2, l1rate: 0.01 }, 1.2, sig), dfast = runWeb({ ...base2, l1rate: 200 }, 1.2, sig);
  const side2 = r => goertzelAmp(r.L, s0, e0, 1200, SR) + goertzelAmp(r.L, s0, e0, 800, SR);
  check('LFO 1 at 200 Hz modulates the delay time (not smoothed away by the 80 ms glide): sidebands at 1000 +- 200 Hz appear', side2(dfast) > 0.02 && side2(dfast) > 10 * side2(dslow), `fast ${side2(dfast).toFixed(4)}, slow ${side2(dslow).toExponential(1)}`);
}
{ // worst case: both LFOs at 1 kHz, full depth, all shapes, strong feedback
  for (const shape of [0, 1, 2]) {
    const r = runWeb({ fbk: 1.4, ringd: 1, satur: 0.6, l1rate: 1000, l1depth: 1, l1shape: shape, l2rate: 1000, l2depth: 1, l2shape: shape, cwave: 0, dtime: 300, cfreq: 500 }, 8, () => 0.2 * rnd(), withBurst);
    check(`both LFOs at 1 kHz, full depth, shape ${shape}: finite and <= level`, r.bad === 0 && peak(r.L) <= 0.5001 && peak(r.R) <= 0.5001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  }
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
