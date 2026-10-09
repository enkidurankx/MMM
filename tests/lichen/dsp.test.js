// DSP tests for lichen-v0_5.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../lichen-v0_5.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
const PRESETS = (() => { let i = html.indexOf('const PRESETS = ') + 'const PRESETS = '.length, d = 0, e = i; for (let j = i; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (!d) { e = j + 1; break; } } } return vm.runInNewContext('(' + html.slice(i, e) + ')'); })();
let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);

function load(sr) {
  const reg = {}, posted = [];
  const sb = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Int32Array, Object, console };
  vm.createContext(sb); vm.runInContext(dsp, sb);
  return { reg, posted, defaults: vm.runInContext('JSON.parse(JSON.stringify(DEFAULTS))', sb) };
}
function worklet(sr, params) { const l = load(sr || 48000); const p = new l.reg.lichen(); p.posted = l.posted; p.port.onmessage({ data: { type: 'params', params: Object.assign({}, l.defaults, params || {}), immediate: true } }); return p; }
const lastMeter = p => { const m = p.posted.filter(x => x.type === 'meter'); return m[m.length - 1]; };
function run(params, seconds, opts = {}) {
  const sr = opts.sr || 48000, p = worklet(sr, params); if (opts.seed) p.port.onmessage({ data: { type: 'seed', seed: opts.seed } });
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), o1 = new Float32Array(128), o2 = new Float32Array(128); let bad = 0, ai = 0; const at = opts.at || [];
  for (let s = 0; s < n; s += 128) {
    while (ai < at.length && at[ai][0] * sr <= s) { at[ai][1](p); ai++; }
    p.process([[]], [[o1, o2]]);
    for (let i = 0; i < 128 && s + i < n; i++) { L[s + i] = o1[i]; R[s + i] = o2[i]; if (!isFinite(o1[i]) || !isFinite(o2[i])) bad++; }
  }
  return { L, R, p, bad, sr };
}
const SR = 48000;
const rms = (a, f, t) => { let s = 0; for (let i = f; i < t; i++) s += a[i] * a[i]; return Math.sqrt(s / (t - f)); };
const db = x => 20 * Math.log10(Math.max(x, 1e-12));
const peak = a => { let m = 0; for (const v of a) if (Math.abs(v) > m) m = Math.abs(v); return m; };
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let l = 2; l <= n; l <<= 1) { const a = -2 * Math.PI / l; for (let i = 0; i < n; i += l) for (let k = 0; k < l / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + l / 2] * c - im[i + k + l / 2] * s, xi = re[i + k + l / 2] * s + im[i + k + l / 2] * c; re[i + k + l / 2] = re[i + k] - xr; im[i + k + l / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } } }
function spec(a, from, n = 32768) { const re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) re[i] = a[from + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n)); fft(re, im); const m = new Float64Array(n / 2); for (let k = 0; k < n / 2; k++) m[k] = Math.hypot(re[k], im[k]); return m; }
const centroid = (a, from) => { const m = spec(a, from, 8192); let A = 0, B = 0; for (let k = 1; k < m.length; k++) { A += m[k] * k * SR / 8192; B += m[k]; } return B > 0 ? A / B : 0; };
const cv = v => { const m = v.reduce((x, y) => x + y, 0) / v.length; return m > 0 ? Math.sqrt(v.reduce((x, y) => x + (y - m) * (y - m), 0) / v.length) / m : 0; };
const windows = (L, from, len, step) => { const r = [], c = []; for (let w = from; w + len <= L.length; w += step) { r.push(rms(L, w, w + len)); c.push(centroid(L, w + len / 2 - 4096)); } return { r, c }; };
const calm = { regulate: 0, spores: 0, weather: 0, shimmer: 0, jitter: 0 };   // the field alone

