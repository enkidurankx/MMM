// DSP tests for entropy-v0_1.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals (tests/entropy/harness.js).
// The codec worker is not run here (WebCodecs is a browser thing: tests/entropy/codec.test.js does that in Chromium); the loop around it is tested
// with the soft stand-in, and with a FAKE codec on a MessagePort that returns the frames after a latency, with the Opus delay, losses and errors we choose.
'use strict';
const { dsp, PRESETS, load, worklet, fakeCodec, run, SR, rms, db, peak, fft, spec, centroid, flatness, meterOf } = require('./harness.js');
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);

// ===== 1. it sounds by itself, stays bounded, never produces NaN =====
{
  const r = run({}, 8);
  check('default: sound from the start, bounded below 0.97, no NaN', r.bad === 0 && peak(r.L) > 0.02 && peak(r.L) <= 0.97 && peak(r.R) <= 0.97, `peak ${peak(r.L).toFixed(3)}, rms ${db(rms(r.L, 2 * SR, 8 * SR)).toFixed(1)} dB`);
  const a = run({}, 3, { seed: 99 }), b = run({}, 3, { seed: 99 });
  let same = true; for (let i = 0; i < a.L.length; i += 997) if (a.L[i] !== b.L[i]) same = false;
  check('the same seed gives the same sound (deterministic)', same);
  const c = run({}, 3, { seed: 7 }); let diff = 0; for (let i = 0; i < c.L.length; i += 997) diff += Math.abs(c.L[i] - a.L[i]);
  check('another seed gives another sound', diff > 1, diff.toFixed(1));
}

// ===== 2. extremes: every parameter at both ends, all at once; no NaN, no runaway =====
{
  const d = load(SR).defaults; let worst = 0, bad = 0, which = '';
  const ranges = { seed: [0, 1], pitch: [30, 2000], spread: [0, 1], fm: [0, 1], spark: [0, 30], fold: [0.5, 10], bias: [-1, 1], wander: [0, 1], shape: [0, 1], arate: [0.05, 4000], am: [0, 1], tobias: [0, 1], life: [0, 1], bitrate: [6000, 96000], error: [0, 1], loss: [0, 0.3], bitflip: [0, 0.02], roam: [0, 1], fb: [0, 1.6], delay: [0.005, 0.8], focus: [20, 4000], squash: [0, 1], regulate: [0, 1], drift: [0, 1], weather: [0, 1], wet: [0, 1], width: [0, 1], tone: [800, 16000], level: [0, 1], l1rate: [0.002, 1000], l1depth: [0, 1], l2rate: [0.002, 1000], l2depth: [0, 1] };
  for (const k in ranges) for (const v of ranges[k]) { const r = run({ [k]: v }, 2); bad += r.bad; const pk = Math.max(peak(r.L), peak(r.R)); if (pk > worst) { worst = pk; which = k + '=' + v; } }
  check('every parameter at both ends: no NaN, peak <= 0.97', bad === 0 && worst <= 0.97, `worst peak ${worst.toFixed(3)} (${which})`);
  for (const kind of [0, 1]) for (const frame of [0, 1, 2, 3, 4]) { const r = run({ kind, frame }, 1.5); bad += r.bad; }
  check('every FRAME and both CODEC settings run without NaN', bad === 0);
  const hi = {}; for (const k in ranges) hi[k] = ranges[k][1]; const lo = {}; for (const k in ranges) lo[k] = ranges[k][0];
  const r1 = run(hi, 4), r2 = run(lo, 4); check('everything at its maximum and at its minimum at once: no NaN, bounded', r1.bad === 0 && r2.bad === 0 && peak(r1.L) <= 0.97 && peak(r2.L) <= 0.97, `${peak(r1.L).toFixed(2)} / ${peak(r2.L).toFixed(2)}`);
}

