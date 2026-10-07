// DSP tests for creak-v0_2.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../creak-v0_2.html'), 'utf8');
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
function worklet(sr, params) { const l = load(sr || 48000); const p = new l.reg.creak(); p.posted = l.posted; p.port.onmessage({ data: { type: 'params', params: Object.assign({}, l.defaults, params || {}), immediate: true } }); return p; }
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
const rms = (a, f, t) => { f = Math.floor(f); t = Math.floor(t); let s = 0; for (let i = f; i < t; i++) s += a[i] * a[i]; return Math.sqrt(s / (t - f)); };
const db = x => 20 * Math.log10(Math.max(x, 1e-12));
const peak = a => { let m = 0; for (const v of a) if (Math.abs(v) > m) m = Math.abs(v); return m; };
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let l = 2; l <= n; l <<= 1) { const a = -2 * Math.PI / l; for (let i = 0; i < n; i += l) for (let k = 0; k < l / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + l / 2] * c - im[i + k + l / 2] * s, xi = re[i + k + l / 2] * s + im[i + k + l / 2] * c; re[i + k + l / 2] = re[i + k] - xr; im[i + k + l / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } } }
function spec(a, from, n = 32768) { const re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) re[i] = a[from + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n)); fft(re, im); const m = new Float64Array(n / 2); for (let k = 0; k < n / 2; k++) m[k] = Math.hypot(re[k], im[k]); return m; }
const centroid = (a, from) => { const m = spec(a, from, 8192); let A = 0, B = 0; for (let k = 1; k < m.length; k++) { A += m[k] * k * SR / 8192; B += m[k]; } return B > 0 ? A / B : 0; };
const cv = v => { const m = v.reduce((x, y) => x + y, 0) / v.length; return m > 0 ? Math.sqrt(v.reduce((x, y) => x + (y - m) * (y - m), 0) / v.length) / m : 0; };
const windows = (L, from, len, step) => { const r = [], c = []; for (let w = from; w + len <= L.length; w += step) { r.push(rms(L, w, w + len)); c.push(centroid(L, w + len / 2 - 4096)); } return { r, c }; };

const still = { auto: 0, regulate: 0, rough: 0, weather: 0 };   // no player, no regulator, no grit: the plate alone
const meterAt = (r, t) => { const ms = r.p.posted.filter(x => x.type === 'meter'); return ms[Math.min(ms.length - 1, Math.floor(t * ms.length / (r.L.length / r.sr)))]; };

// ===== 1. it starts by itself and stays bounded =====
{
  for (const sr of [44100, 48000, 96000]) { const r = run({}, 25, { sr }), pk = peak(r.L);
    check(`starts by itself at ${sr} Hz: sounds (rms above -50 dB in the last 5 s), finite, peak below 0.97`, r.bad === 0 && db(rms(r.L, 20 * sr, 25 * sr)) > -50 && pk < 0.97, `${db(rms(r.L, 20 * sr, 25 * sr)).toFixed(1)} dB, peak ${pk.toFixed(2)}`); }
  const m = lastMeter(run({}, 4).p);
  check('the meter reports 48 modes (amplitude and frequency), three contacts and the regulator', m.a.length === 48 && m.f.length === 48 && m.cx.length === 3 && m.cOn.length === 3 && isFinite(m.reg), `reg ${m.reg.toFixed(2)}`);
}

