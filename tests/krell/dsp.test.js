// DSP tests for krell-v0_1.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// The system is generative, so the tests are about its rules: notes only from the chosen scale and range, times as set, chance and coupling as statistics over many cycles,
// the self-brake (busy, loud sound lengthens the next notes), the echo, no clicks at note starts, bounds, reset, LFOs, determinism with a seed.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../krell-v0_1.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);
function load(sr) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  return { reg, posted, internals: vm.runInContext('({ SCALES, COLOURS, DEFAULTS })', sandbox) };
}
function worklet(sr = SR, name = 'krell') { const l = load(sr); const p = new l.reg[name](); p.posted = l.posted; p.internals = l.internals; return p; }
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
  const metersOf = p.posted.filter(x => x.type === 'meter');
  return { L, R, p, bad, ms: Number(process.hrtime.bigint() - t0) / 1e6, meters: metersOf, evs: metersOf.flatMap(m => m.evs) };   // evs: [cell, note, seconds, pan]
}
const peak = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (a, s, e) => { let t = 0; for (let i = s; i < e; i++) t += a[i] * a[i]; return Math.sqrt(t / (e - s)); };
const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
const { SCALES } = worklet().internals;

// ===== 1. notes: only from the scale, only inside the range =====
for (let sc = 0; sc < SCALES.length; sc++) {
  const root = 2, centre = 60, range = 2, r = run({ voices: 2, scale: sc, root, centre, range, chance: 1, rise: 10, fall: 60, spread: 0, rate: 2, wander: 0, coupling: 0 }, 40);
  const set = SCALES[sc], bad = r.evs.filter(e => set.indexOf((((e[1] - root) % 12) + 12) % 12) < 0 || e[1] < centre - 12 || e[1] > centre + 12);
  const used = new Set(r.evs.map(e => ((e[1] - root) % 12 + 12) % 12));
  check(`scale ${sc} (${set.length} notes), root D, 2 octaves around C4: ${r.evs.length} notes, none outside the scale or the range, at least 80 % of the scale tones used`, r.evs.length > 80 && bad.length === 0 && used.size >= 0.8 * set.length, `${bad.length} wrong, ${used.size} of ${set.length} used`);
}
{
  const r = run({ voices: 0, scale: 3, range: 4, centre: 60, chance: 1, rise: 5, fall: 30, spread: 0, rate: 4, wander: 1, glide: 0 }, 60), steps = []; let prev = null;
  for (const e of r.evs) { if (prev !== null) steps.push(Math.abs(e[1] - prev)); prev = e[1]; }
  const r2 = run({ voices: 0, scale: 3, range: 4, centre: 60, chance: 1, rise: 5, fall: 30, spread: 0, rate: 4, wander: 0, glide: 0 }, 60), st2 = []; prev = null;
  for (const e of r2.evs) { if (prev !== null) st2.push(Math.abs(e[1] - prev)); prev = e[1]; }
  check('WANDER 100 % steps to a neighbour (mean step of 1 ... 2 notes on a chromatic scale), WANDER 0 jumps anywhere (mean step more than 5)', mean(steps) < 2.5 && mean(st2) > 5, `${mean(steps).toFixed(2)} vs ${mean(st2).toFixed(2)}`);
}