// ===== 1. it starts by itself and stays bounded =====
{
  for (const sr of [44100, 48000, 96000]) { const r = run({}, 20, { sr }); const pk = peak(r.L);
    check(`starts by itself at ${sr} Hz: sounds (rms above -50 dB in the last 5 s), finite, peak below 0.97`, r.bad === 0 && db(rms(r.L, 15 * sr, 20 * sr)) > -50 && pk < 0.97, `${db(rms(r.L, 15 * sr, 20 * sr)).toFixed(1)} dB, peak ${pk.toFixed(2)}`); }
  const r = run({}, 4); const m = lastMeter(r.p);
  check('three seeds at the start: the field has life and the meter reports 128 values per row', m.life > 0.01 && m.v.length === 128 && m.a.length === 128 && m.fr.length === 128, `life ${m.life.toFixed(3)}`);
}

// ===== 2. the order: which partial is at which frequency =====
{
  const fr = (order, extra) => lastMeter(run({ order, pitch: 100, ...calm, ...(extra || {}) }, 2).p).fr;
  const H = fr(0), B = fr(3), Pr = fr(4), C = fr(5), S = fr(1), Pl = fr(2);
  const near = (a, b, t = 0.01) => Math.abs(a / b - 1) < t;
  check('HARMONIC: partials at 1, 2, 3, 4 x the pitch', near(H[0], 100) && near(H[1], 200) && near(H[2], 300) && near(H[63], 6400), [H[0], H[1], H[2], H[63]].map(x => x.toFixed(0)).join(', '));
  check('BELL: the partials of a church bell (1, 1.183, 1.506, 2 x)', near(B[1] / B[0], 1.183) && near(B[2] / B[0], 1.506) && near(B[3] / B[0], 2), [B[1] / B[0], B[2] / B[0], B[3] / B[0]].map(x => x.toFixed(3)).join(', '));
  check('PRIMES: 1, 1.5, 2.5, 3.5 x (the primes 2, 3, 5, 7 over 2)', near(Pr[1] / Pr[0], 1.5) && near(Pr[2] / Pr[0], 2.5) && near(Pr[3] / Pr[0], 3.5), [Pr[1] / Pr[0], Pr[2] / Pr[0], Pr[3] / Pr[0]].map(x => x.toFixed(3)).join(', '));
  check('CONTINUUM: 16 equal steps to the octave', near(C[1] / C[0], Math.pow(2, 1 / 16)) && near(C[16] / C[0], 2), `${(C[1] / C[0]).toFixed(4)}, ${(C[16] / C[0]).toFixed(3)}`);
  check('STRETCH runs sharp above HARMONIC, PLATE spreads wider', S[63] > H[63] * 1.1 && Pl[63] > H[63] * 2, `${(S[63] / H[63]).toFixed(2)} x, ${(Pl[63] / H[63]).toFixed(2)} x at the 64th`);
  const w = fr(0, { warp: 1 }); let moved = 0; for (let i = 0; i < 64; i++) if (Math.abs(w[i] / H[i] - 1) > 0.02) moved++;
  check('WARP shifts the partials by up to a quarter octave, once and for good', moved > 40 && Math.max(...Array.from(w).map((x, i) => Math.abs(Math.log2(x / H[i])))) < 0.26, `${moved} of 64 moved`);
  check('PITCH doubles every partial', near(lastMeter(run({ pitch: 200, ...calm }, 2).p).fr[5] / H[5], 2), '');
}

