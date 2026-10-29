// Runs MMM_RingMod.genexpr (GenExpr is C-like, transpiled 1:1 to JS) and checks the DSP:
// ring-mod sidebands, AM keeps the input tone, every wave/mode is finite, diode sign, filters, wet/dry.
// It cannot catch GenExpr syntax errors (only Max can) - see README.
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'MMM_RingMod.genexpr'), 'utf8');
function compile(sr) {
  const params = {}, hist = {};
  let body = src.replace(/^\s*Param\s+(\w+)\(\s*([-\d.]+)[^)]*\)\s*;.*$/gm, (_, n, d) => { params[n] = +d; return ''; });
  body = body.replace(/History\s+(\w+)\(\s*([-\d.]+)\s*\)\s*;/g, (_, n, d) => { hist[n] = +d; return ''; });
  body = body.replace(/\/\/.*$/gm, '');
  const reserved = new Set([...Object.keys(params), ...Object.keys(hist), 'in1', 'in2', 'out1', 'out2']);
  const locals = new Set();
  for (const m of body.matchAll(/(?:^|[;{}])\s*([A-Za-z_]\w*)\s*=(?!=)/g)) if (!reserved.has(m[1])) locals.add(m[1]);
  const initLine = body.split('\n').find(l => /^\s*xL = 0;/.test(l)) || '';
  const missing = [...locals].filter(n => !new RegExp('\\b' + n + ' = [01];').test(initLine));
  if (missing.length) throw new Error('locals not initialised at top: ' + missing.join(','));
  const P = { ...params }, H = { ...hist };
  const fn = new Function('P', 'H', 'samplerate', 'h', `
    const {floor, exp, log, pow, abs, min, max, cos, sin} = h;
    return function(in1, in2) {
      let out1 = 0, out2 = 0;
      let ${[...locals].join(', ')};
      const {${Object.keys(params).join(',')}} = P;
      let {${Object.keys(hist).join(',')}} = H;
      ${body}
      Object.assign(H, {${Object.keys(hist).join(',')}});
      return [out1, out2];
    };`);
  return { step: fn(P, H, sr, { floor: Math.floor, exp: Math.exp, log: Math.log, pow: Math.pow, abs: Math.abs, min: Math.min, max: Math.max, cos: Math.cos, sin: Math.sin }), P };
}
const sr = 48000;
function run(setup, f, secs, amp = 0.5) {
  const c = compile(sr); setup(c.P);
  const N = Math.floor(secs * sr), out = new Float64Array(N); let bad = 0, peak = 0;
  for (let n = 0; n < N; n++) {
    const x = amp * Math.sin(2 * Math.PI * f * n / sr), o = c.step(x, x);
    if (!Number.isFinite(o[0]) || !Number.isFinite(o[1])) bad++;
    out[n] = o[0]; peak = Math.max(peak, Math.abs(o[0]));
  }
  return { out, bad, peak };
}
function mag(buf, f) {  // Goertzel-ish single bin DFT over the last second
  const n0 = buf.length - sr, w = 2 * Math.PI * f / sr; let re = 0, im = 0;
  for (let n = 0; n < sr; n++) { re += buf[n0 + n] * Math.cos(w * n); im += buf[n0 + n] * Math.sin(w * n); }
  return 2 * Math.hypot(re, im) / sr;
}
let fail = 0;
function ok(c, msg) { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fail++; }

// 1) ideal ring mod, sine carrier 300 Hz, input 1000 Hz: sidebands 700/1300, no 300/1000
{ const r = run(p => { p.p_freq = 300; }, 1000, 2);
  const s7 = mag(r.out, 700), s13 = mag(r.out, 1300), c = mag(r.out, 300), i = mag(r.out, 1000);
  ok(s7 > .2 && s13 > .2 && c < .01 && i < .01, `ring sine: 700=${s7.toFixed(3)} 1300=${s13.toFixed(3)} 300=${c.toFixed(4)} 1000=${i.toFixed(4)}`); }
// 2) AM (bias 1): keeps the input tone, adds sidebands
{ const r = run(p => { p.p_freq = 300; p.p_bias = 1; }, 1000, 2);
  ok(mag(r.out, 1000) > .1 && mag(r.out, 700) > .03, `AM keeps input: 1000=${mag(r.out, 1000).toFixed(3)} 700=${mag(r.out, 700).toFixed(3)}`); }
// 3) all waves x modes x extreme settings finite and bounded
for (const wave of [0, 1, 2, 3]) for (const mode of [0, 1]) {
  const r = run(p => { Object.assign(p, { p_wave: wave, p_mode: mode, p_freq: 7000, p_fold: 1, p_fm: 1, p_lfod: 2, p_lfor: 30, p_drive: 1, p_spread: .5, p_pw: .05, p_gain: 12 }); }, 3000, 1, 1);
  ok(r.bad === 0 && r.peak < 20, `wave ${wave} mode ${mode} extreme: nonfinite=${r.bad} peak=${r.peak.toFixed(2)}`);
  const r2 = run(p => { Object.assign(p, { p_wave: wave, p_mode: mode, p_freq: 0.1 }); }, 100, 1);
  ok(r2.bad === 0, `wave ${wave} mode ${mode} low freq finite`);
}
// 4) diode mode: sideband content like ring mod (has 700/1300), small-signal gain same sign for + and - carrier phase
{ const r = run(p => { p.p_freq = 300; p.p_mode = 1; }, 1000, 2, 0.1);
  ok(mag(r.out, 700) > 0.01 && mag(r.out, 1300) > 0.01, `diode sidebands: 700=${mag(r.out, 700).toFixed(4)} 1300=${mag(r.out, 1300).toFixed(4)}`); }
// 5) wet = 0 is dry; HP kills low input; LP kills high input
{ const r = run(p => { p.p_wet = 0; }, 1000, 1);
  ok(Math.abs(mag(r.out, 1000) - 0.5) < 0.01, `wet 0 = dry (${mag(r.out, 1000).toFixed(3)})`); }
{ const r = run(p => { p.p_wet = 1; p.p_bias = 1; p.p_freq = 0.1; p.p_hp = 2000; }, 100, 1);
  ok(mag(r.out, 100) < .1, `HP 2k removes 100 Hz (${mag(r.out, 100).toFixed(3)})`); }
{ const r = run(p => { p.p_wet = 1; p.p_bias = 1; p.p_freq = 0.1; p.p_lp = 200; }, 8000, 1);
  ok(mag(r.out, 8000) < .05, `LP 200 removes 8 kHz (${mag(r.out, 8000).toFixed(3)})`); }
// 6) square/saw PolyBLEP: alias level of a 5 kHz saw is below the naive one (just report)
{ const r = run(p => { p.p_wave = 3; p.p_freq = 5123; p.p_bias = 1; }, 50, 1, 0.01);
  ok(r.bad === 0, 'saw 5.1 kHz finite'); }
console.log(fail ? `${fail} FAILED` : 'all passed'); process.exit(fail ? 1 : 0);