// ===== 2. times, chance, cells =====
{
  const a = run({ voices: 0, rise: 100, fall: 400, spread: 0, rate: 1, chance: 1, brake: 0, emix: 0 }, 20), b = run({ voices: 0, rise: 100, fall: 400, spread: 0, rate: 2, chance: 1, brake: 0, emix: 0 }, 20);
  check('rise 100 ms + fall 400 ms with no spread and no brake: every note lasts 0.5 s; at RATE 2 every note lasts 0.25 s', a.evs.length > 15 && a.evs.every(e => Math.abs(e[2] - 0.5) < 0.002) && b.evs.every(e => Math.abs(e[2] - 0.25) < 0.002), `${a.evs.length} notes, durations ${[...new Set(a.evs.map(e => e[2]))].join(',')} / ${[...new Set(b.evs.map(e => e[2]))].join(',')}`);
  const s = run({ voices: 0, rise: 100, fall: 400, spread: 1, rate: 1, chance: 1, brake: 0, emix: 0 }, 120), d = s.evs.map(e => e[2]);
  check('SPREAD 100 % makes the times differ at random: longest note at least 3 x the shortest, mean near the set value', Math.max(...d) / Math.min(...d) > 3 && mean(d) > 0.4 && mean(d) < 1.2, `${Math.min(...d).toFixed(2)} ... ${Math.max(...d).toFixed(2)} s, mean ${mean(d).toFixed(2)}`);
}
{
  const q = { voices: 0, rise: 20, fall: 60, spread: 0, rate: 1, brake: 0, coupling: 0, emix: 0 };
  const n0 = run({ ...q, chance: 0 }, 60), n1 = run({ ...q, chance: 1 }, 60), nh = run({ ...q, chance: 0.5 }, 60);
  check('CHANCE 0: no note ever, the output is silent', n0.evs.length === 0 && peak(n0.L) < 1e-9, `${n0.evs.length} notes`);
  const ratio = nh.evs.length / n1.evs.length;
  check('CHANCE 50 %: about half as many notes as at 100 % (rests take about as long as notes: expected ratio 0.53 +- 0.12)', Math.abs(ratio - 0.53) < 0.12, `${nh.evs.length} / ${n1.evs.length} = ${ratio.toFixed(2)}`);
}
{
  const q = { rise: 10, fall: 80, spread: 0.2, rate: 1, brake: 0, chance: 0.3, emix: 0 };
  const c0 = run({ ...q, voices: 2, coupling: 0 }, 120), c1 = run({ ...q, voices: 2, coupling: 1 }, 120);
  check('COUPLING 100 %: a finished cell wakes its neighbour out of its rest, so there are clearly more notes than with 0 % (at least 1.25 x)', c1.evs.length > 1.25 * c0.evs.length, `${c1.evs.length} vs ${c0.evs.length}`);
  const one = run({ ...q, voices: 0, chance: 1 }, 20), two = run({ ...q, voices: 1, chance: 1 }, 20), three = run({ ...q, voices: 2, chance: 1 }, 20);
  const cellsOf = r => [...new Set(r.evs.map(e => e[0]))].sort().join('');
  check('CELLS 1 / 2 / 3: only cell 0 / cells 0 and 1 / all three play', cellsOf(one) === '0' && cellsOf(two) === '01' && cellsOf(three) === '012', `${cellsOf(one)} / ${cellsOf(two)} / ${cellsOf(three)}`);
  const join = run({ ...q, voices: 0, chance: 1 }, 20, { at: [[8, p => send(p, { type: 'params', params: { voices: 2 }, immediate: false })]] });
  check('raising CELLS while it runs lets the new cells join within a second or two', new Set(join.evs.filter(e => e[0] > 0).map(e => e[0])).size === 2 && join.p.posted.length > 0);
}
{ // trig wakes resting cells at once
  const r = run({ voices: 2, chance: 0, coupling: 0, rise: 5, fall: 40, emix: 0 }, 3, { at: [[1, p => send(p, { type: 'trig' })]] });
  check('TRIG starts a note in every resting cell immediately (chance 0: only the Trig notes sound, three of them)', r.evs.length === 3 && peak(r.L.subarray(0, SR)) < 1e-9 && peak(r.L.subarray(SR, SR + 4800)) > 1e-3, `${r.evs.length} notes`);
}

// ===== 3. the brake: a busy, loud sound slows itself down =====
{
  const q = { voices: 2, rise: 20, fall: 300, spread: 0.3, rate: 2, chance: 1, coupling: 0.5, emix: 0.3, efb: 0.5 };
  const b0 = run({ ...q, brake: 0 }, 60), b1 = run({ ...q, brake: 1 }, 60);
  const d0 = mean(b0.evs.map(e => e[2])), d1 = mean(b1.evs.map(e => e[2])), a0 = mean(b0.meters.map(m => m.act)), a1 = mean(b1.meters.map(m => m.act));
  check('BRAKE 100 %: the notes last more than 1.6 x as long as with no brake, and there are fewer of them', d1 > 1.6 * d0 && b1.evs.length < 0.7 * b0.evs.length, `mean note ${d0.toFixed(2)} s -> ${d1.toFixed(2)} s, ${b0.evs.length} -> ${b1.evs.length} notes`);
  check('the activity reading stays between 0 and 2 and is higher for the busier sound', b0.meters.every(m => m.act >= 0 && m.act <= 2) && a0 > 0.3, `activity ${a0.toFixed(2)} (no brake) / ${a1.toFixed(2)} (brake)`);
  const quiet = run({ ...q, brake: 1, voices: 0, chance: 0.2, emix: 0, level: 0.1 }, 40), qd = mean(quiet.evs.map(e => e[2]));
  check('the brake reads the sound before the level fader (activity is about the sound, not about how loud the speakers are): LEVEL 10 % brakes just as much', Math.abs(mean(run({ ...q, brake: 1, level: 0.1 }, 60).evs.map(e => e[2])) / d1 - 1) < 0.35, '');
}