// ===== 2. the modes: where they sit =====
{
  const f = (params) => Array.from(lastMeter(run({ ...still, ...params }, 1).p).f);
  const near = (a, b, t = 0.01) => Math.abs(a / b - 1) < t;
  const base = f({ pitch: 100, stiff: 2, aspect: 1.3 }), sq = f({ pitch: 100, stiff: 2, aspect: 1 }), mem = f({ pitch: 100, stiff: 1, aspect: 1 });
  check('the lowest mode is at SIZE; mode (1,2) of a square plate is 2.5 x it (a thin plate: (m^2 + n^2) / 2 = 2.5)', near(base[0], 100) && near(sq[1], 250, 0.02), `${base[0].toFixed(1)} Hz, ${sq[1].toFixed(1)} Hz`);
  check('STIFFNESS 1 (a membrane): the same mode sits at sqrt(2.5) = 1.58 x', near(mem[1], 158.1, 0.02), `${mem[1].toFixed(1)} Hz`);
  check('STIFFNESS 3 spreads the modes wider than a plate (the 30th mode is higher), STIFFNESS 1 squeezes them', f({ stiff: 3 })[29] > base[29] * 1.5 && mem[29] < base[29] * 0.5, `${(f({ stiff: 3 })[29] / base[29]).toFixed(1)} x, ${(mem[29] / base[29]).toFixed(2)} x`);
  check('SIZE doubles every mode', near(f({ pitch: 200 })[7] / f({ pitch: 100 })[7], 2), '');
  const w = f({ warp: 1, pitch: 100 }), w0 = f({ warp: 0, pitch: 100 }); let moved = 0, worst = 0; for (let i = 0; i < 32; i++) { const o = Math.abs(Math.log2(w[i] / w0[i])); if (o > 0.01) moved++; worst = Math.max(worst, o); }
  check('WARP moves the modes by up to 0.15 octave, once and for good', moved > 20 && worst < 0.16 && worst > 0.05, `${moved} moved, up to ${worst.toFixed(3)} octaves`);
  const asp = f({ aspect: 2, pitch: 100 }); check('ASPECT 2 (a long plate) moves the modes apart from a square one', Math.abs(asp[5] / sq[5] - 1) > 0.1, `${asp[5].toFixed(0)} vs ${sq[5].toFixed(0)} Hz`);
  const dn = run({ ...still, density: 12 }, 3), md = lastMeter(dn.p); let above = 0; for (let k = 12; k < 48; k++) above += md.a[k];
  check('MODES 12: the modes above the 12th are silent', above < 1e-6, `${above.toExponential(1)}`);
}

// ===== 3. the body: a struck plate rings as long as DECAY says =====
{
  const ring = params => { const r = run({ ...still, pressure: 0, ...params }, 4, { at: [] }); return r; };
  const a0 = r => { const ms = r.p.posted.filter(x => x.type === 'meter'); const per = ms.length / 4; return t => ms[Math.floor(t * per)].a[0]; };
  const r2 = ring({ damp: 2, regen: 0 }), g2 = a0(r2), d2 = db(g2(0.9) / g2(0.2));
  check('DECAY 2 s: the lowest mode loses 21 dB in 0.7 s (60 dB in 2 s), within 4 dB', Math.abs(d2 + 21) < 4, `${d2.toFixed(1)} dB in 0.7 s`);
  const r5 = ring({ damp: 2, regen: 0.5 }), g5 = a0(r5), d5 = db(g5(0.9) / g5(0.2));
  check('REGEN 50 % halves the loss (10.5 dB in 0.7 s)', Math.abs(d5 + 10.5) < 3, `${d5.toFixed(1)} dB in 0.7 s`);
  const rh = ring({ damp: 2, regen: 1 }), gh = a0(rh), dh = db(gh(1.2) / gh(0.2));
  check('REGEN 100 % takes all the loss away: the mode keeps its size (within 3 dB in a second)', Math.abs(dh) < 3, `${dh.toFixed(1)} dB`);
  const rg = run({ ...still, pressure: 0, damp: 2, regen: 1.3 }, 20), mg = rg.p.posted.filter(x => x.type === 'meter'), ag = t => mg[Math.floor(t * mg.length / 20)].a[0];
  check('REGEN 130 %: the mode grows on its own and settles (it is held, not run away): the size at 12 s and at 19 s agree within 1.5 dB and it is below 1', Math.abs(db(ag(19) / ag(12))) < 1.5 && ag(19) < 1 && ag(19) > 0.005, `${ag(19).toFixed(3)}`);
  const hi = run({ ...still, pressure: 0, damp: 2, regen: 0 }, 2), mh = lastMeter(hi.p);
    const dec = (k) => { const ms = hi.p.posted.filter(x => x.type === 'meter'), per = ms.length / 2; return db(ms[Math.floor(0.3 * per)].a[k] / Math.max(1e-12, ms[Math.floor(0.08 * per)].a[k])); };
  check('... a higher mode loses more in the same time than the lowest one (it decays faster: at least 3 dB more in 0.2 s)', dec(20) < dec(0) - 3, `${dec(0).toFixed(1)} dB (lowest) vs ${dec(20).toFixed(1)} dB (21st) in 0.2 s`);
}

