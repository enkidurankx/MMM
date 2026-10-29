// chop.4 engine test: runs the AudioWorklet code of the page (the <script id="dsp"> block) in plain Node with a fake AudioWorkletProcessor.
// Checks: capture (hold to record), the sample is chopped, live window, loading a file, clear, panic, 8 s limit, no NaN, the output stays below 1,
// and the messages for the picture (bins, grains) make sense.   Run:  node tests/chop/engine.test.js [page.html]
'use strict';
const fs = require('fs'), path = require('path');
const page = process.argv[2] || fs.readdirSync(path.join(__dirname, '..', '..')).filter(f => /^chop-v\d+_\d+\.html$/.test(f)).sort().pop();
const html = fs.readFileSync(path.join(__dirname, '..', '..', page), 'utf8');
const src = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
const SR = 48000;
function make() {
  const reg = {}; let msgs = [];
  class AudioWorkletProcessor { constructor() { this.port = { postMessage: m => msgs.push(m), onmessage: null }; } }
  new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', src)(AudioWorkletProcessor, (n, c) => { reg[n] = c; }, SR);
  const p = new reg.chop();
  return { p, msgs: () => msgs, clear: () => { msgs = []; }, send: m => p.port.onmessage({ data: m }) };
}
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
function run(h, seconds, input) {   // input(n) -> [l, r]
  let bad = 0, peak = 0, n0 = 0;
  const blocks = Math.floor(seconds * SR / 128);
  for (let b = 0; b < blocks; b++) {
    const iL = new Float32Array(128), iR = new Float32Array(128), oL = new Float32Array(128), oR = new Float32Array(128);
    for (let i = 0; i < 128; i++) { const x = input ? input(n0 + i) : [0, 0]; iL[i] = x[0]; iR[i] = x[1]; }
    n0 += 128;
    h.p.process([[iL, iR]], [[oL, oR]]);
    for (let i = 0; i < 128; i++) { if (!isFinite(oL[i]) || !isFinite(oR[i])) bad++; peak = Math.max(peak, Math.abs(oL[i]), Math.abs(oR[i])); }
  }
  return { bad, peak };
}
const voice = n => { const t = n / SR, env = Math.max(0, Math.sin(t * 3.1)) ** 2; const x = 0.5 * env * Math.sin(2 * Math.PI * 220 * t) + 0.2 * env * Math.sin(2 * Math.PI * 660 * t); return [x, x * 0.9]; };

// 1  silence before a sample exists
let h = make();
h.send({ p: { trig: 0, rate: 8, sync: 0, prob: 1, live: 0 } });
let r = run(h, 1, null);
ok(r.peak === 0 && r.bad === 0, 'no sample: nothing plays');

// 2  hold to record 2 s, let go
h.send({ open: 1 }); h.send({ cap: 1 });
r = run(h, 2, voice);
ok(h.p.cap && Math.abs(h.p.capN - 2 * SR) < 256, 'recording runs while held (' + h.p.capN + ' frames)');
h.send({ cap: 0 }); h.send({ open: 0 });
ok(!h.p.cap && Math.abs(h.p.len - 2 * SR) < 256, 'let go: sample length ' + (h.p.len / SR).toFixed(2) + ' s');
ok(h.p.bins.some(x => x > 0.2), 'the picture has a wave (bins)');
r = run(h, 3, null);
ok(r.peak > 0.02 && r.peak <= 1 && r.bad === 0, 'the sample is chopped without input: peak ' + r.peak.toFixed(2));
const vis = h.msgs().filter(m => m.vis);
ok(vis.length > 50, 'vis messages arrive (' + vis.length + ')');
ok(vis.some(m => m.gr.length >= 5), 'pieces are reported');
ok(vis.every(m => m.gr.every(x => isFinite(x))) , 'piece data finite');
const withBins = vis.filter(m => m.bins);
ok(withBins.length > 0 && withBins[withBins.length - 1].bins.length === 256, 'bins are sent');
ok(vis.every(m => m.wr >= 0 && m.wr <= 1.0001), 'write head in range');