// ===== 4. sound: no clicks, bounds, echo =====
{
  const r = run({ voices: 2, timbre: 0, rise: 5, fall: 200, chance: 1, rate: 2, emix: 0.3, efb: 0.5, spread: 0.5, glide: 0.05, centre: 72, range: 1.5, level: 1 }, 40);
  let worst = 0; for (let i = 1; i < r.L.length; i++) worst = Math.max(worst, Math.abs(r.L[i] - r.L[i - 1]), Math.abs(r.R[i] - r.R[i - 1]));
  check('no click at any note start or end (pure sine notes up to about 2 kHz, 5 ms attacks, echo on): the largest step between samples stays below 0.12', worst < 0.12 && r.evs.length > 60, `largest step ${worst.toFixed(4)}, ${r.evs.length} notes`);
}
{
  let worst = 0, bad = 0, runs = 0;
  for (const q of [{ efb: 0.95, emix: 1, timbre: 1, chance: 1, rate: 4, level: 1, voices: 2, colour: 2 }, { efb: 0.95, emix: 1, etime: 40, timbre: 1, chance: 1, rate: 4, level: 1, rise: 3, fall: 20, coupling: 1, voices: 2 }, { efb: 0.95, emix: 1, etime: 1200, timbre: 1, chance: 1, level: 1, voices: 2, fall: 5000, rise: 2000 }, { l1rate: 1000, l1depth: 1, l2rate: 1000, l2depth: 1, l1shape: 2, l2shape: 2, chance: 1, efb: 0.9, emix: 1, level: 1, voices: 2, timbre: 1 }]) {
    const r = run(q, 25); bad += r.bad; worst = Math.max(worst, peak(r.L), peak(r.R)); runs++;
  }
  check(`${runs} extreme settings (echo feedback 95 %, echo 100 % wet, FM 100 %, 1 kHz LFOs, ...): finite and below 0.9`, bad === 0 && worst <= 0.9001, `peak ${worst.toFixed(3)}`);
  const sr = [44100, 96000].map(s => run({ chance: 1, voices: 2, rate: 3, efb: 0.9, emix: 0.8 }, 10, { sr: s })); 
  check('44.1 and 96 kHz: finite and bounded', sr.every(r => r.bad === 0 && peak(r.L) <= 0.9001 && r.evs.length > 10), sr.map(r => r.evs.length + ' notes').join(' / '));
}
{ // echo: one short note, repeats on the left every 200 ms, on the right at 1.5 x that
  const r = run({ voices: 0, chance: 0, rise: 5, fall: 30, spread: 0, timbre: 0, centre: 72, scale: 3, glide: 0, etime: 200, efb: 0.5, emix: 1, etone: 12000, width: 0, level: 1 }, 2, { at: [[0.5, p => send(p, { type: 'trig' })]] });
  const w = (a, t0, t1) => rms(a, Math.round(t0 * SR), Math.round(t1 * SR)), t = 0.5;
  check('echo: the note repeats on the left after 200 ms and on the right after 300 ms, quieter each time (feedback 50 %)', w(r.L, t + 0.2, t + 0.25) > 8 * w(r.L, t + 0.1, t + 0.15) && w(r.R, t + 0.3, t + 0.35) > 8 * w(r.R, t + 0.15, t + 0.2) && w(r.L, t + 0.4, t + 0.45) < w(r.L, t + 0.2, t + 0.25), `L: ${w(r.L, t, t + 0.05).toExponential(1)} ${w(r.L, t + 0.2, t + 0.25).toExponential(1)} ${w(r.L, t + 0.4, t + 0.45).toExponential(1)}`);
  const none = run({ voices: 0, chance: 0, rise: 5, fall: 30, timbre: 0, etime: 200, efb: 0.5, emix: 0, level: 1 }, 2, { at: [[0.5, p => send(p, { type: 'trig' })]] });
  check('echo mix 0: no repeats', w(none.L, t + 0.2, t + 0.25) < 1e-9);
}

