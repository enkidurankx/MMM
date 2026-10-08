// The reverb returns into the loop: every Experimental Sound worklet takes the return as its input and lets it act on the system.
// Node, no browser: the worklet code of each page runs with a stub; the return is a train of decaying noise bursts (what a reverb tail looks like), at the level the page lets through.
// Run: node tests/feedbacks/loopinput.test.js
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '../..'), SR = 48000;
const APPS = { vink: ['vink-v1_0.html', 'vink'], homoeo: ['homoeo-v1_0.html', 'homoeo'], serge: ['serge-v0_1.html', 'serge'], lattice: ['lattice-v0_2.html', 'lattice'], knot: ['knot-v0_2.html', 'knot'], lichen: ['lichen-v0_1.html', 'lichen'], creak: ['creak-v0_2.html', 'creak'], entropy: ['entropy-v0_2.html', 'entropy'] };
let ok = true; const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
function load(file, name) {
  const html = fs.readFileSync(path.join(root, file), 'utf8'), dsp = html.match(/<script id="dsp" type="text\/plain">([\s\S]*?)<\/script>/)[1];
  const reg = {}, posted = [], sb = { sampleRate: SR, AudioWorkletProcessor: class { constructor() { this.port = { postMessage: m => posted.push(m), onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float64Array, Float32Array, Int32Array, Uint8Array, Object, console };
  vm.createContext(sb); vm.runInContext(dsp, sb);
  const p = new reg[name](); p.port.onmessage({ data: { type: 'params', params: vm.runInContext('JSON.parse(JSON.stringify(DEFAULTS))', sb), immediate: true } }); p.port.onmessage({ data: { type: 'seed', seed: 12345 } });
  if (name === 'serge') p.port.onmessage({ data: { type: 'note', on: true, note: 48, vel: 1 } });
  return p;
}
function run(file, name, withReturn, seconds) {
  const p = load(file, name), n = SR * seconds, blk = 128, L = new Float64Array(n), a = new Float32Array(blk), b = new Float32Array(blk), ia = new Float32Array(blk), ib = new Float32Array(blk); let s0 = 99, env = 0, bad = 0;
  for (let s = 0; s < n; s += blk) {
    for (let i = 0; i < blk; i++) { s0 = (Math.imul(s0, 1664525) + 1013904223) >>> 0; const w = s0 / 2147483648 - 1; if (((s + i) % 24000) === 0) env = 1; env *= 0.99992; ia[i] = 0.25 * env * w; ib[i] = 0.25 * env * ((Math.imul(s0, 69069) >>> 0) / 2147483648 - 1); }
    p.process(withReturn === null ? [[]] : [[ia, ib]], [[a, b]]);
    for (let i = 0; i < blk && s + i < n; i++) { L[s + i] = a[i]; if (!isFinite(a[i]) || !isFinite(b[i]) || Math.abs(a[i]) > 0.971) bad++; }
  }
  return { L, bad };
}
const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(APPS);
for (const k of which) {
  const [file, name] = APPS[k];
  const off = run(file, name, null, 6), on = run(file, name, true, 6);
  let d = 0, e = 0; for (let i = 3 * SR; i < 6 * SR; i++) { d += (on.L[i] - off.L[i]) ** 2; e += off.L[i] ** 2; }
  check(`${k}: with no return connected the worklet runs (no NaN, below 0.97)`, off.bad === 0 && e > 0, `${off.bad} bad samples`);
  check(`${k}: with the return connected it stays finite and below 0.97`, on.bad === 0, `${on.bad} bad samples`);
  check(`${k}: the return acts on the system (the sound differs by more than 2 % rms from the one without it)`, Math.sqrt(d / (e + 1e-30)) > 0.02, `difference ${(100 * Math.sqrt(d / (e + 1e-30))).toFixed(0)} % of the rms`);
}
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
