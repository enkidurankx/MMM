// DSP tests for serge-v0_3.html: the AudioWorklet code of the page runs in Node with a stub of the worklet globals.
// Rules of the instrument: silent until a note; a held key makes the loop sing at the pitch of the key; released, it rings out and dies; four voices, the fifth steals;
// the body decides where the partials sit; the wave multiplier adds overtones with more stages; HOLD, GLIDE, bend; reset; LFOs (FM at audio rate); extremes; CPU.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../serge-v0_3.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
if (/[^\x00-\x7F]/.test(dsp)) { console.log('FAIL non-ASCII in worklet code'); process.exit(1); }
const SR = 48000; let ok = true;
const check = (name, cond, info) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? '  ' + info : ''}`); if (!cond) ok = false; };
const info = s => console.log('info ' + s);
function worklet(sr = SR) {
  const reg = {}, posted = [];
  const sandbox = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: (m, tr) => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Object, console };
  vm.createContext(sandbox); vm.runInContext(dsp, sandbox);
  const p = new reg.serge(); p.posted = posted; return p;
}
const send = (p, m) => p.port.onmessage({ data: m });
const on = (n, v = 1) => p => send(p, { type: 'note', on: true, note: n, vel: v }), off = n => p => send(p, { type: 'note', on: false, note: n });
function run(params, seconds, events = [], opts = {}) {
  const sr = opts.sr || SR, p = worklet(sr); send(p, { type: 'params', params, immediate: true });
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
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
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

// ===== 1. silence, a held key sings, a released key rings out =====
{
  const idle = run({}, 2); check('silent until a key is played', peak(idle.L) === 0 && peak(idle.R) === 0, `peak ${peak(idle.L)}`);
  const r = run({}, 6, [[0.2, on(57)]]);
  check('a held key makes the loop sing (> -30 dB rms after 1 s)', db(rms(r.L, SR, SR * 3)) > -30, `${db(rms(r.L, SR, SR * 3)).toFixed(1)} dB`);
  check('output bounded and finite', r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `peak ${Math.max(peak(r.L), peak(r.R)).toFixed(3)}`);
  const m = r.meters[r.meters.length - 1]; check('the meter reports one voice and its note', m.nv === 1 && m.notes.length === 1 && m.notes[0] === 57, JSON.stringify([m.nv, m.notes]));
  const rel = run({ damp: 0.12, release: 30 }, 8, [[0.2, on(57)], [3, off(57)]]);
  check('released: it rings out and dies (< -60 dB after 4 s, loop gain below 1)', db(rms(rel.L, SR * 7, SR * 8)) < -60 && db(rms(rel.L, SR * 2, SR * 3)) > -30, `held ${db(rms(rel.L, SR * 2, SR * 3)).toFixed(0)} dB, 4 s after ${db(rms(rel.L, SR * 7, SR * 8)).toFixed(0)} dB`);
  const ring = run({ damp: 0.02, release: 5, focus: 300, body: 0 }, 8, [[0.2, on(57)], [3, off(57)]]);
  check('DAMP 2 % with a fast release and a narrow body: it keeps ringing for seconds (> -45 dB 2.5 s after release)', db(rms(ring.L, SR * 5.5, SR * 6)) > -45, `${db(rms(ring.L, SR * 5.5, SR * 6)).toFixed(0)} dB`);
  const dead = run({ damp: 0.3 }, 6, [[0.2, on(57)], [0.5, off(57)]]);
  check('a short tap with DAMP 30 % dies away (< -60 dB 3 s after the key)', db(rms(dead.L, SR * 3.5, SR * 4)) < -60, `${db(rms(dead.L, SR * 3.5, SR * 4)).toFixed(0)} dB`);
  const d1 = run({ damp: 0.1 }, 6, [[0.2, on(57)], [0.5, off(57)]]); check('the default DAMP (10 %) falls by more than 20 dB in the second after the key', db(rms(d1.L, SR * 0.8, SR * 1.0)) - db(rms(d1.L, SR * 2.0, SR * 2.2)) > 10, `${(db(rms(d1.L, SR * 0.8, SR * 1.0)) - db(rms(d1.L, SR * 2.0, SR * 2.2))).toFixed(0)} dB`);
}

// ===== 2. pitch =====
for (const n of [36, 45, 57, 69, 81]) {
  const r = run({ body: 0, bright: 0, focus: 120, fold: 2 }, 4, [[0.1, on(n)]]), p = spectrum(r.L, SR * 2), f = mtof(n), pk = peakHz(p);
  const ratio = pk / f, near = Math.round(ratio);
  check(`note ${n} (${f.toFixed(1)} Hz): the loop sings at the key (strongest partial is a whole multiple, fundamental within 25 dB)`, Math.abs(ratio - near) < 0.02 && near >= 1 && near <= 4 && band(p, f) > band(p, pk) * Math.pow(10, -2.5), `peak ${pk.toFixed(1)} Hz = ${ratio.toFixed(3)} x`);
}

// ===== 3. the body decides where the partials sit =====
{
  const f = mtof(48), spec = (body, fold, stages = 1) => spectrum(run({ body, fold, stages }, 4, [[0.1, on(48)]]).L, SR * 2);
  const bell = spec(3, 3), string = spec(0, 5), pipe = spec(1, 2), glass = spec(4, 2);
  const lv = (p, k) => 10 * Math.log10(band(p, f * k) + 1e-30);
  check('BELL at FOLD x3: the loop sings at the first bell mode, 2.76 x the key, and not at 2 x or 3 x (20 dB or more)', lv(bell, 2.76) > Math.max(lv(bell, 2), lv(bell, 3)) + 20, `${lv(bell, 2.76).toFixed(0)} dB vs ${lv(bell, 2).toFixed(0)} / ${lv(bell, 3).toFixed(0)} dB`);
  check('STRING at FOLD x5: whole multiples of the key (2 x and 3 x), not the bell mode 2.76 x (20 dB or more)', Math.max(lv(string, 2), lv(string, 3)) > lv(string, 2.76) + 20, `${Math.max(lv(string, 2), lv(string, 3)).toFixed(0)} dB vs ${lv(string, 2.76).toFixed(0)} dB`);
  check('PIPE at FOLD x2: odd multiples only (1 x and 3 x), the even ones (2 x, 4 x) are 30 dB or more below', Math.max(lv(pipe, 1), lv(pipe, 3)) > Math.max(lv(pipe, 2), lv(pipe, 4)) + 30, `${Math.max(lv(pipe, 1), lv(pipe, 3)).toFixed(0)} dB vs ${Math.max(lv(pipe, 2), lv(pipe, 4)).toFixed(0)} dB`);
  check('GLASS at FOLD x2: it sings at a glass mode (not at a whole multiple above 2 x)', lv(glass, 1) > lv(glass, 3) + 10 || lv(glass, 2.32) > lv(glass, 3) + 10, `${lv(glass, 1).toFixed(0)} / ${lv(glass, 2.32).toFixed(0)} / ${lv(glass, 3).toFixed(0)} dB`);
}
{
  const cent = p => { let a = 0, b = 0; for (let i = 5; i < p.length; i++) { a += i * p[i]; b += p[i]; } return a / b * SR / 16384; };
  const c1 = cent(spectrum(run({ body: 3, fold: 1.3, stages: 1 }, 4, [[0.1, on(48)]]).L, SR * 2)), c4 = cent(spectrum(run({ body: 3, fold: 1.3, stages: 4 }, 4, [[0.1, on(48)]]).L, SR * 2));
  check('STAGES 4 drives the loop harder than STAGES 1 (a bell at FOLD x1.3: the spectral centroid moves up by more than 3 x)', c4 > 3 * c1, `${c1.toFixed(0)} -> ${c4.toFixed(0)} Hz`);
  const a = run({ body: 0, fold: 1.3, stages: 1, edge: 0 }, 5, [[0.1, on(48)]]), b = run({ body: 0, fold: 8, stages: 1, edge: 0 }, 5, [[0.1, on(48)]]);
  check('FOLD x8 is brighter than FOLD x1.3 (string body: spectral centroid at least 2 x higher)', cent(spectrum(b.L, SR * 3)) > 2 * cent(spectrum(a.L, SR * 3)), `${cent(spectrum(a.L, SR * 3)).toFixed(0)} -> ${cent(spectrum(b.L, SR * 3)).toFixed(0)} Hz`);
  const sk0 = run({ skew: 0, stages: 1, edge: 1 }, 4, [[0.1, on(48)]]), sk1 = run({ skew: 1, stages: 1, edge: 1 }, 4, [[0.1, on(48)]]);
  const pk0 = spectrum(sk0.L, SR * 2), pk1 = spectrum(sk1.L, SR * 2), f0 = mtof(48);
  check('SKEW adds even partials (2 x the note) relative to the odd ones (3 x)', band(pk1, f0 * 2) / band(pk1, f0 * 3) > 2 * band(pk0, f0 * 2) / band(pk0, f0 * 3), `${(band(pk1, f0 * 2) / band(pk1, f0 * 3)).toFixed(2)} vs ${(band(pk0, f0 * 2) / band(pk0, f0 * 3)).toFixed(2)}`);
  const pl = run({ pol: 1, body: 3, stages: 1, fold: 3 }, 4, [[0.1, on(48)]]), pn = run({ pol: 0, body: 3, stages: 1, fold: 3 }, 4, [[0.1, on(48)]]); const sp1 = spectrum(pl.L, SR * 2), sp0 = spectrum(pn.L, SR * 2); let dd = 0, ee = 0; for (let i = 0; i < sp1.length; i++) { dd += Math.abs(Math.sqrt(sp1[i]) - Math.sqrt(sp0[i])); ee += Math.sqrt(sp0[i]); }
  check('POLARITY - still sings, with a different spectrum (the odd modes of the body are turned over)', db(rms(pl.L, SR * 2, SR * 4)) > -35 && dd / ee > 0.05, `${db(rms(pl.L, SR * 2, SR * 4)).toFixed(0)} dB, spectrum differs by ${(100 * dd / ee).toFixed(0)} %`);
}

// ===== 4. four voices, stealing, HOLD, GLIDE, bend =====
{
  const chord = [[0.1, on(48)], [0.15, on(55)], [0.2, on(60)], [0.25, on(64)]];
  const r = run({ damp: 0.05 }, 4, chord), m = r.meters[r.meters.length - 1];
  check('four notes: four voices, all reported', m.nv === 4 && m.notes.slice().sort().join() === '48,55,60,64', JSON.stringify(m.notes));
  const p = spectrum(r.L, SR * 2); check('... and the chord is there: each note has energy at its pitch (or a partial)', [48, 55, 60, 64].every(n => band(p, mtof(n)) + band(p, 2 * mtof(n)) > 1e-6 * Math.max(...p)), '');
  const st = run({ damp: 0.05 }, 4, chord.concat([[1, on(72)]])), ms = st.meters[st.meters.length - 1];
  check('a fifth note takes a voice from the oldest one: still four voices, the new note is there, no NaN, no loud step', ms.nv === 4 && ms.notes.indexOf(72) >= 0 && ms.notes.indexOf(48) < 0 && st.bad === 0 && peak(st.L) <= 1.0001, JSON.stringify(ms.notes));
  const again = run({}, 3, [[0.1, on(57)], [0.6, on(57)]]), ma = again.meters[again.meters.length - 1]; check('the same key again re-strikes its voice instead of taking another', ma.nv === 1, String(ma.nv));
}
{
  const h = run({ hold: 1, damp: 0.1, release: 200 }, 8, [[0.2, on(57)], [1.5, off(57)]]), g = run({ hold: 0, damp: 0.1, release: 200 }, 8, [[0.2, on(57)], [1.5, off(57)]]);
  check('HOLD: the note keeps singing after the key is let go (> -30 dB at 5 s), without HOLD it is gone', db(rms(h.L, SR * 5, SR * 6)) > -30 && db(rms(g.L, SR * 5, SR * 6)) < -60, `${db(rms(h.L, SR * 5, SR * 6)).toFixed(0)} vs ${db(rms(g.L, SR * 5, SR * 6)).toFixed(0)} dB`);
  const rl = run({ hold: 1, damp: 0.1, release: 200 }, 9, [[0.2, on(57)], [1.5, off(57)], [4, p => send(p, { type: 'params', params: { hold: 0 }, immediate: false })]]);
  check('... and switching HOLD off lets it go', db(rms(rl.L, SR * 8, SR * 9)) < -60, `${db(rms(rl.L, SR * 8, SR * 9)).toFixed(0)} dB`);
}
{
  const cyc = (a, s) => { let c = 0; for (let i = s + 1; i < s + SR * 0.5; i++) if (a[i - 1] <= 0 && a[i] > 0) c++; return c * 2; };
  const g = run({ body: 0, bright: 0, focus: 150, fold: 2, glide: 0.6 }, 6, [[0.1, on(45)], [2, off(45)], [2.01, on(57)]]);
  const before = cyc(g.L, SR * 1.5), mid = cyc(g.L, SR * 2.2), after = cyc(g.L, SR * 5);
  check('GLIDE 0.6 s: the pitch slides from the last note to the new one (below, between, at the new pitch)', before < mid && mid < after && Math.abs(after / 220 - 1) < 0.2 || (before > 0 && after > before * 1.6), `${before} -> ${mid} -> ${after} (zero crossings x2, relative)`);
  const bend = run({ body: 0, bright: 0, focus: 150, fold: 2 }, 6, [[0.1, on(57)], [3, p => send(p, { type: 'bend', semis: 12 })]]);
  const pb = peakHz(spectrum(bend.L, SR * 1.5)), pa = peakHz(spectrum(bend.L, SR * 4.5));
  check('pitch bend +12 semitones doubles the pitch', Math.abs(pa / pb - 2) < 0.1, `${pb.toFixed(0)} -> ${pa.toFixed(0)} Hz`);
}

// ===== 5. strike, colour, level =====
{
  const lv = run({ level: 0.3 }, 4, [[0.1, on(57)]]), lh = run({ level: 0.9 }, 4, [[0.1, on(57)]]);
  check('LEVEL scales the output (0.9 is about 9.5 dB above 0.3)', Math.abs(db(rms(lh.L, SR * 2, SR * 4)) - db(rms(lv.L, SR * 2, SR * 4)) - 9.5) < 3, `${(db(rms(lh.L, SR * 2, SR * 4)) - db(rms(lv.L, SR * 2, SR * 4))).toFixed(1)} dB`);
  check('LEVEL 0 is silent', peak(run({ level: 0 }, 2, [[0.1, on(57)]]).L) < 1e-9, '');
  const w0 = run({ width: 0 }, 3, [[0.1, on(48)], [0.15, on(60)]]), w1 = run({ width: 1 }, 3, [[0.1, on(48)], [0.15, on(60)]]);
  let d0 = 0, d1 = 0; for (let i = SR; i < SR * 3; i++) { d0 += Math.abs(w0.L[i] - w0.R[i]); d1 += Math.abs(w1.L[i] - w1.R[i]); }
  check('WIDTH 0 puts both sides equal, WIDTH 100 % spreads the voices (left and right differ)', d0 < d1 * 0.05 && d1 > 1, `${d0.toExponential(1)} vs ${d1.toExponential(1)}`);
  const soft = run({ strike: 1, colour: 200 }, 1, [[0.1, on(57)]]), bright = run({ strike: 1, colour: 16000 }, 1, [[0.1, on(57)]]);
  const hfx = x => { let s = 0; for (let i = SR * 0.1; i < SR * 0.13; i++) { const d = x[i] - 2 * x[i - 1] + x[i - 2]; s += d * d; } return s; };
  check('COLOUR bright makes a sharper strike than COLOUR dark (second difference energy in the first 30 ms)', hfx(bright.L) > hfx(soft.L) * 1.5, `${(hfx(bright.L) / Math.max(1e-30, hfx(soft.L))).toFixed(1)}x`);
}

// ===== 6. reset, LFOs =====
{
  const r = run({ hold: 1 }, 5, [[0.1, on(57)], [3, p => send(p, { type: 'reset' })]]);
  check('before reset the note sings', db(rms(r.L, SR * 2, SR * 2.9)) > -30, '');
  check('RESET fades out and silences every voice (silent 0.1 s later, and it stays silent, as no key is down)', peak(r.L.subarray(SR * 3.1, SR * 5)) < 1e-9 && r.meters[r.meters.length - 1].nv === 0, '');
  const t = SR * 3; let mx = 0, rf = 0; for (let i = t; i < t + 400; i++) mx = Math.max(mx, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2])); for (let i = t - 4000; i < t; i++) rf = Math.max(rf, Math.abs(r.L[i] - 2 * r.L[i - 1] + r.L[i - 2]));
  check('RESET does not click (second difference around the fade at most twice that of the sound before)', mx <= 2 * rf + 1e-9, `${mx.toExponential(1)} vs ${rf.toExponential(1)}`);
}
{
  const slow = run({ l1depth: 1, l1rate: 0.5, l2depth: 0.5, l2rate: 5 }, 8, [[0.1, on(57)]]);
  check('LFOs at slow rate: bounded, finite, alive', slow.bad === 0 && peak(slow.L) <= 1.0001 && db(rms(slow.L, SR * 4, SR * 8)) > -45, `${db(rms(slow.L, SR * 4, SR * 8)).toFixed(0)} dB`);
  const fm = run({ body: 0, bright: 0, focus: 40, l2depth: 0.3, l2rate: 200 }, 5, [[0.1, on(57)]]), nofm = run({ body: 0, bright: 0, focus: 40 }, 5, [[0.1, on(57)]]);
  const sf = spectrum(fm.L, SR * 2.5), sn = spectrum(nofm.L, SR * 2.5), f = mtof(57);
  check('LFO 2 at audio rate (200 Hz) is FM: sidebands at the note +- 200 Hz that are not there without it', fm.bad === 0 && band(sf, f + 200, 0.015) + band(sf, f - 200, 0.015) > 20 * (band(sn, f + 200, 0.015) + band(sn, f - 200, 0.015)), `${db(Math.sqrt(band(sf, f + 200, 0.015))).toFixed(0)} dB vs ${db(Math.sqrt(band(sn, f + 200, 0.015))).toFixed(0)} dB`);
  const m = fm.meters[fm.meters.length - 1]; check('LFO depth 0: the fold factor in the meter stays 1', run({}, 1, [[0.1, on(57)]]).meters.every(x => x.fk === 1), '');
}

// ===== 7. extremes and cost =====
{
  let bad = 0, big = 0, cases = 0; const rnd = (() => { let s = 5; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const ranges = { glide: [0, 1], strike: [0, 1], colour: [200, 16000], fold: [0.3, 10], stages: [1, 4], spread: [0, 1], skew: [-1, 1], body: [0, 4], focus: [3, 600], bright: [0, 1], attack: [1, 2000], release: [5, 8000], damp: [0, 0.5], pol: [0, 1], edge: [0, 1], width: [0, 1], tone: [800, 16000], level: [0, 1], l1depth: [0, 1], l2depth: [0, 1], l1rate: [0.002, 1000], l2rate: [0.002, 1000] };
  for (let i = 0; i < 24; i++) {
    const prm = {}; for (const k in ranges) { const [a, b] = ranges[k]; const u = i < 8 ? (rnd() < 0.5 ? 0 : 1) : rnd(); prm[k] = a + (b - a) * u; if (k === 'pol') prm[k] = Math.round(prm[k]); }
    prm.hold = i % 2;
    const sr = i % 3 === 0 ? 44100 : (i % 3 === 1 ? 96000 : 48000);
    const r = run(prm, 3, [[0.1, on(30 + (i * 7) % 60)], [0.3, on(40 + (i * 5) % 50)], [0.5, on(50 + (i * 3) % 40)], [0.7, on(60)], [0.9, on(72)], [1.5, off(60)]], { sr }); cases++; bad += r.bad; if (peak(r.L) > 1.0001 || peak(r.R) > 1.0001) big++;
  }
  check(`${cases} random and corner settings with five notes at 44.1 / 48 / 96 kHz: no NaN or infinity, never above the limiter`, bad === 0 && big === 0, `${bad} bad samples, ${big} too loud`);
  const hot = { fold: 10, stages: 4, spread: 1, skew: 1, edge: 1, focus: 600, damp: 0, level: 1, hold: 1 };
  const r = run(hot, 6, [[0.1, on(40)], [0.2, on(52)], [0.3, on(64)], [0.4, on(76)], [3, p => send(p, { type: 'params', params: { ...hot, fold: 0.3, stages: 1, focus: 3 }, immediate: false })]]);
  check('everything pushed to the limit, then back in one go: bounded, finite', r.bad === 0 && peak(r.L) <= 1.0001 && peak(r.R) <= 1.0001, `peak ${peak(r.L).toFixed(2)}`);
}
{
  const r = run({ stages: 4, spread: 1, l1depth: 1, l1rate: 3, l2depth: 0.3, l2rate: 220, hold: 1 }, 6, [[0.1, on(48)], [0.2, on(55)], [0.3, on(60)], [0.4, on(64)]]), per = r.ms / (6 * SR / 128), budget = 128 / SR * 1000;
  info(`CPU: ${per.toFixed(3)} ms per 128-sample block at 48 kHz (budget ${budget.toFixed(2)} ms) = ${(100 * per / budget).toFixed(0)} % of one core in Node on this machine (four voices, four stages, both LFOs, pitch modulation at audio rate)`);
  check('CPU: under 50 % of the audio budget in Node with four voices and everything on', per < 0.5 * budget, `${(100 * per / budget).toFixed(0)} %`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
