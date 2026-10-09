// DSP tests for knot-v0_5.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// Rules of the knot of coupled oscillators: a lone oscillator is a clean sine at its pitch, the ratio sets, FM and ring modulation add sidebands, LOCK pulls pairs into step,
// ADAPT makes the links breathe, WANDER moves the pitches, FOLD and SKEW add overtones, COUNT, shake, reset, LFOs (FM at audio rate), extremes, cost.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../knot-v0_5.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);
function worklet(sr = SR) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Int32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const p = new reg.knot(); p.posted = posted; return p;
}
const send = (p, m) => p.port.onmessage({ data: m });
const touch = (kind, x, y, id = 1, vel = 1) => p => send(p, { type: 'touch', id, kind, x, y, vel });
function run(params, seconds, events = [], opts = {}) {
  const sr = opts.sr || SR, p = worklet(sr); send(p, { type: 'seed', seed: opts.seed || 7 }); send(p, { type: 'params', params: { weather: 0, clean: 0, ...params }, immediate: true });   // WEATHER is off and CLEAN is at its raw end unless a test asks for it
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), blk = 128, oL = new Float32Array(blk), oR = new Float32Array(blk), z = new Float32Array(blk); let bad = 0, ei = 0;
  const ev = events.slice().sort((a, b) => a[0] - b[0]); const t0 = process.hrtime.bigint();
  for (let s = 0; s < n; s += blk) {
    while (ei < ev.length && ev[ei][0] * sr < s + blk) { ev[ei][1](p); ei++; }
    p.process([[z, z]], [[oL, oR]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = oL[i]; R[s + i] = oR[i]; if (!isFinite(oL[i]) || !isFinite(oR[i])) bad++; }
  }
  return { L, R, p, bad, ms: Number(process.hrtime.bigint() - t0) / 1e6, meters: p.posted.filter(x => x.type === 'meter') };
}
const peak = a => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; };
const rms = (a, s, e) => { s = Math.floor(s); e = Math.floor(e); let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const db = x => 20 * Math.log10(x + 1e-12);
// power spectrum of 16384 samples from `from` (Hann), bin width SR / 16384
function spectrum(a, from, N = 16384) {
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = (a[from + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= N; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  const p = new Float64Array(N / 2); for (let i = 0; i < N / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i]; return p;
}
const bin = f => f * 16384 / SR;
const band = (p, f, rel = 0.03) => { let s = 0; for (let i = Math.max(1, Math.floor(bin(f * (1 - rel)))); i <= Math.ceil(bin(f * (1 + rel))); i++) s += p[i]; return s; };
const peakHz = (p, lo = 30, hi = 12000) => { let m = 0, k = 0; for (let i = Math.floor(bin(lo)); i < Math.ceil(bin(hi)); i++) if (p[i] > m) { m = p[i]; k = i; } return k * SR / 16384; };

const zc = (a, from, len) => { let c = 0, first = -1, last = -1; for (let i = Math.floor(from) + 1; i < Math.floor(from + len); i++) if (a[i - 1] <= 0 && a[i] > 0) { if (first < 0) first = i; last = i; c++; } return c > 1 ? (c - 1) * SR / (last - first) : 0; };
const plain = { count: 1, lock: 0, mod: 0, ring: 0, self: 0, fold: 0, skew: 0, adapt: 0, wander: 0, detune: 0, set: 0, width: 0, tone: 16000 };
const meterAt = (r, t, secs) => r.meters[Math.min(r.meters.length - 1, Math.floor(r.meters.length * t / secs))];

// ===== 1. it sounds and stays bounded =====
{
  const r = run({}, 20);
  check('defaults: the knot sounds from the first moment (> -30 dB rms), bounded and finite', db(rms(r.L, SR * 10, SR * 20)) > -30 && r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `${db(rms(r.L, SR * 10, SR * 20)).toFixed(1)} dB, peak ${Math.max(peak(r.L), peak(r.R)).toFixed(2)}`);
  const m = r.meters[r.meters.length - 1]; check('the meter reports six phases, six waves and the 6 x 6 grip and lock tables', m.ph.length === 6 && m.x.length === 6 && m.g.length === 36 && m.rho.length === 36, '');
}

// ===== 2. a lone oscillator, the ratio sets =====
{
  const sp = (params, secs = 4) => spectrum(run(params, secs).L, Math.floor(SR * (secs - 1.4)));
  const a = sp({ ...plain, pitch: 110 }), hzPk = peakHz(a, 30, 3000);
  const zc0 = zc(run({ ...plain, pitch: 110 }, 4).L, SR * 2, SR * 2);
  check('one oscillator alone is a clean sine at the PITCH (110 Hz within 0.1 %, the second and third harmonic more than 50 dB down)', Math.abs(zc0 / 110 - 1) < 0.001 && band(a, 220, 0.02) < 1e-5 * band(a, 110, 0.02) && band(a, 330, 0.02) < 1e-5 * band(a, 110, 0.02), `${zc0.toFixed(2)} Hz`);
  const f0 = 110, lv = (p, k) => 10 * Math.log10(band(p, f0 * k, 0.01) + 1e-30);
  const harm = sp({ ...plain, count: 6, set: 1 }), fifths = sp({ ...plain, count: 6, set: 2 }), inh = sp({ ...plain, count: 6, set: 3 }), uni = sp({ ...plain, count: 6, set: 0 });
  check('HARMONIC: six peaks at 1 ... 6 x the pitch', [1, 2, 3, 4, 5, 6].every(k => lv(harm, k) > lv(harm, 1) - 12), [1, 2, 3, 4, 5, 6].map(k => lv(harm, k).toFixed(0)).join(' / ') + ' dB');
  check('FIFTHS: peaks at 1.5 x and 2.25 x, nothing at 2 x or 3 x', lv(fifths, 1.5) > lv(fifths, 2) + 25 && lv(fifths, 2.25) > lv(fifths, 3) + 25, `${lv(fifths, 1.5).toFixed(0)} vs ${lv(fifths, 2).toFixed(0)} dB`);
  check('INHARM: peaks at 1.414 x and 2.236 x (square roots), nothing at 1.5 x', lv(inh, 1.4142) > lv(inh, 1.5) + 25 && lv(inh, 2.2361) > lv(inh, 2) + 25, `${lv(inh, 1.4142).toFixed(0)} vs ${lv(inh, 1.5).toFixed(0)} dB`);
  check('UNISON: all six sit on the pitch (a peak at 1 x, nothing at 1.5 x, 2 x or 3 x)', lv(uni, 1) > lv(uni, 1.5) + 40 && lv(uni, 1) > lv(uni, 2) + 40 && lv(uni, 1) > lv(uni, 3) + 40, `${lv(uni, 1).toFixed(0)} dB`);
  const dt = sp({ ...plain, count: 6, set: 0, detune: 1 }); check('DETUNE 100 % moves the six apart by up to 4 % (energy at 1.04 x and 0.96 x the pitch)', lv(dt, 1.04) > lv(dt, 1.2) + 20 && lv(dt, 0.96) > lv(dt, 0.8) + 20, `${lv(dt, 1.04).toFixed(0)} / ${lv(dt, 0.96).toFixed(0)} dB`);
  const p2 = sp({ ...plain, pitch: 220 }); const zc1 = zc(run({ ...plain, pitch: 220 }, 4).L, SR * 2, SR * 2); check('PITCH 220 doubles the pitch', Math.abs(zc1 / zc0 - 2) < 0.002, `${zc0.toFixed(2)} -> ${zc1.toFixed(2)} Hz`);
  const cnt = run({ ...plain, count: 3, set: 1 }, 3).meters.pop(); check('COUNT 3: oscillators 4 to 6 are silent', cnt.x.slice(3).every(v => v === 0) && cnt.x.slice(0, 3).some(v => Math.abs(v) > 0.01), cnt.x.map(v => v.toFixed(2)).join(' '));
}

// ===== 3. modulation: FM, ring, self, fold, skew =====
{
  const sp = params => spectrum(run({ ...plain, count: 6, set: 3, ...params }, 4).L, Math.floor(SR * 2.6));
  const wide = p => { const mx = Math.max(...p); let n = 0; for (let i = 2; i < p.length; i++) if (p[i] > mx * 1e-5) n++; return n; };
  const m0 = sp({ mod: 0 }), m3 = sp({ mod: 3 });
  check('MOD 3 (FM) makes sidebands: many more spectral lines than MOD 0 (more than 5 x as many bins within 50 dB of the peak)', wide(m3) > 5 * wide(m0), `${wide(m0)} -> ${wide(m3)}`);
  const r0 = sp({ ring: 0 }), r1 = sp({ ring: 1 }); let d = 0, e = 0; for (let i = 0; i < r0.length; i++) { d += Math.abs(Math.sqrt(r1[i]) - Math.sqrt(r0[i])); e += Math.sqrt(r0[i]); }
  check('RING 100 % changes the spectrum (sum and difference tones: the spectra differ by more than 30 %)', d / e > 0.3, `${(100 * d / e).toFixed(0)} %`);
  const s0 = sp({ self: 0 }), s1 = sp({ self: 1 }); check('SELF 100 % adds sidebands too', wide(s1) > 3 * wide(s0), `${wide(s0)} -> ${wide(s1)}`);
  const one = params => spectrum(run({ ...plain, ...params }, 4).L, Math.floor(SR * 2.6)), f0 = 110;
  const f1 = one({ fold: 1 }), f0s = one({ fold: 0 });
  check('FOLD 100 %: a lone oscillator gets odd overtones (3 x the pitch less than 40 dB down), without FOLD none', band(f1, 3 * f0, 0.02) > 1e-4 * band(f1, f0, 0.02) && band(f0s, 3 * f0, 0.02) < 1e-6 * band(f0s, f0, 0.02), '');
  const k1 = one({ fold: 1, skew: 1 }); check('SKEW adds even overtones (2 x) to the folded wave', band(k1, 2 * f0, 0.02) > 100 * band(f1, 2 * f0, 0.02) + 1e-12, `${(10 * Math.log10(band(k1, 2 * f0, 0.02) / band(k1, f0, 0.02))).toFixed(0)} dB vs ${(10 * Math.log10(band(f1, 2 * f0, 0.02) / band(f1, f0, 0.02))).toFixed(0)} dB`);
}

// ===== 4. LOCK and ADAPT =====
{
  const link = (params, secs, t0) => { const r = run({ count: 2, set: 0, detune: 1, mod: 0, ring: 0, self: 0, fold: 0, wander: 0, links: 1, twist: 0, adapt: 0, ...params }, secs); let s = 0, n = 0; for (const m of r.meters) { if (m === undefined) continue; } const ms = r.meters.slice(Math.floor(r.meters.length * t0 / secs)); for (const m of ms) { s += Math.abs(m.rho[1 * 6 + 0]); n++; } return s / n; };
  const lo = link({ lock: 0 }, 10, 4), hi = link({ lock: 0.8 }, 10, 4);
  check('LOCK: two oscillators 4 % apart beat against each other at LOCK 0 (mean |coherence| below 0.5) and fall into step at LOCK 80 % (above 0.9)', lo < 0.5 && hi > 0.9, `${lo.toFixed(2)} -> ${hi.toFixed(2)}`);
  const sprd = a => Math.max(...a) - Math.min(...a);
  const gser = params => { const r = run({ set: 3, detune: 0.5, lock: 0.5, ...params }, 80); const ms = r.meters, out = []; for (let t = 20; t < 80; t += 1) { const m = ms[Math.min(ms.length - 1, Math.floor(ms.length * t / 80))]; let s = 0; for (let i = 0; i < 6; i++) s += m.g[i * 6 + (i + 5) % 6]; out.push(s / 6); } return out; };
  const g0 = gser({ adapt: 0 }), g1 = gser({ adapt: 1, evolve: 8 });
  check('ADAPT 0: the links keep their full grip (1.0); ADAPT 100 %: they loosen by more than 30 %', sprd(g0) < 1e-6 && Math.max(...g0) > 0.999 && Math.min(...g1) < 0.7, `${Math.min(...g0).toFixed(2)} ... ${Math.max(...g0).toFixed(2)} vs ${Math.min(...g1).toFixed(2)} ... ${Math.max(...g1).toFixed(2)}`);
  check('... and the grip keeps moving (changes by more than 0.05 within 60 s, not stuck at a fixed value)', sprd(g1) > 0.05, `range ${sprd(g1).toFixed(2)}`);
  const fast = gser({ adapt: 1, evolve: 3 }), slow = gser({ adapt: 1, evolve: 20 }); const turns = a => { let t = 0; for (let i = 2; i < a.length; i++) if ((a[i] - a[i - 1]) * (a[i - 1] - a[i - 2]) < 0 && Math.abs(a[i] - a[i - 1]) > 0.002) t++; return t; };
  info(`EVOLVE 3 s: ${turns(fast)} turning points of the grip in 40 s, EVOLVE 20 s: ${turns(slow)}`);
}

// ===== 5. WANDER, shake, reset =====
{
  const lo = [0, 1, 2, 3].map(i => zc(run({ ...plain, wander: 0 }, 9, [], { seed: 10 + i }).L, SR * 6, SR * 3)), hi = [0, 1, 2, 3].map(i => zc(run({ ...plain, wander: 1 }, 9, [], { seed: 10 + i }).L, SR * 6, SR * 3));
  const spread = a => Math.max(...a) - Math.min(...a);
  check('WANDER 100 %: the pitch differs from run to run (more than 0.5 Hz), at 0 it is exactly the same every time', spread(hi) > 0.5 && spread(lo) < 0.01, `${spread(hi).toFixed(2)} Hz vs ${spread(lo).toFixed(3)} Hz`);
}
{
  const params = { set: 3, detune: 0.5, lock: 0.8, adapt: 0.3 };
  const r = run(params, 12, [[6, p => send(p, { type: 'shake' })]]);
  const lk = t => { const m = meterAt(r, t, 12); let s = 0; for (let i = 0; i < 6; i++) s += Math.abs(m.rho[i * 6 + (i + 5) % 6]); return s / 6; };
  const t = SR * 6; let mx = 0, rf = 0; for (let i = t; i < t + 2400; i++) mx = Math.max(mx, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); for (let i = t - 24000; i < t; i++) rf = Math.max(rf, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2]));
  check('SHAKE lets the links go (the sound stays finite and bounded) without a click (second difference in the 50 ms around it at most 3 x that of the sound before)', r.bad === 0 && mx <= 3 * rf + 1e-9, `${mx.toExponential(1)} vs ${rf.toExponential(1)}`);
  info(`coherence of the links before shake ${lk(5.5).toFixed(2)}, 1 s after ${lk(7).toFixed(2)}, 5 s after ${lk(11.5).toFixed(2)}`);
}
{
  const r = run({}, 12, [[6, p => send(p, { type: 'reset' })]]), t = SR * 6;
  let mx = 0, rf = 0; for (let i = t; i < t + 400; i++) mx = Math.max(mx, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); for (let i = t - 4000; i < t; i++) rf = Math.max(rf, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2]));
  check('RESET does not click (second difference around the fade at most twice that of the sound before)', mx <= 2 * rf + 1e-9, `${mx.toExponential(1)} vs ${rf.toExponential(1)}`);
  check('after RESET the knot sounds again at once', db(rms(r.L, SR * 8, SR * 12)) > -30, '');
}

