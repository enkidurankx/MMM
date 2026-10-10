// Reverb test of the Experimental Sound apps (shared plate reverb in feedbacks/shell.js) in the preinstalled Chromium.
// Run: PW=/opt/node22/lib/node_modules/playwright node tests/feedbacks/reverb.test.js [app ...]
'use strict';
const path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
const APPS = { vink: ['vink-v1_4.html', '__vink'], homoeo: ['homoeo-v1_3.html', '__homoeo'], serge: ['serge-v0_4.html', '__serge'], lattice: ['lattice-v0_5.html', '__lattice'], knot: ['knot-v0_5.html', '__knot'], lichen: ['lichen-v0_5.html', '__lichen'], creak: ['creak-v0_8.html', '__creak'], entropy: ['entropy-v0_5.html', '__entropy'] };
const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(APPS);
let ok = true; const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // ---- the impulse response itself (any page carries the shell) ----
  { const p = await (await browser.newContext()).newPage(); await p.goto('file://' + path.resolve(__dirname, '../..', APPS[which[0]][0]));
    const r = await p.evaluate(() => {
      const ctx = new OfflineAudioContext(2, 48000, 48000), out = {};
      const t60 = (d, sr) => { const n = d.length, e = new Float64Array(n + 1); for (let i = n - 1; i >= 0; i--) e[i] = e[i + 1] + d[i] * d[i]; const db = i => 10 * Math.log10(e[i] / e[0] + 1e-30); let i5 = 0, i35 = 0; for (let i = 0; i < n; i++) { if (!i5 && db(i) < -5) i5 = i; if (!i35 && db(i) < -35) { i35 = i; break; } } return i35 && i5 ? 2 * (i35 - i5) / sr : 0; };
      const cen = (d, from, len) => { let A = 0, B = 0; for (let i = from + 1; i < from + len; i++) { const x = d[i] - d[i - 1]; A += x * x; B += d[i] * d[i]; } return A / (B + 1e-30); };   // first-difference energy over energy: a brightness measure
      for (const T of [0.8, 2.2, 4]) for (const damp of [0, 0.5, 1]) {
        const b = FB.plateIR(ctx, T, damp), L = b.getChannelData(0), R = b.getChannelData(1); let s = 0, a = 0, c = 0; for (let i = 0; i < L.length; i++) { s += L[i] * R[i]; a += L[i] * L[i]; c += R[i] * R[i]; }
        let pre = 0; for (let i = 0; i < 100; i++) pre = Math.max(pre, Math.abs(L[i]));
        out[T + '/' + damp] = { ch: b.numberOfChannels, len: b.length / 48000, t60: t60(L, 48000), corr: s / Math.sqrt(a * c), pre, bright: [cen(L, 0, 4800), cen(L, Math.floor(0.6 * 48000), 4800)] };
      }
      return out;
    });
    for (const T of [0.8, 2.2, 4]) { const x = r[T + '/0.5']; check(`plate IR, ${T} s: stereo, RT60 within 30 % of ${T} s, the two channels are not correlated (|r| < 0.05), silent for the first 100 samples`, x.ch === 2 && Math.abs(x.t60 / T - 1) < 0.3 && Math.abs(x.corr) < 0.05 && x.pre < 1e-6, `RT60 ${x.t60.toFixed(2)} s, r ${x.corr.toFixed(3)}, length ${x.len.toFixed(2)} s`); }
    check('DAMPING 100 % makes the tail darker than DAMPING 0 % (brightness at 0.6 s, 2.2 s tail, at least 1.5 x lower)', r['2.2/1'].bright[1] * 1.5 < r['2.2/0'].bright[1], `${r['2.2/1'].bright[1].toFixed(3)} vs ${r['2.2/0'].bright[1].toFixed(3)}`);
    check('the highs die first: the tail is darker at 0.6 s than at the start (DAMPING 50 %)', r['2.2/0.5'].bright[1] < r['2.2/0.5'].bright[0], `${r['2.2/0.5'].bright[0].toFixed(3)} -> ${r['2.2/0.5'].bright[1].toFixed(3)}`);
    // the six rooms of gran2 next to the plate: each is stereo, finite, loud enough, the length gran2 uses at TAIL 2.2 s, and stretches with TAIL
    const g = await p.evaluate(() => {
      const ctx = new OfflineAudioContext(2, 48000, 48000), out = {};
      for (const k of Object.keys(FB.reverb ? { plate: 1, cavern: 1, ghost: 1, poltergeist: 1, pendulum: 1, shredder: 1, void: 1 } : {})) {
        const gen = window.__rvIRS ? window.__rvIRS[k] : null; if (!gen) continue;
        const a = gen(ctx, 2.2, 0.5), b = gen(ctx, 1.1, 0.5), d = a.getChannelData(0), e = b.getChannelData(0); let bad = 0, s = 0, mx = 0, c = 0, sl = 0, sr = 0; const R = a.getChannelData(1);
        for (let i = 0; i < d.length; i++) { if (!isFinite(d[i]) || !isFinite(R[i])) bad++; s += d[i] * d[i]; mx = Math.max(mx, Math.abs(d[i])); c += d[i] * R[i]; sl += d[i] * d[i]; sr += R[i] * R[i]; }
        out[k] = { ch: a.numberOfChannels, len: a.length / 48000, half: b.length / 48000, bad, rms: Math.sqrt(s / d.length), mx, corr: c / Math.sqrt(sl * sr + 1e-30), same: e.length === b.length };
      }
      return out;
    });
    const want = { plate: 2.64, cavern: 3.5, ghost: 2.0, poltergeist: 2.5, pendulum: 3.0, shredder: 1.5, void: 4.0 };
    for (const k of Object.keys(want)) { const x = g[k]; check(`room ${k}: stereo, finite, not silent, ${want[k]} s long at TAIL 2.2 s and half as long at 1.1 s`, !!x && x.ch === 2 && x.bad === 0 && x.rms > 1e-4 && Math.abs(x.len - want[k]) < 0.05 && Math.abs(x.half / x.len - 0.5) < 0.03, x ? `len ${x.len.toFixed(2)} s, half ${x.half.toFixed(2)} s, rms ${x.rms.toExponential(1)}, r ${x.corr.toFixed(2)}` : 'missing'); }
    await p.close(); }
  for (const name of which) {
    const [file, g] = APPS[name]; const p = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = [];
    p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto('file://' + path.resolve(__dirname, '../..', file));
    check(`${name}: four reverb faders (REVERB, TAIL, DAMPING, IN LOOP) in the Output section, REVERB reads "off", the reverb is off`, await p.evaluate(() => { const o = document.querySelector('#rvmix').closest('section'); return o.querySelector('h2 .t').textContent === 'Output' && !!o.querySelector('#rvtime') && !!o.querySelector('#rvdamp') && !!o.querySelector('#rvloop') && document.querySelector('#rvmix').closest('.ctl').querySelector('output').textContent === 'off' && window.__rv.st.mix === 0 && !window.__rv.on; }));
    check(`${name}: ROOM is a drop-down with the plate and the six rooms of gran2, the plate first`, await p.evaluate(() => { const s = document.querySelector('#rvtype'); return !!s && s.tagName === 'SELECT' && [...s.options].map(o => o.textContent).join(',') === 'PLATE,IR_CAVERN_01,IR_REVERSE_GHOST,IR_POLTERGEIST_PULSE,IR_PENDULUM_SWEEP,IR_AM_SHREDDER,IR_SPATIAL_VOID' && s.value === 'plate'; }));
    await p.click('#start'); await p.waitForFunction(g => window[g] && window[g].ctx && window[g].ctx.state === 'running', g, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(800);
    let s = await p.evaluate(() => ({ on: window.__rv.on, conv: !!window.__rv.conv, wet: window.__rv.wet.gain.value, dry: window.__rv.dry.gain.value }));
    check(`${name}: after the start it is still off (no convolver, wet 0, dry 1)`, !s.on && !s.conv && s.wet === 0 && Math.abs(s.dry - 1) < 1e-6, JSON.stringify(s));
    await p.locator('#rvmix').evaluate(e => { e.value = 0.8; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(600);
    s = await p.evaluate(() => ({ on: window.__rv.on, ch: window.__rv.conv && window.__rv.conv.buffer.numberOfChannels, len: window.__rv.conv && window.__rv.conv.buffer.length, wet: window.__rv.wet.gain.value, dry: window.__rv.dry.gain.value, txt: document.querySelector('#rvmix').closest('.ctl').querySelector('output').textContent }));
    check(`${name}: REVERB up: a stereo convolver with the plate (2.2 s), wet and dry follow (equal power: at 64 % dry is 0.54, wet 0.76), the readout shows the percentage`, s.on && s.ch === 2 && s.len > 2 * 48000 * 0.9 && Math.abs(s.wet - 0.9 * Math.sin(0.64 * Math.PI / 2)) < 0.03 && Math.abs(s.dry - Math.cos(0.64 * Math.PI / 2)) < 0.03 && /^64 %$/.test(s.txt), JSON.stringify(s));
    s = await p.evaluate(() => ({ lp: window.__rv.lp && window.__rv.lp.gain.value, loop: window.__rv.st.loop }));
    check(`${name}: IN LOOP 60 %: the way back into the loop is open (gain 0.2 x sin(mix) x loop = 0.10 at mix 64 %, vink x 0.3)`, s.lp !== null && Math.abs(s.lp - 0.2 * (name === 'vink' ? 0.3 : 1) * Math.sin(0.64 * Math.PI / 2) * 0.6) < 0.01, JSON.stringify(s));
    await p.locator('#rvloop').evaluate(e => { e.value = 0; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(400);
    s = await p.evaluate(() => window.__rv.lp.gain.value);
    check(`${name}: IN LOOP 0: the way back is closed (the reverb is only on the output)`, s < 0.002, String(s));
    await p.locator('#rvloop').evaluate(e => { e.value = 0.6; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(300);
    // the level: the full reverb at the default master must not pass 0 dB
    if (name === 'serge') await p.keyboard.down('a');   // a played instrument: a key holds the sound
    await p.locator('#rvmix').evaluate(e => { e.value = 1; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(500);
    const pk = await p.evaluate(g => new Promise(res => { const rv = window.__rv, an = rv.to.context.createAnalyser(); an.fftSize = 2048; rv.sum.connect(an); let m = 0, rms = 0, n = 0; const t = setInterval(() => { const w = new Float32Array(2048); an.getFloatTimeDomainData(w); let s = 0; for (const v of w) { m = Math.max(m, Math.abs(v)); s += v * v; } rms += s / 2048; n++; }, 50); setTimeout(() => { clearInterval(t); rv.sum.disconnect(an); res({ peak: m, rms: Math.sqrt(rms / n) }); }, 4000); }), g);
    if (name === 'serge') await p.keyboard.up('a');
    check(`${name}: REVERB 100 %: the sound is there and the peak at the sum, before the soft ceiling, stays below 1`, pk.peak < 1 && pk.rms > 0.003, `peak ${pk.peak.toFixed(2)}, rms ${pk.rms.toFixed(3)}`);
    for (const [room, secs] of [['ghost', 2.0], ['void', 4.0], ['plate', 2.64]]) {
      await p.evaluate(r => { const s = document.querySelector('#rvtype'); s.value = r; s.dispatchEvent(new Event('change')); }, room); await p.waitForTimeout(900);
      s = await p.evaluate(() => ({ len: window.__rv.conv && window.__rv.conv.buffer.length / window.__rv.conv.context.sampleRate, ir: window.__rv.st.ir, wet: window.__rv.wet.gain.value }));
      check(`${name}: ROOM ${room} while the reverb runs: a new convolver of ${secs} s, the wet level comes back`, s.ir === room && Math.abs(s.len - secs) < 0.06 && s.wet > 0.5, JSON.stringify(s));
    }
    const c0 = await p.evaluate(() => { window.__c0 = window.__rv.conv; return true; });
    await p.locator('#rvtime').evaluate(e => { e.value = 0.9; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(900);
    s = await p.evaluate(() => ({ same: window.__rv.conv === window.__c0, len: window.__rv.conv.buffer.length / 48000, wet: window.__rv.wet.gain.value }));
    check(`${name}: TAIL up: a new convolver with a longer plate, the wet level comes back`, !s.same && s.len > 3.5 && s.wet > 0.8, JSON.stringify(s));
    await p.locator('#rvmix').evaluate(e => { e.value = 0; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(900);
    s = await p.evaluate(() => ({ on: window.__rv.on, conv: !!window.__rv.conv, wet: window.__rv.wet.gain.value, dry: window.__rv.dry.gain.value, txt: document.querySelector('#rvmix').closest('.ctl').querySelector('output').textContent }));
    check(`${name}: REVERB back to 0: off again, the convolver is gone (no CPU), dry is 1, "off"`, !s.on && !s.conv && s.wet < 0.001 && Math.abs(s.dry - 1) < 0.01 && s.txt === 'off', JSON.stringify(s));
    check(`${name}: no page or console errors`, errors.length === 0, errors.join(' | ').slice(0, 200));
    await p.context().close();
  }
  await browser.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
