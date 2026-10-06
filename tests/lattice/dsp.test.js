// DSP tests for lattice-v0_2.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// Rules of the cellular resonator space: it starts from the hiss, each cell sits at its mode, coupling and the slow things (tiring, rivalry, pull, drift) make it develop,
// a touch strikes the cells near it, CELLS and the topologies, reset, LFOs, extremes at other sample rates, cost.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../lattice-v0_2.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);
function worklet(sr = SR) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Int32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const p = new reg.lattice(); p.posted = posted; return p;
}
const send = (p, m) => p.port.onmessage({ data: m });
const touch = (kind, x, y, id = 1, vel = 1) => p => send(p, { type: 'touch', id, kind, x, y, vel });
function run(params, seconds, events = [], opts = {}) {
  const sr = opts.sr || SR, p = worklet(sr); send(p, { type: 'seed', seed: opts.seed || 7 }); send(p, { type: 'params', params, immediate: true });
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

// the meter's cell energies (normalised, 0 ... 1.5) at times from the start
const envAt = (r, t) => { const ms = r.meters; return ms[Math.min(ms.length - 1, Math.floor(ms.length * t / r.secs))].e; };
const quiet = { regen: 0.6, hiss: 0 };   // below the singing threshold and no noise: silent until touched
const one = { shimmer: 0, size: 1, couple: 0, hiss: 1, focus: 60, drive: 1, regen: 1.6, fatigue: 0, rival: 0, pull: 0, drift: 0 };   // one cell that starts fast (a high Q at a low pitch takes many seconds to grow out of the hiss)

// ===== 1. it starts by itself and stays bounded =====
{
  const r = run({}, 20);
  check('defaults, no touch: the cells start by themselves from the hiss (> -35 dB rms after 10 s)', db(rms(r.L, SR * 10, SR * 20)) > -35, `${db(rms(r.L, SR * 10, SR * 20)).toFixed(1)} dB`);
  check('output bounded and finite', r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  const m = r.meters[r.meters.length - 1]; check('the meter reports 16 energies and 16 tirednesses', m.e.length === 16 && m.s.length === 16 && m.e.some(x => x > 0.2), `max ${Math.max(...m.e).toFixed(2)}`);
  const q = run(quiet, 4); check('regen 0.6 and no hiss: silent (< -100 dB)', db(rms(q.L, SR * 2, SR * 4)) < -100, `${db(rms(q.L, SR * 2, SR * 4)).toFixed(0)} dB`);
}

// ===== 2. every cell sits at its mode =====
{
  const f0 = 110, pk = (params, secs = 6) => { const r = run(params, secs); return spectrum(r.L, Math.floor(SR * (secs - 1.4))); };
  const a = pk({ ...one, pitch: f0 }), hzPk = peakHz(a, 30, 3000);
  check('one cell alone sings at the PITCH (110 Hz within 2 %)', Math.abs(hzPk / f0 - 1) < 0.02, `${hzPk.toFixed(1)} Hz`);
  const st = pk({ ...one, size: 4, set: 3, pitch: 110 });
  check('four cells of the STRING set, uncoupled: peaks at 1, 2, 3, 4 x the pitch', [1, 2, 3, 4].every(k => band(st, f0 * k, 0.02) > 1e-4 * Math.max(...st)), [1, 2, 3, 4].map(k => db(Math.sqrt(band(st, f0 * k, 0.02))).toFixed(0)).join(' / ') + ' dB');
  const pl = pk({ ...one, size: 2, set: 0, pitch: 110 });
  check('two cells of the PLATE set: peaks at 1 x and 2.5 x the pitch, nothing at 2 x or 3 x', band(pl, f0 * 2.5, 0.02) > 100 * band(pl, f0 * 2, 0.02) && band(pl, f0, 0.02) > 100 * band(pl, f0 * 3, 0.02), `${db(Math.sqrt(band(pl, f0 * 2.5, 0.02))).toFixed(0)} vs ${db(Math.sqrt(band(pl, f0 * 2, 0.02))).toFixed(0)} dB`);
  const bl = pk({ ...one, size: 2, set: 2, pitch: 110 });
  check('two cells of the BELLS set: 1 x and 1.183 x', band(bl, f0 * 1.183, 0.02) > 100 * band(bl, f0 * 1.1, 0.01) && band(bl, f0, 0.02) > 0, '');
  const t1 = pk({ ...one, pitch: 110 }), t2 = pk({ ...one, pitch: 220 });
  check('PITCH 220 doubles the pitch', Math.abs(peakHz(t2, 30, 3000) / peakHz(t1, 30, 3000) - 2) < 0.05, `${peakHz(t1, 30, 3000).toFixed(0)} -> ${peakHz(t2, 30, 3000).toFixed(0)} Hz`);
  const sz = run({ size: 8 }, 12).meters.pop(); check('CELLS 8: cells 9 to 16 are out (zero energy), the first eight are alive', sz.e.slice(8).every(x => x === 0) && sz.e.slice(0, 8).some(x => x > 0.1), sz.e.map(x => x.toFixed(1)).join(' '));
}

// ===== 3. pull and drift move the pitch =====
{
  const pk = params => peakHz(spectrum(run({ ...one, ...params }, 6).L, SR * 4.5), 30, 3000);
  const p0 = pk({ pull: 0 }), p1 = pk({ pull: 1 });
  check('PULL 100 %: a loud cell sings higher than with PULL 0 (by 2 % or more)', p1 > p0 * 1.02, `${p0.toFixed(1)} -> ${p1.toFixed(1)} Hz`);
  const zc = (a, from, len) => { let c = 0, first = -1, last = -1; for (let i = from + 1; i < from + len; i++) if (a[i - 1] <= 0 && a[i] > 0) { if (first < 0) first = i; last = i; c++; } return c > 1 ? (c - 1) * SR / (last - first) : 0; };
  const lo = [0, 1, 2, 3].map(i => zc(run({ ...one, drift: 0 }, 9, [], { seed: 10 + i }).L, SR * 6, SR * 3)), hi = [0, 1, 2, 3].map(i => zc(run({ ...one, drift: 1 }, 9, [], { seed: 10 + i }).L, SR * 6, SR * 3));
  const spread = a => Math.max(...a) - Math.min(...a);
  check('DRIFT 100 %: the pitch differs from run to run (a few per cent), at 0 it is the same every time', spread(hi) > 0.5 && spread(lo) < 0.2, `${spread(hi).toFixed(2)} Hz vs ${spread(lo).toFixed(2)} Hz`);
}

// ===== 4. it develops: tiring and rivalry =====
{
  const cv = params => { const r = run(params, 60); r.secs = 60; const rows = []; for (let t = 15; t < 60; t += 0.5) rows.push(envAt(r, t)); let s = 0; for (let c = 0; c < 16; c++) { const v = rows.map(x => x[c]), m = v.reduce((a, b) => a + b) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); s += sd / (m + 1e-9); } return { cv: s / 16, r }; };
  const live = cv({}), still = cv({ fatigue: 0, rival: 0 });
  check('defaults: the cells wake and rest on their own (temporal variation of a cell\'s energy over 45 s: 0.4 or more)', live.cv > 0.4, `${live.cv.toFixed(2)}`);
  check('TIRING 0 and RIVALRY 0: the same cells stay put (variation below 0.2)', still.cv < 0.2, `${still.cv.toFixed(2)}`);
  const awake = r => { r.secs = 60; let sum = 0, n = 0, mn = 99, mx = 0; for (let t = 15; t < 60; t += 1) { const k = envAt(r, t).filter(x => x > 0.2).length; sum += k; n++; mn = Math.min(mn, k); mx = Math.max(mx, k); } return { mean: sum / n, mn, mx }; };
  const aw = awake(live.r); check('... and it is not just one cell: on average 3 or more are awake, never all 16 at once', aw.mean >= 3 && aw.mx < 16, `mean ${aw.mean.toFixed(1)}, ${aw.mn} ... ${aw.mx}`);
  const slow = run({ tire: 30 }, 40), fast = run({ tire: 1 }, 40); slow.secs = fast.secs = 40;
  const flips = r => { let f = 0, prev = null; for (let t = 10; t < 40; t += 1) { const a = envAt(r, t).map(x => x > 0.2); if (prev) for (let i = 0; i < 16; i++) if (a[i] !== prev[i]) f++; prev = a; } return f; };
  check('REST TIME changes how it moves: 1 s and 30 s give different numbers of cells changing state (a long rest time is a delay in the feedback, so it is not calmer: 30 s gave more changes)', Math.abs(flips(fast) - flips(slow)) > 0.15 * Math.max(flips(fast), flips(slow)), `${flips(fast)} vs ${flips(slow)} changes in 30 s`);
}

// ===== 5. coupling =====
{
  const m = r => r.meters[r.meters.length - 1];
  // cells with a high Q answer only near their own pitch, so neighbours at other pitches hardly hear each other; the coupling acts through the clip (overtones of one cell land on another) and
  // between cells that are close in pitch. What can be shown: the same seed with COUPLE 0 and COUPLE 100 % gives a different pattern of loud cells, and the STRING set (whose cells sit on each other's overtones) hands energy on.
  const pat = couple => { const r = run({ couple, set: 3, fatigue: 0, rival: 0, regen: 1.15, focus: 60, hiss: 0.5 }, 12); r.secs = 12; return envAt(r, 11.5); };
  const q0 = pat(0), q1 = pat(1); let dist = 0; for (let k = 0; k < 16; k++) dist += Math.abs(q0[k] - q1[k]);
  check('COUPLE 0 and COUPLE 100 % (STRING set, same seed) give different patterns of loud cells (sum of differences > 0.5)', dist > 0.5, dist.toFixed(2));
  for (const [name, topo] of [['GRID', 0], ['RING', 1], ['ALL', 2], ['SPARSE', 3]]) {
    const r = run({ topo, twist: 0.5, couple: 0.8, regen: 1.35 }, 20);
    check(`LINKS ${name} with TWIST 50 % and COUPLE 80 %: alive, bounded, finite`, r.bad === 0 && peak(r.L) <= 1.0001 && db(rms(r.L, SR * 10, SR * 20)) > -50, `${db(rms(r.L, SR * 10, SR * 20)).toFixed(0)} dB`);
  }
}

// ===== 6. touch =====
{
  const r = run(quiet, 4, [[1, touch('down', 0.1, 0.1)], [1.05, touch('up', 0.1, 0.1)]]), e = r.meters[Math.floor(r.meters.length * 1.3 / 4)].e;
  check('a strike in the top-left corner wakes the cells there most (cell 0, 1, 4 or 5 loudest), the far corner stays quiet', [0, 1, 4, 5].indexOf(e.indexOf(Math.max(...e))) >= 0 && e[15] < 0.2 * Math.max(...e) && peak(r.L) > 1e-4, `top ${e.indexOf(Math.max(...e))}, cell 15 ${e[15].toFixed(3)} vs ${Math.max(...e).toFixed(3)}`);
  const hold = run(quiet, 5, [[1, touch('down', 0.9, 0.9)], [1.4, touch('move', 0.85, 0.9)], [3, touch('up', 0.9, 0.9)]]);
  check('holding a finger rubs: sound while it rests, silence after it is lifted (and the cells die away)', db(rms(hold.L, SR * 2, SR * 3)) > -70 && db(rms(hold.L, SR * 4.5, SR * 5)) < db(rms(hold.L, SR * 2, SR * 3)) - 10, `${db(rms(hold.L, SR * 2, SR * 3)).toFixed(0)} dB held, ${db(rms(hold.L, SR * 4.5, SR * 5)).toFixed(0)} dB later`);
  const multi = run(quiet, 3, [[1, touch('down', 0.1, 0.1, 1)], [1, touch('down', 0.9, 0.9, 2)], [1.5, touch('up', 0.1, 0.1, 1)], [1.5, touch('up', 0.9, 0.9, 2)]]), em = multi.meters[Math.floor(multi.meters.length * 1.3 / 3)].e;
  const cA = Math.max(em[0], em[1], em[4], em[5]), cB = Math.max(em[10], em[11], em[14], em[15]), mid = Math.max(em[2], em[3], em[8], em[9]);
  check('two fingers at once strike two places (both corners clearly louder than the cells between them)', cA > 2 * mid && cB > 2 * mid && cA > 1e-4 && cB > 1e-4, `${cA.toExponential(1)} and ${cB.toExponential(1)} vs ${mid.toExponential(1)}`);
  const many = run(quiet, 3, [1, 2, 3, 4, 5, 6].map(i => [1, touch('down', i / 7, 0.5, i)])); check('six fingers (more than there is room for): bounded, no NaN', many.bad === 0 && peak(many.L) <= 1.0001, '');
}

// ===== 7. reset, LFOs =====
{
  const r = run({}, 20, [[10, p => send(p, { type: 'reset' })]]), t = SR * 10;
  check('before reset the space is alive', db(rms(r.L, SR * 8, SR * 9.9)) > -40, '');
  let mx = 0, rf = 0; for (let i = t; i < t + 400; i++) mx = Math.max(mx, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); for (let i = t - 4000; i < t; i++) rf = Math.max(rf, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2]));
  check('RESET does not click (second difference around the fade at most twice that of the sound before)', mx <= 2 * rf + 1e-9, `${mx.toExponential(1)} vs ${rf.toExponential(1)}`);
  check('after RESET the cells start again by themselves from the hiss (> -40 dB, 8 s later)', db(rms(r.L, SR * 18, SR * 20)) > -40, `${db(rms(r.L, SR * 18, SR * 20)).toFixed(0)} dB`);
}
{
  const slow = run({ l1depth: 1, l1rate: 0.4, l2depth: 0.5, l2rate: 0.3 }, 12), m = slow.meters[slow.meters.length - 1];
  check('LFOs at slow rate: bounded, finite, alive; the meter shows the moving coupling and pitch', slow.bad === 0 && peak(slow.L) <= 1.0001 && db(rms(slow.L, SR * 6, SR * 12)) > -50 && slow.meters.some(x => x.lm !== 1) && slow.meters.some(x => x.pm !== 1), `${db(rms(slow.L, SR * 6, SR * 12)).toFixed(0)} dB`);
  const au = run({ l1depth: 1, l1rate: 200, l2depth: 0.4, l2rate: 400 }, 6); check('LFOs at audio rate (200 Hz, 400 Hz): bounded and finite', au.bad === 0 && peak(au.L) <= 1.0001, `peak ${peak(au.L).toFixed(2)}`);
  const idle = run({}, 2); check('LFO depth 0: the factors in the meter stay 1', idle.meters.every(x => x.lm === 1 && x.pm === 1), '');
  const pk = (d) => peakHz(spectrum(run({ ...one, l2depth: d, l2rate: 0.01 }, 5, []).L, SR * 3.5), 30, 3000);
  info('pitch with LFO 2 at depth 1 and a very slow rate: ' + pk(1).toFixed(1) + ' Hz (without: ' + pk(0).toFixed(1) + ' Hz)');
}

