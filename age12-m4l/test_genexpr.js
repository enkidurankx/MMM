// Runs AGE12.genexpr (transpiled 1:1 to JS — GenExpr is C-like) against the ORIGINAL offline chain
// from ../age12-v1_4.html. Catches port/logic errors; it cannot catch GenExpr syntax errors (only Max can).
'use strict';
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'age12-v1_4.html'), 'utf8');
const { ageSample, MODELS } = new Function(html.slice(html.indexOf('function resample('), html.indexOf('function mixDryWet(')) + '\nreturn {ageSample, MODELS};')();
const src = fs.readFileSync(path.join(__dirname, 'AGE12.genexpr'), 'utf8');

function compile(sampleRate) {
  const params = {}, hist = {}, data = {};
  let body = src.replace(/^\s*Param\s+(\w+)\(\s*([-\d.]+)[^)]*\)\s*;.*$/gm, (_, n, d) => { params[n] = +d; return ''; });
  body = body.replace(/History\s+(\w+)\(\s*([-\d.]+)\s*\)\s*;/g, (_, n, d) => { hist[n] = +d; return ''; });
  body = body.replace(/Data\s+(\w+)\(\s*(\d+)\s*\)\s*;/g, (_, n, s) => { data[n] = +s; return ''; });
  body = body.replace(/\/\/.*$/gm, '');
  const reserved = new Set([...Object.keys(params), ...Object.keys(hist), 'out1', 'out2']);
  const locals = new Set();
  for (const m of body.matchAll(/(?:^|[;{}])\s*([A-Za-z_]\w*)\s*=(?!=)/g)) if (!reserved.has(m[1])) locals.add(m[1]);
  const fn = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, mod, floor, tanh, exp, log, pow, abs, min, max, noise} = helpers;
    return function(in1, in2) {
      let out1 = 0, out2 = 0;
      let ${[...locals].join(', ')};
      const {${Object.keys(params).join(',')}} = P;
      let {${Object.keys(hist).join(',')}} = H;
      ${body}
      Object.assign(H, {${Object.keys(hist).join(',')}});
      return [out1, out2];
    };`);
  const H = { ...hist }, D = {}, P = { ...params };
  for (const [n, s] of Object.entries(data)) D[n] = new Float64Array(s);
  // data objects are referenced by name inside the code -> expose as variables
  const helpers = {
    peek: (d, i) => d[i] || 0, poke: (d, v, i) => { d[i] = v; }, mod: (a, b) => a - b * Math.floor(a / b),
    floor: Math.floor, tanh: Math.tanh, exp: Math.exp, log: Math.log, pow: Math.pow, abs: Math.abs, min: Math.min, max: Math.max,
    noise: () => Math.random() * 2 - 1,
  };
  const withData = new Function('P', 'H', 'D', 'samplerate', 'helpers', 'make', `
    const {${Object.keys(data).join(',')}} = D; return make(P,H,D,samplerate,helpers);`);
  // simplest: rebuild the function with data names in scope
  const fn2 = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, mod, floor, tanh, exp, log, pow, abs, min, max, noise} = helpers;
    const {${Object.keys(data).join(',')}} = D;
    return function(in1, in2) {
      let out1 = 0, out2 = 0;
      let ${[...locals].join(', ')};
      let {${Object.keys(params).join(',')}} = P;
      let {${Object.keys(hist).join(',')}} = H;
      ${body}
      Object.assign(H, {${Object.keys(hist).join(',')}});
      return [out1, out2];
    };`);
  return { step: fn2(P, H, D, sampleRate, helpers), P, H };
}

function material(rate, seconds) {
  const n = Math.floor(rate * seconds), x = new Float32Array(n);
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate; ph += 2 * Math.PI * (50 * Math.pow(300, (t % 1.5) / 1.5)) / rate;
    let v = 0.25 * Math.sin(ph); const tk = t % 0.5;
    v += 0.6 * Math.exp(-tk * 18) * Math.sin(2 * Math.PI * (45 + 120 * Math.exp(-tk * 30)) * tk);
    v += 0.2 * Math.exp(-((t + 0.25) % 0.5) * 60) * rnd() + (t % 1.0 > 0.9 ? 0.3 : 0.01) * rnd();
    x[i] = v;
  }
  let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); for (let i = 0; i < n; i++) x[i] *= 0.9 / pk;
  return x;
}