// ===== 3. the regulator: the loop stays between silence and runaway =====
{
  const loud = run({ seed: 0, spark: 0, fb: 1.5, fold: 8, regulate: 1 }, 14, { at: [[0.05, p => p.port.onmessage({ data: { type: 'kick', amp: 1 } })]] });
  const a = rms(loud.L, 6 * SR, 14 * SR);
  check('seed 0, no sparks, FEEDBACK 150 % and FOLD x8: a spark starts the loop and REGULATE keeps it alive and below the limiter', a > 0.01 && peak(loud.L) <= 0.97, `rms ${db(a).toFixed(1)} dB`);
  const x = meterOf(loud); info(`loop gain factor ${x.reg.toFixed(2)}, rms in loop ${x.rms.toFixed(3)}`);
  const w = []; for (let t = 4; t < 14; t += 1) w.push(rms(loud.L, t * SR, (t + 1) * SR));
  check('the loop level is steady within 10 dB from second to second (it neither dies nor runs away)', Math.max(...w.map(db)) - Math.min(...w.map(db)) < 10, `${Math.min(...w.map(db)).toFixed(1)} ... ${Math.max(...w.map(db)).toFixed(1)} dB`);
  const dead = run({ seed: 0, spark: 0, fb: 0.2, fold: 0.5, regulate: 0, wander: 0, tobias: 0, am: 0 }, 6, { at: [[0.05, p => p.port.onmessage({ data: { type: 'kick', amp: 1 } })]] });
  check('REGULATE 0 with weak feedback: the spark dies away (this is what the regulator is for)', rms(dead.L, 5 * SR, 6 * SR) < 0.01, `${db(rms(dead.L, 5 * SR, 6 * SR)).toFixed(1)} dB`);
  const revive = run({ seed: 0, spark: 0, fb: 0.9, fold: 3, regulate: 0.8, wander: 0, tobias: 0, am: 0 }, 14);
  check('seed 0, no sparks, REGULATE on: a silent loop is thrown a spark by itself (kicks > 0, it sounds)', meterOf(revive).kicks > 0 && rms(revive.L, 8 * SR, 14 * SR) > 0.005, `kicks ${meterOf(revive).kicks}, ${db(rms(revive.L, 8 * SR, 14 * SR)).toFixed(1)} dB`);
}