// ===== 4. friction: what a bow does =====
{
  const lvl = (params, secs = 30) => { const r = run({ auto: 1, regulate: 0, rough: 0, weather: 0, ...params }, secs, { seed: 5 }); return { r, db: db(rms(r.L, (secs - 8) * SR, secs * SR)) }; };
  const none = lvl({ pressure: 0 }), grip = lvl({ pressure: 0.8, grip: 1 }), sing = lvl({ pressure: 0.8, grip: 1.8 });
  check('without pressure nothing sounds (below -60 dB after the first strike has died away: only the noise floor of the modes is left, and the bow does not hop)', none.db < -60, `${none.db.toFixed(0)} dB`);
  check('GRIP 1 (a friction that does not fall with the slip speed) never sings: at least 20 dB below a bow that does (what is left are the thumps of the bow hopping)', grip.db < sing.db - 20 && grip.db < -33, `${grip.db.toFixed(0)} dB`);
  check('GRIP 1.8 with pressure sings (above -40 dB) on its own', sing.db > -40, `${sing.db.toFixed(0)} dB`);
  const low = lvl({ pressure: 0.15, grip: 1.8, auto: 1 }), mid = lvl({ pressure: 0.8, grip: 1.8, auto: 1 });
  check('too little pressure does not sustain (PRESSURE 15 %: at least 15 dB below the sustained level, there is a threshold, as on a violin; what is left are the soft knocks of a bow that is set down again and again), enough does (80 %: above -30 dB)', low.db < mid.db - 15 && mid.db > -30, `${low.db.toFixed(0)} / ${mid.db.toFixed(0)} dB`);
  const slow = run({ ...still, auto: 1, pressure: 1, speed: 0.04, grip: 2.2 }, 25, { seed: 5 }), fast = run({ ...still, auto: 1, pressure: 1, speed: 0.8, grip: 2.2 }, 25, { seed: 5 });
  check('a slow bow sticks part of the time (the stick branch is taken in more than 0.5 % of the samples), a fast one hardly ever', lastMeter(slow.p).stick > 0.005 && lastMeter(fast.p).stick < lastMeter(slow.p).stick, `${(100 * lastMeter(slow.p).stick).toFixed(1)} % vs ${(100 * lastMeter(fast.p).stick).toFixed(1)} %`);
  const pw = rr => { let s = 0, c = 0; for (let i = 15 * SR; i < rr.L.length; i += 4) { s += rr.L[i] * rr.L[i]; c++; } return s / c; };
  const cl = x => x.toFixed(2); const rr0 = run({ ...still, auto: 1, pressure: 0.8, rough: 0 }, 25, { seed: 5 }), rr1 = run({ ...still, auto: 1, pressure: 0.8, rough: 1 }, 25, { seed: 5 });
  const sf = (r, a, b) => { const m = spec(r.L, 20 * SR, 16384); let hi = 0, all = 0; for (let k = 1; k < m.length; k++) { const f = k * SR / 16384; all += m[k] * m[k]; if (f > 3000) hi += m[k] * m[k]; } return hi / all; };
  check('ROUGH adds noise to the friction: at least twice the share of the energy above 3 kHz of a clean bow', sf(rr1) > sf(rr0) * 2, `${(100 * sf(rr0)).toFixed(1)} % -> ${(100 * sf(rr1)).toFixed(1)} %`);
}