// ===== 3. what you hear is what the field says: the energy at each partial's frequency follows the amplitude the meter reports =====
{
  let bestR = 1, txt = [];
  for (const order of [0, 3, 4, 5]) for (const seed of [11, 12]) {
    const r = run({ order, pitch: 100, density: 24, speed: 10, ...calm, tilt: 0 }, 12, { seed }), mm = r.p.posted.filter(x => x.type === 'meter'), m = mm[Math.floor((6 + 0.68) * mm.length / 12)], sp = spec(r.L, 6 * SR, 65536), xs = [], ys = [];
    for (let i = 0; i < 24; i++) { const f = m.fr[i], k0 = Math.floor(f * 0.985 * 65536 / SR), k1 = Math.ceil(f * 1.015 * 65536 / SR); let mx = 0; for (let k = k0; k <= k1; k++) mx = Math.max(mx, sp[k]); xs.push(m.a[i]); ys.push(mx); }
    const mx = xs.reduce((a, b) => a + b) / 24, my = ys.reduce((a, b) => a + b) / 24; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < 24; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    const c = sxy / Math.sqrt(sxx * syy + 1e-30); bestR = Math.min(bestR, c); if (c < 0.9) txt.push(`order ${order} seed ${seed}: r = ${c.toFixed(2)}`);
  }
  check('the line height in the spectrum at each partial follows the amplitude the meter reports (correlation above 0.9 in 8 runs over 4 orders)', bestR > 0.9, `lowest r = ${bestR.toFixed(3)}` + (txt.length ? '; ' + txt.join('; ') : ''));
}

// ===== 4. density, width, pitch, level =====
{
  const m = lastMeter(run({ density: 24, ...calm }, 10).p); let above = 0; for (let i = 24; i < 128; i++) above += m.a[i] + m.v[i];
  check('DENSITY 24: cells above the 24th are silent and empty', above < 1e-6 && m.active <= 24, `${m.active} active`);
  const mono = run({ width: 0, ...calm }, 8), wide = run({ width: 1, ...calm }, 8); let dm = 0, dw = 0; for (let i = 5 * SR; i < 8 * SR; i++) { dm += Math.abs(mono.L[i] - mono.R[i]); dw += Math.abs(wide.L[i] - wide.R[i]); }
  check('WIDTH 0 is mono (left = right), WIDTH 100 % is not', dm < 1e-6 && dw > 1, `${dm.toExponential(1)} vs ${dw.toFixed(1)}`);
  const lo = rms(run({ level: 0.3 }, 12, { seed: 5 }).L, 6 * SR, 12 * SR), hi = rms(run({ level: 0.6 }, 12, { seed: 5 }).L, 6 * SR, 12 * SR);
  check('LEVEL 60 % is louder than 30 %', hi > lo * 1.3, `${db(lo).toFixed(1)} -> ${db(hi).toFixed(1)} dB`);
}