// ===== 8a. the nine orders, STRETCH, WARP, the bell partial, QUALITY, the limiter =====
{
  const fOf = params => { const r = run({ ...params }, 2); return r.meters[r.meters.length - 1].f; };
  const near = (a, b, tol = 0.01) => Math.abs(a / b - 1) < tol;
  const J = fOf({ set: 4, pitch: 110 });
  check('JUST: the first row is 4/3, 1, 3/2, 9/8 of the pitch (fifths folded into an octave), the second row starts at 5/3 and 5/4 (a major third up per row)', near(J[0] / J[1], 4 / 3) && near(J[2] / J[1], 1.5) && near(J[3] / J[1], 1.125) && near(J[4] / J[1], 5 / 3) && near(J[5] / J[1], 1.25), J.slice(0, 6).map(x => x.toFixed(1)).join(' '));
  const SL = fOf({ set: 5, pitch: 110 }), PE = fOf({ set: 6, pitch: 110 }), BP = fOf({ set: 7, pitch: 110 }), FI = fOf({ set: 8, pitch: 110 });
  check('SLENDRO: five equal steps per octave (cell 2 is 2^(240/1200) above cell 1, cell 6 an octave above cell 1)', near(SL[1] / SL[0], Math.pow(2, 0.2)) && near(SL[5] / SL[0], 2), `${(SL[1] / SL[0]).toFixed(3)}, ${(SL[5] / SL[0]).toFixed(3)}`);
  check('PENTA: minor pentatonic (3 and 10 semitones above the pitch for cells 2 and 5)', near(PE[1] / PE[0], Math.pow(2, 3 / 12)) && near(PE[4] / PE[0], Math.pow(2, 10 / 12)), `${(PE[1] / PE[0]).toFixed(3)}, ${(PE[4] / PE[0]).toFixed(3)}`);
  check('BOHLEN-PIERCE: thirteen steps make a 3 : 1 (cell 14 is three times cell 1)', near(BP[13] / BP[0], 3), `${(BP[13] / BP[0]).toFixed(3)}`);
  check('FIFTHS: a stack of fifths (cell 2 is 3/2, cell 3 is 9/4 of the pitch), folded back by octaves once it passes 16 x', near(FI[1] / FI[0], 1.5) && near(FI[2] / FI[0], 2.25) && FI.every(f => f / FI[0] < 16 && f / FI[0] >= 1), `${(FI[1] / FI[0]).toFixed(3)}, ${(FI[2] / FI[0]).toFixed(3)}`);
  const P0 = fOf({ set: 0 }), S1 = fOf({ set: 0, stretch: 1 }), S2 = fOf({ set: 0, stretch: -1 });
  check('STRETCH +100 % widens the spacing (8.5 -> 8.5^1.3), -100 % squeezes it (8.5^0.7)', near(S1[3] / S1[0], Math.pow(8.5, 1.3), 0.02) && near(S2[3] / S2[0], Math.pow(8.5, 0.7), 0.02) && near(P0[3] / P0[0], 8.5, 0.02), `${(S2[3] / S2[0]).toFixed(2)} / ${(P0[3] / P0[0]).toFixed(2)} / ${(S1[3] / S1[0]).toFixed(2)}`);
  const W0a = fOf({ set: 3, warp: 0, seed: 1 }), W0b = fOf({ set: 3, warp: 0, seed: 2 }), W1a = fOf({ set: 3, warp: 1, seed: 1 }), W1b = fOf({ set: 3, warp: 1, seed: 2 }), W1c = fOf({ set: 3, warp: 1, seed: 1 });
  const dist = (a, b) => a.reduce((t, v, i) => t + Math.abs(Math.log2(v / b[i])), 0);
  check('WARP: 0 changes nothing whatever the seed, 100 % shifts each cell by up to 0.4 octave in a fixed pattern (same seed: same pattern, another seed: another one)', dist(W0a, W0b) < 1e-9 && dist(W1a, W1c) < 1e-9 && dist(W1a, W1b) > 0.5 && dist(W1a, W0a) > 0.5, `${dist(W1a, W1b).toFixed(2)}`);
  // the order glides in over about 150 ms instead of jumping
  const g = run({ set: 0 }, 3, [[1, p => send(p, { type: 'params', params: { set: 3 }, immediate: false })]]); const fm = g.meters; const fa = fm[Math.floor(fm.length * 0.99 / 3)].f[3], fb2 = fm[Math.floor(fm.length * 1.12 / 3)].f[3], fc = fm[Math.floor(fm.length * 2.5 / 3)].f[3];
  check('a new ORDER glides to its pitches (cell 4 goes from 8.5 x to 4 x the pitch over about 150 ms: not yet there at 0.12 s, there at 1.5 s)', fa > 8 * 110 * 0.97 && fb2 < fa && fb2 > fc && near(fc, 4 * 110, 0.01), `${fa.toFixed(0)} -> ${fb2.toFixed(0)} -> ${fc.toFixed(0)} Hz`);
  // the bell partial: a struck cell rings a second, inharmonic partial
  const bell = shimmer => { const r = run({ ...one, regen: 0.6, hiss: 0, shimmer, partial: 2.76, size: 1, focus: 120 }, 3, [[1, touch('down', 0.12, 0.12)], [1.03, touch('up', 0.12, 0.12)]]); return spectrum(r.L, SR); };
  const b1 = bell(1), b0 = bell(0);
  check('SHIMMER: a struck cell rings a second partial at 2.76 x its pitch (at least 20 dB above the same strike without SHIMMER)', band(b1, 110 * 2.76, 0.03) > 100 * band(b0, 110 * 2.76, 0.03) + 1e-20, `${db(Math.sqrt(band(b1, 110 * 2.76, 0.03))).toFixed(0)} dB vs ${db(Math.sqrt(band(b0, 110 * 2.76, 0.03))).toFixed(0)} dB`);
  const b2 = (() => { const r = run({ ...one, regen: 0.6, hiss: 0, shimmer: 1, partial: 4.5, size: 1, focus: 120 }, 3, [[1, touch('down', 0.12, 0.12)], [1.03, touch('up', 0.12, 0.12)]]); return spectrum(r.L, SR); })();
  check('PARTIAL 4.5 moves it (energy at 4.5 x, much less at 2.76 x)', band(b2, 110 * 4.5, 0.03) > 10 * band(b2, 110 * 2.76, 0.03), '');
  // quality
  const zc2 = (a, from, len) => { let c = 0, first = -1, last = -1; for (let i = Math.floor(from) + 1; i < Math.floor(from + len); i++) if (a[i - 1] <= 0 && a[i] > 0) { if (first < 0) first = i; last = i; c++; } return c > 1 ? (c - 1) * SR / (last - first) : 0; };
  const pq = [0, 1, 2].map(q => zc2(run({ ...one, quality: q }, 6).L, SR * 4, SR * 2));
  check('QUALITY LITE, ECO and FULL: one cell sings at the pitch in all three (110 Hz within 1 %)', pq.every(f => near(f, 110, 0.01)), pq.map(f => f.toFixed(2)).join(' / ') + ' Hz');
  const qs = run({ quality: 0 }, 14, [[7, p => send(p, { type: 'params', params: { quality: 2 }, immediate: false })], [10, p => send(p, { type: 'params', params: { quality: 1 }, immediate: false })]]);
  let mxq = 0, rfq = 0; const tq = SR * 7; for (let i = tq; i < tq + 3000; i++) mxq = Math.max(mxq, Math.abs(qs.L[i] - 2 * qs.L[i - 1] + qs.L[i - 2])); for (let i = tq - 24000; i < tq; i++) rfq = Math.max(rfq, Math.abs(qs.L[i] - 2 * qs.L[i - 1] + qs.L[i - 2]));
  check('switching QUALITY while it sounds: no NaN, still sounding, no click (second difference at most 3 x that of the sound before)', qs.bad === 0 && db(rms(qs.L, SR * 12, SR * 14)) > -45 && mxq <= 3 * rfq + 1e-9 && qs.meters[qs.meters.length - 1].q === 2, `${mxq.toExponential(1)} vs ${rfq.toExponential(1)}`);
  // the limiter
  const hot = run({ regen: 1.6, drive: 0.5, couple: 1.2, rival: 0, fatigue: 0, focus: 600, size: 16, level: 1, hiss: 1, shimmer: 1, topo: 2 }, 12, [[2, touch('down', 0.5, 0.5, 1)], [3, touch('up', 0, 0, 1)]]);
  check('LIMITER: even with everything wide open and LEVEL 100 % the output stays below 0.97 (-0.26 dB), never reaching 0 dB', hot.bad === 0 && peak(hot.L) <= 0.97 + 1e-12 && peak(hot.R) <= 0.97 + 1e-12 && peak(hot.L) > 0.5, `peak ${Math.max(peak(hot.L), peak(hot.R)).toFixed(4)}`);
}

