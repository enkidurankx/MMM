// DSP tests for chua-v1_0.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// The circuit is checked against mathematics, not against a second implementation: integrator order, boundedness, the Lyapunov reading,
// sensitive dependence, independence of the time scale, and the behaviour of the output stage (DC, clicks, bounds, stereo).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../chua-v1_0.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }

function load(sr) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } },
    registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const internals = vm.runInContext('({ Circuit, DEFAULTS, diode, HMAX, EPS, A_MIN, A_MAX, B_MIN, B_MAX, ASYM_MAX })', sandbox);
  return { reg, posted, internals };
}
function worklet(sr, name = 'chua') { const l = load(sr); const p = new l.reg[name](); p.posted = l.posted; return p; }
function setParams(p, params) { p.port.onmessage({ data: { type: 'params', params, immediate: true } }); }
function run(params, seconds, opts = {}) {
  const sr = opts.sr || 48000, p = worklet(sr); setParams(p, params);
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), blk = 128, oL = new Float32Array(blk), oR = new Float32Array(blk);
  let bad = 0; const t0 = process.hrtime.bigint();
  for (let s = 0; s < n; s += blk) {
    if (opts.at) for (const [t, fn] of opts.at) if (s <= Math.floor(t * sr) && Math.floor(t * sr) < s + blk) fn(p);
    p.process([[]], [[oL, oR]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = oL[i]; R[s + i] = oR[i]; if (!isFinite(oL[i]) || !isFinite(oR[i])) bad++; }
  }
  return { L, R, bad, p, ms: Number(process.hrtime.bigint() - t0) / 1e6, sr };
}
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
function goertzel(a, s, e, f) { const w = 2 * Math.PI * f / SR; let re = 0, im = 0; for (let i = s; i < e; i++) { re += a[i] * Math.cos(w * i); im += a[i] * Math.sin(w * i); } return 2 * Math.hypot(re, im) / (e - s); }
const info = s => console.log('info ' + s);
const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const mean = (a, s = 0, e = a.length) => { let t = 0; for (let i = s; i < e; i++) t += a[i]; return t / (e - s); };
const rms = (a, s, e) => { let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const lastMeter = p => { const m = p.posted.filter(x => x.type === 'meter'); return m[m.length - 1]; };
const { Circuit, DEFAULTS, diode, HMAX, A_MIN, A_MAX, B_MIN, B_MAX, ASYM_MAX } = load(SR).internals;
// advance a bare circuit by tau (dimensionless time) in steps of h
function integrate(c, tau, h, a = 15.6, b = 28, asym = 0) { const n = Math.round(tau / h); for (let i = 0; i < n; i++) c.advance(h, a, b, asym); return c; }
function integrateN(c, n, h) { for (let i = 0; i < n; i++) c.advance(h, 15.6, 28, 0); return c; }

// ===== 1. the diode: the three slopes of the Chua characteristic =====
{
  const m0 = (diode(0.5, 0) - diode(-0.5, 0)) / 1, m1 = (diode(3, 0) - diode(2, 0)) / 1, m2 = (diode(9, 0) - diode(8, 0)) / 1;
  check('Chua diode: slope -8/7 inside |x| < 1, -5/7 outside, positive beyond |x| > 4 (a run-away orbit is caught)', Math.abs(m0 + 8 / 7) < 1e-12 && Math.abs(m1 + 5 / 7) < 1e-12 && m2 > 0.5, `${m0.toFixed(4)} / ${m1.toFixed(4)} / ${m2.toFixed(3)}`);
  check('Chua diode is odd without asymmetry and shifted with it', Math.abs(diode(1.7, 0) + diode(-1.7, 0)) < 1e-12 && Math.abs(diode(1.7, 0.3) - diode(2.0, 0)) < 1e-12);
}

// ===== 2. integrator: RK4 is fourth order where the equations are smooth =====
{
  // inside |x| < 1 the diode is a straight line, the system is smooth: start tiny, stay inside, compare with a very fine reference
  const start = c => { c.s[0] = 0.001; c.s[1] = 0; c.s[2] = 0; return c; };
  const ref = integrate(start(new Circuit()), 0.4, 0.0005).s.slice();
  const err = h => { const s = integrate(start(new Circuit()), 0.4, h).s; return Math.hypot(s[0] - ref[0], s[1] - ref[1], s[2] - ref[2]); };
  const e1 = err(0.02), e2 = err(0.01), order = Math.log2(e1 / e2);
  check('RK4 in the smooth zone: halving the step cuts the error by about 2^4 (order between 3.5 and 4.5)', order > 3.5 && order < 4.5, `error ${e1.toExponential(2)} -> ${e2.toExponential(2)}, order ${order.toFixed(2)}`);
  // across the kinks of the diode (|x| = 1) the order drops, which is what a piecewise-linear characteristic does to any Runge-Kutta scheme; the error still shrinks with the step
  const ref2 = integrate(new Circuit(), 4, 0.0005).s.slice(), err2 = h => { const s = integrate(new Circuit(), 4, h).s; return Math.hypot(s[0] - ref2[0], s[1] - ref2[1], s[2] - ref2[2]); };
  const k1 = err2(0.02), k2 = err2(0.01), k3 = err2(0.005);
  info(`across the diode kinks: error ${k1.toExponential(2)} (h 0.02), ${k2.toExponential(2)} (0.01), ${k3.toExponential(2)} (0.005)`);
  check('RK4 across the diode kinks: the error shrinks with the step and is below 1e-3 at the step the worklet uses (<= 0.025)', k2 < k1 && k3 < k2 && k1 < 1e-3, `${k1.toExponential(2)} at 0.02`);
}

// ===== 3. the classic double scroll (alpha 15.6, beta 28): bounded, both scrolls, chaotic =====
{
  const c = new Circuit(); integrate(c, 200, 0.01);
  let mx = 0, pos = 0, neg = 0, sum = 0, n = 0, maxy = 0, maxz = 0;
  for (let i = 0; i < 100000; i++) { c.advance(0.01, 15.6, 28, 0); const x = c.s[0]; mx = Math.max(mx, Math.abs(x)); maxy = Math.max(maxy, Math.abs(c.s[1])); maxz = Math.max(maxz, Math.abs(c.s[2])); if (x > 1) pos++; if (x < -1) neg++; sum += x; n++; }
  check('double scroll: bounded (|x| < 3, |y| < 1, |z| < 6)', mx < 3 && maxy < 1 && maxz < 6, `max |x| ${mx.toFixed(2)}, |y| ${maxy.toFixed(2)}, |z| ${maxz.toFixed(2)}`);
  check('double scroll: both scrolls are visited, about equally often', pos > 0.25 * n * 0.5 && neg > 0.25 * n * 0.5 && Math.abs(pos - neg) / (pos + neg) < 0.25, `x>1 ${(100 * pos / n).toFixed(0)} %, x<-1 ${(100 * neg / n).toFixed(0)} %`);
  check('double scroll: symmetric, the mean of x is about zero', Math.abs(sum / n) < 0.15, (sum / n).toFixed(3));
  check('double scroll: Lyapunov exponent positive, of the size known for this circuit (about 0.3 ... 0.6 per tau)', c.lyap > 0.25 && c.lyap < 0.65, 'lambda ' + c.lyap.toFixed(3));
  const pitch = c.cyclesPerTau; check('double scroll: about 0.6 ... 0.8 oscillations per tau (the basis of the pitch readout)', pitch > 0.55 && pitch < 0.85, pitch.toFixed(3));
}

// ===== 4. sensitive dependence: a difference of 1e-9 grows to the size of the attractor =====
{
  const a = new Circuit(), b = new Circuit(); integrate(a, 100, 0.01); b.s.set(a.s); b.s[0] += 1e-9;
  let t = 0, d = 0; const d0 = 1e-9;
  while (t < 400) { a.advance(0.01, 15.6, 28, 0); b.advance(0.01, 15.6, 28, 0); t += 0.01; d = Math.hypot(a.s[0] - b.s[0], a.s[1] - b.s[1], a.s[2] - b.s[2]); if (d > 1) break; }
  const rate = Math.log(d / d0) / t;
  check('two states 1e-9 apart separate to order 1 within 150 tau, at about the Lyapunov rate', t < 150 && rate > 0.2 && rate < 0.7, `separated after ${t.toFixed(0)} tau, growth ${rate.toFixed(2)} per tau`);
}

// ===== 5. other regimes: what the readout claims is true =====
{
  const regimes = [
    ['alpha 12, beta 28 (periodic)', 12, 28, 0, 'periodic'], ['alpha 14.3, beta 28 (single-scroll chaos)', 14.3, 28, 0, 'chaotic'], ['alpha 17, beta 28 (chaos)', 17, 28, 0, 'chaotic'],
    ['alpha 15.6, beta 18 (large cycle)', 15.6, 18, 0, 'periodic'], ['alpha 15.6, beta 45 (periodic)', 15.6, 45, 0, 'periodic'],
  ];
  for (const [name, a, b, asym, want] of regimes) {
    const c = new Circuit(); integrate(c, 300, 0.01, a, b, asym); integrate(c, 500, 0.01, a, b, asym); let mx = 0;
    for (let i = 0; i < 20000; i++) { c.advance(0.01, a, b, asym); mx = Math.max(mx, Math.abs(c.s[0])); }
    const got = c.lyap > 0.05 ? 'chaotic' : c.lyap < -0.05 ? 'settling' : 'periodic';
    check(`${name}: reading "${got}" (lambda ${c.lyap.toFixed(3)}), orbit stays below |x| = 7`, got === want && mx < 7, `max |x| ${mx.toFixed(2)}`);
  }
  // asymmetry breaks the symmetry: a single scroll has a non-zero mean
  const c = new Circuit(); integrate(c, 300, 0.01, 14, 28, 0); let sum = 0; for (let i = 0; i < 50000; i++) { c.advance(0.01, 14, 28, 0); sum += c.s[0]; }
  check('single scroll (alpha 14): the orbit sits on one side (mean x about 1.2), which is why the output removes the mean', Math.abs(sum / 50000) > 0.8, (sum / 50000).toFixed(2));
}

// ===== 5b. two stable orbits for the same settings: which one is reached depends on the state =====
{
  const rest = new Circuit(), far = new Circuit(); far.s[0] = 6; far.s[1] = 0.5; far.s[2] = -3;
  integrate(rest, 300, 0.01); integrate(far, 300, 0.01); integrate(rest, 400, 0.01); integrate(far, 400, 0.01);
  let mr = 0, mf = 0; for (let i = 0; i < 20000; i++) { rest.advance(0.01, 15.6, 28, 0); far.advance(0.01, 15.6, 28, 0); mr = Math.max(mr, Math.abs(rest.s[0])); mf = Math.max(mf, Math.abs(far.s[0])); }
  check('alpha 15.6, beta 28 has two attractors: from rest the small chaotic one (lambda > 0.25, |x| < 3), from x = 6 a large regular orbit (lambda ~ 0, |x| > 5)', rest.lyap > 0.25 && mr < 3 && Math.abs(far.lyap) < 0.05 && mf > 5, `rest: lambda ${rest.lyap.toFixed(2)}, max |x| ${mr.toFixed(2)}; far: lambda ${far.lyap.toFixed(3)}, max |x| ${mf.toFixed(2)}`);
  // and a reset gets out of the large one (what the page does for every preset)
  const r = run({}, 1.0, { at: [[0.2, p => { p.c.s[0] = 6; p.c.s[1] = 0.5; p.c.s[2] = -3; }], [0.4, p => p.port.onmessage({ data: { type: 'reset' } })]] });
  check('after being thrown into the large orbit, a reset returns the state to rest, to start the small attractor again', Math.abs(r.p.c.s[0]) < 3 && r.bad === 0, `x ${r.p.c.s[0].toFixed(2)}`);
}

// ===== 6. bounded and finite for every parameter in the UI range, at every rate, at three sample rates =====
{
  let worst = 0, bad = 0, runs = 0, worstDesc = '';
  for (const sr of [44100, 48000, 96000]) for (const [a, b, asym] of [[4, 8, 0], [22, 60, 0.5], [22, 8, -0.5], [4, 60, 0.5], [15.6, 28, 0], [19, 28, 0.4], [13, 50, -0.3]]) for (const rate of [0.5, 160, 2000]) {
    const r = run({ alpha: a, beta: b, asym, rate, level: 1, tone: 18000 }, 1.2, { sr }); runs++;
    const pk = peak(r.L) > peak(r.R) ? peak(r.L) : peak(r.R); bad += r.bad; if (pk > worst) { worst = pk; worstDesc = `sr ${sr} a ${a} b ${b} asym ${asym} rate ${rate}`; }
  }
  check(`${runs} extreme settings: output always finite and below 0.8 (level 100 %)`, bad === 0 && worst <= 0.8001, `peak ${worst.toFixed(3)} (${worstDesc})`);
}

// ===== 7. time scale: rate only changes how fast the same orbit is run =====
{
  // the same orbit at two rates, compared after the same circuit time. The worklet runs whole blocks of 128 samples:
  // 24 blocks at 100 tau/s and 6 blocks at 400 tau/s are both 6.4 tau.
  const a = run({ rate: 100 }, 24 * 128 / SR), b = run({ rate: 400 }, 6 * 128 / SR), sa = a.p.c.s, sb = b.p.c.s;
  const dd = Math.hypot(sa[0] - sb[0], sa[1] - sb[1], sa[2] - sb[2]);
  check('same orbit at 100 and 400 tau/s: states agree after the same circuit time (6.4 tau, within 0.005)', dd < 0.005, `difference ${dd.toExponential(2)}`);
  // high rate: substeps keep it accurate against a fine reference (one block = 128 samples = 8.7 tau at 2000 tau/s and 44.1 kHz)
  const hi = run({ rate: 2000 }, 128 / 44100, { sr: 44100 }), tau = 128 * 2000 / 44100, ref = integrateN(new Circuit(), 8000, tau / 8000).s;
  const e = Math.hypot(hi.p.c.s[0] - ref[0], hi.p.c.s[1] - ref[1], hi.p.c.s[2] - ref[2]);
  check('2000 tau/s at 44.1 kHz (step 0.045 tau, cut into substeps of at most ' + HMAX + '): within 0.02 of a fine reference after 5.8 tau', e < 0.02, `difference ${e.toExponential(2)}`);
  // pitch scales with the rate
  const p1 = run({ rate: 80 }, 3).p, p2 = run({ rate: 320 }, 3).p, m1 = lastMeter(p1), m2 = lastMeter(p2);
  check('the pitch readout scales with the rate (x4 rate = x4 pitch within 10 %)', Math.abs(m2.pitch / m1.pitch / 4 - 1) < 0.1, `${m1.pitch.toFixed(1)} Hz -> ${m2.pitch.toFixed(1)} Hz`);
}

// ===== 8. the meter message: Lyapunov reading in the worklet, pitch against an independent count =====
{
  const r = run({ rate: 200 }, 4), m = lastMeter(r.p);
  check('worklet reports a positive exponent for the default circuit and a pitch of about 100 ... 180 Hz', m.lam > 0.2 && m.lam < 0.7 && m.pitch > 90 && m.pitch < 190, `lambda ${m.lam.toFixed(3)}, pitch ${m.pitch.toFixed(0)} Hz`);
  // independent: zero crossings of the y variable in the right output channel (a low-passed copy of y) per second
  let cr = 0; const n = r.R.length, s0 = Math.floor(n * 0.4); for (let i = s0 + 1; i < n; i++) if ((r.R[i] > 0) !== (r.R[i - 1] > 0)) cr++;
  const count = cr / 2 / ((n - s0) / SR);
  check('pitch readout agrees with an independent zero-crossing count of the output within 25 %', Math.abs(m.pitch / count - 1) < 0.25, `readout ${m.pitch.toFixed(0)} Hz, counted ${count.toFixed(0)} Hz`);
}

// ===== 9. output stage =====
{
  // DC: the single scroll has a mean of 1.2 in x, which must not reach the speaker
  const r = run({ alpha: 14, beta: 28, src: 1, level: 1 }, 6), n = r.L.length;
  check('DC removed: a lopsided orbit (mean x about 1.2) leaves less than 0.02 DC at the output after 3 s', Math.abs(mean(r.L, 3 * SR, n)) < 0.02 && rms(r.L, 3 * SR, n) > 0.05, `mean ${mean(r.L, 3 * SR, n).toFixed(4)}, rms ${rms(r.L, 3 * SR, n).toFixed(3)}`);
  // stereo
  const st = run({ src: 0, width: 1 }, 2), n2 = st.L.length; let sl = 0, sr_ = 0, sx = 0; for (let i = n2 / 2; i < n2; i++) { sl += st.L[i] * st.L[i]; sr_ += st.R[i] * st.R[i]; sx += st.L[i] * st.R[i]; }
  const corr = sx / Math.sqrt(sl * sr_);
  check('X / Y with width 100 %: left and right are different views of the orbit (|correlation| < 0.5)', Math.abs(corr) < 0.5, 'correlation ' + corr.toFixed(2));
  const mo = run({ src: 0, width: 0 }, 1), same = mo.L.every((v, i) => Math.abs(v - mo.R[i]) < 1e-6);
  check('width 0 folds X / Y to mono; the single sources X, Y, Z are mono too', same && [1, 2, 3].every(s => { const q = run({ src: s }, 0.5); return q.L.every((v, i) => v === q.R[i]) && rms(q.L, 0, q.L.length) > 0.01; }));
  // tone: a one-pole low-pass. A regular orbit (alpha 12.6) is nearly a line spectrum: find its strongest line and compare the change in level with the analytic one-pole response
  const bright = run({ alpha: 12.6, rate: 3000, tone: 18000, src: 2 }, 2), dark = run({ alpha: 12.6, rate: 3000, tone: 300, src: 2 }, 2), nb = bright.L.length;
  const gz = (a, f) => goertzel(a, nb / 2, nb, f);
  let f0 = 0, best = 0; for (let f = 400; f < 6000; f += 4) { const g = gz(bright.L, f); if (g > best) { best = g; f0 = f; } }
  const H = (fc, f) => { const a = 1 - Math.exp(-2 * Math.PI * fc / SR), w = 2 * Math.PI * f / SR; const re = 1 - (1 - a) * Math.cos(w), im = (1 - a) * Math.sin(w); return a / Math.hypot(re, im); };
  const meas = 20 * Math.log10(gz(dark.L, f0) / gz(bright.L, f0)), theory = 20 * Math.log10(H(300, f0) / H(18000, f0));
  check('TONE: the strongest line of a regular orbit (' + f0 + ' Hz) is attenuated as a one-pole low-pass at 300 Hz says (within 1.2 dB: the soft saturation compresses the loud 18 kHz case slightly)', Math.abs(meas - theory) < 1.2 && f0 > 1000, `measured ${meas.toFixed(2)} dB, theory ${theory.toFixed(2)} dB`);
  // level
  const l1 = run({ level: 0.5 }, 1.5), l2 = run({ level: 0.25 }, 1.5), nn = l1.L.length;
  check('LEVEL scales the output (50 % is louder than 25 %, nothing is added)', rms(l1.L, nn / 2, nn) > 1.4 * rms(l2.L, nn / 2, nn));
}

// ===== 10. kick, reset, safety net =====
{
  // kick: smoothed (no click) and it really changes the trajectory
  const base = run({ rate: 40 }, 4), kicked = run({ rate: 40 }, 4, { at: [[2, p => p.port.onmessage({ data: { type: 'kick' } })]] });
  let jump = 0; for (let i = 1; i < kicked.L.length; i++) jump = Math.max(jump, Math.abs(kicked.L[i] - kicked.L[i - 1]), Math.abs(kicked.R[i] - kicked.R[i - 1]));
  let jb = 0; for (let i = 1; i < base.L.length; i++) jb = Math.max(jb, Math.abs(base.L[i] - base.L[i - 1]));
  check('kick: no click (largest step between samples stays within 2x of the unkicked orbit, below 0.01)', jump < Math.max(0.01, 2 * jb), `kicked ${jump.toFixed(4)}, unkicked ${jb.toFixed(4)}`);
  let d = 0; for (let i = 3 * SR; i < base.L.length; i += 100) d = Math.max(d, Math.abs(base.L[i] - kicked.L[i]));
  check('kick: the trajectory differs from the unkicked one afterwards and stays bounded', d > 0.05 && peak(kicked.L) <= 0.8001, `largest difference ${d.toFixed(3)}`);
  // reset: restart from rest, faded
  const rs = run({ rate: 160 }, 3, { at: [[1.5, p => p.port.onmessage({ data: { type: 'reset' } })]] });
  let j2 = 0; for (let i = 1; i < rs.L.length; i++) j2 = Math.max(j2, Math.abs(rs.L[i] - rs.L[i - 1]), Math.abs(rs.R[i] - rs.R[i - 1]));
  const quiet = rms(rs.L, Math.floor(1.5 * SR + 0.015 * SR), Math.floor(1.5 * SR + 0.025 * SR));
  check('reset: fades out and in without a click (largest step below 0.02), and sounds again afterwards', j2 < 0.02 && rms(rs.L, 2.5 * SR, 3 * SR) > 0.05, `largest step ${j2.toFixed(4)}`);
  check('reset: starts from the rest state again (x = 0.1, y = 0, z = 0 shortly after)', (() => { const p = run({ rate: 0.5 }, 0.56, { at: [[0.5, p => p.port.onmessage({ data: { type: 'reset' } })]] }).p; return Math.abs(p.c.s[0] - 0.1) < 0.01 && Math.abs(p.c.s[1]) < 0.01 && Math.abs(p.c.s[2]) < 0.01; })());
  // safety net
  const sf = run({}, 1, { at: [[0.3, p => { p.c.s[0] = NaN; }]] }), p2 = sf.p;
  check('safety net: a NaN state is replaced by the rest state, output stays finite, the event is counted', sf.bad === 0 && p2.c.reseeds >= 1 && rms(sf.L, 0.8 * SR, SR) > 0.01, `reseeds ${p2.c.reseeds}`);
  const sf2 = run({}, 1, { at: [[0.3, p => { p.c.s[0] = 1e6; }]] });
  check('safety net: a state thrown far outside the attractor is caught too', sf2.bad === 0 && sf2.p.c.reseeds >= 1 && peak(sf2.L) <= 0.8001);
}

// ===== 11. LFOs =====
{
  const r = run({ l1rate: 1, l1depth: 1, l1shape: 0, l2rate: 1, l2depth: 1, l2shape: 1 }, 3);
  const ms = r.p.posted.filter(x => x.type === 'meter'), as = ms.map(m => m.a), bs = ms.map(m => m.b);
  check('LFO 1 swings alpha by +-3 around 15.6 (held to the safe window 12.5 ... 18), LFO 2 swings beta by +-10 around 28 (held to 24 ... 38)', Math.min(...as) < 12.7 && Math.min(...as) >= 12.5 - 1e-9 && Math.max(...as) > 17.9 && Math.max(...as) <= 18 + 1e-9 && Math.min(...bs) >= 24 - 1e-9 && Math.min(...bs) < 24.2 && Math.max(...bs) > 37.8 && Math.max(...bs) <= 38 + 1e-9,
    `alpha ${Math.min(...as).toFixed(2)} ... ${Math.max(...as).toFixed(2)}, beta ${Math.min(...bs).toFixed(2)} ... ${Math.max(...bs).toFixed(2)}`);
  check('beta is lifted along the line beta >= 24 + 4 * (alpha - 16) in every reading', ms.every(m => m.b >= 24 + 4 * Math.max(0, m.a - 16) - 1e-9), 'checked ' + ms.length + ' readings');
  const off = run({ l1depth: 0, l2depth: 0 }, 1), mo = lastMeter(off.p);
  check('depth 0 = off: alpha and beta stay at their values', Math.abs(mo.a - 15.6) < 1e-9 && Math.abs(mo.b - 28) < 1e-9);
  const dr = run({ l1rate: 1, l1depth: 1, l1shape: 2 }, 12), da = dr.p.posted.filter(x => x.type === 'meter').map(m => m.a);
  let step = 0; for (let i = 1; i < da.length; i++) step = Math.max(step, Math.abs(da[i] - da[i - 1]));
  check('drift LFO: alpha stays within 12.5 ... 18 and moves without jumps (largest step between readings < 0.3, the most a 1 Hz drift can move in 32 ms)', Math.min(...da) >= 12.5 - 1e-9 && Math.max(...da) <= 18 + 1e-9 && step < 0.3, `range ${Math.min(...da).toFixed(2)} ... ${Math.max(...da).toFixed(2)}, step ${step.toFixed(3)}`);
  // the LFO drives the readout: sweeping alpha through the chaotic window makes the exponent change sign
  const sw = run({ alpha: 14.5, l1rate: 0.1, l1depth: 1, l1shape: 0, rate: 400 }, 12), lams = sw.p.posted.filter(x => x.type === 'meter' && x.tau > 20).map(m => m.lam); info('sweep lambda ' + Math.min(...lams).toFixed(2) + ' ... ' + Math.max(...lams).toFixed(2));
  check('sweeping alpha with LFO 1 moves the exponent through both signs (regular and chaotic phases)', Math.min(...lams) < 0.08 && Math.max(...lams) > 0.2, `lambda ${Math.min(...lams).toFixed(2)} ... ${Math.max(...lams).toFixed(2)}`);
}

// ===== 12. presets of the page stay bounded and give the regime they are named for =====
{
  const src = html.match(/const PRESETS = \{([\s\S]*?)\n  \};/)[1]; const PRESETS = new Function('return {' + src + '}')();
  for (const [name, p] of Object.entries(PRESETS)) {
    const r = run(Object.assign({}, p), 8, { sr: 48000 }), m = lastMeter(r.p);
    info(`preset ${name.padEnd(14)} peak ${peak(r.L).toFixed(2)} / ${peak(r.R).toFixed(2)}, lambda ${m.lam.toFixed(2)} (${m.lam > 0.05 ? 'chaotic' : m.lam < -0.05 ? 'settling' : 'periodic'}), pitch ${m.pitch.toFixed(0)} Hz`);
    check(`preset "${name}": finite, bounded, audible`, r.bad === 0 && peak(r.L) <= 0.8001 && Math.max(rms(r.L, 4 * SR, 8 * SR), rms(r.R, 4 * SR, 8 * SR)) > 0.02);
  }
  const want = { 'Double scroll': 'chaotic', 'Single scroll': 'chaotic', 'Limit cycle': 'periodic', 'High cycle': 'periodic', 'Roar': 'chaotic' };
  for (const [name, w] of Object.entries(want)) { const m = lastMeter(run(Object.assign({}, PRESETS[name]), 8).p), got = m.lam > 0.05 ? 'chaotic' : m.lam < -0.05 ? 'settling' : 'periodic'; check(`preset "${name}" is ${w}`, got === w, `lambda ${m.lam.toFixed(3)}`); }
}

// ===== 12b. the safe window: no tipping into the large orbit, no hysteresis, no getting stuck =====
{
  // requested values far outside the window are held inside it
  const r = run({ alpha: 22, beta: 8, asym: 0.5 }, 2), m = lastMeter(r.p);
  check('requested alpha 22, beta 8, asymmetry 0.5 are held to alpha 18, beta 32 (24 + 4 * 2) and asymmetry 0.03', Math.abs(m.a - 18) < 1e-9 && Math.abs(m.b - 32) < 1e-9, `alpha ${m.a}, beta ${m.b}`);
  // a glide walk over the whole old range: every 3 s a new target, the controls move to it smoothly, as a finger or an LFO would; with the rescue switched off the state must stay on the small attractor
  let seed2 = 99; const rnd2 = () => ((seed2 = (seed2 * 1664525 + 1013904223) >>> 0) / 4294967296);
  const sr = 48000, oL = new Float32Array(128), oR = new Float32Array(128);
  const walk = (glide, rescueOn, steps, hold) => {
    const p = worklet(sr); p.c.rescueOn = rescueOn; setParams(p, { rate: 500 }); let cur = { alpha: 15.6, beta: 28, asym: 0 }, blocks = 0, big = 0, mx = 0, endBig = 0;
    for (let step = 0; step < steps; step++) {
      const tg = { alpha: 4 + 18 * rnd2(), beta: 8 + 52 * rnd2(), asym: rnd2() - 0.5 }, nb = Math.floor((glide ? 3 : hold) * sr / 128), st0 = cur;
      for (let b = 0; b < nb; b++) {
        const u = glide ? (b + 1) / nb : 1, q = { alpha: st0.alpha + (tg.alpha - st0.alpha) * u, beta: st0.beta + (tg.beta - st0.beta) * u, asym: st0.asym + (tg.asym - st0.asym) * u };
        p.port.onmessage({ data: { type: 'params', params: q, immediate: !glide } }); p.process([[]], [[oL, oR]]); blocks++;
        const ax = Math.abs(p.c.s[0]); if (step > 0) { if (ax > mx) mx = ax; if (ax > 3) big++; }
      }
      if (Math.abs(p.c.s[0]) > 3) endBig++; cur = tg;
    }
    return { big, blocks, mx, endBig, rescues: p.c.rescues };
  };
  const g = walk(true, false, 24, 0);
  check(`glide walk over the old full range (alpha 4 ... 22, beta 8 ... 60, asymmetry +-0.5; ${(g.blocks * 128 / sr).toFixed(0)} s, rescue off): |x| never above 3, so the state never gets stuck on the large orbit`, g.big === 0 && g.mx < 3, `largest |x| ${g.mx.toFixed(2)}`);
  // abrupt jumps (a preset, a fast fader move) can throw the state out of the small attractor; with the rescue on it must be back at the end of every hold
  const j = walk(false, true, 30, 4);
  info(`jump walk, rescue on: ${j.endBig} of 30 holds ended outside the small attractor, ${j.rescues} restarts by itself, ${(100 * j.big / j.blocks).toFixed(1)} % of the time spent outside`);
  check('jump walk (30 abrupt requests, 4 s each, rescue on): at most 2 of 30 holds end outside the small attractor, and the time spent outside stays below 10 %', j.endBig <= 2 && j.big / j.blocks < 0.1, `${j.endBig} of 30, ${(100 * j.big / j.blocks).toFixed(1)} %`);
}
{
  // kicks: the kick is a third of what it was; how often does one still throw the state out of the small attractor? (rescue off)
  for (const [alpha, beta] of [[15.6, 28], [17, 29], [14.3, 28], [18, 32]]) {
    const sr = 48000, p = worklet(sr); p.c.rescueOn = false; setParams(p, { alpha, beta, rate: 600 }); const oL = new Float32Array(128), oR = new Float32Array(128);
    const blk = t => { for (let b = 0; b < Math.floor(t * sr / 128); b++) p.process([[]], [[oL, oR]]); };
    blk(1); let tips = 0; const N = 60;
    for (let k = 0; k < N; k++) { p.port.onmessage({ data: { type: 'kick' } }); blk(0.5); let mx = 0; for (let b = 0; b < Math.floor(0.3 * sr / 128); b++) { p.process([[]], [[oL, oR]]); mx = Math.max(mx, Math.abs(p.c.s[0])); } if (mx > 3) { tips++; p.c.reset(); } }
    info(`kicks at alpha ${alpha}, beta ${beta}: ${tips} of ${N} left the small attractor (rescue off)`);
    check(`${N} kicks at alpha ${alpha}, beta ${beta}: at most 1 in 15 leaves the small attractor (with the rescue it comes back by itself)`, tips <= 4, tips + ' of ' + N);
  }
}
{
  // rescue: a state thrown onto the large orbit is detected and restarted from rest
  const r = run({ rate: 400 }, 6, { at: [[0.5, p => { p.c.s[0] = 6; p.c.s[1] = 0.5; p.c.s[2] = -3; }]] }), p = r.p;
  let mx = 0; for (let i = 5 * SR; i < r.L.length; i++) mx = Math.max(mx, Math.abs(r.L[i]));
  check('rescue: a state thrown onto the large orbit is detected and restarted from rest within 3 s; it is back on the small attractor and sounding', p.c.rescues >= 1 && Math.abs(p.c.s[0]) < 3 && rms(r.L, 5 * SR, r.L.length) > 0.03 && r.bad === 0, `rescues ${p.c.rescues}, x ${p.c.s[0].toFixed(2)}`);
  let j = 0; for (let i = Math.floor(0.6 * SR); i < r.L.length; i++) j = Math.max(j, Math.abs(r.L[i] - r.L[i - 1]), Math.abs(r.R[i] - r.R[i - 1]));
  check('rescue: the restart is faded, no click after the thrown state is gone (largest step between samples below 0.02 from 0.6 s on)', j < 0.02, 'largest step ' + j.toFixed(4));
  // rescue: a state at rest (the origin is an equilibrium: exactly zero stays zero) is detected as dead and restarted
  const rest = run({ rate: 400 }, 4, { at: [[0.5, p => { p.c.s[0] = 0; p.c.s[1] = 0; p.c.s[2] = 0; p.c.q[0] = 1e-6; }]] });
  check('rescue: a state that has come to rest is detected (speed below 0.05 for 15 tau) and restarted; the circuit sounds again', rest.p.c.rescues >= 1 && rms(rest.L, 3 * SR, rest.L.length) > 0.03, `rescues ${rest.p.c.rescues}`);
  // rescue limit: never more than one restart per 6 s, even if a setting keeps falling
  const dead = run({ alpha: 16, beta: 30, rate: 400 }, 14), pd = dead.p;
  info(`a setting that comes to rest by itself (alpha 16, beta 30): ${pd.c.rescues} restarts in 14 s, lambda ${lastMeter(pd).lam.toFixed(2)}`);
  check('a state that comes to rest is restarted at most once per 6 s and the output stays finite', pd.c.rescues <= 3 && dead.bad === 0);
}
{
  // low end: the slow flipping between the two scrolls
  const sr = 48000, bandAmp = (a, lo, hi, step) => { let s = 0; for (let f = lo; f <= hi; f += step) { const g = goertzel(a, a.length / 2, a.length, f); s += g * g; } return Math.sqrt(s); };
  const full = run({ low: 1, src: 1, rate: 160, tone: 18000 }, 8), cut = run({ low: 0, src: 1, rate: 160, tone: 18000 }, 8), mid = run({ low: 0.25, src: 1, rate: 160, tone: 18000 }, 8);
  const dB = (x, y) => 20 * Math.log10(x / y);
  const lf = dB(bandAmp(full.L, 2, 25, 1), bandAmp(cut.L, 2, 25, 1)), lf2 = dB(bandAmp(mid.L, 2, 25, 1), bandAmp(cut.L, 2, 25, 1));
  const hf = dB(bandAmp(full.L, 60, 400, 10), bandAmp(cut.L, 60, 400, 10));
  check('LOW END 0 takes the slow flipping (2 ... 25 Hz at 160 tau/s) down by more than 10 dB against 100 %', lf > 10, lf.toFixed(1) + ' dB');
  check('LOW END 25 % (the default) is between the two: at least 4 dB below the full low end', dB(bandAmp(full.L, 2, 25, 1), bandAmp(mid.L, 2, 25, 1)) > 4, `100 %: +${lf.toFixed(1)} dB, 25 %: +${lf2.toFixed(1)} dB over 0 %`);
  check('... while the oscillation itself (60 ... 400 Hz) stays within 3 dB', Math.abs(hf) < 3, hf.toFixed(1) + ' dB');
  info(`LOW END: peak X at 100 % ${peak(full.L).toFixed(2)}, 25 % ${peak(mid.L).toFixed(2)}, 0 % ${peak(cut.L).toFixed(2)}`);
}

// ===== 13. recorder =====
{
  const l = load(SR), p = new l.reg['chua-rec'](), posted = l.posted; const a = new Float32Array(128).fill(0.25), b = new Float32Array(128).fill(-0.25);
  for (let i = 0; i < 40; i++) p.process([[a, b]], [[]]);
  p.port.onmessage({ data: { type: 'stop' } });
  const chunks = posted.filter(x => x.type === 'chunk'), frames = chunks.reduce((s, c) => s + c.l.length, 0);
  check('recorder: delivers every frame it was fed (40 blocks of 128) in planar chunks and confirms the stop', frames === 40 * 128 && posted.some(x => x.type === 'done') && chunks[0].l[0] === 0.25 && chunks[0].r[0] === -0.25);
}

// ===== 14. cost =====
{
  for (const [rate, sr] of [[160, 48000], [2000, 44100]]) {
    const r = run({ rate }, 3, { sr }), per = r.ms / (3 * sr / 128), budget = 128 / sr * 1000;
    info(`CPU: rate ${rate} at ${sr} Hz: ${per.toFixed(3)} ms per 128-sample block (budget ${budget.toFixed(2)} ms) = ${(100 * per / budget).toFixed(0)} % of one core in Node on this machine`);
    check(`rate ${rate} at ${sr} Hz fits the real-time budget with margin (< 50 %)`, per < 0.5 * budget, (100 * per / budget).toFixed(0) + ' %');
  }
}
// ===== 15. LFOs up to the audio range (1 kHz): per sample =====
{ // the phase runs per sample at the right speed: 187 blocks of 128 samples
  const blocks = 187, n = blocks * 128, p = worklet(SR); setParams(p, { l1rate: 523.25, l2rate: 997 });
  const z = new Float32Array(128), o1 = new Float32Array(128), o2 = new Float32Array(128); for (let b = 0; b < blocks; b++) p.process([[z, z]], [[o1, o2]]);
  const want1 = (523.25 * n / SR) % 1, want2 = (997 * n / SR) % 1, d = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  check('LFO phase advances per sample: 523.25 Hz and 997 Hz (audio range) after 0.5 s are exactly where they should be', d(p.lfo1.ph, want1) < 1e-6 && d(p.lfo2.ph, want2) < 1e-6, `phase ${p.lfo1.ph.toFixed(6)} / ${p.lfo2.ph.toFixed(6)} (want ${want1.toFixed(6)} / ${want2.toFixed(6)})`);
}
{
  // LFO 1 on alpha at 300 Hz: call the processor one sample at a time and follow alpha itself; it must swing at 300 Hz (+-3, held to the window), per sample
  { const p = worklet(SR); setParams(p, { l1rate: 300, l1depth: 1, l1shape: 0, alpha: 15.6, rate: 160 }); const o1 = new Float32Array(1), o2 = new Float32Array(1), tr = [];
    for (let i = 0; i < 14400; i++) { p.process([[]], [[o1, o2]]); tr.push(p.ea); }
    let cr = 0; for (let i = 1; i < tr.length; i++) if ((tr[i] > 15.6) !== (tr[i - 1] > 15.6)) cr++;
    const lo = Math.min(...tr), hi = Math.max(...tr);
    check('alpha follows LFO 1 at 300 Hz sample by sample: 0.3 s holds 180 crossings of its centre, and (once the depth has glided up) it swings 12.6 ... 18 (the window)', Math.abs(cr - 180) <= 3 && lo < 12.7 && lo >= 12.5 - 1e-9 && hi > 17.9 && hi <= 18 + 1e-9, `${cr} crossings, ${lo.toFixed(2)} ... ${hi.toFixed(2)}`); }
  const fast = run({ src: 2, l1depth: 1, l1rate: 300, rate: 160, alpha: 15.6 }, 4);
  check('alpha swung at 300 Hz: finite, bounded, no restarts, still sounding', fast.bad === 0 && peak(fast.L) <= 0.8001 && fast.p.c.reseeds === 0 && fast.p.c.rescues === 0 && rms(fast.L, SR * 2, SR * 4) > 0.03, `peak ${peak(fast.L).toFixed(3)}, rescues ${fast.p.c.rescues}`);
  for (const shape of [0, 1, 2]) {
    const r = run({ l1rate: 1000, l1depth: 1, l1shape: shape, l2rate: 1000, l2depth: 1, l2shape: shape, level: 1, rate: 600 }, 6), ms = r.p.posted.filter(x => x.type === 'meter');
    check(`both LFOs at 1 kHz, full depth, shape ${shape}: finite, <= 0.8, inside the safe window, at most 2 restarts by the safety net (random parameters at 1 kHz may throw it out once)`, r.bad === 0 && peak(r.L) <= 0.8001 && r.p.c.rescues <= 2 && ms.every(m => m.a >= A_MIN - 1e-9 && m.a <= A_MAX + 1e-9 && m.b >= B_MIN - 1e-9 && m.b <= B_MAX + 1e-9 && m.b >= B_MIN + 4 * Math.max(0, m.a - 16) - 1e-9), `peak ${peak(r.L).toFixed(3)}, rescues ${r.p.c.rescues}`);
  }
}
// ===== 16. nothing flips: the LFO shape crossfades, the output source crossfades =====
{ // changing the LFO shape crossfades over 20 ms: the modulation never jumps
  const p = worklet(SR), lfo = p.lfo1, inc = 40 / SR; let prev = null, maxJump = 0, vAt5 = null, sw = 0;
  for (let i = 0; i < 4000; i++) { const v = lfo.next(inc, i < 2000 ? 0 : 1); if (prev !== null) maxJump = Math.max(maxJump, Math.abs(v - prev)); prev = v; if (i === 2000 + 240) vAt5 = [v, lfo.shapeValue(1, lfo.ph)]; }
  check('changing the LFO shape (sine to triangle at 40 Hz) crossfades: largest step between samples stays below 0.05 (a flip would be up to 2)', maxJump < 0.05, `largest step ${maxJump.toFixed(4)}`);
  check('... and 5 ms after the switch the value is still on its way (the fade takes 20 ms), not at the new shape yet', vAt5 && Math.abs(vAt5[0] - vAt5[1]) > 0.01, vAt5 && (vAt5[0].toFixed(3) + ' vs new ' + vAt5[1].toFixed(3)));
}
{ // output source X / Y -> Z: six weights, two smoothers in a row, about 25 ms
  const p = worklet(SR); setParams(p, { src: 0, width: 1 }); const z = new Float32Array(128), o1 = new Float32Array(128), o2 = new Float32Array(128);
  for (let b = 0; b < 40; b++) p.process([[]], [[o1, o2]]);
  p.port.onmessage({ data: { type: 'params', params: { src: 3 }, immediate: false } }); const w = [];
  for (let b = 0; b < 40; b++) { p.process([[]], [[o1, o2]]); w.push(p.ow[2]); }
  let maxStep = 0, mono = true; for (let b = 1; b < w.length; b++) { maxStep = Math.max(maxStep, Math.abs(w[b] - w[b - 1])); if (w[b] < w[b - 1] - 1e-12) mono = false; }
  const doneAt = w.findIndex(v => v > 0.98) * 128 / SR * 1000;
  check('output source X/Y -> Z: the Z weight rises 0 -> 1 monotone in steps of at most 15 % per 2.7 ms and takes 20 ... 60 ms', mono && maxStep < 0.15 && doneAt > 20 && doneAt < 60, `largest step ${maxStep.toFixed(3)}, done after ${doneAt.toFixed(0)} ms`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