// ===== 5. the field: what the regulator and the spores are for =====
{
  const mo = (params, secs, from) => { const r = run(params, secs, { seed: 21 }); const ms = r.p.posted.filter(x => x.type === 'meter'); const per = ms.length / secs; let still = 0, n = 0, dead = 0; for (let t = from; t < secs; t += 0.5) { const m = ms[Math.floor(t * per)]; n++; if (m.motion < 0.03) still++; if (m.life < 0.005) dead++; } return { still: still / n, dead: dead / n, r }; };
  const free = mo({ ...calm, growth: 0.03, decay: 0.055 }, 90, 30), reg = mo({ regulate: 0.7, spores: 0, weather: 0 }, 90, 30);
  check('left alone the field freezes (it moves less than 0.03 for most of the minute after the first 30 s): this is why the rest exists', free.still > 0.6, `frozen ${(100 * free.still).toFixed(0)} % of the time`);
  check('with REGULATE 70 % it is frozen less than a quarter of the time and dead for less than 10 %', reg.still < 0.25 && reg.dead < 0.1, `frozen ${(100 * reg.still).toFixed(0)} %, dead ${(100 * reg.dead).toFixed(0)} %`);
  const dying = run({ ...calm, growth: 0.012, decay: 0.075 }, 30, { seed: 9 }), m0 = lastMeter(dying.p);
  check('a field that cannot live is restarted by a seed: spores are planted even with SPORES 0 (after 0.25 s of death)', m0.spores >= 8, `${m0.spores} seeds in 30 s`);
  const t = run({ ...calm, speed: 10, density: 64 }, 1, { at: [[0.2, p => p.port.onmessage({ data: { type: 'spore', x: 0.5, amt: 1 } })]] }).p, mt = lastMeter(t);
  check('a seed from the page lands where it was put (x = 0.5 of 64 cells: V above 0.1 near cell 32)', mt.v[32] > 0.1 || mt.v[31] > 0.1 || mt.v[33] > 0.1, `V ${mt.v[32].toFixed(2)}`);
  const wf = run({ weather: 1 }, 60, { seed: 3 }), Fs = wf.p.posted.filter(x => x.type === 'meter').map(x => x.F), w0 = run({ weather: 0, regulate: 0 }, 60, { seed: 3 }), F0 = w0.p.posted.filter(x => x.type === 'meter').map(x => x.F);
  check('WEATHER 100 % makes the growth rate wander by at least 15 %, at 0 (and no regulator) it stays put', Math.max(...Fs) / Math.min(...Fs) > 1.15 && Math.max(...F0) / Math.min(...F0) < 1.001, `${(Math.max(...Fs) / Math.min(...Fs)).toFixed(2)} x vs ${(Math.max(...F0) / Math.min(...F0)).toFixed(3)} x`);
  const lf = run({ l1depth: 1, l1rate: 0.5, regulate: 0, weather: 0 }, 12), Fl = lf.p.posted.filter(x => x.type === 'meter').map(x => x.F);
  check('LFO 1 moves the growth rate by up to a half octave at full depth', Math.max(...Fl) / Math.min(...Fl) > 1.5, `${(Math.max(...Fl) / Math.min(...Fl)).toFixed(2)} x`);
  const lp = run({ l2depth: 1, l2rate: 0.5, ...calm }, 12), fp = lp.p.posted.filter(x => x.type === 'meter').map(x => x.fr[3]);
  check('LFO 2 moves the pitch of the row (the 4th partial changes by more than an octave over the cycle at full depth)', Math.max(...fp) / Math.min(...fp) > 2.5, '');
}

// ===== 6. it does not settle: three minutes with the defaults =====
{
  const r = run({}, 180, { seed: 31 }), early = windows(r.L, 8 * SR, 4 * SR, 4 * SR), late = windows(r.L.subarray(100 * SR), 0, 4 * SR, 4 * SR);
  const e = cv(early.r.slice(0, 15)) + cv(early.c.slice(0, 15)), l = cv(late.r) + cv(late.c), minDb = Math.min(...early.r, ...late.r.map(x => x)).valueOf();
  check('three minutes: the variation of level and tone colour in the last 80 s is at least 60 % of that in the first minute, and not below 0.2', l > 0.6 * e && l > 0.2, `${e.toFixed(2)} -> ${l.toFixed(2)}`);
  check('... and it is never silent: every 4 s window is above -55 dB', db(minDb) > -55, `quietest window ${db(minDb).toFixed(0)} dB`);
  const noreg = run({ ...calm }, 120, { seed: 31 }), nw = windows(noreg.L, 40 * SR, 4 * SR, 4 * SR);
  check('without REGULATE, SPORES, WEATHER, SHIMMER and JITTER the same minute is nearly static (variation below 0.1)', cv(nw.r) + cv(nw.c) < 0.1, `${(cv(nw.r) + cv(nw.c)).toFixed(3)}`);
}

// ===== 7. every preset: alive for two and a half minutes, no holes, no overload =====
{
  const bad = [];
  for (const [name, pr] of Object.entries(PRESETS)) {
    const r = run(pr, 150, { seed: 41 }), w = windows(r.L, 10 * SR, 4 * SR, 4 * SR), mn = Math.min(...w.r), pk = peak(r.L);
    if (r.bad || db(mn) < -55 || pk > 0.9 || cv(w.r) + cv(w.c) < 0.15) bad.push(`${name}: min ${db(mn).toFixed(0)} dB, peak ${pk.toFixed(2)}, variation ${(cv(w.r) + cv(w.c)).toFixed(2)}`);
    info(`preset ${name.padEnd(13)} rms ${db(rms(r.L, 10 * SR, r.L.length)).toFixed(0)} dB, quietest window ${db(mn).toFixed(0)} dB, peak ${pk.toFixed(2)}, variation ${(cv(w.r) + cv(w.c)).toFixed(2)}`);
  }
  check('all presets: no silent holes (every 4 s window above -55 dB), peak below 0.9, level and colour keep varying', bad.length === 0, bad.join('; '));
}

