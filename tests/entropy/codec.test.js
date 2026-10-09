// Codec test for entropy-v0_4.html in the preinstalled Chromium: the REAL Opus loop (AudioWorklet -> MessagePort -> Worker with WebCodecs -> back), served over http because
// WebCodecs wants a secure context (localhost counts) and a file: page cannot load a worklet from a blob.
// Run: PW=/opt/node22/lib/node_modules/playwright node tests/entropy/codec.test.js
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
const FILE = path.resolve(__dirname, '../../entropy-v0_4.html');
let ok = true; const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
const server = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(fs.readFileSync(FILE)); });
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  const set = (p, v) => page.evaluate(([p, v]) => { const e = document.querySelector(`input[data-p="${p}"]`); const d = window.__entropy.st.params; const m = e; e.value = v; e.dispatchEvent(new Event('input')); return d[p]; }, [p, v]);
  const raw = (p, v) => page.evaluate(([p, v]) => { const g = window.__entropy; g.st.params[p] = v; g.node.port.postMessage({ type: 'params', params: g.st.params, immediate: false }); }, [p, v]);
  const m = () => page.evaluate(() => { const x = window.__entropy.meter; return { pout: x.pout, mode: x.mode, ready: x.ready, sent: x.sent, back: x.back, tears: x.tears, lat: x.lat, D: x.D, br: x.br, why: x.why, kicks: x.kicks, frame: x.frame }; });
  const watch = async (ms, step = 200) => { const a = []; for (let t = 0; t < ms; t += step) { a.push(await m()); await page.waitForTimeout(step); } return a; };
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  check('secure context: WebCodecs audio is there', await page.evaluate(() => !!window.AudioEncoder && !!window.AudioDecoder && window.isSecureContext));
  await page.click('#start'); await page.waitForFunction(() => window.__entropy.ctx && window.__entropy.ctx.state === 'running', null, { timeout: 8000 }).catch(() => {});
  check('the page asked for 48 kHz (Opus) and got it', (await page.evaluate(() => window.__entropy.ctx.sampleRate)) === 48000);
  await page.waitForFunction(() => window.__entropy.meter.mode === 1, null, { timeout: 8000 }).catch(() => {});
  let x = await m(); check('the worker is ready and the loop runs through Opus (mode 1), no reason given for the stand-in', x.mode === 1 && x.ready === 1 && x.why === '', JSON.stringify(x));

  // ---- A. the default, a clean channel ----
  await raw('loss', 0); await raw('bitflip', 0); await raw('roam', 0); await raw('weather', 0); await page.waitForTimeout(1500);
  const s0 = await m(); const a = await watch(6000); const s1 = a[a.length - 1];
  const ratio = (s1.back - s0.back) / (s1.sent - s0.sent);
  check('clean channel: at least 97 % of the frames come back', ratio > 0.97, `${(100 * ratio).toFixed(1)} % (${s1.back - s0.back} of ${s1.sent - s0.sent})`);
  check('clean channel: the decoder is never torn', s1.tears === 0, String(s1.tears));
  const lats = a.map(v => v.lat); console.log(`info codec latency, 20 ms frames, frame complete -> decoded frame back (EMA): median ${med(lats).toFixed(1)} ms, max ${Math.max(...lats).toFixed(1)} ms; effective loop ${s1.D.toFixed(0)} ms`);
  check('the way back is shorter than the loop (the loop reads behind the frames): median latency < DELAY', med(lats) < s1.D, `${med(lats).toFixed(1)} < ${s1.D.toFixed(0)} ms`);
  check('and it sounds (output level above 0.01)', Math.max(...a.map(v => v.pout)) > 0.01, Math.max(...a.map(v => v.pout)).toFixed(3));

  // ---- B. loss: about the set share of frames goes missing ----
  await raw('loss', 0.2); await page.waitForTimeout(1200); const l0 = await m(); await page.waitForTimeout(5000); const l1 = await m();
  const lr = 1 - (l1.back - l0.back) / (l1.sent - l0.sent);
  check('LOSS 20 %: about a fifth of the frames never comes back (15 ... 25 %)', lr > 0.15 && lr < 0.25, `${(100 * lr).toFixed(1)} %`);
  const ll = []; for (let i = 0; i < 10; i++) { ll.push((await m()).lat); await page.waitForTimeout(500); }
  console.log(`info latency under 20 % loss: ${ll.map(v => v.toFixed(0)).join(' ')} ms`);
  check('the latency does not creep under loss (the decoder numbers its frames itself; the time stamps are kept in the worker): median < 60 ms, last < 60 ms', med(ll) < 60 && ll[ll.length - 1] < 60, `median ${med(ll).toFixed(0)} ms, last ${ll[ll.length - 1].toFixed(0)} ms`);
  check('and the sound goes on', l1.pout > 0.005 || (await m()).pout > 0.005);
  await raw('loss', 0);

  // ---- C. bit flips: the decoder gets torn and recreated, the loop goes on ----
  const t0 = (await m()).tears; await raw('bitflip', 0.02); await page.waitForTimeout(6000); const c1 = await m();
  check('BIT FLIPS at the top: the decoder is torn now and then and recreated (tears rise), the loop keeps going (frames keep coming, output > 0)', c1.tears > t0 && c1.mode === 1 && c1.pout > 0.005, `tears ${t0} -> ${c1.tears}, back ${c1.back}, pout ${c1.pout.toFixed(3)}`);
  await raw('bitflip', 0.004); const tt = (await m()).tears; await page.waitForTimeout(5000); const c2 = await m();
  console.log(`info 0.4 % bit flips: ${c2.tears - tt} tears in 5 s`);
  await raw('bitflip', 0); await page.waitForTimeout(1500); const bb = await m(); await page.waitForTimeout(3000); const b2 = await m();
  check('bit flips off: after a moment frames come back again, no more tears', b2.back - bb.back > 100 && b2.tears === bb.tears, `${b2.back - bb.back} frames, tears ${bb.tears} -> ${b2.tears}`);

  // ---- D. the bitrate wanders: the encoder is reconfigured again and again ----
  await raw('roam', 1); await raw('weather', 1); const d0 = await m(); const d = await watch(9000, 300); const d1 = d[d.length - 1];
  const brs = d.map(v => v.br); check('ROAM and WEATHER at 100 %: the bitrate wanders (more than an octave) and the codec keeps up', Math.log2(Math.max(...brs) / Math.min(...brs)) > 1 && d1.mode === 1 && d1.back - d0.back > 300 && d1.tears === d0.tears, `${Math.min(...brs).toFixed(0)} ... ${Math.max(...brs).toFixed(0)} bit/s, back +${d1.back - d0.back}, tears ${d0.tears} -> ${d1.tears}`);
  await raw('roam', 0); await raw('weather', 0);

  // ---- E. every packet length ----
  for (const [fi, name] of [[0, '2.5 ms'], [1, '5 ms'], [2, '10 ms'], [3, '20 ms'], [4, '40 ms']]) {
    await raw('frame', fi); await page.waitForFunction(f => window.__entropy.meter.frame === f && window.__entropy.meter.mode === 1, fi, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(1500); const e0 = await m(); const e = await watch(3000, 250); const e1 = e[e.length - 1];
    const r = (e1.back - e0.back) / Math.max(1, e1.sent - e0.sent), lt = e.map(v => v.lat);
    console.log(`info frame ${name}: ${(100 * r).toFixed(0)} % back, latency median ${med(lt).toFixed(1)} ms, effective loop ${e1.D.toFixed(0)} ms, tears ${e1.tears}`);
    check(`FRAME ${name}: Opus runs, at least 90 % of the frames come back, loop at least frame + 35 ms`, e1.mode === 1 && r > 0.9 && e1.D >= (parseFloat(name) + 33), `${(100 * r).toFixed(0)} %, ${e1.D.toFixed(0)} ms`);
  }
  await raw('frame', 3);

  // ---- F. the real codec destroys: the high part is gone at a low bitrate (spectrum of the output through the analyser) ----
  await page.evaluate(() => { const g = window.__entropy; Object.assign(g.st.params, { wet: 1, fb: 0.9, seed: 0.5, spread: 0.9, fm: 0.8, spark: 6, fold: 6, am: 0, tobias: 0, wander: 0, bitrate: 6000, roam: 0, loss: 0, delay: 0.1 }); g.node.port.postMessage({ type: 'params', params: g.st.params, immediate: true }); });
  await page.waitForTimeout(3000);
  const cen = async () => page.evaluate(() => { const g = window.__entropy, an = g.ctx.createAnalyser(); an.fftSize = 8192; g.node.connect(an); return new Promise(res => setTimeout(() => { const d = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(d); let A = 0, B = 0, hi = 0, all = 0; for (let k = 2; k < d.length; k++) { const p = Math.pow(10, d[k] / 10), f = k * g.ctx.sampleRate / an.fftSize; A += p * f; B += p; all += p; if (f > 6000) hi += p; } res({ cen: A / B, hiShare: hi / all }); g.node.disconnect(an); }, 1500)); });
  const lo = await cen();
  await page.evaluate(() => { const g = window.__entropy; g.st.params.bitrate = 96000; g.node.port.postMessage({ type: 'params', params: g.st.params, immediate: false }); }); await page.waitForTimeout(3500);
  const hi = await cen();
  console.log(`info through real Opus: 6 kbit/s centroid ${lo.cen.toFixed(0)} Hz (share above 6 kHz ${(100 * lo.hiShare).toFixed(2)} %), 96 kbit/s ${hi.cen.toFixed(0)} Hz (${(100 * hi.hiShare).toFixed(2)} %)`);
  check('the real codec is the brightness ceiling: 6 kbit/s is darker than 96 kbit/s (share of energy above 6 kHz at least 3 x smaller)', lo.hiShare * 3 < hi.hiShare, `${(100 * lo.hiShare).toFixed(3)} % vs ${(100 * hi.hiShare).toFixed(3)} %`);

  // ---- F2. every preset through the real codec: it sounds, stays under the limiter, levels within 8 dB of each other, the loop is alive at the end ----
  { const names = await page.$$eval('#presets button', bs => bs.map(x => x.textContent)), meds = [];
    for (const name of names) {
      await page.locator('#presets button', { hasText: new RegExp('^' + name + '$') }).click(); await page.waitForTimeout(4000);
      const r = await page.evaluate(() => new Promise(res => { const g = window.__entropy, an = g.ctx.createAnalyser(); an.fftSize = 8192; g.node.connect(an); const rows = []; let n = 0;
        const t = setInterval(() => { const w = new Float32Array(an.fftSize); an.getFloatTimeDomainData(w); let s = 0, pk = 0; for (const v of w) { s += v * v; pk = Math.max(pk, Math.abs(v)); } rows.push([Math.sqrt(s / w.length), pk]); if (++n >= 12) { clearInterval(t); g.node.disconnect(an); res(rows); } }, 500); }));
      const rms = r.map(v => v[0]).sort((a, b) => a - b), med1 = 20 * Math.log10(rms[6] + 1e-9), pk = Math.max(...r.map(v => v[1])), mm = await m();
      meds.push(med1); console.log(`info preset ${name.padEnd(14)} median ${med1.toFixed(1)} dB, peak ${pk.toFixed(2)}, mode ${mm.mode}, regulator x${(await page.evaluate(() => window.__entropy.meter.reg)).toFixed(2)}, tears ${mm.tears}`);
      check(`preset ${name} through the real codec: sounds (> -40 dB), peak < 0.97, loop alive`, med1 > -40 && pk < 0.97 && (name === 'Soft rot' || mm.mode === 1));
    }
    check('preset levels within 8 dB of each other (real codec, before the master fader)', Math.max(...meds) - Math.min(...meds) < 8, `${Math.min(...meds).toFixed(1)} ... ${Math.max(...meds).toFixed(1)} dB`);
    await page.locator('#presets button', { hasText: /^Generations$/ }).click(); }

  // ---- G. soft fallback and back ----
  await page.evaluate(() => { const g = window.__entropy; g.st.params.kind = 1; g.node.port.postMessage({ type: 'params', params: g.st.params, immediate: false }); }); await page.waitForTimeout(800);
  const g1 = await m(); await page.evaluate(() => { const g = window.__entropy; g.st.params.kind = 0; g.node.port.postMessage({ type: 'params', params: g.st.params, immediate: false }); }); await page.waitForTimeout(2500); const g2 = await m();
  check('CODEC SOFT drops to the stand-in at once, OPUS brings the real codec back', g1.mode === 0 && g2.mode === 1 && g2.back > g1.back, JSON.stringify([g1.mode, g2.mode]));

  check('no page or console errors', errors.length === 0, errors.join(' | ').slice(0, 300));
  await browser.close(); server.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
