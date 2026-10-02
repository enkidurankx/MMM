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
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, noise: (() => { let s = 987654321; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1; })(),
  };
  const D = {}, H = { ...hist }, P = { ...params };
  for (const [n, s] of Object.entries(data)) D[n] = new Float64Array(s);
  const fn = new Function('P', 'H', 'D', 'samplerate', 'helpers', `
    const {peek, poke, mod, floor, tanh, exp, log, pow, abs, min, max, sin, cos, tan, sqrt, noise} = helpers;
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
  const base = { ...quiet, ringd: 0.5, cfreq: 55, dtime: 180, satur: 0.4, hpf: 80, lpf: 8000, seedlvl: 0, link: 0 };   // reso at its default 0.2; one independent loop (the sustain point of the coupled pair is measured in section 23 / the README)
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
  const { step, P } = compile(SR); Object.assign(P, { ...quiet, seedlvl: 1, fbk: 0.8, ringd: 0.5, link: 0 });
  let rmax = 0, lmax = 0; for (let i = 0; i < SR; i++) { const [l, r] = step(i < 2000 ? 0.5 * Math.sin(i * 0.1) : 0, 0); rmax = Math.max(rmax, Math.abs(r)); lmax = Math.max(lmax, Math.abs(l)); }
  check('channels are independent at LINK 0 (L-only input leaves R silent)', rmax < 1e-6 && lmax > 1e-3, `R ${rmax.toExponential(1)}, L ${lmax.toFixed(3)}`);
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
for (const [dt, ft, fx] of [[0, 0, 0], [3, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3]]) {
  const { step, P, D, H } = compile(SR); Object.assign(P, { ...quiet, dtype: dt, ftype: ft, fxtype: fx, fxmix: 0.5, fbk: 1.4, ringd: 0.5, cfreq: 55, satur: 0.4, hpf: 80, lpf: 8000, dtime: 180, wow: 0.2, spread: 0.3, level: 1 });
  let n = 0; const run1 = (secs, f) => { for (let k = 0; k < SR * secs; k++, n++) f(step(0, 0), n); };
  P.burst = 1; run1(0.15, () => {}); P.burst = 0; run1(8, () => {});
  const before = (() => { let t = 0, c = 0; run1(0.5, ([l]) => { t += l * l; c++; }); return db(Math.sqrt(t / c)); })();
  check(`[delay ${dt}, filter ${ft}, fx ${fx}] `+'before reset the loop is alive', before > -30, `${before.toFixed(1)} dB rms`);
  P.clear = 1; let first = 0; run1(0.002, ([l]) => { first = Math.max(first, Math.abs(l)); });
  check(`[delay ${dt}, filter ${ft}, fx ${fx}] `+'RESET silences the output within 2 ms', first < 1e-6, `peak in first 2 ms ${first.toExponential(1)}`);
  run1(0.75, () => {}); P.clear = 0;
  // the part of the delay line that can still be read (longest read-back 0.55 s with wow/spread at maximum) must be empty
  let mem = 0; for (const [d, wi] of [[D.dbL, H.wL], [D.dbR, H.wR]]) for (let k = 1; k <= Math.floor(SR * 0.6); k++) mem = Math.max(mem, Math.abs(d[(((wi - k) % d.length) + d.length) % d.length]));
  check(`[delay ${dt}, filter ${ft}, fx ${fx}] `+'RESET zeroed the readable delay memory (last 0.6 s, L and R)', mem < 1e-9, `largest stored value ${mem.toExponential(1)}`);
  let after = 0; run1(3, ([l, r]) => { after = Math.max(after, Math.abs(l), Math.abs(r)); });
  check(`[delay ${dt}, filter ${ft}, fx ${fx}] `+'after RESET (noise floor 0) the loop stays empty', after < 1e-6, `peak over 3 s ${after.toExponential(1)}`);
  P.burst = 1; run1(0.15, () => {}); P.burst = 0; run1(6, () => {});
  let t = 0, c = 0; run1(0.5, ([l]) => { t += l * l; c++; });
  check(`[delay ${dt}, filter ${ft}, fx ${fx}] `+'a seed burst restarts the loop after RESET', db(Math.sqrt(t / c)) > -30, `${db(Math.sqrt(t / c)).toFixed(1)} dB rms`);
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
  const pp = ty => { const { step, P } = compile(SR); Object.assign(P, { ...quiet, seedlvl: 1, fbk: 0.8, ringd: 0, link: 0, dtype: ty, dtime: 100, hpf: 20, lpf: 16000, reso: 0 }); let rmax = 0, lmax = 0;
    for (let i = 0; i < SR; i++) { const [l, r] = step(i < 2000 ? 0.5 * Math.sin(i * 0.1) : 0, 0); if (i > SR * 0.3) { rmax = Math.max(rmax, Math.abs(r)); lmax = Math.max(lmax, Math.abs(l)); } } return { rmax, lmax }; };
  const pt = pp(0), pg = pp(3);
  check('ping-pong: left-only input reaches the right channel (tape keeps it silent at LINK 0)', pg.rmax > 1e-3 && pt.rmax < 1e-6, `ping-pong R ${pg.rmax.toExponential(1)}, tape R ${pt.rmax.toExponential(1)}`);
  for (let ty = 0; ty <= 3; ty++) {
    let s2 = 777 + ty; const rnd = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, dtype: ty, level: 1, dtime: 30, lpf: 16000, hpf: 20 }, 6, () => 3 * rnd(), 0.5);
    const pk = Math.max(r.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0), r.R.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
    check(`delay type ${ty}: worst case finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}`);
  }
}

// 17. filter models (CLEAN 12 dB, LADDER 24 dB, MS-20 style, SOFT 6 dB): slopes, resonance character, level dependence
{
  const o = { ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, dtime: 20, wow: 0, level: 1, hpf: 20, lpf: 16000 };
  const gain = (f, set, amp = 0.05) => { const r = run({ ...o, ...set }, 0.8, i => amp * Math.sin(2 * Math.PI * f * i / SR)); return goertzel(r.L, SR * 0.4, SR * 0.8, f) / amp; };
  const lpSlope = ft => db(gain(8000, { ftype: ft, lpf: 2000, reso: 0 }) / gain(500, { ftype: ft, lpf: 2000, reso: 0 }));
  const hpSlope = ft => db(gain(100, { ftype: ft, hpf: 400, reso: 0 }) / gain(3000, { ftype: ft, hpf: 400, reso: 0 }));
  const lp = [0, 1, 2, 3].map(lpSlope), hp = [0, 1, 2, 3].map(hpSlope);
  const inR = (v, a, b) => v >= a && v <= b;
  check('CLEAN: 12 dB/oct (2 octaves above the cutoff: about -24 dB), low-pass and high-pass', inR(lp[0], -30, -21) && inR(hp[0], -28, -20), `LP ${lp[0].toFixed(1)}, HP ${hp[0].toFixed(1)} dB`);
  check('LADDER: 24 dB/oct (about -48 dB)', lp[1] < -44 && hp[1] < -44, `LP ${lp[1].toFixed(1)}, HP ${hp[1].toFixed(1)} dB`);
  check('MS-20: 12 dB/oct', inR(lp[2], -30, -21) && inR(hp[2], -28, -20), `LP ${lp[2].toFixed(1)}, HP ${hp[2].toFixed(1)} dB`);
  check('SOFT: 6 dB/oct (about -12 dB)', inR(lp[3], -16, -10) && inR(hp[3], -15, -9), `LP ${lp[3].toFixed(1)}, HP ${hp[3].toFixed(1)} dB`);
  const peak = (ft, rs) => db(gain(2000, { ftype: ft, lpf: 2000, reso: rs }) / gain(500, { ftype: ft, lpf: 2000, reso: rs }));
  const pass = (ft, rs) => db(gain(500, { ftype: ft, lpf: 2000, reso: rs }));
  check('CLEAN: resonance peaks at the cutoff (> +12 dB at RESO 0.9) without losing the passband', peak(0, 0.9) > 12 && pass(0, 0.9) > -3, `peak ${peak(0, 0.9).toFixed(1)} dB, passband ${pass(0, 0.9).toFixed(1)} dB`);
  check('LADDER: resonance peaks (> +10 dB); the passband still loses some level at RESO 0.9 (between -8 and -1 dB; an uncompensated ladder would lose ~13 dB)', peak(1, 0.9) > 10 && pass(1, 0.9) < -1 && pass(1, 0.9) > -8, `peak ${peak(1, 0.9).toFixed(1)} dB, passband ${pass(1, 0.9).toFixed(1)} dB`);
  check('SOFT: RESO has no effect', Math.abs(peak(3, 0.9) - peak(3, 0)) < 0.3, `${peak(3, 0).toFixed(1)} vs ${peak(3, 0.9).toFixed(1)} dB`);
  const drop = ft => db(gain(2000, { ftype: ft, lpf: 2000, reso: 1 }, 0.005)) - db(gain(2000, { ftype: ft, lpf: 2000, reso: 1 }, 0.1));
  check('MS-20: the resonant peak is squashed by its own level (drop from quiet to loud > CLEAN + 5 dB)', drop(2) > drop(0) + 5, `MS-20 ${drop(2).toFixed(1)} dB, CLEAN ${drop(0).toFixed(1)} dB`);
  for (let ft = 0; ft <= 3; ft++) {
    let s3 = 31337 + ft; const rnd = () => ((s3 = (s3 * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, fdrive: 1, ftype: ft, level: 1, dtime: 30, lpf: 16000, hpf: 400 }, 6, () => 3 * rnd(), 0.5);
    const pk = Math.max(r.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0), r.R.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
    check(`filter ${ft}: worst case finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}`);
    const d = run({ ...compile(SR).P, ftype: ft }, 12, null, 0.15);
    check(`filter ${ft}: factory defaults + seed burst stay finite and <= level 0.5`, d.bad === 0 && d.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0) <= 0.5001, `rms ${db(rms(d.L, SR * 8, SR * 12)).toFixed(1)} dB`);
  }
  { // switching the model while the loop runs must stay finite and bounded
    const { step, P } = compile(SR); Object.assign(P, { ...quiet, fbk: 1.2, ringd: 0.5, level: 1, satur: 0.4, hpf: 80, lpf: 8000, reso: 0.6 });
    let bad = 0, pk = 0; P.burst = 1;
    for (let i = 0; i < SR * 12; i++) { if (i === Math.floor(SR * 0.15)) P.burst = 0; P.ftype = Math.floor(i / (SR * 0.5)) % 4; const [l, r] = step(0, 0); if (!isFinite(l) || !isFinite(r)) bad++; pk = Math.max(pk, Math.abs(l), Math.abs(r)); }
    check('switching the filter model every 0.5 s: finite and <= 0 dBFS', bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}, non-finite ${bad}`);
  }
}

