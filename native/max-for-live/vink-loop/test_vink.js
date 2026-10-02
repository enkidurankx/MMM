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
    sin: Math.sin, tan: Math.tan, sqrt: Math.sqrt, noise: (() => { let s = 987654321; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; })(),
  };
  const D = {}, H = { ...hist }, P = { ...params };
  for (const [n, s] of Object.entries(data)) D[n] = new Float64Array(s);
  const fn = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, mod, floor, tanh, exp, log, pow, abs, min, max, sin, tan, sqrt, noise} = helpers;
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
  return { step: fn(P, H, D, sampleRate, helpers), P, D, H };
}

const SR = 48000; let ok = true;
{ // scope lint: GenExpr variables first set inside an if-block exist only there (the JS transpile would not notice)
  const body = src.replace(/\/\/.*/g, ''), decl = new Set([...src.matchAll(/(?:Param|History|Data)\s+(\w+)/g)].map(m => m[1]));
  const skip = new Set(['if','else','min','max','floor','sin','tanh','exp','sqrt','peek','poke','mod','noise','samplerate','in1','in2','out1','out2']);
  const stack = [0]; let nxt = 1; const first = {}, bad = new Set();
  for (const m of body.matchAll(/\{|\}|[A-Za-z_]\w*/g)) { const t = m[0];
    if (t === '{') stack.push(nxt++); else if (t === '}') stack.pop(); else if (skip.has(t) || decl.has(t)) continue;
    else if (!(t in first)) first[t] = [...stack]; else if (!stack.includes(first[t][first[t].length - 1])) bad.add(t); }
  if (bad.size) { console.log('FAIL variables first set inside an if-block but used outside:', [...bad].join(', ')); process.exit(1); }
}
if (/[^\x00-\x7F]/.test(src)) { console.log('FAIL GenExpr contains non-ASCII characters (gen~ codebox will not compile)'); process.exit(1); }
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
  const base = { ...quiet, ringd: 0.5, cfreq: 55, dtime: 180, satur: 0.4, hpf: 80, lpf: 8000, seedlvl: 0 };   // reso at its default 0.2
  const lo = run({ ...base, fbk: 0.5 }, 9, null, 0.15), mid = run({ ...base, fbk: 0.65 }, 24, null, 0.15), hi = run({ ...base, fbk: 1.4 }, 14, null, 0.15), on = run({ ...base, fbk: 0.9 }, 14, null, 0.15);
  const loE = rms(lo.L, SR * 0.5, SR * 1.5), loL = rms(lo.L, SR * 7, SR * 9);
  check('feedback 0.5 decays (>40 dB in 6 s)', db(loL) < db(loE) - 40, `${db(loE).toFixed(1)} -> ${db(loL).toFixed(1)} dB`);
  check('feedback 0.65 still decays (ring 0.5, reso 0.2): the threshold is above it', db(rms(mid.L, SR * 20, SR * 23)) < -60, `${db(rms(mid.L, SR * 20, SR * 23)).toFixed(1)} dB`);
  check('feedback 0.9 (the default) sustains', db(rms(on.L, SR * 10, SR * 14)) > -30, `${db(rms(on.L, SR * 10, SR * 14)).toFixed(1)} dB rms`);
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
  const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, cwave: cm ? 7 : 0, level: 1, dtime: 30, lpf: 16000, hpf: 20 }, 8, () => 3 * rnd(), 0.5);
  const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0), pk = Math.max(peak(r.L), peak(r.R));
  check(`worst case (${cm ? 'cross-feed' : 'sine'}): finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}, non-finite ${r.bad}`);
}
// 7. cross-feed mode is a different network (carrier = delay tap) but still alive and bounded
{
  const a = run({ ...quiet, ringd: 1, fbk: 1.4, cwave: 0, seedlvl: 0, dtime: 120 }, 6, null, 0.15), b = run({ ...quiet, ringd: 1, fbk: 1.4, cwave: 7, seedlvl: 0, dtime: 120 }, 6, null, 0.15);
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

// 11. carrier waveforms: sidebands of a 1 kHz seed through a 100 Hz carrier (ring 1, one pass) show each waveform's harmonics
{
  const probe = w => { const r = run({ ...quiet, ringd: 1, cfreq: 100, cwave: w, seedlvl: 1, fbk: 0, satur: 0, dtime: 50 }, 1.0, i => 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR));
    const s = Math.floor(SR * 0.3), e = Math.floor(SR * 0.9); return { b1: goertzel(r.L, s, e, 900), b2: goertzel(r.L, s, e, 800), b3: goertzel(r.L, s, e, 700), bad: r.bad }; };
  const sine = probe(0), tri = probe(1), saw = probe(2), sq = probe(3);
  // 700 Hz in the sine case is only tanh distortion at drive 0, hence the 5 % limit
  check('sine carrier: only +-100 Hz sidebands', sine.b1 > 0.05 && sine.b2 < 0.01 * sine.b1 && sine.b3 < 0.05 * sine.b1, `900:${sine.b1.toFixed(3)} 800:${sine.b2.toFixed(4)} 700:${sine.b3.toFixed(4)}`);
  check('triangle carrier: odd harmonics only (900 strong, 800 absent, 700 weak ~1/9)', tri.b1 > 0.05 && tri.b2 < 0.02 * tri.b1 && tri.b3 > 0.03 * tri.b1 && tri.b3 < 0.25 * tri.b1, `900:${tri.b1.toFixed(3)} 800:${tri.b2.toFixed(4)} 700:${tri.b3.toFixed(4)}`);
  check('saw carrier: all harmonics (800 ~ half of 900)', saw.b1 > 0.05 && saw.b2 > 0.3 * saw.b1 && saw.b2 < 0.7 * saw.b1, `900:${saw.b1.toFixed(3)} 800:${saw.b2.toFixed(3)}`);
  check('square carrier: odd harmonics only (800 absent, 700 ~ 1/3 of 900)', sq.b1 > 0.05 && sq.b2 < 0.02 * sq.b1 && sq.b3 > 0.2 * sq.b1 && sq.b3 < 0.5 * sq.b1, `900:${sq.b1.toFixed(3)} 800:${sq.b2.toFixed(4)} 700:${sq.b3.toFixed(3)}`);
}
// 12. sample & hold is stepped (rare jumps), smooth random is continuous, noise jumps everywhere; all bounded
{
  const jumps = w => { const r = run({ ...quiet, ringd: 1, cfreq: 200, cwave: w, seedlvl: 1, fbk: 0, satur: 0, dtime: 20, hpf: 20, lpf: 16000 }, 1.0, () => 0.5);
    let pk = 0; for (let i = SR * 0.3; i < SR * 0.9; i++) pk = Math.max(pk, Math.abs(r.L[i]));
    let n = 0, m = 0; for (let i = SR * 0.3; i < SR * 0.9; i++) { if (Math.abs(r.L[i] - r.L[i - 1]) > 0.2 * pk) n++; m++; } return { frac: n / m, pk, bad: r.bad }; };
  const sh = jumps(4), sm = jumps(5), nz = jumps(6);
  check('sample & hold: stepped (jumps on < 3 % of samples, ~ 200/s)', sh.frac < 0.03 && sh.frac > 0.001 && sh.pk > 0.05, `jump fraction ${(sh.frac * 100).toFixed(2)} %`);
  check('smooth random: continuous (no jumps)', sm.frac < 0.001 && sm.pk > 0.02, `jump fraction ${(sm.frac * 100).toFixed(3)} %`);
  check('noise carrier: jumps on most samples', nz.frac > 0.3, `jump fraction ${(nz.frac * 100).toFixed(1)} %`);
}
// 13. every waveform: finite and bounded at the worst case settings, and holds with enough feedback
for (let w = 0; w <= 7; w++) {
  let s = 4242 + w; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, cwave: w, level: 1, dtime: 30, lpf: 16000, hpf: 20 }, 6, () => 3 * rnd(), 0.5);
  const pk = r.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  check(`wave ${w}: worst case finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}`);
}
// 14. RESET: silences at once, zeroes the delay memory and the filters, and the loop can be restarted afterwards (tape and ping-pong)
for (const dt of [0, 3]) {
  const { step, P, D, H } = compile(SR); Object.assign(P, { ...quiet, dtype: dt, fbk: 1.4, ringd: 0.5, cfreq: 55, satur: 0.4, hpf: 80, lpf: 8000, dtime: 180, wow: 0.2, spread: 0.3, level: 1 });
  let n = 0; const run1 = (secs, f) => { for (let k = 0; k < SR * secs; k++, n++) f(step(0, 0), n); };
  P.burst = 1; run1(0.15, () => {}); P.burst = 0; run1(8, () => {});
  const before = (() => { let t = 0, c = 0; run1(0.5, ([l]) => { t += l * l; c++; }); return db(Math.sqrt(t / c)); })();
  check(`[type ${dt}] `+'before reset the loop is alive', before > -30, `${before.toFixed(1)} dB rms`);
  P.clear = 1; let first = 0; run1(0.002, ([l]) => { first = Math.max(first, Math.abs(l)); });
  check(`[type ${dt}] `+'RESET silences the output within 2 ms', first < 1e-6, `peak in first 2 ms ${first.toExponential(1)}`);
  run1(0.75, () => {}); P.clear = 0;
  // the part of the delay line that can still be read (longest read-back 0.55 s with wow/spread at maximum) must be empty
  let mem = 0; for (const [d, wi] of [[D.dbL, H.wL], [D.dbR, H.wR]]) for (let k = 1; k <= Math.floor(SR * 0.6); k++) mem = Math.max(mem, Math.abs(d[(((wi - k) % d.length) + d.length) % d.length]));
  check(`[type ${dt}] `+'RESET zeroed the readable delay memory (last 0.6 s, L and R)', mem < 1e-9, `largest stored value ${mem.toExponential(1)}`);
  let after = 0; run1(3, ([l, r]) => { after = Math.max(after, Math.abs(l), Math.abs(r)); });
  check(`[type ${dt}] `+'after RESET (noise floor 0) the loop stays empty', after < 1e-6, `peak over 3 s ${after.toExponential(1)}`);
  P.burst = 1; run1(0.15, () => {}); P.burst = 0; run1(6, () => {});
  let t = 0, c = 0; run1(0.5, ([l]) => { t += l * l; c++; });
  check(`[type ${dt}] `+'a seed burst restarts the loop after RESET', db(Math.sqrt(t / c)) > -30, `${db(Math.sqrt(t / c)).toFixed(1)} dB rms`);
}