// ===== 8. the limiter, the odd corners, the reset =====
{
  const worst = [{ density: 128, growth: 0.05, decay: 0.05, grit: 1, level: 1, tilt: 9, order: 5, shimmer: 1, width: 1 }, { order: 3, pitch: 400, tilt: 9, level: 1, grit: 1 }, { speed: 3000, spread: 2, density: 128, level: 1 }];
  let pk = 0, bad = 0; for (const w of worst) { const r = run(w, 25, { seed: 7 }); pk = Math.max(pk, peak(r.L)); bad += r.bad; }
  check('worst cases (128 partials, GRIT 100 %, TILT +9, LEVEL 100 %, fast): finite, and the limiter keeps the peak below 0.97', bad === 0 && pk < 0.97, `peak ${pk.toFixed(3)}`);
  const corner = []; let cbad = 0; for (let i = 0; i < 20; i++) { const pr = {}; for (const k of ['growth', 'decay', 'spread', 'speed', 'density', 'pitch', 'warp', 'tilt', 'shimmer', 'jitter', 'grit', 'spores', 'regulate', 'weather', 'width', 'tone', 'level']) pr[k] = Math.random() < 0.5 ? 'min' : 'max'; pr.order = i % 6; corner.push(pr); }
  const ranges = { growth: [0.012, 0.07], decay: [0.04, 0.075], spread: [0.25, 2], speed: [30, 3000], density: [16, 128], pitch: [20, 400], warp: [0, 1], tilt: [-18, 9], shimmer: [0, 1], jitter: [0, 1], grit: [0, 1], spores: [0, 2], regulate: [0, 1], weather: [0, 1], width: [0, 1], tone: [800, 16000], level: [0, 1] };
  let cp = 0; for (const pr of corner) { const real = {}; for (const k in ranges) real[k] = pr[k] === 'min' ? ranges[k][0] : ranges[k][1]; real.order = pr.order; const r = run(real, 8, { seed: 2 }); cbad += r.bad; cp = Math.max(cp, peak(r.L)); }
  check('20 corner settings (every fader at one end, all six orders): finite, peak below 0.97', cbad === 0 && cp < 0.97, `peak ${cp.toFixed(3)}`);
  const rr = run({}, 14, { at: [[6, p => p.port.onmessage({ data: { type: 'reset' } })]] }), pre = rms(rr.L, 5 * SR, 5.9 * SR); let dip = 1e9;
  for (let t = 6 * SR; t < 6.05 * SR; t += 24) dip = Math.min(dip, rms(rr.L, t, t + 24));
  let jump = 0, ref = 0; for (let i = 6 * SR; i < 7 * SR; i++) jump = Math.max(jump, Math.abs(rr.L[i] - rr.L[i - 1])); for (let i = 4 * SR; i < 5 * SR; i++) ref = Math.max(ref, Math.abs(rr.L[i] - rr.L[i - 1]));
  const ms = rr.p.posted.filter(x => x.type === 'meter'), per = ms.length / 14, s0 = ms[Math.floor(5.9 * per)].spores, s1 = ms[Math.floor(6.3 * per)].spores;
  check('RESET fades out in 6 ms (the level dips below a third), plants three new seeds, fades in again, and nothing clicks (the largest step is no larger than in the second before)', dip < pre / 3 && s1 - s0 >= 3 && rms(rr.L, 12 * SR, 14 * SR) > 1e-3 && jump < 1.3 * ref, `dip ${(dip / pre).toFixed(2)} x, ${s1 - s0} seeds, step ${jump.toFixed(3)} (before: ${ref.toFixed(3)})`);
}