// 18. filter drive: exact bypass at 0, gain and harmonics rise with it, the loop holds at lower feedback, always bounded
{
  const o = { ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, dtime: 20, wow: 0, level: 1, hpf: 20, lpf: 16000, reso: 0 };
  const meas = (set, amp) => { const r = run({ ...o, ...set }, 0.8, i => amp * Math.sin(2 * Math.PI * 500 * i / SR)); return { h1: goertzel(r.L, SR * 0.4, SR * 0.8, 500) / amp, h3: goertzel(r.L, SR * 0.4, SR * 0.8, 1500) / amp }; };
  const q0 = meas({ fdrive: 0 }, 0.01), q1 = meas({ fdrive: 1 }, 0.01), l0 = meas({ fdrive: 0 }, 0.3), l1 = meas({ fdrive: 1 }, 0.3);
  const x0 = run({ ...o, fdrive: 0 }, 0.5, i => 0.3 * Math.sin(i * 0.02)), x0b = run({ ...o }, 0.5, i => 0.3 * Math.sin(i * 0.02));
  let dd = 0; for (let i = 0; i < x0.L.length; i++) dd = Math.max(dd, Math.abs(x0.L[i] - x0b.L[i]));
  check('filter drive 0 is an exact bypass (identical to the default)', dd === 0, `max diff ${dd}`);
  check('filter drive 1: small-signal gain rises by 10-16 dB', db(q1.h1 / q0.h1) > 10 && db(q1.h1 / q0.h1) < 16, `${db(q1.h1 / q0.h1).toFixed(1)} dB`);
  check('filter drive 1: the 3rd harmonic of a 0.3 sine grows by > 20 dB', db(l1.h3 / l1.h1) - db(l0.h3 / l0.h1) > 20, `${db(l0.h3 / l0.h1).toFixed(1)} -> ${db(l1.h3 / l1.h1).toFixed(1)} dB re fundamental`);
  const bb = { ...quiet, seedlvl: 0, hpf: 80, lpf: 8000, satur: 0.4, dtime: 180, cfreq: 55, ringd: 0.5 };
  const noD = run({ ...bb, fdrive: 0, fbk: 0.5 }, 16, null, 0.15), withD = run({ ...bb, fdrive: 0.5, fbk: 0.5 }, 16, null, 0.15);
  check('filter drive 0.5 lets the loop hold at FDBK 0.5, where it dies without drive', db(rms(noD.L, SR * 12, SR * 15)) < -60 && db(rms(withD.L, SR * 12, SR * 15)) > -20, `without ${db(rms(noD.L, SR * 12, SR * 15)).toFixed(0)} dB, with ${db(rms(withD.L, SR * 12, SR * 15)).toFixed(0)} dB`);
}
// 19. stereo width: mid/side on the whole result; 0 = mono, 1 = unchanged, the mono sum never changes
{
  const out = w => { const c = compile(SR); Object.assign(c.P, { ...quiet, seedlvl: 1, fbk: 0.5, ringd: 0.5, dtime: 60, spread: 1, level: 1, wetmix: 0.6, width: w }); const L = [], R = [];
    for (let i = 0; i < SR * 0.5; i++) { const [l, r] = c.step(0.4 * Math.sin(i * 0.05), 0.4 * Math.sin(i * 0.063)); L.push(l); R.push(r); } return { L, R }; };
  const w0 = out(0), wh = out(0.5), w1 = out(1);
  let d0 = 0, sum = 0, side = 0, side1 = 0;
  for (let i = SR * 0.2; i < SR * 0.5; i++) { d0 = Math.max(d0, Math.abs(w0.L[i] - w0.R[i]));
    sum = Math.max(sum, Math.abs((w1.L[i] + w1.R[i]) - (w0.L[i] + w0.R[i])), Math.abs((w1.L[i] + w1.R[i]) - (wh.L[i] + wh.R[i])));
    side = Math.max(side, Math.abs((wh.L[i] - wh.R[i]) - 0.5 * (w1.L[i] - w1.R[i]))); side1 = Math.max(side1, Math.abs(w1.L[i] - w1.R[i])); }
  check('width 0: left and right are identical (mono)', d0 < 1e-12 && side1 > 0.05, `max |L-R| ${d0.toExponential(1)}, side at width 1: ${side1.toFixed(3)}`);
  check('width: the mono sum is the same at every setting', sum < 1e-12, `max diff ${sum.toExponential(1)}`);
  check('width 0.5: the side signal is exactly half of the one at width 1', side < 1e-12, `max diff ${side.toExponential(1)}`);
  let peak = 0; for (let i = 0; i < w1.L.length; i++) peak = Math.max(peak, Math.abs(w1.L[i]), Math.abs(w1.R[i]));
  check('width never exceeds the level (peak <= 1)', peak <= 1.0001, `peak ${peak.toFixed(3)}`);
}

