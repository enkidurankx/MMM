// Shared helpers of the entropy tests: the AudioWorklet code of the page runs in Node with a stub of the worklet globals, a fake codec stands in for the worker.
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../../entropy-v0_2.html'), 'utf8');
const dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
const PRESETS = (() => { let i = html.indexOf('const PRESETS = ') + 'const PRESETS = '.length, d = 0, e = i; for (let j = i; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (!d) { e = j + 1; break; } } } return vm.runInNewContext('(' + html.slice(i, e) + ')'); })();
function load(sr) {
  const reg = {}, posted = [];
  const sb = { sampleRate: sr, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Int32Array, Object, console };
  vm.createContext(sb); vm.runInContext(dsp, sb);
  return { reg, posted, defaults: vm.runInContext('JSON.parse(JSON.stringify(DEFAULTS))', sb) };
}
function worklet(sr, params) { const l = load(sr || 48000); const p = new l.reg.entropy(); p.posted = l.posted; p.port.onmessage({ data: { type: 'params', params: Object.assign({}, l.defaults, params || {}), immediate: true } }); return p; }
const SR = 48000;
// the fake codec: frames go in on a port, come back after `latency` blocks, shifted by the Opus delay `lag`, with some frames lost and an optional error added
function fakeCodec(p, o) {
  o = o || {}; const q = [], lag = o.lag === undefined ? 312 : o.lag, latBlocks = o.latBlocks === undefined ? 4 : o.latBlocks; let blk = 0, needReady = false; const memo = new Map();
  const port = { onmessage: null, postMessage: m => {
    if (m.cfg) { needReady = true; return; }
    if (o.loseEvery && (++port.n % o.loseEvery) === 0) return;
    const d = new Float32Array(m.data.length);   // a frame shifted by the codec delay: it carries what came `lag` samples before
    const S = Math.round(m.ts * SR / 1e6);
    for (let i = 0; i < m.data.length; i++) memo.set(S + i, m.data[i]);
    for (let i = 0; i < d.length; i++) { const k = S + i - lag; d[i] = (memo.get(k) || 0) + (o.noise ? o.noise * Math.sin(i * 0.37 + S) : 0); }
    if (memo.size > 40000) { for (const k of memo.keys()) { if (k < S - 20000) memo.delete(k); } }
    q.push({ at: blk + latBlocks, ts: m.ts, data: d });
  }, n: 0 };
  p.cp = port; p.sendCfg();
  return { tick() { blk++; if (needReady) { needReady = false; p.fromCodec({ ready: true }); } while (q.length && q[0].at <= blk) { const f = q.shift(); p.fromCodec({ ts: f.ts, data: f.data }); } }, port };
}
function run(params, seconds, opts = {}) {
  const sr = SR, p = worklet(sr, params); if (opts.seed) p.port.onmessage({ data: { type: 'seed', seed: opts.seed } });
  const fc = opts.fake ? fakeCodec(p, opts.fake) : null;
  const n = Math.floor(sr * seconds), L = new Float64Array(n), R = new Float64Array(n), o1 = new Float32Array(128), o2 = new Float32Array(128); let bad = 0, ai = 0; const at = opts.at || [];
  for (let s = 0; s < n; s += 128) {
    while (ai < at.length && at[ai][0] * sr <= s) { at[ai][1](p); ai++; }
    if (fc) fc.tick();
    p.process([[]], [[o1, o2]]);
    for (let i = 0; i < 128 && s + i < n; i++) { L[s + i] = o1[i]; R[s + i] = o2[i]; if (!isFinite(o1[i]) || !isFinite(o2[i])) bad++; }
  }
  return { L, R, p, bad, sr, fc };
}
const rms = (a, f, t) => { f = Math.floor(f); t = Math.floor(t); let s = 0; for (let i = f; i < t; i++) s += a[i] * a[i]; return Math.sqrt(s / (t - f)); };
const db = x => 20 * Math.log10(Math.max(x, 1e-12));
const peak = a => { let m = 0; for (const v of a) if (Math.abs(v) > m) m = Math.abs(v); return m; };
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let l = 2; l <= n; l <<= 1) { const a = -2 * Math.PI / l; for (let i = 0; i < n; i += l) for (let k = 0; k < l / 2; k++) { const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + l / 2] * c - im[i + k + l / 2] * s, xi = re[i + k + l / 2] * s + im[i + k + l / 2] * c; re[i + k + l / 2] = re[i + k] - xr; im[i + k + l / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } } }
function spec(a, from, n = 8192) { const re = new Float64Array(n), im = new Float64Array(n); for (let i = 0; i < n; i++) re[i] = a[from + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n)); fft(re, im); const m = new Float64Array(n / 2); for (let k = 0; k < n / 2; k++) m[k] = Math.hypot(re[k], im[k]); return m; }
const centroid = (a, from) => { const m = spec(a, from); let A = 0, B = 0; for (let k = 1; k < m.length; k++) { A += m[k] * k * SR / 8192; B += m[k]; } return B > 0 ? A / B : 0; };
const flatness = (a, from) => { const m = spec(a, from); let ls = 0, s = 0, c = 0; for (let k = 4; k < m.length / 2; k++) { const v = m[k] * m[k] + 1e-20; ls += Math.log(v); s += v; c++; } return Math.exp(ls / c) / (s / c); };   // 1 = white noise, 0 = a pure tone
const meterOf = r => { const ms = r.p.posted.filter(x => x.type === 'meter'); return ms[ms.length - 1]; };

module.exports = { html, dsp, PRESETS, load, worklet, fakeCodec, run, SR, rms, db, peak, fft, spec, centroid, flatness, meterOf };
