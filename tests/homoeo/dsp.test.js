// DSP tests for homoeo-v1_0.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// There is no second implementation to compare with (the circuit is new), so the parts are checked against their own theory:
// the band-pass against the analytic response, the delays by impulse response, the loop by behaviour (start, balance, regulation, reset, bounds).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../homoeo-v1_0.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }

function load(sr) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } },
    registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const internals = vm.runInContext('({ Core, coefficients, DEFAULTS, BASE_MS, BUF, MASK })', sandbox);
  return { reg, posted, internals };
}
function worklet(sr, name = 'homoeo') { const l = load(sr); const p = new l.reg[name](); p.posted = l.posted; return p; }
const lastMeter = p => { const m = p.posted.filter(x => x.type === 'meter'); return m[m.length - 1]; };
function setParams(p, params) { p.port.onmessage({ data: { type: 'params', params: { weather: 0, ...params }, immediate: true } }); }   // WEATHER is off unless a test asks for it: the checks below need a settled circuit
function runWeb(params, seconds, input, opts = {}) {
  const sr = opts.sr || 48000, p = worklet(sr); setParams(p, params);
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), blk = 128;
  const iL = new Float32Array(blk), iR = new Float32Array(blk), oL = new Float32Array(blk), oR = new Float32Array(blk);
  let bad = 0; const t0 = process.hrtime.bigint();
  for (let s = 0; s < n; s += blk) {
    if (opts.at) for (const [t, fn] of opts.at) if (s <= Math.floor(t * sr) && Math.floor(t * sr) < s + blk) fn(p);
    for (let i = 0; i < blk; i++) { const v = input ? input(s + i) : 0; iL[i] = v; iR[i] = v; }
    p.process([[iL, iR]], [[oL, oR]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = oL[i]; R[s + i] = oR[i]; if (!isFinite(oL[i]) || !isFinite(oR[i])) bad++; }
  }
  return { L, R, bad, p, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
}
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const rms = (a, s, e) => { let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const db = x => 20 * Math.log10(x + 1e-30);
const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const burst = p => p.port.onmessage({ data: { type: 'burst' } });
const withBurst = { at: [[0, burst]] };
function goertzel(a, s, e, f, sr = SR) { const w = 2 * Math.PI * f / sr; let re = 0, im = 0; for (let i = s; i < e; i++) { re += a[i] * Math.cos(w * i); im += a[i] * Math.sin(w * i); } return 2 * Math.hypot(re, im) / (e - s); }
let seed = 4711; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

// ===== 1. filter bank: each band is a band-pass with unity gain at its centre and the analytic response around it =====
{
  const { Core, coefficients, DEFAULTS } = load(SR).internals;
  for (const q of [1.5, 6, 20]) {
    const p = { ...DEFAULTS, fbase: 440, dist: 1, q, drive: 1, fold: 0, fbg: 0, imod: 0, seedlvl: 1, nfloor: 0, dshift: 1 }, c = coefficients(p, SR, {});
    const centres = [220, 440, 880];
    for (let band = 0; band < 3; band++) {
      const worst = [];
      for (const ratio of [1, 0.5, 0.8, 1.25, 2]) {
        const f = centres[band] * ratio, core = new Core(() => 0), n = SR; const bp = new Float64Array(n);
        for (let i = 0; i < n; i++) { core.step(c, 0.002 * Math.sin(2 * Math.PI * f * i / SR), 0, 1); bp[i] = core.buf[band][(core.w - 1) & (core.buf[band].length - 1)]; }
        const gain = goertzel(bp, SR * 0.5, n, f) / 0.002, theory = 1 / Math.sqrt(1 + q * q * (ratio - 1 / ratio) ** 2);
        worst.push([ratio, 20 * Math.log10(gain / theory)]);
      }
      const dev = Math.max(...worst.map(w => Math.abs(w[1])));
      check(`band ${band + 1} (${centres[band]} Hz), Q ${q}: gain at the centre is 1 and the response follows the analytic band-pass (within 0.6 dB at 0.5x ... 2x)`, dev < 0.6, `largest deviation ${dev.toFixed(2)} dB`);
    }
  }
}

// ===== 2. delays: the three bands come back after 47 / 79 / 131 ms x shift =====
{
  const { Core, coefficients, DEFAULTS, BASE_MS } = load(SR).internals;
  for (const dshift of [1, 0.5, 2.5]) {
    const p = { ...DEFAULTS, fbase: 3000, dist: 0, q: 0.7, drive: 1, fold: 0, fbg: 0, imod: 0, seedlvl: 1, nfloor: 0, dshift }, c = coefficients(p, SR, {});
    const core = new Core(() => 0), n = Math.floor(SR * 0.9), peaks = [0, 0, 0], at = [0, 0, 0];
    for (let i = 0; i < n; i++) { core.step(c, i === 100 ? 0.01 : 0, 0, 1); for (let b = 0; b < 3; b++) if (Math.abs(core.d[b]) > peaks[b]) { peaks[b] = Math.abs(core.d[b]); at[b] = i; } }
    const ms = at.map(i => (i - 100) / SR * 1000), want = BASE_MS.map(x => x * dshift);
    check(`delays at shift x${dshift}: ${want.map(x => x.toFixed(1)).join(' / ')} ms`, ms.every((m, i) => Math.abs(m - want[i]) < 1.5), ms.map(m => m.toFixed(1)).join(' / ') + ' ms');
  }
}

// ===== 3. the loop as a whole =====
{
  const r = runWeb({}, 14, null, withBurst);   // factory defaults, burst only
  check('defaults + burst: the loop sustains (> -40 dB rms after 8 s), finite and bounded', db(rms(r.L, SR * 10, SR * 14)) > -40 && r.bad === 0 && peak(r.L) <= 1.0001, `${db(rms(r.L, SR * 10, SR * 14)).toFixed(1)} dB, peak ${peak(r.L).toFixed(3)}`);
  const l = db(rms(r.L, SR * 10, SR * 14)), rr = db(rms(r.R, SR * 10, SR * 14));
  check('defaults: left and right both sound (low band left, high band right), within 8 dB', Math.abs(l - rr) < 8 && rr > -50, `L ${l.toFixed(1)}, R ${rr.toFixed(1)} dB`);
}
{ // band balance: with the default coupling all three bands keep sounding; in ONE shared loop (coupling 100 %, the spec) one band wins and the others fade
  const { coefficients } = load(SR).internals;
  const bandsOf = (set, secs = 12) => { const p = worklet(SR); setParams(p, set); burst(p); const e = [0, 0, 0], z = new Float32Array(128), a = new Float32Array(128), b = new Float32Array(128); let n = 0;
    for (let k = 0; k < SR * secs / 128; k++) { p.process([[z, z]], [[a, b]]); if (k > SR * 8 / 128) { for (let i = 0; i < 3; i++) e[i] += p.core.d[i] ** 2; n++; } }
    return e.map(x => 10 * Math.log10(x / n + 1e-30)); };
  const presets = new Function('return ' + html.match(/const PRESETS = (\{[\s\S]*?\n  \});/)[1])();
  for (const [name, set] of Object.entries(presets)) {
    const e = bandsOf(set), spread = Math.max(...e) - Math.min(...e);
    check(`preset "${name}": all three bands sound, within 10 dB of each other`, spread < 10 && Math.min(...e) > -25, `${e.map(x => x.toFixed(1)).join(' / ')} dB (spread ${spread.toFixed(1)})`);
  }
  const shared = bandsOf({ couple: 1 }), sp1 = Math.max(...shared) - Math.min(...shared);
  check('coupling 100 % (the spec: one shared loop): one band wins, the spread is large (> 15 dB), which is why the control exists', sp1 > 15, `${shared.map(x => x.toFixed(1)).join(' / ')} dB (spread ${sp1.toFixed(1)})`);
  const sep = bandsOf({ couple: 0 }), sp0 = Math.max(...sep) - Math.min(...sep);
  check('coupling 0 %: three independent loops, nearly equal in level (< 4 dB)', sp0 < 4, `${sep.map(x => x.toFixed(1)).join(' / ')} dB`);
}
{ // long run: it must neither die nor run away while nothing touches it
  const r = runWeb({}, 60, null, withBurst), a = db(rms(r.L, SR * 8, SR * 12)), b = db(rms(r.L, SR * 50, SR * 60));
  check('60 s without any input: still sounding and still at a similar level (within 12 dB of the early level)', b > -40 && Math.abs(a - b) < 12 && r.bad === 0, `${a.toFixed(1)} dB at 8-12 s, ${b.toFixed(1)} dB at 50-60 s`);
}
{ // the system needs a seed: with nothing at all it stays silent, and a noise floor alone wakes it up
  const silent = runWeb({ nfloor: 0, seedlvl: 0 }, 6);
  check('no seed at all (no noise floor, no burst, no input): silent', peak(silent.L) < 1e-9 && peak(silent.R) < 1e-9, `peak ${peak(silent.L).toExponential(1)}`);
  const nf = runWeb({ nfloor: 0.6 }, 20);
  check('the noise floor alone wakes the loop up', db(rms(nf.L, SR * 15, SR * 20)) > -45, `${db(rms(nf.L, SR * 15, SR * 20)).toFixed(1)} dB`);
}
{ // homeostasis: more damping = lower settled level; the gain-reduction meter follows
  const lev = d => { const r = runWeb({ damp: d, fbg: 2.4 }, 12, null, withBurst); return { r, e: db(Math.hypot(rms(r.L, SR * 8, SR * 12), rms(r.R, SR * 8, SR * 12))) }; };   // total power of both channels
  const a = lev(0), b = lev(1.5), c = lev(6), d8 = lev(8);
  const agOf = r => { const m = r.p.posted.filter(x => x.type === 'meter'); return m.slice(-20).reduce((t, x) => t + x.ag, 0) / 20; };
  check('regulation depth follows the damping: none at 0 (gain 1), stronger at 1.5, stronger again at 6', agOf(a.r) > 0.99 && agOf(b.r) < agOf(a.r) - 0.2 && agOf(c.r) < agOf(b.r) - 0.1, `mean gain ${agOf(a.r).toFixed(2)} / ${agOf(b.r).toFixed(2)} / ${agOf(c.r).toFixed(2)}`);
  check('from moderate damping upwards a stronger damping settles the system lower (1.5 > 6 > 8)', b.e > c.e + 0.3 && c.e > d8.e + 0.3, `${b.e.toFixed(1)} > ${c.e.toFixed(1)} > ${d8.e.toFixed(1)} dB`);
  console.log(`info  damping 0 settles at ${a.e.toFixed(1)} dB, i.e. not louder than 1.5: without any regulation the bands saturate hard and crowd each other out`);
  const m = b.r.p.posted.filter(x => x.type === 'meter'), last = m[m.length - 1], first = runWeb({}, 0.2).p.posted.filter(x => x.type === 'meter')[0];
  check('the regulation meter shows the gain pulled back while sounding (ag < 1) and none when idle (ag = 1)', last.ag < 0.9 && last.ag > 0.05 && (!first || first.ag === 1), `ag ${last.ag.toFixed(2)} while sounding`);
  // the small-signal loop gain is Feedback x Drive x Fold factor (the spec: drive decides whether new oscillations arise): below 1 it dies out, above 1 it sustains
  const weak = runWeb({ fbg: 0.5, drive: 1, fold: 0 }, 12, null, withBurst), strong = runWeb({ fbg: 1.3, drive: 1, fold: 0 }, 12, null, withBurst);
  check('loop gain 0.5 x 1 x 1 = 0.5 (below 1): the loop decays', db(rms(weak.L, SR * 9, SR * 12)) < -60, `${db(rms(weak.L, SR * 9, SR * 12)).toFixed(1)} dB`);
  check('loop gain 1.3 x 1 x 1 (above 1): the loop sustains, at the low level the regulation settles to (> -60 dB, 40 dB above the decaying case)', db(rms(strong.L, SR * 9, SR * 12)) > -60 && db(rms(strong.L, SR * 9, SR * 12)) > db(rms(weak.L, SR * 9, SR * 12)) + 40, `${db(rms(strong.L, SR * 9, SR * 12)).toFixed(1)} dB vs ${db(rms(weak.L, SR * 9, SR * 12)).toFixed(1)} dB`);
  const dr = runWeb({ fbg: 0.5, drive: 4, fold: 0 }, 12, null, withBurst);
  check('drive raises the loop gain: 0.5 x 4 = 2 sustains although Feedback is below 1', db(rms(dr.L, SR * 9, SR * 12)) > -40, `${db(rms(dr.L, SR * 9, SR * 12)).toFixed(1)} dB`);
}
{ // reset
  const r = runWeb({ nfloor: 0 }, 9, null, { at: [[0, burst], [4, p => p.port.onmessage({ data: { type: 'reset' } })], [7, burst]] });
  const t = SR * 4;
  check('before reset the loop is alive', db(rms(r.L, SR * 3.5, SR * 3.99)) > -40);
  check('RESET fades the output out in 6 ms (smoothstep, no click) and then it is silent', peak(r.L.subarray(t + 400, t + 700)) < 1e-9 && peak(r.R.subarray(t + 400, t + 700)) < 1e-9, `peak after 8 ms ${peak(r.L.subarray(t + 400, t + 700)).toExponential(1)}`);
  let stepMax = 0, stepRef = 0; for (let i = t - 400; i < t + 400; i++) stepMax = Math.max(stepMax, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); for (let i = t - 4000; i < t - 400; i++) stepRef = Math.max(stepRef, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2]));
  check('RESET does not click: the largest second difference around the fade is not larger than in the sound before it (x2)', stepMax <= 2 * stepRef + 1e-9, `${stepMax.toExponential(2)} vs ${stepRef.toExponential(2)}`);
  check('after RESET the loop stays empty (noise floor 0)', peak(r.L.subarray(SR * 5, SR * 7)) < 1e-9);
  check('a burst restarts it after RESET', db(rms(r.L, SR * 8, SR * 9)) > -45, `${db(rms(r.L, SR * 8, SR * 9)).toFixed(1)} dB`);
}
{ // intermodulation: 0 = plain sum of the bands, 100 % = product of two bands: a different network, both alive
  const a = runWeb({ imod: 0 }, 12, null, withBurst), b = runWeb({ imod: 1 }, 12, null, withBurst);
  let d = 0; for (let i = SR * 8; i < SR * 12; i++) d = Math.max(d, Math.abs(a.L[i] - b.L[i]));
  check('intermod 0 % and 100 % are different networks and both sustain', d > 1e-3 && db(rms(a.L, SR * 8, SR * 12)) > -50 && db(rms(b.L, SR * 8, SR * 12)) > -50 && a.bad + b.bad === 0, `diff ${d.toExponential(1)}, ${db(rms(a.L, SR * 8, SR * 12)).toFixed(1)} / ${db(rms(b.L, SR * 8, SR * 12)).toFixed(1)} dB`);
  // NOT verified here: that the product adds audible sum/difference tones. It is a product by construction, but a spectrum probe that separates it from the band modes did not give a reliable result.
}
{ // width: 0 = all bands in the centre (L = R exactly), 1 = low left, high right
  const m = runWeb({ width: 0 }, 6, null, withBurst); let diff = 0; for (let i = 0; i < m.L.length; i++) diff = Math.max(diff, Math.abs(m.L[i] - m.R[i]));
  check('width 0: left and right are identical', diff < 1e-12, `max difference ${diff.toExponential(1)}`);
  const w = runWeb({ width: 1 }, 10, null, withBurst); let d2 = 0; for (let i = SR * 6; i < SR * 10; i++) d2 = Math.max(d2, Math.abs(w.L[i] - w.R[i]));
  check('width 1: left and right differ', d2 > 1e-3, `max difference ${d2.toExponential(1)}`);
  const band = (a, f0, f1) => { let e = 0; for (let f = f0; f <= f1; f += 2) { const g = goertzel(a, SR * 6, SR * 10, f); e += g * g; } return e; };
  const lowL = band(w.L, 70, 170), lowR = band(w.R, 70, 170), hiL = band(w.L, 330, 600), hiR = band(w.R, 330, 600);
  check('width 1: the low band sits left, the high band right', lowL > 2 * lowR && hiR > 2 * hiL, `70-170 Hz L/R ${lowL.toExponential(1)}/${lowR.toExponential(1)}, 330-600 Hz L/R ${hiL.toExponential(1)}/${hiR.toExponential(1)}`);
}
{ // worst cases
  for (const [name, p] of [['everything at maximum', { drive: 8, fold: 1, imod: 1, q: 30, fbg: 3, damp: 0, dshift: 6, fbase: 1600, dist: 2.5, level: 1, nfloor: 1, seedlvl: 1 }],
                           ['everything at minimum', { drive: 0.5, fold: 0, imod: 0, q: 0.7, fbg: 0, damp: 8, dshift: 0.1, fbase: 40, dist: 0.2, level: 0, nfloor: 0, seedlvl: 0 }],
                           ['maximum feedback, no damping, loud noise in', { fbg: 3, damp: 0, drive: 8, fold: 1, level: 1 }]]) {
    const r = runWeb(p, 8, () => 3 * rnd(), withBurst);
    check(`worst case (${name}): finite and <= 1.0`, r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  }
  const { coefficients } = load(SR).internals; const z = {}; for (const k of Object.keys(load(SR).internals.DEFAULTS)) z[k] = 0;
  const r0 = runWeb(z, 1, i => 0.3 * Math.sin(i * 0.02));
  check('all parameters 0: finite', r0.bad === 0, `peak ${peak(r0.L).toFixed(3)}`);
}
{ // parameters moved all the time while it runs
  const moves = []; for (let k = 0; k < 100; k++) moves.push([1 + k * 0.1, p => p.port.onmessage({ data: { type: 'params', params: { dshift: 0.2 + (k * 37 % 50) / 10, fbase: 60 + (k * 53 % 900), q: 1 + (k * 7 % 25), drive: 0.6 + (k % 7), fold: (k % 10) / 10, imod: (k % 5) / 4, dist: 0.2 + (k % 9) / 4, fbg: 0.5 + (k % 6) * 0.5, damp: (k % 8) } } })]);
  const r = runWeb({}, 12, null, { at: [[0, burst], ...moves] });
  check('moving every control while it runs stays finite and bounded', r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
}
{ // delay shift and filter base are glided/smoothed: a jump of the delay time must not click
  const r = runWeb({}, 8, null, { at: [[0, burst], [4, p => p.port.onmessage({ data: { type: 'params', params: { dshift: 4 } } })]] });
  let worst = 0, base = 0; for (let i = SR * 2; i < SR * 4; i++) base = Math.max(base, Math.abs(r.L[i] - r.L[i - 1]));
  for (let i = SR * 4; i < SR * 6; i++) worst = Math.max(worst, Math.abs(r.L[i] - r.L[i - 1]));
  check('a jump of the delay shift (x1 -> x4) does not click (largest sample step <= 3x the normal one)', worst <= 3 * base + 0.01, `normal ${base.toFixed(4)}, after the jump ${worst.toFixed(4)}`);
}
{ // presets (read from the page): every one must sustain and stay bounded
  const presets = new Function('return ' + html.match(/const PRESETS = (\{[\s\S]*?\n  \});/)[1])();
  for (const [name, set] of Object.entries(presets)) {
    const r = runWeb(set, 14, null, withBurst), e = db(rms(r.L, SR * 10, SR * 14)), er = db(rms(r.R, SR * 10, SR * 14));
    check(`preset "${name}": sustains, finite, bounded, both channels sound`, e > -45 && er > -55 && r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `L ${e.toFixed(1)}, R ${er.toFixed(1)} dB, peak ${Math.max(peak(r.L), peak(r.R)).toFixed(2)}`);
  }
}

// ===== 4. LFOs: LFO 1 -> delay shift (+-1 octave), LFO 2 -> filter base frequency (+-1.5 octaves) =====
function advanceTo(p, seconds) { const blk = 128, z = new Float32Array(blk), o1 = new Float32Array(blk), o2 = new Float32Array(blk); for (let s = 0; s < Math.round(seconds * SR); s += blk) p.process([[z, z]], [[o1, o2]]); return p; }
for (const [shape, name] of [[0, 'sine'], [1, 'triangle']]) {
  const p = worklet(SR); setParams(p, { l1rate: 0.25, l1depth: 1, l1shape: shape, l2rate: 0.25, l2depth: 0.5, l2shape: shape, dshift: 1, fbase: 200 });
  advanceTo(p, 1.0); const pk = [lastMeter(p).ds, lastMeter(p).fb]; advanceTo(p, 2.0); const lo = [lastMeter(p).ds, lastMeter(p).fb];
  check(`LFO 1 (${name}) swings the delay shift x2 at the peak and x0.5 at the trough`, Math.abs(pk[0] / 2 - 1) < 0.02 && Math.abs(lo[0] / 0.5 - 1) < 0.02, `x${pk[0].toFixed(2)} / x${lo[0].toFixed(2)}`);
  const up = 200 * 2 ** (1.5 * 0.5), dn = 200 / 2 ** (1.5 * 0.5);
  check(`LFO 2 (${name}) swings the filter base by 1.5 octaves x depth (depth 0.5: x${(up / 200).toFixed(2)} / x${(dn / 200).toFixed(2)})`, Math.abs(pk[1] / up - 1) < 0.02 && Math.abs(lo[1] / dn - 1) < 0.02, `${pk[1].toFixed(1)} / ${lo[1].toFixed(1)} Hz (want ${up.toFixed(1)} / ${dn.toFixed(1)})`);
}
{ // drift: smooth random, bounded, no jumps, wanders
  const p = worklet(SR); setParams(p, { l1rate: 0.5, l1depth: 1, l1shape: 2, dshift: 1 });
  const blk = 128, z = new Float32Array(blk), o1 = new Float32Array(blk), o2 = new Float32Array(blk); let prev = null, maxStep = 0, lo = 9, hi = -9, bad = 0;
  for (let s = 0; s < SR * 60; s += blk) { p.process([[z, z]], [[o1, o2]]); const v = p.lfo1.v; if (prev !== null) maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; lo = Math.min(lo, v); hi = Math.max(hi, v); if (Math.abs(v) > 1.0001) bad++; }
  check('LFO drift: bounded to +-1 octave, no jumps, uses most of the range', bad === 0 && maxStep < 0.01 && hi - lo > 1.2, `range ${lo.toFixed(2)} ... ${hi.toFixed(2)} octave, largest step ${maxStep.toFixed(4)}`);
}
{ // through the audio path: the first echo of an impulse sent at the LFO peak (period 100 s, peak at 25 s) comes after 2 x 47 ms
  const q = { fbg: 0, imod: 0, drive: 1, fold: 0, nfloor: 0, seedlvl: 1, fbase: 3000, dist: 0, q: 0.7, width: 0, level: 1, dshift: 1, l1rate: 0.01, l1depth: 1, l1shape: 0 };
  const imp = Math.round(SR * 25), r = runWeb(q, 25.6, i => i === imp ? 0.01 : 0);
  let pk = 0, pi = 0; for (let i = imp; i < imp + SR * 0.12; i++) if (Math.abs(r.L[i]) > pk) { pk = Math.abs(r.L[i]); pi = i; }
  const ms = (pi - imp) / SR * 1000;
  check('LFO 1 through the audio path: the first echo of an impulse sent at the peak comes after about 2 x 47 ms', Math.abs(ms - 94) < 4, `${ms.toFixed(1)} ms (want ~94)`);
}

// ===== 5. recorder =====
{
  const p = worklet(SR, 'homoeo-rec'), total = 4096 * 2 + 1000, blk = 128;
  let n = 0; const L = new Float32Array(blk), R = new Float32Array(blk), out = [new Float32Array(blk), new Float32Array(blk)];
  while (n < total) { for (let i = 0; i < blk; i++) { L[i] = (n + i) / 100000; R[i] = -(n + i) / 100000; } p.process([[L, R]], [out]); n += blk; }
  p.port.onmessage({ data: { type: 'stop' } });
  const chunks = p.posted.filter(m => m.type === 'chunk'), done = p.posted.filter(m => m.type === 'done').length;
  const frames = chunks.reduce((a, c) => a + c.l.length, 0); let okOrder = true, k = 0;
  for (const c of chunks) for (let i = 0; i < c.l.length; i++, k++) if (Math.abs(c.l[i] - k / 100000) > 1e-6 || Math.abs(c.r[i] + k / 100000) > 1e-6) okOrder = false;
  check('recorder: all frames arrive once, in order, left/right kept apart', frames === n && okOrder && done === 1, `${frames} of ${n} frames, ${chunks.length} chunks, done x${done}`);
  check('recorder: after stop the processor ends (returns false)', p.process([[L, R]], [out]) === false);
}

// ===== 6. other sample rates, cost =====
for (const sr of [44100, 96000]) {
  const r = runWeb({}, 12, null, { sr, at: [[0, burst]] }), e = db(rms(r.L, sr * 8, sr * 12));
  check(`sample rate ${sr}: the default loop sustains`, e > -40 && r.bad === 0, `${e.toFixed(1)} dB`);
}
{
  const r = runWeb({}, 20, null, withBurst), perBlock = r.ms / (SR * 20 / 128);
  console.log(`info  CPU: ${perBlock.toFixed(3)} ms per 128-sample block at 48 kHz (budget 2.667 ms) = ${(perBlock / 2.667 * 100).toFixed(0)} % of one core in Node on this machine`);
  check('fits the real-time budget with margin (< 50 %)', perBlock < 1.33, `${(perBlock / 2.667 * 100).toFixed(0)} %`);
}
// ===== 8. LFOs up to the audio range (1 kHz): per sample =====
{ // the phase runs per sample at the right speed: 187 blocks of 128 samples
  const blocks = 187, n = blocks * 128, p = worklet(SR); setParams(p, { l1rate: 523.25, l2rate: 997 });
  const z = new Float32Array(128), o1 = new Float32Array(128), o2 = new Float32Array(128); for (let b = 0; b < blocks; b++) p.process([[z, z]], [[o1, o2]]);
  const want1 = (523.25 * n / SR) % 1, want2 = (997 * n / SR) % 1, d = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  check('LFO phase advances per sample: 523.25 Hz and 997 Hz (audio range) after 0.5 s are exactly where they should be', d(p.lfo1.ph, want1) < 1e-6 && d(p.lfo2.ph, want2) < 1e-6, `phase ${p.lfo1.ph.toFixed(6)} / ${p.lfo2.ph.toFixed(6)} (want ${want1.toFixed(6)} / ${want2.toFixed(6)})`);
}
{
  const sig = i => 0.3 * Math.sin(2 * Math.PI * 1000 * i / SR), s0 = Math.round(SR * 0.4), e0 = Math.round(SR * 1.2);
  const q = { fbg: 0, imod: 0, drive: 1, fold: 0, nfloor: 0, seedlvl: 1, fbase: 1000, dist: 0, q: 2, width: 0, level: 1, dshift: 0.2, l1shape: 0, l2shape: 0 };
  const run1 = (extra) => runWeb({ ...q, ...extra }, 1.2, sig);
  const slow1 = run1({ l1depth: 0.05, l1rate: 0.01 }), fast1 = run1({ l1depth: 0.05, l1rate: 200 });
  const sb1 = r => goertzel(r.L, s0, e0, 1200) + goertzel(r.L, s0, e0, 800);
  check('LFO 1 at 200 Hz modulates the delay shift (not smoothed away): sidebands at 1000 +- 200 Hz, 20 dB above the slow case', sb1(fast1) > 0.003 && sb1(fast1) > 10 * sb1(slow1), `fast ${sb1(fast1).toExponential(2)}, slow ${sb1(slow1).toExponential(1)}`);
  const slow2 = run1({ l2depth: 0.5, l2rate: 0.01 }), fast2 = run1({ l2depth: 0.5, l2rate: 150 });
  const sb2 = r => goertzel(r.L, s0, e0, 1150) + goertzel(r.L, s0, e0, 850);
  check('LFO 2 at 150 Hz moves the filter base frequency: sidebands at 1000 +- 150 Hz, 10 dB above the slow case', sb2(fast2) > 0.003 && sb2(fast2) > 3 * sb2(slow2), `fast ${sb2(fast2).toExponential(2)}, slow ${sb2(slow2).toExponential(1)}`);
}
{ // worst case: both LFOs at 1 kHz, full depth, all shapes
  for (const shape of [0, 1, 2]) {
    const r = runWeb({ fbg: 2.4, imod: 1, drive: 4, fold: 0.6, l1rate: 1000, l1depth: 1, l1shape: shape, l2rate: 1000, l2depth: 1, l2shape: shape, fbase: 400, dshift: 1 }, 8, null, withBurst);
    check(`both LFOs at 1 kHz, full depth, shape ${shape}: finite and below 0.9`, r.bad === 0 && peak(r.L) <= 0.9001 && peak(r.R) <= 0.9001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  }
}
// ===== 9. nothing flips: the burst has an envelope, the LFO shape crossfades =====
{ // burst: 4 ms attack, 12 ms release
  const p = worklet(SR); setParams(p, { nfloor: 0, fbg: 0, imod: 0, drive: 1, fold: 0, seedlvl: 0, fbase: 3000, dist: 0, q: 0.7, width: 0, level: 1, dshift: 0.1, l1depth: 0, l2depth: 0 });
  p.port.onmessage({ data: { type: 'burst' } });
  const z = new Float32Array(128), o1 = new Float32Array(128), o2 = new Float32Array(128), y = [];
  for (let b = 0; b < 100; b++) { p.process([[z, z]], [[o1, o2]]); for (let i = 0; i < 128; i++) y.push(o1[i]); }
  const W = 24, env = []; for (let s = 0; s + W <= y.length; s += W) { let e = 0; for (let i = s; i < s + W; i++) e += y[i] * y[i]; env.push(Math.sqrt(e / W)); }
  const pk = Math.max(...env), t10 = env.findIndex(v => v > 0.1 * pk), t90 = env.findIndex(v => v > 0.9 * pk); let l90 = 0, l10 = 0; env.forEach((v, k) => { if (v > 0.9 * pk) l90 = k; if (v > 0.1 * pk) l10 = k; });
  check('burst: the noise rises over at least 2 ms (10 % to 90 %) and fades out over at least 5 ms', (t90 - t10) * W / SR * 1000 >= 2 && (l10 - l90) * W / SR * 1000 >= 5, `rise ${((t90 - t10) * W / SR * 1000).toFixed(1)} ms, fall ${((l10 - l90) * W / SR * 1000).toFixed(1)} ms`);
}
{ // changing the LFO shape crossfades over 20 ms: the modulation never jumps
  const p = worklet(SR), lfo = p.lfo1, inc = 40 / SR; let prev = null, maxJump = 0, vAt5 = null, sw = 0;
  for (let i = 0; i < 4000; i++) { const v = lfo.next(inc, i < 2000 ? 0 : 1); if (prev !== null) maxJump = Math.max(maxJump, Math.abs(v - prev)); prev = v; if (i === 2000 + 240) vAt5 = [v, lfo.shapeValue(1, lfo.ph)]; }
  check('changing the LFO shape (sine to triangle at 40 Hz) crossfades: largest step between samples stays below 0.05 (a flip would be up to 2)', maxJump < 0.05, `largest step ${maxJump.toFixed(4)}`);
  check('... and 5 ms after the switch the value is still on its way (the fade takes 20 ms), not at the new shape yet', vAt5 && Math.abs(vAt5[0] - vAt5[1]) > 0.01, vAt5 && (vAt5[0].toFixed(3) + ' vs new ' + vAt5[1].toFixed(3)));
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
  const on = { weather: 0.6 }, off = Object.assign({}, on, { weather: 0 });
  const a = spread(runWeb(on, 44, null, { at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })]] }).L), b = spread(runWeb(off, 44, null, { at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })]] }).L);
  check('WEATHER 0 keeps the sound where it is, WEATHER on moves it (variation of level plus tone colour over 40 s at least 1.5 x as large)', (a.rms + a.cen) > 1.5 * (b.rms + b.cen), `${(b.rms + b.cen).toFixed(3)} -> ${(a.rms + a.cen).toFixed(3)}`);
  check('... and it stays alive: the level in the last minute is within 12 dB of the one without WEATHER', a.level > 0.25 * b.level && a.level < 4 * b.level, `${(20 * Math.log10(a.level)).toFixed(0)} dB vs ${(20 * Math.log10(b.level)).toFixed(0)} dB`);
  const hard = runWeb({ weather: 1 }, 30, null, { at: [[0, p => p.port.onmessage({ data: { type: 'burst' } })]] }).L; let pk = 0, bad = 0; for (const v of hard) { if (!isFinite(v)) bad++; if (Math.abs(v) > pk) pk = Math.abs(v); }
  check('WEATHER 100 %: finite, and below 0 dB (peak under 0.97)', bad === 0 && pk < 0.97, `peak ${pk.toFixed(2)}`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