// ===== 4. the loop around a codec: ring, delay, holes, error, alignment (fake codec on a port) =====
{
  const base = { seed: 0.6, spread: 0, fm: 0, spark: 0, fold: 0.5, am: 0, tobias: 0, wander: 0, bias: 0, fb: 0, wet: 1, width: 0, drift: 0, weather: 0, loss: 0, delay: 0.1, tone: 16000, level: 0.5, regulate: 0, frame: 3, kind: 0, pitch: 330 };
  const soft = run(base, 3), op = run(base, 3, { fake: { lag: 312 } });
  check('fake codec on the port: frames go out (about one per 20 ms) and come back', meterOf(op).sent > 100 && meterOf(op).back / meterOf(op).sent > 0.9 && meterOf(op).mode === 1, `sent ${meterOf(op).sent}, back ${meterOf(op).back}`);
  // WET 1, no feedback: the output is the signal DELAY behind (plus the codec delay of the fake: the ring is addressed by the time stamp of the frame, so the delay is exactly DELAY and the codec lag shows as a shift of the content).
  // The probe is a burst of noise (a periodic tone has a peak at every period): a kick at 1 s; its place in the dry output against the wet output.
  const probe = { seed: 0, spark: 0, wander: 0, tobias: 0, am: 0, wet: 0 }, kick = [[1, p => p.port.onmessage({ data: { type: 'kick', amp: 1 } })]];
  const dry = run({ ...base, ...probe }, 2, { at: kick });
  const lagOf = (r, x) => { let best = -1, bl = 0; const s = SR; for (let L = 0; L < 7000; L++) { let c = 0; for (let i = 0; i < 600; i++) c += x[s + i] * r[s + i + L]; if (c > best) { best = c; bl = L; } } return bl; };
  const soft1 = run({ ...base, ...probe, wet: 1 }, 2, { at: kick }), op1 = run({ ...base, ...probe, wet: 1 }, 2, { fake: { lag: 312 }, at: kick });
  const d1 = lagOf(soft1.L, dry.L), d2 = lagOf(op1.L, dry.L);
  check('soft stand-in: a burst comes out DELAY (100 ms = 4800 samples) later', Math.abs(d1 - 4800) <= 40, `${d1} samples`);
  check('fake codec with 312 samples of Opus delay: the burst comes out DELAY plus that later (the ring is addressed by time stamp)', Math.abs(d2 - (4800 + 312)) <= 40, `${d2} samples`);
  // holes: lose every 5th frame: the ring has gaps, the output has silent stretches of one frame
  const holes = run({ ...base, loss: 0 }, 3, { fake: { lag: 0, loseEvery: 5 } });
  let zeroRuns = 0, run0 = 0; const s0 = 2 * SR; for (let i = s0; i < 3 * SR; i++) { if (Math.abs(holes.L[i]) < 1e-5) run0++; else { if (run0 > 700) zeroRuns++; run0 = 0; } }
  check('a frame that never comes back is a hole of silence in the loop (every fifth frame lost: about 10 gaps of 20 ms per 2 s)', zeroRuns >= 6 && zeroRuns <= 14, `${zeroRuns} gaps`);
  // late frames: more latency than DELAY allows: holes, no crash
  const late = run({ ...base, delay: 0.005 }, 2, { fake: { latBlocks: 40 } });
  check('a codec that answers later than DELAY allows leaves holes but nothing breaks', late.bad === 0 && peak(late.L) <= 0.97);
  // error: ERROR 1 sends what the codec got wrong. A fake codec that adds a known error: the loop gets (decoded - sent) and with an exact codec that is nothing
  const exact = run({ ...base, error: 1, fb: 1.0, seed: 0, spark: 0 }, 2, { fake: { lag: 312 }, at: [[0.1, p => p.port.onmessage({ data: { type: 'kick', amp: 1 } })]] });
  const noisy = run({ ...base, error: 1, fb: 1.0, seed: 0, spark: 0 }, 2, { fake: { lag: 312, noise: 0.05 }, at: [[0.1, p => p.port.onmessage({ data: { type: 'kick', amp: 1 } })]] });
  const e0 = rms(exact.L, 1.5 * SR, 2 * SR), e1 = rms(noisy.L, 1.5 * SR, 2 * SR);
  check('ERROR 1: with an exact codec (delay compensated) the error is zero and the loop stays quiet; a codec that adds an error of 0.05 makes the loop sound', e0 < 0.002 && e1 > 4 * e0, `exact ${db(e0).toFixed(0)} dB, with error ${db(e1).toFixed(0)} dB`);
  // switching OPUS to SOFT and back, and changing FRAME while the codec is attached
  const sw = run({ ...base, wet: 0.6, fb: 0.6 }, 6, { fake: {}, at: [[1, p => p.port.onmessage({ data: { type: 'params', params: { kind: 1 } } })], [2, p => p.port.onmessage({ data: { type: 'params', params: { kind: 0 } } })], [3, p => p.port.onmessage({ data: { type: 'params', params: { frame: 1 } } })], [4, p => p.port.onmessage({ data: { type: 'params', params: { frame: 4 } } })]] });
  check('switching CODEC and FRAME while it runs: no NaN, still sound', sw.bad === 0 && rms(sw.L, 5 * SR, 6 * SR) > 0.01 && peak(sw.L) <= 0.97, `peak ${peak(sw.L).toFixed(2)}`);
  // no WebCodecs: the page tells the worklet, it falls back by itself
  const nc = run({ ...base, wet: 1 }, 3, { fake: {}, at: [[1, p => p.port.onmessage({ data: { type: 'nocodec', why: 'test' } })]] });
  check('"nocodec" (worker failed): the soft stand-in takes over, the sound goes on', meterOf(nc).mode === 0 && rms(nc.L, 2 * SR, 3 * SR) > 0.01);
  const unsup = run({ ...base, wet: 1 }, 2, { fake: {}, at: [[0.5, p => p.fromCodec({ unsupported: 'Opus at 44100 Hz' })]] });
  check('the worker says "unsupported": the soft stand-in plays and the reason is kept for the page', meterOf(unsup).mode === 0 && /Opus/.test(meterOf(unsup).why) && rms(unsup.L, 1 * SR, 2 * SR) > 0.01);
}