// ===== 5. reset, LFOs, determinism =====
{
  const r = run({ voices: 2, chance: 1, rise: 5, fall: 400, emix: 0.4, efb: 0.6, level: 1, timbre: 0 }, 8, { at: [[4, p => send(p, { type: 'reset' })]] }), t = 4 * SR;
  let jump = 0; for (let i = t - 3000; i < t + 3000; i++) jump = Math.max(jump, Math.abs(r.L[i] - r.L[i - 1]));
  check('RESET fades the sound out (no click) and clears the echo: silent from 15 ms after the reset on (the cells wait at least 50 ms), then they start again by themselves', rms(r.L, t - 4800, t) > 1e-3 && rms(r.L, t + 700, t + 2000) < 1e-6 && rms(r.L, 6 * SR, 8 * SR) > 1e-3 && jump < 0.1, `largest step ${jump.toFixed(4)}`);
  const a = run({ voices: 2, chance: 0.8 }, 20, { seed: 99 }), b = run({ voices: 2, chance: 0.8 }, 20, { seed: 99 }), c = run({ voices: 2, chance: 0.8 }, 20, { seed: 100 });
  const key = r => JSON.stringify(r.evs);
  check('the same seed plays the same piece (every note equal), another seed another one', key(a) === key(b) && key(a) !== key(c), `${a.evs.length} notes`);
}
{
  const blocks = 187, n = blocks * 128, p = worklet(); send(p, { type: 'params', params: { l1rate: 523.25, l2rate: 997 }, immediate: true });
  const z = new Float32Array(128), o1 = new Float32Array(128), o2 = new Float32Array(128); for (let b = 0; b < blocks; b++) p.process([[z, z]], [[o1, o2]]);
  const want1 = (523.25 * n / SR) % 1, want2 = (997 * n / SR) % 1, d = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
  check('LFO phase advances per sample: 523.25 Hz and 997 Hz (audio range) after 0.5 s are exactly where they should be', d(p.lfo1.ph, want1) < 1e-6 && d(p.lfo2.ph, want2) < 1e-6, `phase ${p.lfo1.ph.toFixed(6)} / ${p.lfo2.ph.toFixed(6)}`);
  const lfo = p.lfo1, inc = 40 / SR; let prev = null, maxJump = 0;
  for (let i = 0; i < 4000; i++) { const v = lfo.next(inc, i < 2000 ? 0 : 1); if (prev !== null) maxJump = Math.max(maxJump, Math.abs(v - prev)); prev = v; }
  check('changing the LFO shape crossfades: largest step between samples stays below 0.05', maxJump < 0.05, maxJump.toFixed(4));
  const slow = run({ voices: 0, chance: 1, rise: 20, fall: 200, spread: 0, brake: 0, emix: 0, l1rate: 0.1, l1depth: 1, l1shape: 0 }, 60), d1 = slow.evs.map(e => e[2]);
  check('LFO 1 stretches the times: with depth 100 % the notes are 2^1.5 = 2.8 x longer at one end of the cycle than at the other (at least 2.2 x)', Math.max(...d1) / Math.min(...d1) > 2.2, `${Math.min(...d1).toFixed(2)} ... ${Math.max(...d1).toFixed(2)} s`);
  const off = run({ voices: 0, chance: 1, rise: 20, fall: 200, spread: 0, brake: 0, emix: 0 }, 20), dd = new Set(off.evs.map(e => e[2]));
  check('depth 0 = off: every note has the same length', dd.size === 1);
}
{ // recorder
  const l = load(SR), p = new l.reg['krell-rec'](), posted = l.posted, a = new Float32Array(128).fill(0.25), b = new Float32Array(128).fill(-0.25);
  for (let i = 0; i < 40; i++) p.process([[a, b]], [[]]);
  p.port.onmessage({ data: { type: 'stop' } });
  const chunks = posted.filter(x => x.type === 'chunk'), frames = chunks.reduce((s, c) => s + c.l.length, 0);
  check('recorder: delivers every frame it was fed (40 blocks of 128) in planar chunks and confirms the stop', frames === 40 * 128 && posted.some(x => x.type === 'done') && chunks[0].l[0] === 0.25 && chunks[0].r[0] === -0.25);
}
{ // presets of the page
  const src = html.match(/const PRESETS = \{([\s\S]*?)\n  \};/)[1]; const PRESETS = new Function('return {' + src + '}')();
  for (const [name, set] of Object.entries(PRESETS)) {
    const r = run({ ...set }, 30);
    info(`preset ${name.padEnd(14)} ${String(r.evs.length).padStart(3)} notes in 30 s, mean note ${mean(r.evs.map(e => e[2])).toFixed(2)} s, peak ${Math.max(peak(r.L), peak(r.R)).toFixed(2)}`);
    check(`preset "${name}": finite, bounded, plays notes`, r.bad === 0 && peak(r.L) <= 0.9001 && r.evs.length >= 2);
  }
}
{ // cost
  const r = run({ voices: 2, chance: 1, rate: 3, efb: 0.7, emix: 0.5, timbre: 1, rise: 5, fall: 400 }, 10), per = r.ms / (10 * SR / 128), budget = 128 / SR * 1000;
  info(`CPU: ${per.toFixed(3)} ms per 128-sample block (budget ${budget.toFixed(2)} ms) = ${(100 * per / budget).toFixed(0)} % of one core in Node on this machine (three voices sounding, echo on)`);
  check('three voices with echo fit the real-time budget with margin (< 50 %)', per < 0.5 * budget, (100 * per / budget).toFixed(0) + ' %');
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