// ===== 6. LFOs, extremes, cost =====
{
  const slow = run({ l1depth: 1, l1rate: 0.4, l2depth: 0.5, l2rate: 0.3 }, 12);
  check('LFOs at slow rate: bounded, finite; the meter shows the moving MOD and pitch', slow.bad === 0 && peak(slow.L) <= 1.0001 && slow.meters.some(x => x.lm !== 1) && slow.meters.some(x => x.pm !== 1), '');
  const au = run({ l1depth: 1, l1rate: 200, l2depth: 0.4, l2rate: 400 }, 6); check('LFOs at audio rate (200 Hz, 400 Hz): bounded and finite', au.bad === 0 && peak(au.L) <= 1.0001, `peak ${peak(au.L).toFixed(2)}`);
  const sp = params => spectrum(run({ ...plain, ...params }, 4).L, Math.floor(SR * 2.6)), f0 = 110;
  const fm = sp({ l2depth: 0.05, l2rate: 40 }), nofm = sp({ l2depth: 0 });
  check('LFO 2 at audio rate (40 Hz) is FM: sidebands at the pitch +- 40 Hz, not there without it', band(fm, f0 + 40, 0.01) > 100 * band(nofm, f0 + 40, 0.01) + 1e-9, `${(10 * Math.log10(band(fm, f0 + 40, 0.01))).toFixed(0)} dB vs ${(10 * Math.log10(band(nofm, f0 + 40, 0.01) + 1e-30)).toFixed(0)} dB`);
  check('LFO depth 0: the factors in the meter stay 1', run({}, 2).meters.every(x => x.lm === 1 && x.pm === 1), '');
}
{
  let bad = 0, big = 0, cases = 0; const rnd = (() => { let s = 5; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const ranges = { pitch: [20, 1000], set: [0, 3], detune: [0, 1], count: [2, 6], lock: [0, 1.2], mod: [0, 8], ring: [0, 1], self: [0, 1], links: [0, 2], twist: [0, 1], fold: [0, 1], skew: [-1, 1], adapt: [0, 1], evolve: [0.5, 60], wander: [0, 1], width: [0, 1], tone: [800, 16000], level: [0, 1], l1depth: [0, 1], l2depth: [0, 1], l1rate: [0.002, 1000], l2rate: [0.002, 1000] };
  for (let i = 0; i < 24; i++) {
    const prm = {}; for (const k in ranges) { const [a, b] = ranges[k]; const u = i < 8 ? (rnd() < 0.5 ? 0 : 1) : rnd(); prm[k] = a + (b - a) * u; if (k === 'links') prm[k] = Math.round(prm[k]); }
    const sr = i % 3 === 0 ? 44100 : (i % 3 === 1 ? 96000 : 48000);
    const r = run(prm, 4, [], { sr }); cases++; bad += r.bad; if (peak(r.L) > 1.0001 || peak(r.R) > 1.0001) big++;
  }
  check(`${cases} random and corner settings at 44.1 / 48 / 96 kHz: no NaN or infinity, never above the limiter`, bad === 0 && big === 0, `${bad} bad samples, ${big} too loud`);
  const hot = { lock: 1.2, mod: 8, ring: 1, self: 1, fold: 1, skew: 1, links: 2, adapt: 1, level: 1 };
  const r = run(hot, 8, [[4, p => send(p, { type: 'params', params: { ...hot, lock: 0, mod: 0, ring: 0, self: 0, fold: 0, links: 0 }, immediate: false })]]);
  check('everything wide open, then closed again in one go: bounded, finite', r.bad === 0 && peak(r.L) <= 1.0001, `peak ${peak(r.L).toFixed(2)}`);
}
{
  const r = run({ links: 2, lock: 0.6, mod: 3, ring: 0.5, fold: 0.5, l1depth: 1, l1rate: 3, l2depth: 0.3, l2rate: 220 }, 6), per = r.ms / (6 * SR / 128), budget = 128 / SR * 1000;
  info(`CPU: ${per.toFixed(3)} ms per 128-sample block at 48 kHz (budget ${budget.toFixed(2)} ms) = ${(100 * per / budget).toFixed(0)} % of one core in Node on this machine (six oscillators, everyone hears everyone, all modulation on)`);
  check('CPU: under 70 % of the audio budget in Node with everything on and everyone hearing everyone (the default ring costs about half of that)', per < 0.7 * budget, `${(100 * per / budget).toFixed(0)} %`);
}
// ===== WEATHER: slow random drifts so the sound never settles =====
{
  const SRW = 48000;
  const cen = (a, o) => { const n = 8192, re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) re[i] = a[o + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let l = 2; l <= n; l <<= 1) { const w = -2 * Math.PI / l; for (let i = 0; i < n; i += l) for (let k = 0; k < l / 2; k++) { const c = Math.cos(w * k), s = Math.sin(w * k), xr = re[i + k + l / 2] * c - im[i + k + l / 2] * s, xi = re[i + k + l / 2] * s + im[i + k + l / 2] * c; re[i + k + l / 2] = re[i + k] - xr; im[i + k + l / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
    let A = 0, B = 0; for (let k = 1; k < n / 2; k++) { const m = Math.hypot(re[k], im[k]); A += m * k * SRW / n; B += m; } return B > 0 ? A / B : 0; };
  const spread = a => { let rm = [], cn = []; for (let w = 4 * SRW; w + 4 * SRW <= a.length; w += 4 * SRW) { let s = 0; for (let i = w; i < w + 4 * SRW; i++) s += a[i] * a[i]; rm.push(Math.sqrt(s / (4 * SRW))); cn.push(cen(a, w + 2 * SRW - 4096)); }
    const cv = v => { const m = v.reduce((x, y) => x + y, 0) / v.length; return m > 0 ? Math.sqrt(v.reduce((x, y) => x + (y - m) * (y - m), 0) / v.length) / m : 0; }; return { rms: cv(rm), cen: cv(cn), level: rm.reduce((x, y) => x + y, 0) / rm.length }; };
  const on = { set: 3, mod: 5, self: 0.5, fold: 0.6, ring: 0.6, l2rate: 90, l2depth: 0.12, lock: 0.2, tone: 6000, level: 1, weather: 0.7 }, off = Object.assign({}, on, { weather: 0 });
  const a = spread(run(on, 44).L), b = spread(run(off, 44).L);
  check('WEATHER 0 keeps the sound where it is, WEATHER on moves it (variation of level plus tone colour over 40 s at least 1.5 x as large)', (a.rms + a.cen) > 1.5 * (b.rms + b.cen), `${(b.rms + b.cen).toFixed(3)} -> ${(a.rms + a.cen).toFixed(3)}`);
  check('... and it stays alive: the level in the last minute is within 12 dB of the one without WEATHER', a.level > 0.25 * b.level && a.level < 4 * b.level, `${(20 * Math.log10(a.level)).toFixed(0)} dB vs ${(20 * Math.log10(b.level)).toFixed(0)} dB`);
  const hard = run({ weather: 1 }, 30).L; let pk = 0, bad = 0; for (const v of hard) { if (!isFinite(v)) bad++; if (Math.abs(v) > pk) pk = Math.abs(v); }
  check('WEATHER 100 %: finite, and below 0 dB (peak under 0.97)', bad === 0 && pk < 0.97, `peak ${pk.toFixed(2)}`);
}
// ===== CLEAN: the modulation only hears the first overtones of the other waves =====
{
  const hf = L => { const n = 16384, re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) re[i] = L[SR * 6 + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let l = 2; l <= n; l <<= 1) { const w = -2 * Math.PI / l; for (let i = 0; i < n; i += l) for (let k = 0; k < l / 2; k++) { const c = Math.cos(w * k), s2 = Math.sin(w * k), xr = re[i + k + l / 2] * c - im[i + k + l / 2] * s2, xi = re[i + k + l / 2] * s2 + im[i + k + l / 2] * c; re[i + k + l / 2] = re[i + k] - xr; im[i + k + l / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
    let hi = 0, all = 0; for (let k = 1; k < n / 2; k++) { const v = re[k] * re[k] + im[k] * im[k]; all += v; if (k * SR / n > 3000) hi += v; } return hi / all; };
  const rough = { set: 3, detune: 0.5, lock: 0.5, mod: 4, ring: 0.3, self: 0.4, fold: 0.2, pitch: 150, tone: 16000 };
  const raw = hf(run({ ...rough, clean: 0 }, 12).L), cl = hf(run({ ...rough, clean: 1 }, 12).L), mid = hf(run({ ...rough, clean: 0.6 }, 12).L);
  check('CLEAN 100 % keeps at least 5 x less energy above 3 kHz than CLEAN 0 at a rough setting (MOD 4, SELF 40 %)', cl * 5 < raw, `${(100 * raw).toFixed(1)} % -> ${(100 * cl).toFixed(1)} %`);
  check('... and the default CLEAN 60 % lies in between', mid < raw && mid > cl * 0.8, `${(100 * mid).toFixed(1)} %`);
  const plain = run({ clean: 1, mod: 0, self: 0, ring: 0, fold: 0 }, 6).L; let pk = 0; for (const v of plain) if (Math.abs(v) > pk) pk = Math.abs(v);
  check('CLEAN does not touch a sound without MOD or SELF (still sounds)', pk > 0.05, `peak ${pk.toFixed(2)}`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