// ===== 5. contacts: fingers and the player =====
{
  const bowMsg = (id, kind, x, y) => p => p.port.onmessage({ data: { type: 'bow', id, kind, x, y } });
  const r = run({ ...still, pressure: 0.9, grip: 2 }, 24, { seed: 5, at: [[1, bowMsg(7, 'down', 0.3, 0.6)], [2, bowMsg(7, 'move', 0.32, 0.62)], [3, bowMsg(8, 'down', 0.7, 0.3)], [13, bowMsg(7, 'up')], [14, bowMsg(8, 'up')]] });
  const m1 = meterAt(r, 2.5), m2 = meterAt(r, 5), m3 = meterAt(r, 16);
  check('a finger puts a bow on the plate where it lands (contact 1, near x 0.32, y 0.62), a second finger takes contact 2, and both lift when they let go', m1.cOn[1] === 1 && Math.abs(m1.cx[1] - 0.32) < 0.02 && Math.abs(m1.cy[1] - 0.62) < 0.02 && m2.cOn[2] === 1 && Math.abs(m2.cx[2] - 0.7) < 0.02 && m3.cOn[1] === 0 && m3.cOn[2] === 0, JSON.stringify({ a: m1.cOn, b: m2.cOn, c: m3.cOn }));
  check('a plate with only fingers is silent without them and sings with them', db(rms(r.L, 9 * SR, 12 * SR)) > db(rms(r.L, 20 * SR, 24 * SR)) + 15, `${db(rms(r.L, 9 * SR, 12 * SR)).toFixed(0)} dB with, ${db(rms(r.L, 20 * SR, 24 * SR)).toFixed(0)} dB without`);
  const au = run({ pressure: 0.6, weather: 0 }, 60, { seed: 5 }), xs = au.p.posted.filter(x => x.type === 'meter').map(x => x.cx[0]);
  check('the player wanders over the plate (contact 0 moves by more than 0.2 across a minute)', Math.max(...xs) - Math.min(...xs) > 0.2, `${(Math.max(...xs) - Math.min(...xs)).toFixed(2)}`);
  const dead = run({ auto: 1, grip: 1, rough: 0, regulate: 0, weather: 0 }, 30, { seed: 5 });
  check('a bow that finds nothing to sing looks for a place that sounds: it hops (at least 3 hops in 30 s on a plate that cannot sing)', lastMeter(dead.p).hops >= 3, `${lastMeter(dead.p).hops} hops`);
  const mo = run({ auto: 0, regulate: 0, rough: 0, weather: 0 }, 6), off = lastMeter(mo.p);
  check('PLAYER 0: contact 0 is off', off.cOn[0] === 0, JSON.stringify(off.cOn));
  const st = run({ ...still }, 6, { at: [[2, p => p.port.onmessage({ data: { type: 'strike', x: 0.4, y: 0.3, amp: 1 } })]] }), pre = rms(st.L, 1.5 * SR, 1.99 * SR), post = rms(st.L, 2.05 * SR, 2.3 * SR);
  check('a strike rings the plate (the level jumps by at least 30 dB over the quiet before it)', db(post) > db(pre) + 30, `${db(pre).toFixed(0)} -> ${db(post).toFixed(0)} dB`);
}

// ===== 6. the regulator =====
{
  const lv = (params) => { const r = run({ auto: 1, rough: 0, weather: 0, ...params }, 40, { seed: 5 }); return db(rms(r.L, 30 * SR, 40 * SR)); };
  const lo0 = lv({ pressure: 0.15, regulate: 0 }), lo1 = lv({ pressure: 0.15, regulate: 1 }), mean3 = pr => [5, 6, 7].map(sd => { const r = run({ auto: 1, rough: 0, weather: 0, ...pr }, 45, { seed: sd }); return db(rms(r.L, 35 * SR, 45 * SR)); }).reduce((a, b) => a + b) / 3, hi0 = mean3({ pressure: 0.9, regulate: 0 }), hi1 = mean3({ pressure: 0.9, regulate: 1 });
  check('REGULATE leans the bow in when the plate is quiet (a bow that is too weak to sing starts to: louder by at least 8 dB than the knocks of the unregulated one)', lo1 > lo0 + 8, `${lo0.toFixed(0)} -> ${lo1.toFixed(0)} dB`);
  check('... and it evens things out: a weak and a hard bow end up closer together than without it', Math.abs(hi1 - lo1) < Math.abs(hi0 - lo0), `unregulated ${lo0.toFixed(0)} / ${hi0.toFixed(0)} dB, regulated ${lo1.toFixed(0)} / ${hi1.toFixed(0)} dB`);
}