// 3  nothing is written while the microphone is closed in sample mode
const before = Array.from(h.p.bufL.subarray(0, 1000));
run(h, 0.5, () => [0.9, 0.9]);
ok(Array.from(h.p.bufL.subarray(0, 1000)).every((x, i) => x === before[i]), 'sample is not overwritten by input when not recording');

// 4  8 second limit
h.clear(); h.send({ open: 1 }); h.send({ cap: 1 });
run(h, 8.5, voice);
ok(!h.p.cap && h.p.len === h.p.N && h.msgs().some(m => m.capEnd), 'recording stops by itself at 8 s');
h.send({ open: 0 });

// 5  clear
h.send({ clear: 1 });
r = run(h, 0.5, null);
ok(h.p.len === 0 && r.peak === 0, 'clear: empty and silent');

// 6  load a file (3 s sine)
const L = new Float32Array(3 * SR), R = new Float32Array(3 * SR); for (let i = 0; i < L.length; i++) { L[i] = 0.6 * Math.sin(i * 0.05); R[i] = L[i]; }
h.send({ load: { l: L, r: R } });
ok(Math.abs(h.p.len - 3 * SR) < 2, 'load: length 3 s');
r = run(h, 2, null);
ok(r.peak > 0.05 && r.bad === 0, 'loaded sample plays, peak ' + r.peak.toFixed(2));

// 7  tempo clock, onset, LFO, all outputs, no NaN
h.send({ p: { sync: 1, bpm: 140, div: 32, rept: 4, chaos: 1, pitch: 24, rev: 1, lfo: 1, lfodepth: 1, lfotick: 1, outs: 4, route: 3, size: 20, fade: 1, lvlvar: 1, range: 0.3 } });
r = run(h, 3, null);
ok(r.bad === 0 && r.peak <= 1, 'extreme settings: finite and below 1 (peak ' + r.peak.toFixed(2) + ')');
const lit = new Set(); h.msgs().filter(m => m.vis).forEach(m => m.act.forEach((a, i) => { if (a) lit.add(i); }));
ok(lit.size >= 2, 'several outputs play (' + [...lit].join(',') + ')');
// every grain read index stays inside the buffer
let idxBad = 0; for (const x of h.p.g) { const pw = x.pos - h.p.bl_ * Math.floor(x.pos / h.p.bl_); if (!(pw >= 0 && pw < h.p.bl_)) idxBad++; }
ok(idxBad === 0, 'read positions inside the buffer');

// 8  panic
h.send({ panic: 1 }); run(h, 0.01, null);
ok(h.p.g.length === 0 || h.p.g.length <= 1, 'panic empties the pieces');

// 9  live window: writes only while the microphone is open, rolls, freezes when closed
h = make();
h.send({ p: { live: 1, bufsec: 2, trig: 0, rate: 6, prob: 1, range: 1 } });
run(h, 1, voice);
ok(h.p.wr === 0 || h.p.bins.every(x => x === 0), 'live, microphone closed: nothing is written');
h.send({ open: 1 }); run(h, 3, voice);
ok(h.p.bins.some(x => x > 0.2) && h.p.wr > 0, 'live, open: the window is written and rolls');
h.send({ open: 0 }); const wr0 = h.p.wr; run(h, 1, voice);
ok(h.p.wr === wr0, 'live, closed: the window freezes');
r = run(h, 2, null);
ok(r.peak > 0.02 && r.bad === 0, 'frozen live window is chopped (peak ' + r.peak.toFixed(2) + ')');
h.send({ p: { hold: 1 } }); h.send({ open: 1 }); const wr1 = h.p.wr; run(h, 0.5, voice);
ok(h.p.wr === wr1, 'freeze holds the window while the microphone is open');
h.send({ p: { bufsec: 1 } }); run(h, 0.1, null);
ok(h.p.binBL === Math.floor(1 * SR), 'changing the window length redraws the wave');

// 10 mode switch
h.send({ p: { live: 0 } }); r = run(h, 0.5, null);
ok(r.bad === 0, 'switch to sample mode: fine (' + (h.p.len ? 'sample kept' : 'empty') + ')');
console.log(fails ? '\n' + fails + ' FAILED' : '\nall ok');
process.exit(fails ? 1 : 0);
