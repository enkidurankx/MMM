// Runs VINK.genexpr (transpiled 1:1 to JS - GenExpr is C-like, same approach as ../../age12/m4l/test_genexpr.js) and checks the
// structure from the description: stability, decay below unity, self-sustain at unity, ring-modulator sidebands, delay time,
// cross-feed, dry path, channel independence, unset parameters. It cannot catch GenExpr syntax errors (only Max can).
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'VINK.genexpr'), 'utf8');

function compile(sampleRate) {
  const params = {}, hist = {}, data = {};
  let body = src.replace(/^\s*Param\s+(\w+)\(\s*([-\d.]+)[^)]*\)\s*;.*$/gm, (_, n, d) => { params[n] = +d; return ''; });
  body = body.replace(/History\s+(\w+)\(\s*([-\d.]+)\s*\)\s*;/g, (_, n, d) => { hist[n] = +d; return ''; });
  body = body.replace(/Data\s+(\w+)\(\s*(\d+)\s*\)\s*;/g, (_, n, s) => { data[n] = +s; return ''; });
  body = body.replace(/\/\/.*$/gm, '');
  const reserved = new Set([...Object.keys(params), ...Object.keys(hist), ...Object.keys(data), 'out1', 'out2']);
  const locals = new Set();
  for (const m of body.matchAll(/(?:^|[;{}])\s*([A-Za-z_]\w*)\s*=(?!=)/g)) if (!reserved.has(m[1])) locals.add(m[1]);
  const helpers = {
    peek: (d, i) => d[i] || 0, poke: (d, v, i) => { d[i] = v; }, mod: (a, b) => a - b * Math.floor(a / b),
    floor: Math.floor, tanh: Math.tanh, exp: Math.exp, log: Math.log, pow: Math.pow, abs: Math.abs, min: Math.min, max: Math.max,
    sin: Math.sin, sqrt: Math.sqrt, noise: (() => { let s = 987654321; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; })(),
  };
  const D = {}, H = { ...hist }, P = { ...params };
  for (const [n, s] of Object.entries(data)) D[n] = new Float64Array(s);
  const fn = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, mod, floor, tanh, exp, log, pow, abs, min, max, sin, sqrt, noise} = helpers;
    const {${Object.keys(data).join(',')}} = D;
    return function(in1, in2) {
      let out1 = 0, out2 = 0;
      let ${[...locals].join(', ')};
      const {${Object.keys(params).join(',')}} = P;
      let {${Object.keys(hist).join(',')}} = H;
      ${body}
      Object.assign(H, {${Object.keys(hist).join(',')}});
      return [out1, out2];
    };`);
  return { step: fn(P, H, D, sampleRate, helpers), P };
}

const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const rms = (a, s, e) => { let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const db = x => 20 * Math.log10(x + 1e-30);
function goertzel(a, s, e, f) { const w = 2 * Math.PI * f / SR; let re = 0, im = 0; for (let i = s; i < e; i++) { re += a[i] * Math.cos(w * (i - s)); im += a[i] * Math.sin(w * (i - s)); } return 2 * Math.hypot(re, im) / (e - s); }
function run(set, seconds, input, burstSecs = 0) {
  const { step, P } = compile(SR); Object.assign(P, set);
  const n = Math.floor(SR * seconds), L = new Float64Array(n), R = new Float64Array(n);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0 && burstSecs) P.burst = 1;
    if (i === Math.floor(SR * burstSecs)) P.burst = 0;
    const x = input ? input(i) : 0; const [l, r] = step(x, x);
    if (!isFinite(l) || !isFinite(r)) bad++; L[i] = l; R[i] = r;
  }
  return { L, R, bad };
}
const quiet = { nfloor: 0, seedlvl: 0.5, wow: 0, spread: 0, level: 1, wetmix: 1, satur: 0.4, dtime: 100, ringd: 0, hpf: 20, lpf: 16000, fbk: 0 };

// 1. delay time: an impulse comes out after dtime (no ring, no feedback, no wow)
{
  const r = run({ ...quiet, dtime: 180, satur: 0, seedlvl: 1 }, 0.5, i => i === 100 ? 0.5 : 0);
  let pk = 0, pi = 0; for (let i = 0; i < r.L.length; i++) if (Math.abs(r.L[i]) > pk) { pk = Math.abs(r.L[i]); pi = i; }
  const ms = (pi - 100) / SR * 1000;
  check('delay: impulse reappears at the delay time', Math.abs(ms - 180) < 3, `peak at ${ms.toFixed(1)} ms (want 180)`);
}
// 2. dry path: mix 0 returns the input exactly, no latency
{
  const x = i => 0.3 * Math.sin(i * 0.05), r = run({ ...quiet, wetmix: 0, nfloor: 0.3 }, 0.2, x);
  let w = 0; for (let i = 0; i < r.L.length; i++) w = Math.max(w, Math.abs(r.L[i] - x(i))); check('mix = 0 is the dry signal', w < 1e-12, `max err ${w.toExponential(1)}`);
}
// 3. ring modulator: a 1 kHz seed through a 100 Hz carrier (depth 1, one pass) gives 900/1100 Hz and no 1000 Hz
{
  const r = run({ ...quiet, ringd: 1, cfreq: 100, seedlvl: 1, fbk: 0, satur: 0, dtime: 50 }, 1.0, i => 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR));
  const s = Math.floor(SR * 0.3), e = Math.floor(SR * 0.9), a9 = goertzel(r.L, s, e, 900), a10 = goertzel(r.L, s, e, 1000), a11 = goertzel(r.L, s, e, 1100);
  check('ring mod: sidebands 900/1100 Hz present, carrier-free 1000 Hz absent', a9 > 0.05 && a11 > 0.05 && a10 < 0.02 * a9, `900:${a9.toFixed(3)} 1100:${a11.toFixed(3)} 1000:${a10.toFixed(4)}`);
}
// 4. second generation: with feedback the sidebands themselves are modulated again (new components at 800/1200 Hz)
{
  const r = run({ ...quiet, ringd: 1, cfreq: 100, seedlvl: 1, fbk: 0.9, satur: 0.2, dtime: 50, hpf: 20, lpf: 16000 }, 3.0, i => 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR));
  const s = Math.floor(SR * 1.5), e = Math.floor(SR * 2.9);
  const a8 = goertzel(r.L, s, e, 800), a12 = goertzel(r.L, s, e, 1200);
  check('recursion: second-generation sidebands 800/1200 Hz appear', a8 > 0.01 && a12 > 0.01, `800:${a8.toFixed(3)} 1200:${a12.toFixed(3)}`);
}
// 5. below the threshold the loop decays, above it it sustains (limited by the tape stage), always bounded
{
  const base = { ...quiet, ringd: 0.5, cfreq: 55, dtime: 180, satur: 0.4, hpf: 80, lpf: 8000, seedlvl: 0 };
  const lo = run({ ...base, fbk: 0.8 }, 9, null, 0.15), mid = run({ ...base, fbk: 1.0 }, 14, null, 0.15), hi = run({ ...base, fbk: 1.4 }, 14, null, 0.15);
  const loE = rms(lo.L, SR * 0.5, SR * 1.5), loL = rms(lo.L, SR * 7, SR * 9);
  check('feedback 0.8 decays (>40 dB in 6 s)', db(loL) < db(loE) - 40, `${db(loE).toFixed(1)} -> ${db(loL).toFixed(1)} dB`);
  check('feedback 1.0 still decays with ring 0.5 at 55 Hz (ring + filters lose energy)', db(rms(mid.L, SR * 10, SR * 14)) < -80, `${db(rms(mid.L, SR * 10, SR * 14)).toFixed(1)} dB`);
  const hiL = rms(hi.L, SR * 10, SR * 14), pk = hi.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0), hiM = rms(hi.L, SR * 6, SR * 8);
  check('feedback 1.4 sustains (> -30 dBFS rms after 10 s)', db(hiL) > -30, `${db(hiL).toFixed(1)} dB rms`);
  check('feedback 1.4 settles (level at 7 s ~ level at 12 s, within 3 dB)', Math.abs(db(hiL) - db(hiM)) < 3, `${db(hiM).toFixed(1)} -> ${db(hiL).toFixed(1)} dB`);
  check('feedback 1.4 stays bounded (<= level)', pk <= 1.0001 && hi.bad === 0, `peak ${pk.toFixed(3)}, non-finite ${hi.bad}`);
  const d = compile(SR).P;
  const dr = run({ ...d, burst: 0 }, 12, null, 0.15);
  check('factory defaults + seed burst sustain and stay <= level 0.5', db(rms(dr.L, SR * 8, SR * 12)) > -40 && dr.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0) <= 0.5001, `${db(rms(dr.L, SR * 8, SR * 12)).toFixed(1)} dB rms`);
}
// 6. worst case: maximum feedback, drive, ring, loud noise input, wow, both modes
for (const cm of [0, 1]) {
  let s = 55555; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, cmode: cm, level: 1, dtime: 30, lpf: 16000, hpf: 20 }, 8, () => 3 * rnd(), 0.5);
  const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0), pk = Math.max(peak(r.L), peak(r.R));
  check(`worst case (${cm ? 'cross-feed' : 'osc'}): finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}, non-finite ${r.bad}`);
}
// 7. cross-feed mode is a different network (carrier = delay tap) but still alive and bounded
{
  const a = run({ ...quiet, ringd: 1, fbk: 1.4, cmode: 0, seedlvl: 0, dtime: 120 }, 6, null, 0.15), b = run({ ...quiet, ringd: 1, fbk: 1.4, cmode: 1, seedlvl: 0, dtime: 120 }, 6, null, 0.15);
  let d = 0; for (let i = SR * 3; i < SR * 6; i++) d = Math.max(d, Math.abs(a.L[i] - b.L[i]));
  check('cross-feed differs from the oscillator carrier and is alive', d > 1e-3 && rms(b.L, SR * 4, SR * 6) > 1e-4, `diff ${d.toExponential(1)}, rms ${db(rms(b.L, SR * 4, SR * 6)).toFixed(1)} dB`);
}
// 8. stereo: loops are independent (input only on L -> R stays silent without noise floor); spread makes R differ
{
  const { step, P } = compile(SR); Object.assign(P, { ...quiet, seedlvl: 1, fbk: 0.8, ringd: 0.5 });
  let rmax = 0, lmax = 0; for (let i = 0; i < SR; i++) { const [l, r] = step(i < 2000 ? 0.5 * Math.sin(i * 0.1) : 0, 0); rmax = Math.max(rmax, Math.abs(r)); lmax = Math.max(lmax, Math.abs(l)); }
  check('channels are independent (L-only input leaves R silent)', rmax < 1e-6 && lmax > 1e-3, `R ${rmax.toExponential(1)}, L ${lmax.toFixed(3)}`);
  const sp = run({ ...quiet, spread: 1, ringd: 1, fbk: 1.0, nfloor: 0.4, dtime: 150 }, 3, null, 0.2);
  let d = 0; for (let i = SR; i < SR * 3; i++) d = Math.max(d, Math.abs(sp.L[i] - sp.R[i]));
  check('spread: R loop differs from L', d > 1e-3, `diff ${d.toExponential(1)}`);
}
// 9. self-start: noise floor alone (no seed, no burst) wakes up a loop at unity
{
  const r = run({ ...quiet, seedlvl: 0, nfloor: 0.6, fbk: 1.4, ringd: 0.3, satur: 0.3, dtime: 100, hpf: 80, lpf: 8000 }, 25, null);
  check('noise floor alone wakes up a loop at gain 1.4', db(rms(r.L, SR * 20, SR * 25)) > -50, `${db(rms(r.L, SR * 20, SR * 25)).toFixed(1)} dB rms`);
}
// 10. parameters never set (all zero) must not give NaN/inf
{
  const { step, P } = compile(SR); for (const k of Object.keys(P)) P[k] = 0;
  let bad = 0, pk = 0; for (let i = 0; i < SR; i++) { const [l, r] = step(0.3 * Math.sin(i * 0.02), 0.3); if (!isFinite(l) || !isFinite(r)) bad++; pk = Math.max(pk, Math.abs(l)); }
  check('all params = 0: finite', bad === 0, `non-finite ${bad}, peak ${pk.toFixed(3)}`);
}
console.log(ok ? '\nALL OK' : '\nFAILED'); process.exit(ok ? 0 : 1);