// ===== 7. the material moves: weather, LFOs, tension, radiation =====
{
  const fs = (params, secs, idx) => run({ ...still, ...params }, secs).p.posted.filter(x => x.type === 'meter').map(x => x.f[idx]);
  const w1 = fs({ weather: 1, tension: 0 }, 90, 0), w0 = fs({ weather: 0, tension: 0 }, 90, 0), s1 = fs({ weather: 1, tension: 0 }, 90, 12), s0 = fs({ weather: 0, tension: 0 }, 90, 12), ratio = (a, b) => a.map((v, i) => v / b[i]);
  const spread = a => Math.max(...a) / Math.min(...a);
  check('WEATHER 100 % lets the size of the plate wander by at least 8 %, and the shape (the ratio of two modes) by at least 5 %; at 0 neither moves', spread(w1) > 1.08 && spread(ratio(s1, w1)) > 1.05 && spread(w0) < 1.001 && spread(ratio(s0, w0)) < 1.001, `size ${spread(w1).toFixed(3)} x, shape ${spread(ratio(s1, w1)).toFixed(3)} x`);
  const l2 = fs({ l2depth: 1, l2rate: 0.5 }, 12, 0), l1 = fs({ l1depth: 1, l1rate: 0.5 }, 12, 12), l1b = fs({ l1depth: 1, l1rate: 0.5 }, 12, 0), rr = ratio(l1, l1b);
  check('LFO 2 moves the size by an octave at full depth, LFO 1 the stiffness (the ratio of two modes changes by at least 1.5 x)', spread(l2) > 1.9 && spread(rr) > 1.5, `size ${spread(l2).toFixed(2)} x, shape ${spread(rr).toFixed(2)} x`);
  const loud = run({ ...still, regen: 1.3, tension: 1, pressure: 0, damp: 2 }, 20), quiet = run({ ...still, regen: 1.3, tension: 0, pressure: 0, damp: 2 }, 20);
  check('TENSION: a loud plate rises in pitch (the lowest mode is at least 2 % higher with TENSION 100 % than at 0 when it sings)', lastMeter(loud.p).f[0] > lastMeter(quiet.p).f[0] * 1.02, `${lastMeter(quiet.p).f[0].toFixed(1)} -> ${lastMeter(loud.p).f[0].toFixed(1)} Hz`);
  const cen = r => { const m = spec(r.L, 12 * SR, 16384); let A = 0, B = 0; for (let k = 1; k < m.length; k++) { A += m[k] * k * SR / 16384; B += m[k]; } return A / B; };
  const r0 = run({ auto: 1, pressure: 0.8, radiate: 0, weather: 0, regulate: 0 }, 20, { seed: 5 }), r1 = run({ auto: 1, pressure: 0.8, radiate: 1, weather: 0, regulate: 0 }, 20, { seed: 5 });
  check('RADIATE 100 % is brighter than 0 (the spectral centre is at least 20 % higher)', cen(r1) > cen(r0) * 1.2, `${cen(r0).toFixed(0)} -> ${cen(r1).toFixed(0)} Hz`);
  const wd0 = run({ auto: 1, pressure: 0.8, width: 0, weather: 0 }, 14, { seed: 5 }), wd1 = run({ auto: 1, pressure: 0.8, width: 1, weather: 0 }, 14, { seed: 5 }); let dd = 0, ee = 0; for (let i = 8 * SR; i < 14 * SR; i++) { dd += (wd0.L[i] - wd1.L[i]) ** 2; ee += wd0.L[i] ** 2; }
  check('WIDTH moves the pickups: the left channel is not the same at 0 and at 100 % (the difference is at least 20 % of its level), and left and right differ', Math.sqrt(dd / ee) > 0.2 && Math.abs(rms(wd1.L, 8 * SR, 14 * SR) - rms(wd1.R, 8 * SR, 14 * SR)) / rms(wd1.L, 8 * SR, 14 * SR) > 0.0005, `${(Math.sqrt(dd / ee)).toFixed(2)}`);
}

// ===== 8. it does not settle: three minutes with the defaults =====
{
  const r = run({}, 180, { seed: 31 }), early = windows(r.L, 8 * SR, 4 * SR, 4 * SR), late = windows(r.L.subarray(100 * SR), 0, 4 * SR, 4 * SR);
  const e = cv(early.r.slice(0, 15)) + cv(early.c.slice(0, 15)), l = cv(late.r) + cv(late.c), minDb = Math.min(...early.r, ...late.r);
  check('three minutes: the variation of level and tone colour in the last 80 s is at least 60 % of that in the first minute, and not below 0.2', l > 0.6 * e && l > 0.2, `${e.toFixed(2)} -> ${l.toFixed(2)}`);
  check('... and it is never silent: every 4 s window is above -55 dB', db(minDb) > -55, `quietest window ${db(minDb).toFixed(0)} dB`);
}

// ===== 9. every preset: alive for two and a half minutes, no holes, no overload =====
{
  const bad = [];
  for (const [name, pr] of Object.entries(PRESETS)) {
    const r = run(pr, 150, { seed: 41 }), w = windows(r.L, 10 * SR, 4 * SR, 4 * SR), mn = Math.min(...w.r), pk = peak(r.L);
    if (r.bad || db(mn) < -55 || pk > 0.9 || cv(w.r) + cv(w.c) < 0.12) bad.push(`${name}: min ${db(mn).toFixed(0)} dB, peak ${pk.toFixed(2)}, variation ${(cv(w.r) + cv(w.c)).toFixed(2)}`);
    info(`preset ${name.padEnd(17)} rms ${db(rms(r.L, 10 * SR, r.L.length)).toFixed(0)} dB, quietest window ${db(mn).toFixed(0)} dB, peak ${pk.toFixed(2)}, variation ${(cv(w.r) + cv(w.c)).toFixed(2)}`);
  }
  check('all presets: no silent holes (every 4 s window above -55 dB), peak below 0.9, level and colour keep varying', bad.length === 0, bad.join('; '));
}