const LAT = 6; let ok = true;
const cases = [
  { name: 'SP-1200 +12st 44.1k', rate: 44100, st: 12, m: 'sp1200', pre: 0 },
  { name: 'SP-1200 +12st 48k pre=.3', rate: 48000, st: 12, m: 'sp1200', pre: 0.3 },
  { name: 'MPC60 +19st 44.1k companded', rate: 44100, st: 19, m: 'mpc60', pre: 0.15 },
  { name: 'MPC60 +7st 96k', rate: 96000, st: 7, m: 'mpc60', pre: 0 },
  { name: 'MPC3000 +0st 44.1k', rate: 44100, st: 0, m: 'mpc3000', pre: 0 },
  { name: 'SP-1200 +24st 48k', rate: 48000, st: 24, m: 'sp1200', pre: 0 },
];
for (const c of cases) {
  const M = MODELS[c.m], x = material(c.rate, 2.0);
  const ref = ageSample(x, c.rate, c.st, M.rate, M.bits, c.pre, M.quant, M.filtCut, M.filtRes, M.sat, 0, M.asym).buffer; // noise=0: gen noise() is not seedable
  const { step, P } = compile(c.rate);
  Object.assign(P, { pitchst: c.st, crushrate: M.rate, bitdepth: M.bits, prefilt: c.pre, companded: M.quant === 'companded' ? 1 : 0,
                     dacfreq: M.filtCut, dacres: M.filtRes, satur: M.sat, noiselvl: 0, asymm: M.asym, wetmix: 1 });
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = step(x[i], x[i])[0];
  let se = 0, sr = 0, cnt = 0, maxd = 0;
  for (let n = LAT; n < Math.min(out.length, ref.length + LAT) - 200; n++) { const d = out[n] - ref[n - LAT]; se += d * d; sr += ref[n - LAT] ** 2; cnt++; maxd = Math.max(maxd, Math.abs(d)); }
  const db = 10 * Math.log10((se / cnt + 1e-30) / (sr / cnt)); if (db > -90) ok = false;
  console.log(`${c.name.padEnd(30)} error vs original = ${db.toFixed(1).padStart(7)} dB   max|diff|=${maxd.toExponential(1)}`);
}

// Mix=0 must return the dry signal delayed by LAT samples; stereo channels must be independent.
{
  const x = material(48000, 0.5), { step, P } = compile(48000); P.wetmix = 0;
  let worst = 0; const y = x.map((v, i) => step(v, -v));
  const out = []; const c2 = compile(48000); c2.P.wetmix = 0;
  for (let i = 0; i < x.length; i++) { const [l, r] = c2.step.call(null, x[i], -x[i]); if (i >= LAT) worst = Math.max(worst, Math.abs(l - x[i - LAT]), Math.abs(r + x[i - LAT])); }
  console.log(`mix=0 -> dry delayed by ${LAT}, stereo independent: max error ${worst.toExponential(1)}`); if (worst > 1e-12) ok = false;
}

// Live pitch sweep: nothing may blow up.
{
  const x = material(48000, 4), { step, P } = compile(48000); Object.assign(P, { wetmix: 1, noiselvl: 0.12, crushrate: 26040 });
  let peak = 0, bad = 0;
  for (let i = 0; i < x.length; i++) {
    P.pitchst = 12 + 12 * Math.sin(i / 48000 * 2 * Math.PI * 0.7);
    const [l] = step(x[i], x[i]); if (!isFinite(l)) bad++; peak = Math.max(peak, Math.abs(l));
  }
  console.log(`pitch sweep 0..24 st while running: non-finite=${bad}, peak=${peak.toFixed(3)}`); if (bad || peak > 1.5) ok = false;
}
// Params that were never set (all zero) must not produce NaN/inf - this is what a gen~ without working defaults would feed the code.
{
  const x = material(48000, 1), { step, P } = compile(48000);
  for (const k of Object.keys(P)) P[k] = 0;
  let bad = 0, peak = 0;
  for (let i = 0; i < x.length; i++) { const [l, r] = step(x[i], x[i]); if (!isFinite(l) || !isFinite(r)) bad++; peak = Math.max(peak, Math.abs(l)); }
  console.log(`all params = 0: non-finite=${bad}, peak=${peak.toFixed(3)}`); if (bad) ok = false;
}
console.log(ok ? '\nALL OK' : '\nFAILED'); process.exit(ok ? 0 : 1);
