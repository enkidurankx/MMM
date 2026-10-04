// Browser test for chua-v0_1.html in the preinstalled Chromium. Run: PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/chua/browser.test.js
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const FILE = 'file://' + path.resolve(__dirname, '../../chua-v0_1.html');
const SHOTS = process.env.SHOTS; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let ok = true; const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  const page = await ctx.newPage(); const errors = [], requests = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(r.url()); });
  await page.addInitScript(() => { window.__revoked = []; const rv = URL.revokeObjectURL; URL.revokeObjectURL = u => { window.__revoked.push(u); rv.call(URL, u); }; });
  await page.addInitScript(() => { window.__ctxCount = 0; const A = window.AudioContext; window.AudioContext = function (...a) { window.__ctxCount++; return new A(...a); }; window.AudioContext.prototype = A.prototype; });
  await page.goto(FILE);
  check('the page is called chua', (await page.title()) === 'chua' && (await page.textContent('header h1')) === 'chua');
  check('silent until touched: no AudioContext before the first click', (await page.evaluate(() => window.__ctxCount)) === 0);
  check('no horizontal scroll at 390 px', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/1-intro.png' });
  await page.click('#start');
  await page.waitForFunction(() => window.__chua && window.__chua.ctx && window.__chua.ctx.state === 'running', null, { timeout: 8000 }).catch(() => {});
  const state = await page.evaluate(() => window.__chua.ctx && window.__chua.ctx.state);
  check('audio context running after the click, worklet loaded from a blob', state === 'running', 'state ' + state);
  // layout: the attractor first (portrait and readout), then the four parts of the circuit; each LFO sits in the section it modulates; every section has its own dark surface
  const lay = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('section')], title = x => x.querySelector('h2').textContent.replace(/^\d+/, '').trim().split(' ')[0];
    const lum = c => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    const inSec = sel => { const e = document.querySelector(sel); const sec = e && e.closest('section'); return sec ? title(sec) : null; };
    const colored = secs.filter(x => /loop|ring|delay|filter|out/.test(x.className)), bgs = colored.map(x => getComputedStyle(x).backgroundColor);
    return { order: secs.map(title), l1: inSec('input[data-p="l1depth"]'), l2: inSec('input[data-p="l2depth"]'), portrait: inSec('#portrait'), distinct: new Set(bgs).size, n: colored.length, maxLum: Math.max(...bgs.map(lum)) };
  });
  check('order: Attractor, Alpha, Beta, Diode, Time, Output, Presets, Scope', lay.order.join(',') === 'Attractor,Alpha,Beta,Diode,Time,Output,Presets,Scope', lay.order.join(','));
  check('the phase portrait sits in the first section; LFO 1 in Alpha, LFO 2 in Beta', lay.portrait === 'Attractor' && lay.l1 === 'Alpha' && lay.l2 === 'Beta', `${lay.portrait} / ${lay.l1} / ${lay.l2}`);
  check('each coloured section has its own dark surface (5 different, all dark)', lay.n === 5 && lay.distinct === 5 && lay.maxLum < 0.15, `${lay.distinct} colours, brightest ${lay.maxLum.toFixed(3)}`);
  await page.setViewportSize({ width: 1280, height: 900 });
  const wide = await page.evaluate(() => { const r = [...document.querySelectorAll('.top section')].map(x => x.getBoundingClientRect()); const sl = [...document.querySelectorAll('.top input[type=range]')].map(x => x.getBoundingClientRect().width);
    const pr = document.getElementById('portrait').getBoundingClientRect(), ro = document.querySelector('.readout').getBoundingClientRect();
    return { pairs: Math.abs(r[0].top - r[1].top) < 2 && Math.abs(r[2].top - r[3].top) < 2 && r[2].top > r[0].top, n: r.length, minSlider: Math.round(Math.min(...sl)), noScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth, side: ro.left > pr.right - 2 && Math.abs(ro.top - pr.top) < 40, pw: Math.round(pr.width) }; });
  check('wide screen: four parts in two rows of two, portrait and readout side by side, no horizontal scroll', wide.pairs && wide.n === 4 && wide.noScroll && wide.side, JSON.stringify(wide));
  check('wide screen: every fader is long enough to use (>= 150 px)', wide.minSlider >= 150, wide.minSlider + ' px');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/6-wide.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  // ---- faders: no touch-to-jump (mouse here, touch below) ----
  const geo = sel => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2, v: +el.value }; });
  const thumb = g => g.l + 9 + g.v * (g.w - 18);
  await page.locator('input[data-p="alpha"]').scrollIntoViewIfNeeded();
  let g = await geo('input[data-p="alpha"]');
  await page.mouse.click(g.l + g.w - 4, g.y); await page.mouse.click(g.l + 4, g.y);
  let g2 = await geo('input[data-p="alpha"]');
  check('a click on the track does not move the fader (no touch-to-jump)', Math.abs(g2.v - g.v) < 1e-9, `${g.v.toFixed(4)} -> ${g2.v.toFixed(4)}`);
  const cx = thumb(g); await page.mouse.move(cx + 12, g.y); await page.mouse.down(); await page.waitForTimeout(60);
  g2 = await geo('input[data-p="alpha"]');
  check('grabbing the thumb off-centre does not make it jump', Math.abs(g2.v - g.v) < 1e-9, `${g.v.toFixed(4)} -> ${g2.v.toFixed(4)}`);
  await page.mouse.move(cx + 12 + 30, g.y, { steps: 6 }); const g3 = await geo('input[data-p="alpha"]'); await page.mouse.up();
  const want = g.v + 30 / (g.w - 18);
  check('dragging the thumb moves it relative to the finger (30 px = 30 px of travel)', Math.abs(g3.v - want) < 0.01, `${g3.v.toFixed(4)} (want ${want.toFixed(4)})`);
  check('the parameter followed the drag', Math.abs((await page.evaluate(() => window.__chua.st.params.alpha)) - (4 + g3.v * 18)) < 0.01);
  await page.mouse.move(thumb(g3), g.y); await page.mouse.down(); await page.mouse.move(g.l + g.w + 200, g.y, { steps: 5 }); const g4 = await geo('input[data-p="alpha"]'); await page.mouse.up();
  check('dragging past the end stops at the end', Math.abs(g4.v - 1) < 1e-6, g4.v.toFixed(4));
  await page.focus('input[data-p="alpha"]'); await page.keyboard.press('ArrowLeft'); const g5 = await geo('input[data-p="alpha"]');
  check('keyboard control still works (arrow key)', g5.v < g4.v, `${g4.v.toFixed(4)} -> ${g5.v.toFixed(4)}`);
  for (const sel of ['#master', 'input[data-p="rate"]', 'input[data-p="tone"]']) {
    await page.locator(sel).scrollIntoViewIfNeeded(); const a0 = await geo(sel); await page.mouse.click(a0.l + a0.w * 0.9, a0.y); await page.mouse.click(a0.l + a0.w * 0.1, a0.y); const a1 = await geo(sel);
    check(`no jump on ${sel}`, Math.abs(a1.v - a0.v) < 1e-9, `${a0.v.toFixed(4)} -> ${a1.v.toFixed(4)}`);
  }
  { // touch: tap on the track, then a real touch drag on the thumb (CDP touch events)
    const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const tp = await tctx.newPage(); await tp.goto(FILE); await tp.click('#start').catch(() => tp.tap('#start')); await tp.waitForTimeout(800);
    await tp.locator('input[data-p="alpha"]').scrollIntoViewIfNeeded();
    const tg = () => tp.locator('input[data-p="alpha"]').evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2, v: +el.value }; });
    const t0 = await tg(); await tp.touchscreen.tap(t0.l + t0.w - 6, t0.y); await tp.touchscreen.tap(t0.l + 6, t0.y); const t1 = await tg();
    check('touch: a tap on the track does not move the fader', Math.abs(t1.v - t0.v) < 1e-9, `${t0.v.toFixed(4)} -> ${t1.v.toFixed(4)}`);
    const cdp = await tctx.newCDPSession(tp), tx = t0.l + 9 + t0.v * (t0.w - 18) + 10;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: t0.y, id: 1 }] });
    const t2 = await tg();
    for (let i = 1; i <= 3; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + i * 10, y: t0.y, id: 1 }] });
    const t3 = await tg(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    check('touch: grabbing the thumb off-centre does not jump, a 30 px drag moves it 30 px', Math.abs(t2.v - t0.v) < 1e-9 && Math.abs(t3.v - (t0.v + 30 / (t0.w - 18))) < 0.01, `start ${t0.v.toFixed(4)}, grab ${t2.v.toFixed(4)}, end ${t3.v.toFixed(4)}`);
    await tctx.close();
  }
  // ---- sound and readouts (the circuit starts by itself; nothing else drives it) ----
  await page.locator('#presets button', { hasText: 'Double scroll' }).click();
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(5500);
  const reg = () => page.evaluate(() => ({ word: document.getElementById('regime').textContent, lam: document.getElementById('lamv').textContent, pitch: document.getElementById('pitchv').textContent, m: window.__chua.meter }));
  let r0 = await reg();
  check('default circuit: the readout says chaotic, with a positive exponent and a pitch near 110 Hz', r0.word === 'chaotic' && r0.m.lam > 0.2 && /^1[0-9][0-9] Hz$/.test(r0.pitch) && /^\+0\.\d\d/.test(r0.lam), `${r0.word} / ${r0.lam} / ${r0.pitch}`);
  check('the circuit sounds by itself: output meter > 0, below 1.0', r0.m.pout > 0.05 && r0.m.pout < 1, 'peak out ' + r0.m.pout.toFixed(3));
  const ink = () => page.evaluate(() => { const c = document.getElementById('portrait'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, sx = 0, sy = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 90) { n++; const p = i / 4; sx += p % c.width; sy += Math.floor(p / c.width); } return { n, cx: n ? sx / n / c.width : 0, cy: n ? sy / n / c.height : 0 }; });
  const i1 = await ink();
  check('the phase portrait draws the orbit (X-Y: spread over both scrolls, centred)', i1.n > 800 && Math.abs(i1.cx - 0.5) < 0.12, JSON.stringify({ n: i1.n, cx: +i1.cx.toFixed(2) }));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/2-running.png' });
  await page.locator('#sAtt .seg button', { hasText: 'X-Z' }).click(); await page.waitForTimeout(1500);
  const i2 = await ink();
  check('the projection button changes the view (X-Z has a different shape than X-Y) and is stored', i2.n > 500 && Math.abs(i2.cy - i1.cy) > 0.01 && (await page.evaluate(() => window.__chua.st.params.proj)) === 1, JSON.stringify({ n: i2.n, cy: +i2.cy.toFixed(2), was: +i1.cy.toFixed(2) }));
  await page.locator('#sAtt .seg button', { hasText: 'X-Y' }).click();
  // alpha to 12 with the fader value: the regime turns periodic
  await page.evaluate(() => { const e = document.querySelector('input[data-p="alpha"]'); e.value = (12 - 4) / 18; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(4500);
  r0 = await reg();
  check('ALPHA 12: the readout turns to periodic (exponent near 0) and the value is shown', r0.word === 'periodic' && Math.abs(r0.m.lam) < 0.08 && (await page.textContent('input[data-p="alpha"] + output')) === '12.00', `${r0.word} / ${r0.lam}`);
  await page.locator('#presets button', { hasText: 'Double scroll' }).click(); await page.waitForTimeout(4500); r0 = await reg();
  check('preset "Double scroll" brings chaos back and moves the fader', r0.word === 'chaotic' && (await page.textContent('input[data-p="alpha"] + output')) === '15.60', r0.word + ' / ' + (await page.textContent('input[data-p="alpha"] + output')));
  await page.locator('#presets button', { hasText: 'Limit cycle' }).click(); await page.waitForTimeout(4500); r0 = await reg();
  check('preset "Limit cycle": periodic', r0.word === 'periodic', `${r0.word} / ${r0.lam} / ${r0.pitch}`);
  await page.locator('#presets button', { hasText: 'Roar' }).click(); await page.waitForTimeout(4500); r0 = await reg();
  check('preset "Roar": chaotic, higher pitch than the default', r0.word === 'chaotic' && parseFloat(r0.pitch) > 200, `${r0.word} / ${r0.pitch}`);
  // LFO readout
  await page.evaluate(() => { const e = document.querySelector('input[data-p="l1depth"]'); e.value = 1; e.dispatchEvent(new Event('input')); const f = document.querySelector('input[data-p="l1rate"]'); f.value = 1; f.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(2500); const nowTxt = await page.textContent('#l1now');
  check('LFO 1 shows the alpha it has reached ("now 15.xx") when its depth is above 0', /^now \d+\.\d\d$/.test(nowTxt), nowTxt);
  await page.evaluate(() => { const e = document.querySelector('input[data-p="l1depth"]'); e.value = 0; e.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(400); check('LFO 1 depth 0 = "off"', (await page.textContent('#l1now')) === 'off');
  await page.locator('#presets button', { hasText: 'Roar' }).click();
  await page.click('#kick'); await page.waitForTimeout(800);
  check('KICK: still sounding and bounded afterwards', (await page.evaluate(() => window.__chua.meter.pout)) > 0.02 && (await page.evaluate(() => window.__chua.meter.reseeds)) === 0);
  const vis = sel => page.evaluate(sel => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return !!(e.offsetParent && r.width > 0 && r.height > 0); }, sel);
  // ---- record: 24-bit WAV download ----
  const enc = await page.evaluate(() => Array.from(window.__chua.encodeChunk24(new Float32Array([0, 1, -1, 0.5, 2, -2, 1 / 8388607]), new Float32Array([0, 0, 0, 0, 0, 0, 0]))));
  const exp = [0,0,0, 0,0,0,  255,255,127, 0,0,0,  1,0,128, 0,0,0,  0,0,64, 0,0,0,  255,255,127, 0,0,0,  1,0,128, 0,0,0,  1,0,0, 0,0,0];
  check('24-bit encoder: 0, +1, -1, 0.5, clipped +-2 and one LSB are exact (little-endian, two\'s complement)', JSON.stringify(enc) === JSON.stringify(exp), enc.slice(0, 18).join(','));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#kick'); await page.waitForTimeout(1500);
  await page.click('#rec'); await page.waitForTimeout(500);
  const tOn = await page.textContent('#rec');
  await page.waitForTimeout(3000);
  await page.click('#rec'); await page.waitForSelector('#dl:not([hidden])', { timeout: 8000 });
  const dlText = await page.textContent('#dl'), sr = await page.evaluate(() => window.__chua.ctx.sampleRate);
  check('REC shows the elapsed time while recording, Download shows length and size afterwards (compact: "↓ 0:03 · 0.9M")', /^■ \d\d:\d\d$/.test(tOn) && /^↓ 0:0[3-5] · [\d.]+M$/.test(dlText), `"${tOn}" / "${dlText}"`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const fs2 = require('fs'), wav = fs2.readFileSync(await dl.path());
  const u32 = o => wav.readUInt32LE(o), u16 = o => wav.readUInt16LE(o), frames = (wav.length - 44) / 6;
  check('download is a valid stereo 24-bit PCM WAV at the device sample rate', wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE' && u16(20) === 1 && u16(22) === 2 && u32(24) === sr && u16(34) === 24 && u32(28) === sr * 6 && u16(32) === 6 && u32(40) === wav.length - 44 && u32(4) === wav.length - 8 && Number.isInteger(frames), `${sr} Hz, ${frames} frames, ${wav.length} bytes`);
  check('file name carries date, sample rate and bit depth', /^chua_\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d_\d+k_24bit\.wav$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  let pk = 0, sq = 0, nz = 0; for (let i = 44; i + 5 < wav.length; i += 6) { let v = wav[i] | (wav[i + 1] << 8) | (wav[i + 2] << 16); if (v > 8388607) v -= 16777216; const x = v / 8388607; pk = Math.max(pk, Math.abs(x)); sq += x * x; nz++; }
  const secs = frames / sr, rmsDb = 20 * Math.log10(Math.sqrt(sq / nz) + 1e-12);
  check('the recording is about as long as the pressed time and holds the loop sound (not silent, not clipped)', secs > 3 && secs < 4.6 && pk > 0.02 && pk < 0.99 && rmsDb > -50, `${secs.toFixed(2)} s, peak ${pk.toFixed(3)}, rms ${rmsDb.toFixed(1)} dB`);
  await page.click('#rec'); await page.waitForTimeout(800); await page.click('#rec'); await page.waitForTimeout(800);
  const dl2 = await page.textContent('#dl'); check('a second recording replaces the first download button', /^↓ 0:0[0-2]/.test(dl2) && dl2 !== dlText, dl2);
  // ---- the top bar never wraps; discard; no silent overwrite ----
  const oneRow = async w => { await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(200); return page.evaluate(() => { const h = document.querySelector('header'); const kids = [...h.children].filter(e => e.offsetParent !== null && !e.classList.contains('sp')); const tops = kids.map(e => e.getBoundingClientRect().top); return { h: Math.round(h.getBoundingClientRect().height), spread: Math.round(Math.max(...tops) - Math.min(...tops)), noScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth, n: kids.length }; }); };
  for (const w of [390, 360, 320]) { const r = await oneRow(w); check(`top bar stays on ONE row with a recording present (${w} px wide)`, r.spread < 4 && r.h < 66 && r.noScroll, JSON.stringify(r)); }
  for (const w of [390, 360]) {
    await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    const lbl = await page.evaluate(() => { const d = document.getElementById('dl'); return { clipped: d.scrollWidth > d.clientWidth + 1, text: d.textContent }; });
    check(`the Download label is complete, not cut off (${w} px)`, !lbl.clipped, JSON.stringify(lbl));
  }
  await page.click('#discard'); await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  const lbl2 = await page.evaluate(() => { const d = document.getElementById('dl'); return { clipped: d.scrollWidth > d.clientWidth + 1, text: d.textContent }; });
  check('the Download label stays complete while "Delete?" is shown (390 px)', !lbl2.clipped, JSON.stringify(lbl2));
  await page.waitForTimeout(3300);
  await page.setViewportSize({ width: 360, height: 844 }); await page.waitForTimeout(150); await page.click('#discard');
  const lbl3 = await page.evaluate(() => { const d = document.getElementById('dl'); return { clipped: d.scrollWidth > d.clientWidth + 1, text: d.textContent, armed: document.getElementById('discard').textContent }; });
  check('... and also at 360 px', !lbl3.clipped && lbl3.armed === 'Delete?', JSON.stringify(lbl3));
  await page.waitForTimeout(3300); await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(3300);   // the unconfirmed "Delete?" lapses by itself and the take stays
  const noTake = await page.evaluate(() => document.querySelector('header h1').offsetParent !== null);
  check('with a recording present the title makes room on the phone', noTake === false);
  await page.click('#rec'); const rp1 = await page.textContent('#rec');
  check('a recording that was not downloaded is not overwritten silently: REC asks "Replace?"', rp1 === 'Replace?' && (await page.evaluate(() => !!window.__chua.take)) && !(await page.evaluate(() => window.__chua.recording)), rp1);
  await page.waitForTimeout(3400); const rp2 = await page.textContent('#rec');
  check('the "Replace?" question times out and the take stays', /Rec/.test(rp2) && (await page.evaluate(() => !!window.__chua.take)), rp2);
  await page.click('#rec'); await page.click('#rec'); await page.waitForTimeout(700);
  check('second tap on "Replace?" starts a new recording (the old take is gone)', (await page.evaluate(() => window.__chua.recording)) && !(await page.evaluate(() => !!window.__chua.take)) && (await vis('#discard')));
  await page.click('#discard'); const x1 = await page.textContent('#discard');
  check('cancel a running recording: first tap asks "Delete?"', x1 === 'Delete?' && (await page.evaluate(() => window.__chua.recording)), x1);
  await page.click('#discard'); await page.waitForTimeout(900);
  check('second tap cancels the recording: no download appears, the bar is back to normal', !(await page.evaluate(() => window.__chua.recording)) && !(await vis('#dl')) && !(await vis('#discard')) && /Rec/.test(await page.textContent('#rec')));
  await page.click('#rec'); await page.waitForTimeout(1300); await page.click('#rec'); await page.waitForSelector('#dl:not([hidden])');
  const url = await page.getAttribute('#dl', 'href');
  await page.click('#discard'); await page.waitForTimeout(3400);
  check('delete a finished take: an unconfirmed "Delete?" times out and keeps it', (await vis('#dl')) && (await page.textContent('#discard')) === '✕');
  await page.click('#discard'); await page.click('#discard');
  const freed = await page.evaluate(u => window.__revoked.includes(u), url);
  check('second tap deletes the take: Download and X disappear, the memory (blob URL) is released', !(await vis('#dl')) && !(await vis('#discard')) && freed, String(freed));
  // LFOs: fastest setting, full depth: the position indicator must move
  await page.$eval('input[data-p="l1rate"]', el => { el.value = 1; el.dispatchEvent(new Event('input')); });
  await page.$eval('input[data-p="l1depth"]', el => { el.value = 1; el.dispatchEvent(new Event('input')); });
  const lfo = await page.evaluate(() => new Promise(res => { let lo = 9, hi = -9; const t = setInterval(() => { const v = window.__chua.meter.l1 || 0; lo = Math.min(lo, v); hi = Math.max(hi, v); }, 30); setTimeout(() => { clearInterval(t); res([lo, hi]); }, 2500); }));
  const rateTxt = await page.$eval('input[data-p="l1rate"]', el => el.parentNode.querySelector('output').textContent);
  check('LFO 1 runs and its position indicator moves; rate is shown with its period', lfo[1] - lfo[0] > 0.5 && /1\.00 Hz · 1\.0 s/.test(rateTxt), `range ${lfo[0].toFixed(2)} ... ${lfo[1].toFixed(2)}, "${rateTxt}"`);
  const now = await page.evaluate(() => [document.getElementById('l1now').textContent, document.getElementById('l2now').textContent]);
  check('LFO 1 shows the live alpha while it runs ("now 15.xx"); LFO 2 says off at depth 0', /^now \d+\.\d\d$/.test(now[0]) && now[1] === 'off', now.join(' | '));
  await page.$eval('input[data-p="l2depth"]', el => { el.value = 1; el.dispatchEvent(new Event('input')); }); await page.waitForTimeout(600);
  const now2 = await page.textContent('#l2now'); check('LFO 2 shows the live beta once its depth is up', /^now \d+\.\d$/.test(now2), now2);
  await page.$eval('input[data-p="l2depth"]', el => { el.value = 0; el.dispatchEvent(new Event('input')); });
  const slow = await page.$eval('input[data-p="l2rate"]', el => { el.value = 0; el.dispatchEvent(new Event('input')); return el.parentNode.querySelector('output').textContent; });
  check('slowest LFO rate is about 8 minutes', /0\.002 Hz · 8\.3 min/.test(slow), slow);
  // controls
  await page.click('.seg[data-p="l1shape"] button:nth-child(2)');
  await page.fill('#master', '0.3');
  await page.$eval('input[data-p="alpha"]', el => { el.value = 0.5; el.dispatchEvent(new Event('input')); });
  const st = await page.evaluate(() => ({ s: window.__chua.st.params.l1shape, alpha: window.__chua.st.params.alpha }));
  check('segment buttons and sliders change the parameters', st.s === 1 && Math.abs(st.alpha - 13) < 0.01, JSON.stringify(st));
  await page.click('#presets button:nth-child(3)');
  const pre = await page.evaluate(() => ({ p: window.__chua.st.preset, a: window.__chua.st.params.alpha, r: window.__chua.st.params.rate }));
  check('preset "Limit cycle" applies (alpha 12, rate 130)', pre.p === 'Limit cycle' && pre.a === 12 && pre.r === 130, JSON.stringify(pre));
  await page.click('#presets button:nth-child(5)');
  await page.waitForTimeout(1500); const tauBefore = await page.evaluate(() => window.__chua.meter.tau);
  await page.click('#reset'); await page.waitForTimeout(150);
  const rs = await page.evaluate(() => window.__chua.meter);
  check('RESET starts the circuit again from rest: the readout is measuring again (tau window restarted)', tauBefore > 50 && rs.tau < 40, `tau ${tauBefore.toFixed(0)} -> ${rs.tau.toFixed(0)}`);
  await page.waitForTimeout(1200);
  check('... and it sounds again afterwards', (await page.evaluate(() => window.__chua.meter.pout)) > 0.02);
  const saved = await page.evaluate(() => localStorage.getItem('mmm.chua.state'));
  check('state is stored under mmm.chua.*', !!saved && JSON.parse(saved).preset === 'Roar');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check('nothing else in localStorage', keys.every(k => k.startsWith('mmm.chua.')), keys.join(','));
  if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: SHOTS + '/2-running.png' }); await page.screenshot({ path: SHOTS + '/3-full.png', fullPage: true }); }
  await page.click('#mute'); await page.waitForTimeout(250);
  const mu1 = await page.evaluate(() => ({ t: document.getElementById('mute').getAttribute('aria-label'), p: document.getElementById('mute').getAttribute('aria-pressed'), g: window.__chua.outGain, m: window.__chua.muted }));
  check('MUTE: the output gain goes to 0, the button shows the muted state (Unmute label, pressed)', mu1.m && mu1.g < 0.001 && mu1.t === 'Unmute' && mu1.p === 'true', JSON.stringify(mu1));
  for (const w of [360, 320]) {
    await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    const hb = await page.evaluate(() => { const h = document.querySelector('header'); const r = [...h.children].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()); const cy = r.map(x => x.top + x.height / 2); return { spread: Math.round(Math.max(...cy) - Math.min(...cy)), over: h.scrollWidth > h.clientWidth + 1 }; });
    check(`MUTE: the top bar stays one row at ${w} px`, hb.spread <= 4 && !hb.over, JSON.stringify(hb));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#mute'); await page.waitForTimeout(250);
  const mu2 = await page.evaluate(() => ({ t: document.getElementById('mute').getAttribute('aria-label'), g: window.__chua.outGain }));
  check('MUTE: a second tap brings the output back (gain 1)', mu2.g > 0.999 && mu2.t === 'Mute', JSON.stringify(mu2));
  // reload keeps the state, and is silent again
  await page.reload(); const again = await page.evaluate(() => ({ n: window.__ctxCount, p: window.__chua.st.preset }));
  check('reload: state restored, silent again', again.n === 0 && again.p === 'Roar', JSON.stringify(again));
  check('no external requests', requests.length === 0, requests.join(' '));
  check('no page or console errors', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