// 20. FX slot (0 off, 1 wavefolder, 2 spring reverb, 3 bitcrusher)
{
  const o = { ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, dtime: 20, wow: 0, level: 1, hpf: 20, lpf: 16000, reso: 0, fxmix: 1 };
  const sig = (f, amp) => i => amp * Math.sin(2 * Math.PI * f * i / SR);
  const meas = (set, f, amp) => { const r = run({ ...o, ...set }, 1.0, sig(f, amp)); return { r, g: h => goertzel(r.L, SR * 0.4, SR * 0.9, h) / amp }; };
  const thd = (set, f, amp) => { const m = meas(set, f, amp); let t = 0; for (let k = 2; k <= 8; k++) t += m.g(f * k) ** 2; return Math.sqrt(t) / m.g(f); };
  // mix 0 = exact bypass for every type
  { const ref = run({ ...o, fxtype: 0 }, 0.4, sig(500, 0.3)); let worst = 0;
    for (const ty of [1, 2, 3]) { const r = run({ ...o, fxtype: ty, fxmix: 0 }, 0.4, sig(500, 0.3)); for (let i = 0; i < ref.L.length; i++) worst = Math.max(worst, Math.abs(r.L[i] - ref.L[i])); }
    check('FX mix 0 is an exact bypass for all three effects', worst === 0, `max diff ${worst}`); }
  // wavefolder
  { const lo = thd({ fxtype: 1, fxfold: 0 }, 500, 0.3), hi = thd({ fxtype: 1, fxfold: 1 }, 500, 0.3), quiet_ = thd({ fxtype: 1, fxfold: 1 }, 500, 0.005);
    check('wavefolder: fold 1 adds strong harmonics (> 20 dB more than fold 0)', db(hi) - db(lo) > 20, `fold 0 ${db(lo).toFixed(1)} dB, fold 1 ${db(hi).toFixed(1)} dB (harmonics re fundamental)`);
    check('wavefolder is level dependent: a very quiet signal stays clean (> 20 dB less distortion than a loud one)', db(hi) - db(quiet_) > 20, `0.3 amp ${db(hi).toFixed(1)} dB, 0.005 amp ${db(quiet_).toFixed(1)} dB`); }
  // spring reverb: tail length follows the SPRING knob, first echo after the main delay + the first spring, low frequencies arrive later (the chirp)
  { const env = (sp, secs = 3) => { const r = run({ ...o, fxtype: 2, fxspring: sp, spread: 0 }, secs, i => i === 100 ? 0.3 : 0); const e = []; for (let w = 0; w < secs * 100; w++) { let q = 0; for (let i = w * SR / 100; i < (w + 1) * SR / 100; i++) q += r.L[i] ** 2; e.push(db(Math.sqrt(q / (SR / 100)))); } return e; };
    const span = e => { const pk = Math.max(...e); let last = 0; for (let w = 0; w < e.length; w++) if (e[w] > pk - 30) last = w; return { first: e.findIndex(v => v > pk - 30) * 10, last: last * 10 }; };
    const s0 = span(env(0)), s1 = span(env(1));
    check('spring reverb: the first echo comes after main delay + first spring (about 50 ms, not before 40 ms)', s0.first >= 40 && s0.first <= 70, `${s0.first} ms`);
    check('spring reverb: the tail grows from SPRING 0 to 1 (30 dB window 120 ms -> 950 ms, at least 4x)', s1.last > 4 * s0.last && s1.last > 600, `SPRING 0: ${s0.last} ms, SPRING 1: ${s1.last} ms`);
    const arrive = f => { const N = Math.floor(SR * 0.06); const r = run({ ...o, fxtype: 2, fxspring: 0, spread: 0 }, 0.5, i => i < N ? 0.3 * Math.sin(2 * Math.PI * f * i / SR) * 0.5 * (1 - Math.cos(2 * Math.PI * i / N)) : 0);
      const w = Math.floor(SR * 0.002); let best = 0, bi = 0; for (let i = 0; i < SR * 0.14; i += w) { let q = 0; for (let k = 0; k < w; k++) q += r.L[i + k] ** 2; if (q > best) { best = q; bi = i; } } return bi / SR * 1000; };
    const lf = arrive(200), hf = arrive(3000);
    check('spring reverb: dispersion, a 200 Hz burst arrives > 10 ms later than a 3 kHz burst (the spring "boing")', lf - hf > 10, `200 Hz ${lf.toFixed(0)} ms, 3 kHz ${hf.toFixed(0)} ms`); }
  // bitcrusher
  { const resid = (set, f, amp) => { const m = meas(set, f, amp); const w = m.g(f); let tot = 0, n = 0; for (let i = SR * 0.4; i < SR * 0.9; i++) { tot += m.r.L[i] ** 2; n++; } const fund = (w * amp) / Math.SQRT2; return Math.sqrt(Math.max(0, tot / n - fund * fund)) / fund; };
    const hi = resid({ fxtype: 3, fxbits: 0, fxrate: 0 }, 1000, 0.3), lo = resid({ fxtype: 3, fxbits: 0.857, fxrate: 0 }, 1000, 0.3);
    check('bitcrusher: 4 bits (fxbits 0.857) leaves about -16 dB of crush noise, 16 bits adds none (only the -43 dB of the tape stage remains)', db(hi) < -40 && db(lo) - db(hi) > 20 && db(lo) > -20 && db(lo) < -10, `16 bit ${db(hi).toFixed(1)} dB, 4 bit ${db(lo).toFixed(1)} dB`);
    const r1 = meas({ fxtype: 3, fxbits: 0, fxrate: 0 }, 1000, 0.3), r8 = meas({ fxtype: 3, fxbits: 0, fxrate: Math.sqrt(7 / 31) }, 1000, 0.3);   // exactly 1/8
    check('bitcrusher: rate reduction 1/8 creates the alias image at 5 kHz (theory for a sample-and-hold: -14 dB) that is absent without it', db(r8.g(5000) / r8.g(1000)) > -20 && db(r8.g(5000) / r8.g(1000)) < -8 && db(r1.g(5000) / r1.g(1000)) < -60, `1/8: ${db(r8.g(5000) / r8.g(1000)).toFixed(1)} dB, off: ${db(r1.g(5000) / r1.g(1000)).toFixed(1)} dB re fundamental`); }
  // worst case and live switching
  for (const ty of [1, 2, 3]) {
    let s4 = 9001 + ty; const rnd = () => ((s4 = (s4 * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    const r = run({ ...quiet, fbk: 1.5, ringd: 1, satur: 1, wow: 1, spread: 1, seedlvl: 1, nfloor: 1, reso: 1, fdrive: 1, fxtype: ty, fxfold: 1, fxspring: 1, fxbits: 1, fxrate: 1, fxmix: 1, level: 1, dtime: 30, lpf: 16000, hpf: 20 }, 6, () => 3 * rnd(), 0.5);
    const pk = Math.max(r.L.reduce((m, v) => Math.max(m, Math.abs(v)), 0), r.R.reduce((m, v) => Math.max(m, Math.abs(v)), 0));
    check(`fx ${ty}: worst case finite and <= 0 dBFS`, r.bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}`);
  }
  { const { step, P } = compile(SR); Object.assign(P, { ...quiet, fbk: 1.0, ringd: 0.5, level: 1, satur: 0.4, hpf: 80, lpf: 8000, fxmix: 0.7, fxspring: 0.8 });
    let bad = 0, pk = 0; P.burst = 1;
    for (let i = 0; i < SR * 12; i++) { if (i === Math.floor(SR * 0.15)) P.burst = 0; P.fxtype = Math.floor(i / (SR * 0.5)) % 4; const [l, r] = step(0, 0); if (!isFinite(l) || !isFinite(r)) bad++; pk = Math.max(pk, Math.abs(l), Math.abs(r)); }
    check('switching the FX type every 0.5 s: finite and <= 0 dBFS', bad === 0 && pk <= 1.0001, `peak ${pk.toFixed(3)}, non-finite ${bad}`); }
}

// 21. the FX are audible at the factory defaults (the first build was not: bitcrusher inaudible, frequency shifter killed the loop)
{
  const d = compile(SR).P;
  const spec = (r, s, e) => { const v = []; for (let f = 20; f <= 6000; f += 20) v.push(goertzel(r.L, s, e, f)); const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) + 1e-30; return v.map(x => x / n); };
  const share = ty => { const r = run({ ...d, fxtype: ty }, 14, null, 0.15); let t2 = 0; for (let i = SR * 10; i < SR * 13; i++) t2 += r.L[i] ** 2; return { sp: spec(r, SR * 10, SR * 13), rms: db(Math.sqrt(t2 / (3 * SR))), bad: r.bad }; };
  const dist = (a, b) => 1 - a.reduce((s2, x, i) => s2 + x * b[i], 0);
  const off = share(0), s = [1, 2, 3].map(share);
  check('factory defaults: the loop with FX off is alive (> -30 dB)', off.rms > -30 && off.bad === 0, `rms ${off.rms.toFixed(1)} dB`);
  check('factory defaults: WAVEFOLD keeps the loop alive (> -30 dB) and changes its spectrum (distance to FX off > 0.15)', s[0].rms > -30 && dist(off.sp, s[0].sp) > 0.15 && s[0].bad === 0, `distance ${dist(off.sp, s[0].sp).toFixed(2)}, rms ${s[0].rms.toFixed(1)} dB`);
  check('factory defaults: SPRING keeps the loop alive (> -30 dB) and audibly changes it (level differs from FX off by > 3 dB)', s[1].rms > -30 && Math.abs(s[1].rms - off.rms) > 3 && s[1].bad === 0, `rms ${s[1].rms.toFixed(1)} dB (off ${off.rms.toFixed(1)} dB)`);
  check('factory defaults: BITCRUSH keeps the loop alive (> -30 dB) and changes its spectrum (distance to FX off > 0.15)', s[2].rms > -30 && dist(off.sp, s[2].sp) > 0.15 && s[2].bad === 0, `distance ${dist(off.sp, s[2].sp).toFixed(2)}, rms ${s[2].rms.toFixed(1)} dB`);
  // wavefolder and bitcrusher are scaled to the loop's limit (1/drive), so they behave the same at the default tape drive
  const o = { ...d, ringd: 0, fbk: 0, seedlvl: 1, dtime: 20, wow: 0, level: 1, hpf: 20, lpf: 16000, reso: 0, fxmix: 1, ftype: 0, fdrive: 0, nfloor: 0, spread: 0 };   // satur stays at 0.4 -> drive 3, limit 0.333
  const amp = 0.1, sine = i => amp * Math.sin(2 * Math.PI * 500 * i / SR);   // a third of the loop limit: the tape stage's own distortion stays small
  const harm = set => { const r = run({ ...o, ...set }, 1.0, sine); const g = f => goertzel(r.L, SR * 0.4, SR * 0.9, f); let h = 0; for (let k = 2; k <= 8; k++) h += g(500 * k) ** 2; return db(Math.sqrt(h) / g(500)); };
  const h0 = harm({ fxtype: 1, fxfold: 0 }), h5 = harm({ fxtype: 1, fxfold: 0.5 });
  check('wavefolder at the default tape drive: a sine at a third of the loop limit folds at FOLD 0.5 (harmonics > 15 dB above FOLD 0)', h5 - h0 > 15 && h5 > -25, `FOLD 0 ${h0.toFixed(1)} dB, FOLD 0.5 ${h5.toFixed(1)} dB`);
  const crush = set => { const r = run({ ...o, ...set }, 1.0, sine); const w = goertzel(r.L, SR * 0.4, SR * 0.9, 500); let tot = 0, n = 0; for (let i = SR * 0.4; i < SR * 0.9; i++) { tot += r.L[i] ** 2; n++; } const fund = w / Math.SQRT2; return db(Math.sqrt(Math.max(0, tot / n - fund * fund)) / fund); };
  const c0 = crush({ fxtype: 3, fxbits: 0, fxrate: 0 }), c1 = crush({ fxtype: 3, fxbits: 0.857, fxrate: 0 });
  check('bitcrusher at the default tape drive: 4 bits crushes a sine at a third of the loop limit (about -15 dB), 16 bits barely (> 20 dB less)', c1 - c0 > 20 && c1 > -22 && c1 < -10, `16 bit ${c0.toFixed(1)} dB, 4 bit ${c1.toFixed(1)} dB (residual re fundamental)`);
}

// 22. no clicks when the delay time (or the delay type, or the spread) changes: the read position glides instead of jumping
{
  // a sine whose delay change is half a period (518.333 Hz: 300 ms = 155.5 periods) would show a full-scale step if the read position jumped
  const worst = (set, change, f) => { let w = 0; for (let off = 0; off < 90; off += 18) {
      const { step, P } = compile(SR); Object.assign(P, { ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, wow: 0, level: 1, hpf: 20, lpf: 16000, reso: 0, spread: 0, ...set });
      const tc = SR + off; let prev = 0;
      for (let i = 0; i < tc + SR * 0.4; i++) { if (i === tc) Object.assign(P, change); const x = 0.3 * Math.sin(2 * Math.PI * f * i / SR); const [l] = step(x, x); if (i >= tc && i < tc + SR * 0.4) w = Math.max(w, Math.abs(l - prev)); prev = l; } }
    return w / (0.3 * 2 * Math.PI * f / SR); };
  const cases = [['DELAY 100 -> 400 ms', { dtime: 100 }, { dtime: 400 }, 518.3333333], ['DELAY 400 -> 100 ms', { dtime: 400 }, { dtime: 100 }, 518.3333333],
                 ['DELAY 180 -> 181 ms', { dtime: 180 }, { dtime: 181 }, 517], ['SPREAD 0 -> 1', { dtime: 200 }, { spread: 1 }, 517], ['TAPE -> DIGITAL with WOW 1', { dtime: 150, wow: 1, dtype: 0 }, { dtype: 1 }, 517]];
  for (const [nm, set, ch, f] of cases) { const r = worst(set, ch, f); check(`no click when ${nm}: largest sample step < 2x the natural step of the tone (the jumping build gave about 28x)`, r < 2, `x${r.toFixed(2)}`); }
  // the delay time itself is still right at rest, and a changed time is reached
  { const r = run({ ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, dtime: 250, wow: 0, hpf: 20, lpf: 16000, reso: 0, level: 1 }, 0.6, i => i === 100 ? 0.5 : 0); let pk = 0, pi = 0; for (let i = 0; i < r.L.length; i++) if (Math.abs(r.L[i]) > pk) { pk = Math.abs(r.L[i]); pi = i; }
    check('after the glide change nothing is off: delay 250 ms is still exact', Math.abs((pi - 100) / SR * 1000 - 250) < 3, `${((pi - 100) / SR * 1000).toFixed(1)} ms`); }
  { const { step, P } = compile(SR); Object.assign(P, { ...quiet, ringd: 0, fbk: 0, satur: 0, seedlvl: 1, dtime: 100, wow: 0, hpf: 20, lpf: 16000, reso: 0, level: 1 });
    const n = SR * 4; const out = new Float64Array(n); for (let i = 0; i < n; i++) { if (i === SR) P.dtime = 300; const x = i === SR * 2 + 100 ? 0.5 : 0; out[i] = step(x, x)[0]; }
    let pk = 0, pi = 0; for (let i = SR * 2; i < n; i++) if (Math.abs(out[i]) > pk) { pk = Math.abs(out[i]); pi = i; }
    check('a delay set to 300 ms while running ends up exactly at 300 ms (after the glide)', Math.abs((pi - (SR * 2 + 100)) / SR * 1000 - 300) < 3, `${((pi - (SR * 2 + 100)) / SR * 1000).toFixed(1)} ms`); }
}

// 23. stereo balance: independent loops are winner-takes-all (a small detune lets one side sustain and the other die, so the signal sits on one side); LINK couples them
{
  const d = compile(SR).P;
  const lr = (set, secs = 40) => { const r = run({ ...d, ...set }, secs, null, 0.15); return { l: db(rms(r.L, SR * (secs - 10), SR * secs)), r: db(rms(r.R, SR * (secs - 10), SR * secs)) }; };
  const none = lr({ link: 0 });
  check('LINK 0 shows the problem: with the default SPRD one side sustains and the other is > 20 dB lower', none.l - none.r > 20, `L ${none.l.toFixed(1)} dB, R ${none.r.toFixed(1)} dB`);
  for (const [nm, set] of [['defaults', {}], ['SPRD 1', { spread: 1 }], ['BBD delay', { dtype: 2 }], ['carrier S&H', { cwave: 4 }], ['FX WAVEFOLD', { fxtype: 1 }], ['FX BITCRUSH', { fxtype: 3 }], ['MS-20 filter', { ftype: 2 }]]) {
    const b = lr(set);
    check(`LINK 0.35 (default): ${nm} keeps both sides alive and within 6 dB of each other after 40 s`, b.l > -45 && b.r > -45 && Math.abs(b.l - b.r) < 6, `L ${b.l.toFixed(1)} dB, R ${b.r.toFixed(1)} dB`);
  }
  { const { step, P } = compile(SR); Object.assign(P, { ...d, seedlvl: 1, fbk: 0.8, ringd: 0.5, nfloor: 0, link: 0.35 }); let rmax = 0;
    for (let i = 0; i < SR; i++) { const [, r] = step(i < 2000 ? 0.5 * Math.sin(i * 0.1) : 0, 0); if (i > SR * 0.3) rmax = Math.max(rmax, Math.abs(r)); }
    check('LINK 0.35: left-only input reaches the right channel (tape delay, no ping-pong needed)', rmax > 1e-3, `R peak ${rmax.toExponential(1)}`); }
}
console.log(ok ? '\nALL OK' : '\nFAILED'); process.exit(ok ? 0 : 1);