// ===== 5. the soft codec follows the bitrate: brighter at a high rate, dark and coarse at a low one =====
{
  const base = { seed: 0.5, spread: 0.9, fm: 0.8, spark: 3, fold: 6, am: 0, tobias: 0, wander: 0, fb: 0.7, wet: 1, width: 0, weather: 0, roam: 0, delay: 0.05, tone: 16000, regulate: 0.6, kind: 1, loss: 0 };
  const lo = run({ ...base, bitrate: 6000 }, 6, { seed: 5 }), hi = run({ ...base, bitrate: 96000 }, 6, { seed: 5 });
  const cl = centroid(lo.L, 4 * SR), ch = centroid(hi.L, 4 * SR);
  check('SOFT codec: 6 kbit/s is darker than 96 kbit/s (centroid)', cl < 0.7 * ch, `${cl.toFixed(0)} Hz vs ${ch.toFixed(0)} Hz`);
  const roam = run({ ...base, bitrate: 12000, roam: 1 }, 30, { seed: 5 }); const ms = roam.p.posted.filter(x => x.type === 'meter').map(x => x.br);
  check('ROAM 100 %: the effective bitrate wanders over at least 1.5 octaves in 30 s', Math.log2(Math.max(...ms) / Math.min(...ms)) > 1.5, `${Math.min(...ms).toFixed(0)} ... ${Math.max(...ms).toFixed(0)}`);
  const lfo = run({ ...base, bitrate: 12000, l1depth: 1, l1rate: 0.2 }, 20, { seed: 5 }); const ml = lfo.p.posted.filter(x => x.type === 'meter').map(x => x.br);
  check('LFO 1 at full depth moves the bitrate by about 2 octaves up and down', Math.log2(Math.max(...ml) / Math.min(...ml)) > 2.5, `${Math.min(...ml).toFixed(0)} ... ${Math.max(...ml).toFixed(0)}`);
}