// ===== 8b. LOW CUT and HIGH CUT: the band of the partials =====
{
  const out = (r, f1, f2) => { const m = spec(r.L, 6 * SR, 32768); let o = 0, all = 0; for (let k = 1; k < m.length; k++) { const f = k * SR / 32768; all += m[k] * m[k]; if (f < f1 || f > f2) o += m[k] * m[k]; } return o / all; };
  const free = run({}, 10, { seed: 3 }), lo = run({ lowcut: 400 }, 10, { seed: 3 }), hi = run({ highcut: 2000 }, 10, { seed: 3 }), both = run({ lowcut: 400, highcut: 2000 }, 10, { seed: 3 });
  check('LOW CUT 400 Hz: less than 1 % of the energy below 330 Hz (the free field has more than 10 %), and the field still sounds', out(lo, 330, 1e9) < 0.01 && out(free, 330, 1e9) > 0.1 && rms(lo.L, 6 * SR, 10 * SR) > 0.003, `${(100 * out(free, 330, 1e9)).toFixed(1)} % -> ${(100 * out(lo, 330, 1e9)).toFixed(1)} %`);
  check('HIGH CUT 2 kHz: less than 1 % of the energy above 2.4 kHz', out(hi, 0, 2400) < 0.01, `${(100 * out(free, 0, 2400)).toFixed(1)} % -> ${(100 * out(hi, 0, 2400)).toFixed(1)} %`);
  check('both together: a band between 330 Hz and 2.4 kHz (less than 1 % outside) that still sounds, bounded, no NaN', out(both, 330, 2400) < 0.01 && rms(both.L, 6 * SR, 10 * SR) > 0.002 && both.bad === 0 && peak(both.L) <= 0.97, `${(100 * out(both, 330, 2400)).toFixed(2)} %`);
  const moved = run({ lowcut: 20 }, 12, { seed: 3, at: [[6, p => p.port.onmessage({ data: { type: 'params', params: { lowcut: 800 } } })]] });
  let step = 0; for (let i = 6 * SR; i < 8 * SR; i++) step = Math.max(step, Math.abs(moved.L[i] - 2 * moved.L[i - 1] + moved.L[i - 2]));
  let before = 0; for (let i = 4 * SR; i < 6 * SR - 64; i++) before = Math.max(before, Math.abs(moved.L[i] - 2 * moved.L[i - 1] + moved.L[i - 2]));
  check('moving LOW CUT while it plays does not click (the largest step after is no more than 3 x the one before)', step <= 3 * before + 1e-3, `${step.toExponential(1)} vs ${before.toExponential(1)}`);
}

// ===== 9. CPU =====
{
  const per = pr => { const p = worklet(SR, pr); const o1 = new Float32Array(128), o2 = new Float32Array(128); for (let i = 0; i < 1500; i++) p.process([[]], [[o1, o2]]); let best = 1e9; for (let r = 0; r < 5; r++) { const t0 = process.hrtime.bigint(); for (let i = 0; i < 300; i++) p.process([[]], [[o1, o2]]); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6 / 300); } return best; };
  const budget = 128 / SR * 1000, a = per({}), b = per({ density: 128, growth: 0.05, decay: 0.05, speed: 1500 }), c = per({ density: 24 });
  info(`CPU: 64 partials ${(100 * a / budget).toFixed(0)} %, 128 partials and a fast field ${(100 * b / budget).toFixed(0)} %, 24 partials ${(100 * c / budget).toFixed(0)} % of one core in Node on this machine`);
  check('CPU: the defaults take under 25 % of the audio budget in Node, the dense fast field under 45 %', a < 0.25 * budget && b < 0.45 * budget, `${(100 * a / budget).toFixed(0)} % / ${(100 * b / budget).toFixed(0)} %`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
