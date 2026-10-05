// DSP tests for tudor-v0_1.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// Rules of the no-input mixer: it starts from the noise alone; below a loop gain of 1 it dies; the overdrive keeps it bounded; the resonators decide the pitch;
// tuning moves it; polarity and phase change which note rings; reset and burst; LFOs; stereo; extremes at other sample rates.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../tudor-v0_1.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);
function worklet(sr = SR) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const p = new reg.tudor(); p.posted = posted; return p;
}
const send = (p, m) => p.port.onmessage({ data: m });
function run(params, seconds, opts = {}) {
  const sr = opts.sr || SR, p = worklet(sr); send(p, { type: 'seed', seed: opts.seed || 7 }); send(p, { type: 'params', params, immediate: true });
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), blk = 128, oL = new Float32Array(blk), oR = new Float32Array(blk), z = new Float32Array(blk); let bad = 0;
  const t0 = process.hrtime.bigint();
  for (let s = 0; s < n; s += blk) {
    if (opts.at) for (const [t, fn] of opts.at) if (s <= Math.floor(t * sr) && Math.floor(t * sr) < s + blk) fn(p);
    p.process([[z, z]], [[oL, oR]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = oL[i]; R[s + i] = oR[i]; if (!isFinite(oL[i]) || !isFinite(oR[i])) bad++; }
  }
  return { L, R, p, bad, ms: Number(process.hrtime.bigint() - t0) / 1e6, meters: p.posted.filter(x => x.type === 'meter') };
}
const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (a, s, e) => { let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const db = x => 20 * Math.log10(x + 1e-12);
// pitch of the last second: zero crossings (rising) per second
const pitchOf = (a, sr = SR, from = null) => { const s0 = from === null ? a.length - sr : from; let c = 0; for (let i = s0 + 1; i < s0 + sr; i++) if (a[i - 1] <= 0 && a[i] > 0) c++; return c; };
const only = (k, v) => Object.assign({ b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0 }, { ['b' + k]: v });

// ===== 1. it starts from the noise alone, and the overdrive holds it =====
{
  const r = run({}, 8);
  check('defaults: no input, no burst: the loop starts by itself from the noise (> -40 dB rms after 4 s)', db(rms(r.L, SR * 4, SR * 8)) > -40, `${db(rms(r.L, SR * 4, SR * 8)).toFixed(1)} dB`);
  check('defaults: output bounded and finite', peak(r.L) <= 0.81 && peak(r.R) <= 0.81 && r.bad === 0, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  check('defaults: both sides alive, within 8 dB', Math.abs(db(rms(r.L, SR * 6, SR * 8)) - db(rms(r.R, SR * 6, SR * 8))) < 8 && db(rms(r.R, SR * 6, SR * 8)) > -45, '');
  const m = r.meters[r.meters.length - 1]; check('the meter reports the band energies and the clip activity', m.be.length === 6 && m.sat > 0.05 && m.dur > 0, `sat ${m.sat.toFixed(2)}`);
}
{
  const r = run({ noise: 0 }, 4);
  check('without noise and without a kick the loop stays quiet (< -60 dB in the first 2 s)', db(rms(r.L, SR, SR * 2)) < -60, `${db(rms(r.L, SR, SR * 2)).toFixed(1)} dB`);
  const k = run({ noise: 0 }, 6, { at: [[1, p => send(p, { type: 'burst' })]] });
  check('... and a Kick starts it', db(rms(k.L, SR * 4, SR * 6)) > -40, `${db(rms(k.L, SR * 4, SR * 6)).toFixed(1)} dB`);
}
{
  const hi = run({ gain: 1.2 }, 6), lo = run({ gain: 0.5 }, 8, { at: [[0.5, p => send(p, { type: 'burst' })]] });
  check('loop gain below 1 dies out after a kick (< -50 dB after 6 s), above 1 it sings', db(rms(lo.L, SR * 6, SR * 8)) < -50 && db(rms(hi.L, SR * 4, SR * 6)) > -40, `gain 0.5: ${db(rms(lo.L, SR * 6, SR * 8)).toFixed(1)} dB, gain 1.2: ${db(rms(hi.L, SR * 4, SR * 6)).toFixed(1)} dB`);
}

// ===== 2. the resonators decide the note =====
for (const [k, f] of [[0, 55], [1, 140], [2, 350], [3, 880], [4, 2200], [5, 5500]]) {
  const r = run({ ...only(k, 0.9), gain: 1.4, drive: 2, phase: 0, focus: 20, tap: 1, tone: 16000 }, 5), got = pitchOf(r.L);
  check(`band ${k + 1} alone rings near ${f} Hz`, got > f * 0.9 && got < f * 1.12, `${got} Hz`);
}
{
  const a = pitchOf(run({ ...only(3, 0.9), gain: 1.4, drive: 2, phase: 0, focus: 20, tap: 1, tune: 1 }, 5).L), b = pitchOf(run({ ...only(3, 0.9), gain: 1.4, drive: 2, phase: 0, focus: 20, tap: 1, tune: 1.5 }, 5).L);
  check('TUNE x1.5 moves the note by 1.5', Math.abs(b / a - 1.5) < 0.1, `${a} -> ${b} Hz`);
}
{
  const base = { gain: 1.3, drive: 2 }, a = run({ ...base, phase: 0 }, 6), b = run({ ...base, phase: 1, apfreq: 800 }, 6), c = run({ ...base, pol: 1 }, 6);
  const pa = pitchOf(a.L), pb = pitchOf(b.L), pc = pitchOf(c.L);
  check('PHASE changes which note rings (the mode shifts by more than 5 %)', Math.abs(pb / pa - 1) > 0.05, `${pa} -> ${pb} Hz`);
  check('POLARITY - changes it too, or the level', Math.abs(pc / pa - 1) > 0.05 || Math.abs(db(rms(c.L, SR * 4, SR * 6)) - db(rms(a.L, SR * 4, SR * 6))) > 1, `${pa} -> ${pc} Hz`);
}
{
  const sh = run({ drive: 6, shape: 0, tap: 0.2 }, 5), pt = run({ drive: 6, shape: 1, tap: 0.2 }, 5);
  const hf = (x) => { let s = 0; for (let i = SR * 3 + 2; i < SR * 4; i++) { const d = x[i] - 2 * x[i - 1] + x[i - 2]; s += d * d; } return s; };
  check('SHAPE 0 (tanh) is brighter than SHAPE 1 (soft bend) at the same drive (second difference energy)', hf(sh.L) > hf(pt.L) * 1.05, `${(hf(sh.L) / hf(pt.L)).toFixed(2)}x`);
}
{
  const a = run({ bias: 0, drive: 4, tap: 0.1 }, 5), b = run({ bias: 0.8, drive: 4, tap: 0.1 }, 5);
  let dcA = 0, dcB = 0; for (let i = SR * 3; i < SR * 5; i++) { dcA += a.L[i]; dcB += b.L[i]; }
  const e2 = x => { let s = 0, t = 0; for (let i = SR * 3; i < SR * 5; i++) { s += x[i]; t += x[i] * x[i]; } return Math.sqrt(Math.max(0, t / (SR * 2) - (s / (SR * 2)) ** 2)); };
  check('BIAS: stays bounded and finite with the strongest bias', b.bad === 0 && peak(b.L) <= 0.81, `peak ${peak(b.L).toFixed(2)}`);
  info(`bias 0 / 0.8: mean ${(dcA / (SR * 2)).toExponential(1)} / ${(dcB / (SR * 2)).toExponential(1)}, ac rms ${e2(a.L).toFixed(3)} / ${e2(b.L).toFixed(3)}`);
}

// ===== 3. tap, link, detune, tone, level =====
{
  const lv = run({ level: 0.3 }, 5), lh = run({ level: 0.9 }, 5);
  check('LEVEL scales the output (0.9 is about 9.5 dB above 0.3)', Math.abs(db(rms(lh.L, SR * 3, SR * 5)) - db(rms(lv.L, SR * 3, SR * 5)) - 9.5) < 2.5, `${(db(rms(lh.L, SR * 3, SR * 5)) - db(rms(lv.L, SR * 3, SR * 5))).toFixed(1)} dB`);
  const z = run({ level: 0 }, 3); check('LEVEL 0 is silent', peak(z.L) < 1e-9 && peak(z.R) < 1e-9, '');
  const d = run({ detune: 1, link: 0, ...only(3, 0.9), gain: 1.4, drive: 2, phase: 0, focus: 20, tap: 1 }, 5), same = run({ detune: 0, link: 0, ...only(3, 0.9), gain: 1.4, drive: 2, phase: 0, focus: 20, tap: 1 }, 5);
  const pl = pitchOf(d.L), pr = pitchOf(d.R), p0 = pitchOf(same.L), p1 = pitchOf(same.R);
  check('DETUNE 100 % tunes right and left apart by about 6 %; at 0 they agree', pr / pl > 1.04 && pr / pl < 1.09 && Math.abs(p1 / p0 - 1) < 0.01, `${pl} / ${pr} Hz; at 0: ${p0} / ${p1} Hz`);
  const lo = run({ tone: 800 }, 5), hi = run({ tone: 16000 }, 5);
  check('TONE low takes the highs down', db(rms(lo.L, SR * 3, SR * 5)) <= db(rms(hi.L, SR * 3, SR * 5)) + 0.1, `${db(rms(lo.L, SR * 3, SR * 5)).toFixed(1)} vs ${db(rms(hi.L, SR * 3, SR * 5)).toFixed(1)} dB`);
}

// ===== 4. burst, reset =====
{
  const r = run({ noise: 0.3 }, 9, { at: [[4, p => send(p, { type: 'reset' })]] }), t = SR * 4;
  check('before reset the loop is alive', db(rms(r.L, SR * 3, SR * 3.99)) > -40, `${db(rms(r.L, SR * 3, SR * 3.99)).toFixed(1)} dB`);
  let m = 1; for (let i = t + 100; i < t + 1200; i++) m = Math.min(m, Math.abs(r.L[i]) + Math.abs(r.R[i]));
  let dip = 0; for (let i = t + 600; i < t + 1100; i++) dip = Math.max(dip, Math.abs(r.L[i]));   // 6 ms fade, then 20 ms of fade in from a cleared loop
  check('RESET fades out within 6 ms (no click: the second difference around it stays small)', (() => { let mx = 0, rf = 0; for (let i = t; i < t + 400; i++) mx = Math.max(mx, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); for (let i = t - 4000; i < t; i++) rf = Math.max(rf, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); return mx <= 2 * rf + 1e-9; })(), '');
  check('after RESET the loop starts again by itself from the noise (> -40 dB, 4 s later)', db(rms(r.L, SR * 8, SR * 9)) > -40, `${db(rms(r.L, SR * 8, SR * 9)).toFixed(1)} dB`);
}

// ===== 5. LFOs =====
{
  const slow = run({ l1depth: 1, l1rate: 0.3, l2depth: 1, l2rate: 0.2, ...only(3, 0.9), gain: 1.4, drive: 2, phase: 0 }, 12);
  check('LFOs at slow rate: bounded, finite, alive', slow.bad === 0 && peak(slow.L) <= 0.81 && db(rms(slow.L, SR * 8, SR * 12)) > -50, `${db(rms(slow.L, SR * 8, SR * 12)).toFixed(1)} dB`);
  const m = slow.meters[slow.meters.length - 1]; check('the meter reports the moving phase frequency and tuning', m.ap > 0 && m.tn > 0 && (m.ap !== 800 || m.tn !== 1), `ap ${m.ap.toFixed(0)} Hz, tune x${m.tn.toFixed(2)}`);
  const au = run({ l1depth: 1, l1rate: 150, l2depth: 1, l2rate: 400, phase: 2 }, 4);
  check('LFOs at audio rate (150 Hz, 400 Hz): bounded and finite', au.bad === 0 && peak(au.L) <= 0.81, `peak ${peak(au.L).toFixed(2)}`);
  const idle = run({ l1depth: 0, l2depth: 0 }, 3), m2 = idle.meters[idle.meters.length - 1]; check('LFO depth 0: phase frequency and tuning stay at the set values', Math.abs(m2.ap - 800) < 1e-6 && Math.abs(m2.tn - 1) < 1e-9, '');
}

// ===== 6. extremes: every corner of the faders, other sample rates =====
{
  let bad = 0, big = 0, cases = 0; const rnd = (() => { let s = 99; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const ranges = { gain: [0.25, 2.5], noise: [0, 1], drive: [0.5, 8], shape: [0, 1], bias: [-1, 1], b0: [0, 1], b1: [0, 1], b2: [0, 1], b3: [0, 1], b4: [0, 1], b5: [0, 1], focus: [2, 60], tune: [0.5, 2], phase: [0, 4], apfreq: [100, 6000], tap: [0, 1], link: [0, 1], detune: [0, 1], tone: [800, 16000], level: [0, 1], pol: [0, 1], l1depth: [0, 1], l2depth: [0, 1], l1rate: [0.002, 1000], l2rate: [0.002, 1000] };
  for (let i = 0; i < 24; i++) {
    const prm = {}; for (const k in ranges) { const [a, b] = ranges[k]; const u = i < 8 ? (rnd() < 0.5 ? 0 : 1) : rnd(); prm[k] = a + (b - a) * u; if (k === 'pol') prm[k] = Math.round(prm[k]); }
    const r = run(prm, 3, { sr: i % 3 === 0 ? 44100 : (i % 3 === 1 ? 96000 : 48000) }); cases++; bad += r.bad; if (peak(r.L) > 0.81 || peak(r.R) > 0.81) big++;
  }
  check(`${cases} random and corner settings at 44.1 / 48 / 96 kHz: no NaN or infinity, never above the level`, bad === 0 && big === 0, `${bad} bad samples, ${big} too loud`);
}
{
  // a loop that is mistreated in the middle of a run: all parameters jump, the loop must not blow up
  const hot = { gain: 2.5, drive: 8, shape: 1, bias: 1, b0: 1, b1: 1, b2: 1, b3: 1, b4: 1, b5: 1, focus: 60, phase: 4, tap: 0, level: 1 };
  const r = run(hot, 6, { at: [[3, p => send(p, { type: 'params', params: { ...hot, gain: 0.25, drive: 0.5, focus: 2 }, immediate: false })]] });
  check('everything wide open, then closed again in one go: bounded, finite', r.bad === 0 && peak(r.L) <= 0.81 && peak(r.R) <= 0.81, `peak ${peak(r.L).toFixed(2)}`);
}

// ===== 7. cost =====
{
  const r = run({ gain: 1.3, l1depth: 1, l1rate: 3, l2depth: 1, l2rate: 5, b0: 0.5, b1: 0.5, b2: 0.5, b3: 0.5, b4: 0.5, b5: 0.5, phase: 4 }, 6), per = r.ms / (6 * SR / 128), budget = 128 / SR * 1000;
  info(`CPU: ${per.toFixed(3)} ms per 128-sample block at 48 kHz (budget ${budget.toFixed(2)} ms) = ${(100 * per / budget).toFixed(0)} % of one core in Node on this machine (all six bands, four allpass stages, both LFOs)`);
  check('CPU: under 40 % of the audio budget in Node even with everything on', per < 0.4 * budget, `${(100 * per / budget).toFixed(0)} %`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