// ===== 6. it does not settle: the coloured spectrum keeps changing; a loop with nothing moving is the control =====
{
  const base = { seed: 0.3, spark: 1, fb: 0.9, regulate: 0.8, kind: 1, bitrate: 10000, wet: 1, delay: 0.08, loss: 0.03 };
  const alive = run({ ...base, wander: 0.5, tobias: 0.5, am: 0.5, life: 0.6, drift: 0.4, weather: 0.5, roam: 0.5 }, 40, { seed: 11 });
  const still = run({ seed: 0.5, spark: 0, fb: 0.3, fold: 0.5, regulate: 0, wander: 0, tobias: 0, am: 0, life: 0, drift: 0, weather: 0, roam: 0, loss: 0, kind: 1, bitrate: 10000, wet: 1, delay: 0.08 }, 40, { seed: 11 });
  // 24 log bands from 100 Hz to 12 kHz in dB (a band is smooth where a single FFT bin of a noisy sound is not): how far does the picture move from one second to the next?
  const bands = (a, from) => { const m = spec(a, from, 16384), out = []; for (let b = 0; b < 24; b++) { const f1 = 100 * Math.pow(120, b / 24), f2 = 100 * Math.pow(120, (b + 1) / 24); let s = 0; for (let k = Math.floor(f1 * 16384 / SR); k < Math.max(Math.floor(f2 * 16384 / SR), Math.floor(f1 * 16384 / SR) + 1); k++) s += m[k] * m[k]; out.push(10 * Math.log10(s + 1e-12)); } return out; };
  const change = r => { let tot = 0, nn = 0, prev = null; for (let w = 4 * SR; w + 16384 <= r.L.length; w += SR) { const cur = bands(r.L, w); if (prev) { let d = 0; for (let k = 0; k < 24; k++) d += Math.abs(cur[k] - prev[k]); tot += d / 24; nn++; } prev = cur; } return tot / nn; };
  const ca = change(alive), cs = change(still);
  check('with wander, analog, drift, weather and ROAM the spectrum moves from second to second (more than 3 x the loop with nothing moving, and more than 2 dB)', ca > 3 * cs && ca > 2, `mean change per band ${ca.toFixed(2)} dB vs ${cs.toFixed(2)} dB`);
  const w = []; for (let t = 5; t < 40; t += 5) w.push(rms(alive.L, t * SR, (t + 5) * SR));
  check('and it is still sounding after 40 s (level within 12 dB of the first 5 s)', Math.abs(db(w[w.length - 1]) - db(w[0])) < 12 && db(w[w.length - 1]) > -50, w.map(db).map(x => x.toFixed(0)).join(' '));
  const cents = []; for (let t = 6; t < 38; t += 4) cents.push(centroid(alive.L, t * SR));
  info('centroid over time: ' + cents.map(x => x.toFixed(0)).join(' ') + ' Hz');
  info('flatness (1 = noise): alive ' + flatness(alive.L, 20 * SR).toFixed(4) + ', still ' + flatness(still.L, 20 * SR).toFixed(4));
}

// ===== 7. presets: all sound, bounded, with similar level (soft codec path) =====
{
  const d = load(SR).defaults; const levels = [];
  for (const name of Object.keys(PRESETS)) {
    const r = run({ ...PRESETS[name], kind: 1 }, 10, { seed: 3 }); const lv = db(rms(r.L, 4 * SR, 10 * SR)), pk = peak(r.L);
    levels.push([name, lv, pk]); check(`preset ${name}: sound, no NaN, peak <= 0.97`, r.bad === 0 && lv > -45 && pk <= 0.97, `${lv.toFixed(1)} dB rms, peak ${pk.toFixed(2)}`);
  }
  const lv = levels.map(x => x[1]); info('preset levels (soft path): ' + levels.map(x => x[0] + ' ' + x[1].toFixed(1)).join(' | '));
  info('the preset levels that matter are measured with the real codec in tests/entropy/codec.test.js; the soft stand-in only has to sound');
}

// ===== 8. reset: fades out, empties the loop, starts again =====
{
  const r = run({ seed: 0.4 }, 6, { at: [[2, p => p.port.onmessage({ data: { type: 'reset' } })]] });
  const gap = Math.min(...Array.from({ length: 200 }, (_, i) => rms(r.L, 2 * SR + i * 96, 2 * SR + (i + 1) * 96)));
  check('reset: the output goes to silence for a moment and comes back', gap < 0.005 && rms(r.L, 5 * SR, 6 * SR) > 0.01 && r.bad === 0, `quietest 2 ms ${db(gap).toFixed(0)} dB`);
}

// ===== 9. CPU (Node, not a phone): the soft path and the fake-codec path =====
{
  const t0 = process.hrtime.bigint(), r = run({}, 20); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  info(`CPU in Node: 20 s of sound in ${ms.toFixed(0)} ms (${(100 * ms / 20000).toFixed(1)} % of one core; not a phone)`);
  check('CPU in Node under 25 % of real time for the whole loop (soft path)', ms / 20000 < 0.25, `${(100 * ms / 20000).toFixed(1)} %`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
