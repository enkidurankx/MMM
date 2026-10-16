// Runs MMM_VocalChopper.genexpr (transpiled 1:1 to JS - GenExpr is C-like) on synthetic "spoken words" and checks behaviour:
// finite output, buffer indices always in range, routing to the right outs, onset trigger, fire, hold, panic, LFO on/off.
// It cannot catch GenExpr syntax errors (only Max can) - see README triage.
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'MMM_VocalChopper.genexpr'), 'utf8');

function compile(sr) {
  const params = {}, hist = {}, data = {};
  let body = src.replace(/^\s*Param\s+(\w+)\(\s*([-\d.]+)[^)]*\)\s*;.*$/gm, (_, n, d) => { params[n] = +d; return ''; });
  body = body.replace(/History\s+(\w+)\(\s*([-\d.]+)\s*\)\s*;/g, (_, n, d) => { hist[n] = +d; return ''; });
  body = body.replace(/Data\s+(\w+)\(\s*(\d+)\s*\)\s*;/g, (_, n, s) => { data[n] = +s; return ''; });
  body = body.replace(/\/\/.*$/gm, '');
  const reserved = new Set([...Object.keys(params), ...Object.keys(hist), ...Object.keys(data), 'in1', 'in2', ...[1,2,3,4,5,6,7,8].map(i => 'out' + i)]);
  const locals = new Set();
  for (const m of body.matchAll(/(?:^|[;{}])\s*([A-Za-z_]\w*)\s*=(?!=)/g)) if (!reserved.has(m[1])) locals.add(m[1]);
  // every local must be initialised before first use: they all are listed in the "locals" line; check that
  const initLine = body.split('\n').find(l => /^\s*inL = 0;/.test(l)) || '';
  const missing = [...locals].filter(n => !new RegExp('\\b' + n + ' = 0;').test(initLine));
  if (missing.length) throw new Error('locals not initialised at top: ' + missing.join(','));
  const D = {}, P = { ...params }, H = { ...hist };
  for (const [n, s] of Object.entries(data)) D[n] = new Float64Array(s);
  let idxErr = 0;
  const helpers = {
    peek: (d, i) => { if (!(i >= 0 && i < d.length) || i !== Math.floor(i)) idxErr++; return d[i] || 0; },
    poke: (d, v, i) => { if (!(i >= 0 && i < d.length) || i !== Math.floor(i)) idxErr++; d[i] = v; },
    floor: Math.floor, exp: Math.exp, log: Math.log, pow: Math.pow, abs: Math.abs, min: Math.min, max: Math.max,
    cos: Math.cos, sin: Math.sin, noise: () => Math.random() * 2 - 1,
  };
  const fn = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, floor, exp, log, pow, abs, min, max, cos, sin, noise} = helpers;
    const {${Object.keys(data).join(',')}} = D;
    return function(in1, in2) {
      let out1 = 0, out2 = 0, out3 = 0, out4 = 0, out5 = 0, out6 = 0, out7 = 0, out8 = 0;
      let ${[...locals].join(', ')};
      const {${Object.keys(params).join(',')}} = P;
      let {${Object.keys(hist).join(',')}} = H;
      ${body}
      Object.assign(H, {${Object.keys(hist).join(',')}});
      return [out1, out2, out3, out4, out5, out6, out7, out8];
    };`);
  return { step: fn(P, H, D, sr, helpers), P, H, idxErr: () => idxErr };
}

const sr = 48000;
function speech(n) {            // words of 250 ms every 600 ms: sine + noise, fast attack, decaying
  const t = n / sr, ph = t % 0.6;
  if (ph > 0.25) return 0.001 * (Math.random() - 0.5);
  return Math.sin(2 * Math.PI * 180 * t) * 0.5 * Math.exp(-ph * 6) * (ph < 0.005 ? ph / 0.005 : 1) + 0.05 * (Math.random() - 0.5);
}
function run(label, setup, secs, tickEvery) {
  const c = compile(sr);
  setup(c.P);
  const energy = new Array(8).fill(0); let nonfinite = 0, peak = 0, tick = 0, evSamples = 0;
  const N = secs * sr;
  for (let n = 0; n < N; n++) {
    if (tickEvery && n % tickEvery === 0 && n > 0) c.P.p_tick = ++tick;
    const x = speech(n);
    const o = c.step(x, x);
    o.forEach((v, i) => { if (!Number.isFinite(v)) nonfinite++; energy[i] += v * v; peak = Math.max(peak, Math.abs(v)); });
  }
  const rms = energy.map(e => Math.sqrt(e / N));
  console.log(label.padEnd(34), 'rms voices L/R:', rms.map(v => v.toFixed(3)).join(' '), '| peak', peak.toFixed(2), '| nonfinite', nonfinite, '| index errors', c.idxErr());
  if (nonfinite || c.idxErr()) { console.error('FAIL', label); process.exitCode = 1; }
  return { rms, c };
}
const fail = (m) => { console.error('FAIL', m); process.exitCode = 1; };
const voiceRms = (r, v) => Math.max(r[2 * v], r[2 * v + 1]);

let r;
r = run('clock, 4 outs random', P => { P.p_outs = 4; P.p_route = 0; }, 8, sr / 8);
for (let v = 0; v < 4; v++) if (voiceRms(r.rms, v) < 0.005) fail('voice ' + v + ' silent with 4 outs');
r = run('clock, 2 outs', P => { P.p_outs = 2; }, 8, sr / 8);
if (voiceRms(r.rms, 2) > 1e-9 || voiceRms(r.rms, 3) > 1e-9) fail('voices 3/4 not silent with 2 outs');
r = run('clock, 1 out', P => { P.p_outs = 1; }, 8, sr / 8);
if (voiceRms(r.rms, 1) > 1e-9) fail('voice 2 not silent with 1 out');
r = run('cycle, 4 outs', P => { P.p_outs = 4; P.p_route = 1; }, 8, sr / 8);
for (let v = 0; v < 4; v++) if (voiceRms(r.rms, v) < 0.005) fail('cycle: voice ' + v + ' silent');
run('by level', P => { P.p_route = 2; }, 8, sr / 8);
run('by pitch, pitch 12', P => { P.p_route = 3; P.p_pitch = 12; P.p_chaos = 1; }, 8, sr / 8);
r = run('no triggers at all (clock mode, no ticks)', P => { P.p_trigmode = 0; }, 4, 0);
if (Math.max(...r.rms) > 1e-9) fail('output without any trigger');
r = run('onset mode (no ticks)', P => { P.p_trigmode = 1; P.p_thr = -40; }, 6, 0);
if (Math.max(...r.rms) < 0.005) fail('onset mode produced nothing');
r = run('onset mode, threshold above input', P => { P.p_trigmode = 1; P.p_thr = 0; }, 6, 0);
if (Math.max(...r.rms) > 1e-9) fail('onset fired above threshold');
r = run('dry 1, no triggers', P => { P.p_dry = 1; }, 3, 0);
if (r.rms[0] < 0.05 || r.rms[2] > 1e-9) fail('dry must reach only out 1/2');
run('repeats 8, hold on', P => { P.p_rept = 8; P.p_hold = 1; }, 6, sr / 4);
run('extreme: chaos 1 size 2000 range 1 pitch 24', P => { P.p_chaos = 1; P.p_size = 2000; P.p_range = 1; P.p_pitch = 24; P.p_rev = 1; P.p_rept = 8; }, 10, sr / 16);
run('extreme: tiny buffer 0.5 s, size 2000', P => { P.p_bufsec = 0.5; P.p_size = 2000; P.p_chaos = 1; }, 6, sr / 16);
run('LFO on, all targets, per step', P => { P.p_lfo = 1; P.p_lfotick = 1; P.p_lfodepth = 1; for (const k of ['p_tsize','p_tpitch','p_trev','p_tprob','p_trange','p_twidth','p_trept','p_tchaos']) P[k] = 1; }, 10, sr / 16);
run('LFO on, free clock', P => { P.p_lfo = 1; P.p_lfodepth = 1; P.p_tprob = 1; }, 10, sr / 8);
// fire button + panic
{
  const c = compile(sr); let e = 0, e2 = 0;
  for (let n = 0; n < sr * 2; n++) { if (n === sr) c.P.p_fire = 1; if (n === sr + 100) c.P.p_panic = 1;
    const x = speech(n); const o = c.step(x, x); if (n > sr + 100 && n < sr + 20000) e += o[0] ** 2 + o[2] ** 2 + o[4] ** 2 + o[6] ** 2; }
  console.log('fire then panic 100 samples later: energy after panic', e.toFixed(6));
  if (e > 1e-6) fail('panic did not silence grains');
}
{
  const c = compile(sr); let e = 0;
  for (let n = 0; n < sr * 2; n++) { if (n === sr) c.P.p_fire = 1; const x = speech(n); const o = c.step(x, x); if (n > sr) e += o[0] ** 2 + o[1] ** 2 + o[2] ** 2 + o[3] ** 2 + o[4] ** 2 + o[5] ** 2 + o[6] ** 2 + o[7] ** 2; }
  console.log('fire alone: energy', e.toFixed(3)); if (e < 1) fail('fire produced nothing');
}
if (!process.exitCode) console.log('OK');