// 15. filter resonance: a noise burst through the loop with a 2 kHz low-pass rings at 2 kHz much more with RESO 1 than with RESO 0
{
  const band = (r, f0) => { let t = 0; for (let k = -2; k <= 2; k++) t += goertzel(r, SR * 0.1, SR * 1.2, f0 + 40 * k) ** 2; return Math.sqrt(t / 5); };
  const peakness = rs => { const r = run({ ...quiet, seedlvl: 0, nfloor: 0, ringd: 0, fbk: 0.55, lpf: 2000, hpf: 20, satur: 0.1, dtime: 60, reso: rs }, 1.4, null, 0.3);
    return { ratio: band(r.L, 2000) / (band(r.L, 900) + 1e-12), bad: r.bad }; };
  const r0 = peakness(0), r1 = peakness(1);
  check('resonance: 2 kHz peak relative to 900 Hz grows by > 8 dB from RESO 0 to 1', db(r1.ratio) - db(r0.ratio) > 8 && r0.bad + r1.bad === 0, `ratio ${db(r0.ratio).toFixed(1)} -> ${db(r1.ratio).toFixed(1)} dB`);
}
// 16. delay types
{
  const sine = i => 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR);
  const o = { ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, dtime: 100, wow: 1, hpf: 20, lpf: 16000, reso: 0 };
  const dig1 = run({ ...o, dtype: 1 }, 1.0, sine), dig0 = run({ ...o, dtype: 1, wow: 0 }, 1.0, sine), tape1 = run({ ...o, dtype: 0 }, 1.0, sine), tape0 = run({ ...o, dtype: 0, wow: 0 }, 1.0, sine);
  const dd = (a, b) => { let m = 0; for (let i = SR * 0.3; i < SR; i++) m = Math.max(m, Math.abs(a.L[i] - b.L[i])); return m; };
  check('digital: WOW has no effect', dd(dig1, dig0) < 1e-9, `max diff ${dd(dig1, dig0).toExponential(1)}`);
  check('tape: WOW modulates the delay', dd(tape1, tape0) > 0.02, `max diff ${dd(tape1, tape0).toFixed(3)}`);
  const hf = ty => { const r = run({ ...o, wow: 0, dtype: ty }, 1.0, i => 0.5 * Math.sin(2 * Math.PI * 6000 * i / SR)); return goertzel(r.L, SR * 0.3, SR * 0.9, 6000); };
  const hd = hf(1), hb = hf(2);
  check('BBD: darker than digital (6 kHz < 0.4 x)', hb < 0.4 * hd && hb > 0.05 * hd, `digital ${hd.toFixed(3)}, BBD ${hb.toFixed(3)}`);
  const hiss = ty => rms(run({ ...o, dtype: ty, seedlvl: 0 }, 1.0, null).L, SR * 0.3, SR * 0.9);
  check('BBD: adds hiss; digital and tape stay silent', hiss(2) > 1e-5 && hiss(1) < 1e-8 && hiss(0) < 1e-8, `BBD ${db(hiss(2)).toFixed(0)} dB, digital ${db(hiss(1)).toFixed(0)} dB, tape ${db(hiss(0)).toFixed(0)} dB`);
  const pp = ty => { const { step, P } = compile(SR); Object.assign(P, { ...quiet, seedlvl: 1, fbk: 0.8, ringd: 0, dtype: ty, dtime: 100, hpf: 20, lpf: 16000, reso: 0 }); let rmax = 0, lmax = 0;
    for (let i = 0; i < SR; i++) { const [l, r] = step(i < 2000 ? 0.5 * Math.sin(i * 0.1) : 0, 0); if (i > SR * 0.3) { rmax = Math.max(rmax, Math.abs(r)); lmax = Math.max(lmax, Math.abs(l)); } } return { rmax, lmax }; };
  const pt = pp(0), pg = pp(3);
  check('ping-pong: left-only input reaches the right channel (tape/digital keep it silent)', pg.rmax > 1e-3 && pt.rmax < 1e-6, `ping-pong R ${pg.rmax.toExponential(1)}, tape R ${pt.rmax.toExponential(1)}`);
  for (let ty = 0; ty <= 3; ty++) {
    let s2 = 777 + ty; const rnd = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, dtype: ty, level: 1, dtime: 30, lpf: 16000, hpf: 20 }, 6, () => 3 * rnd(), 0.5);
    const pk = Math.max(r.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0), r.R.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
    check(`delay type ${ty}: worst case finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}`);
  }
}
console.log(ok ? '\nALL OK' : '\nFAILED'); process.exit(ok ? 0 : 1);