// ===== 10. the limiter, the odd corners, the reset =====
{
  const worst = [{ pressure: 1, regen: 1.5, damp: 30, grip: 3, speed: 1, level: 1, radiate: 1, rough: 1 }, { pitch: 1500, stiff: 3, density: 48, regen: 1.5, level: 1, radiate: 1, pressure: 1 }, { pitch: 30, aspect: 0.4, damp: 0.1, regen: 1.5, pressure: 1, level: 1, tension: 1 }];
  let pk = 0, bad = 0; for (const w of worst) { const r = run(w, 25, { seed: 7 }); pk = Math.max(pk, peak(r.L)); bad += r.bad; }
  check('worst cases (REGEN 150 %, GRIP 3, PRESSURE 100 %, LEVEL 100 %, RADIATE 100 %): finite, and the limiter keeps the peak below 0.97', bad === 0 && pk < 0.97, `peak ${pk.toFixed(3)}`);
  const ranges = { pressure: [0, 1], speed: [0.02, 1], grip: [1, 3], rough: [0, 1], pitch: [30, 1500], stiff: [0.5, 3], aspect: [0.4, 2.5], warp: [0, 1], density: [8, 48], damp: [0.1, 30], regen: [0, 1.5], tension: [0, 1], radiate: [0, 1], auto: [0, 1], regulate: [0, 1], weather: [0, 1], width: [0, 1], tone: [800, 16000], level: [0, 1] };
  let cbad = 0, cp = 0; for (let i = 0; i < 20; i++) { const pr = {}; for (const k in ranges) pr[k] = Math.random() < 0.5 ? ranges[k][0] : ranges[k][1]; const r = run(pr, 8, { seed: 2 }); cbad += r.bad; cp = Math.max(cp, peak(r.L)); }
  check('20 corner settings (every fader at one end): finite, peak below 0.97', cbad === 0 && cp < 0.97, `peak ${cp.toFixed(3)}`);
  const rr = run({}, 14, { at: [[6, p => p.port.onmessage({ data: { type: 'reset' } })]] }), pre = rms(rr.L, 5 * SR, 5.9 * SR); let dip = 1e9;
  for (let t = 6 * SR; t < 6.05 * SR; t += 24) dip = Math.min(dip, rms(rr.L, t, t + 24));
  let jump = 0, ref = 0; for (let i = 6 * SR; i < 7 * SR; i++) jump = Math.max(jump, Math.abs(rr.L[i] - rr.L[i - 1])); for (let i = 4 * SR; i < 5 * SR; i++) ref = Math.max(ref, Math.abs(rr.L[i] - rr.L[i - 1]));
  check('RESET fades out in 6 ms (the level dips below a third), stills the plate, fades in again, and nothing clicks (the largest step is no larger than in the second before)', dip < pre / 3 && rms(rr.L, 12 * SR, 14 * SR) > 1e-4 && jump < 1.3 * ref, `dip ${(dip / pre).toFixed(2)} x, step ${jump.toFixed(3)} (before: ${ref.toFixed(3)})`);
}

// ===== 11. CPU =====
{
  const per = pr => { const p = worklet(SR, pr); const o1 = new Float32Array(128), o2 = new Float32Array(128); for (let i = 0; i < 1500; i++) p.process([[]], [[o1, o2]]); let best = 1e9; for (let r = 0; r < 5; r++) { const t0 = process.hrtime.bigint(); for (let i = 0; i < 300; i++) p.process([[]], [[o1, o2]]); best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6 / 300); } return best; };
  const budget = 128 / SR * 1000, a = per({}), b = per({ density: 48, regen: 1.3 }), c = per({ density: 12 });
  info(`CPU: 32 modes ${(100 * a / budget).toFixed(0)} %, 48 modes that grow ${(100 * b / budget).toFixed(0)} %, 12 modes ${(100 * c / budget).toFixed(0)} % of one core in Node on this machine`);
  check('CPU: the defaults take under 30 % of the audio budget in Node, 48 modes under 45 %', a < 0.3 * budget && b < 0.45 * budget, `${(100 * a / budget).toFixed(0)} % / ${(100 * b / budget).toFixed(0)} %`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