// ===== 8. extremes and cost =====
{
  let bad = 0, big = 0, cases = 0; const rnd = (() => { let s = 5; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const ranges = { pitch: [30, 1500], set: [0, 3], size: [3, 16], regen: [0.6, 1.6], focus: [8, 600], drive: [0.5, 6], couple: [0, 1.2], topo: [0, 3], twist: [0, 1], fatigue: [0, 1], rival: [0, 1.2], tire: [0.5, 40], pull: [0, 1], drift: [0, 1], hiss: [0, 1], width: [0, 1], tone: [800, 16000], level: [0, 1], l1depth: [0, 1], l2depth: [0, 1], l1rate: [0.002, 1000], l2rate: [0.002, 1000] };
  for (let i = 0; i < 24; i++) {
    const prm = {}; for (const k in ranges) { const [a, b] = ranges[k]; const u = i < 8 ? (rnd() < 0.5 ? 0 : 1) : rnd(); prm[k] = a + (b - a) * u; if (k === 'topo') prm[k] = Math.round(prm[k]); }
    const sr = i % 3 === 0 ? 44100 : (i % 3 === 1 ? 96000 : 48000);
    const r = run(prm, 4, [[1, touch('down', rnd(), rnd(), 1)], [2, touch('up', 0, 0, 1)]], { sr }); cases++; bad += r.bad; if (peak(r.L) > 1.0001 || peak(r.R) > 1.0001) big++;
  }
  check(`${cases} random and corner settings with a touch at 44.1 / 48 / 96 kHz: no NaN or infinity, never above the limiter`, bad === 0 && big === 0, `${bad} bad samples, ${big} too loud`);
  const hot = { regen: 1.6, drive: 0.5, couple: 1.2, rival: 0, fatigue: 0, focus: 600, topo: 2, hiss: 1, level: 1 };
  const r = run(hot, 8, [[4, p => send(p, { type: 'params', params: { ...hot, regen: 0.6, couple: 0, topo: 1, focus: 8 }, immediate: false })]]);
  check('everything wide open, then closed again in one go: bounded, finite', r.bad === 0 && peak(r.L) <= 1.0001, `peak ${peak(r.L).toFixed(2)}`);
}
{
  const r = run({ topo: 2, couple: 0.8, l1depth: 1, l1rate: 3, l2depth: 0.3, l2rate: 220 }, 6, [[1, touch('down', 0.5, 0.5, 1)]]), per = r.ms / (6 * SR / 128), budget = 128 / SR * 1000;
  info(`CPU: ${per.toFixed(3)} ms per 128-sample block at 48 kHz (budget ${budget.toFixed(2)} ms) = ${(100 * per / budget).toFixed(0)} % of one core in Node on this machine (16 cells, everyone hears everyone, both LFOs, a touch)`);
  check('CPU: under 40 % of the audio budget in Node with everything on', per < 0.4 * budget, `${(100 * per / budget).toFixed(0)} %`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
