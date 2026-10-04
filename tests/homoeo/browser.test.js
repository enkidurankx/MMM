// Browser test for homoeo-v0_1.html in the preinstalled Chromium (fake microphone). Run: PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/homoeo/browser.test.js
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const FILE = 'file://' + path.resolve(__dirname, '../../homoeo-v0_1.html');
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
  check('the page is called homoeo', (await page.title()) === 'homoeo' && (await page.textContent('header h1')) === 'homoeo');
  check('silent until touched: no AudioContext before the first click', (await page.evaluate(() => window.__ctxCount)) === 0);
  check('no horizontal scroll at 390 px', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/1-intro.png' });
  await page.click('#start');
  await page.waitForFunction(() => window.__homoeo && window.__homoeo.ctx && window.__homoeo.ctx.state === 'running', null, { timeout: 8000 }).catch(() => {});
  const state = await page.evaluate(() => window.__homoeo.ctx && window.__homoeo.ctx.state);
  check('audio context running after the click, worklet loaded from a blob', state === 'running', 'state ' + state);
  // layout: Input first, then the four stages of the spec in signal order; each LFO sits in the section it modulates; every section has its own dark surface
  const lay = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('section')], title = x => x.querySelector('h2').textContent.replace(/^\d+/, '').trim().split(' ')[0];
    const lum = c => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    const inSec = sel => { const e = document.querySelector(sel); const sec = e && e.closest('section'); return sec ? title(sec) : null; };
    const colored = secs.filter(x => /loop|ring|delay|input|filter|out/.test(x.className)), bgs = colored.map(x => getComputedStyle(x).backgroundColor);
    return { order: secs.slice(0, 5).map(title), couple: inSec('input[data-p="couple"]'), l1: inSec('input[data-p="l1depth"]'), l2: inSec('input[data-p="l2depth"]'), distinct: new Set(bgs).size, n: colored.length, maxLum: Math.max(...bgs.map(lum)) };
  });
  check('Input comes first, then Nonlinearity, Filter bank, Delays and Homeostasis (the signal flow of the spec)', lay.order.join(',') === 'Input,Nonlinearity,Filter,Delays,Homeostasis', lay.order.join(','));
  check('LFO 1 (delay shift) sits in the Delays section, LFO 2 (filter base frequency) in the Filter bank section', lay.l1 === 'Delays' && lay.l2 === 'Filter', `${lay.l1} / ${lay.l2}`);
  check('COUPLING sits next to INTERMOD in the Nonlinearity section', lay.couple === 'Nonlinearity', String(lay.couple));
  check('each coloured section has its own dark surface (6 different, all dark)', lay.n === 6 && lay.distinct === 6 && lay.maxLum < 0.15, `${lay.distinct} colours, brightest ${lay.maxLum.toFixed(3)}`);
  await page.setViewportSize({ width: 1280, height: 900 });
  const wide = await page.evaluate(() => { const r = [...document.querySelectorAll('.top section')].map(x => x.getBoundingClientRect()); const sl = [...document.querySelectorAll('.top input[type=range]')].map(x => x.getBoundingClientRect().width);
    return { pairs: Math.abs(r[0].top - r[1].top) < 2 && Math.abs(r[2].top - r[3].top) < 2 && r[2].top > r[0].top, n: r.length, minSlider: Math.round(Math.min(...sl)), noScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth }; });
  check('wide screen: the four stages sit in two rows of two, no horizontal scroll', wide.pairs && wide.n === 4 && wide.noScroll, JSON.stringify(wide));
  check('wide screen: every fader is long enough to use (>= 150 px)', wide.minSlider >= 150, wide.minSlider + ' px');
  if (SHOTS) await page.screenshot({ path: SHOTS + '/6-wide.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  // ---- faders: no touch-to-jump (mouse here, touch below) ----
  const geo = sel => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2, v: +el.value }; });
  const thumb = g => g.l + 9 + g.v * (g.w - 18);
  await page.locator('input[data-p="fbg"]').scrollIntoViewIfNeeded();
  let g = await geo('input[data-p="fbg"]');
  await page.mouse.click(g.l + g.w - 4, g.y); await page.mouse.click(g.l + 4, g.y);
  let g2 = await geo('input[data-p="fbg"]');
  check('a click on the track does not move the fader (no touch-to-jump)', Math.abs(g2.v - g.v) < 1e-9, `${g.v.toFixed(4)} -> ${g2.v.toFixed(4)}`);
  const cx = thumb(g); await page.mouse.move(cx + 12, g.y); await page.mouse.down(); await page.waitForTimeout(60);
  g2 = await geo('input[data-p="fbg"]');
  check('grabbing the thumb off-centre does not make it jump', Math.abs(g2.v - g.v) < 1e-9, `${g.v.toFixed(4)} -> ${g2.v.toFixed(4)}`);
  await page.mouse.move(cx + 12 + 30, g.y, { steps: 6 }); const g3 = await geo('input[data-p="fbg"]'); await page.mouse.up();
  const want = g.v + 30 / (g.w - 18);
  check('dragging the thumb moves it relative to the finger (30 px = 30 px of travel)', Math.abs(g3.v - want) < 0.01, `${g3.v.toFixed(4)} (want ${want.toFixed(4)})`);
  check('the parameter followed the drag', Math.abs((await page.evaluate(() => window.__homoeo.st.params.fbg)) - g3.v * 3) < 0.01);
  await page.mouse.move(thumb(g3), g.y); await page.mouse.down(); await page.mouse.move(g.l + g.w + 200, g.y, { steps: 5 }); const g4 = await geo('input[data-p="fbg"]'); await page.mouse.up();
  check('dragging past the end stops at the end', Math.abs(g4.v - 1) < 1e-6, g4.v.toFixed(4));
  await page.focus('input[data-p="fbg"]'); await page.keyboard.press('ArrowLeft'); const g5 = await geo('input[data-p="fbg"]');
  check('keyboard control still works (arrow key)', g5.v < g4.v, `${g4.v.toFixed(4)} -> ${g5.v.toFixed(4)}`);
  for (const sel of ['#master', 'input[data-p="dshift"]', 'input[data-p="fbase"]']) {
    await page.locator(sel).scrollIntoViewIfNeeded(); const a0 = await geo(sel); await page.mouse.click(a0.l + a0.w * 0.9, a0.y); await page.mouse.click(a0.l + a0.w * 0.1, a0.y); const a1 = await geo(sel);
    check(`no jump on ${sel}`, Math.abs(a1.v - a0.v) < 1e-9, `${a0.v.toFixed(4)} -> ${a1.v.toFixed(4)}`);
  }
  { // touch: tap on the track, then a real touch drag on the thumb (CDP touch events)
    const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const tp = await tctx.newPage(); await tp.goto(FILE); await tp.click('#start').catch(() => tp.tap('#start')); await tp.waitForTimeout(800);
    await tp.locator('input[data-p="fbg"]').scrollIntoViewIfNeeded();
    const tg = () => tp.locator('input[data-p="fbg"]').evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2, v: +el.value }; });
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
  await page.click('#burst'); await page.waitForTimeout(2500);
  const mAg = await page.evaluate(() => parseFloat(document.getElementById('mAg').style.width) || 0);
  check('the regulation bar shows the gain the bands hold back while it sounds (> 0 %)', mAg > 1, mAg.toFixed(0) + ' %');
  const m = await page.evaluate(() => window.__homoeo.meter);
  check('the loop makes sound by itself (burst + noise floor): output meter > 0', m.pout > 0.01, 'peak out ' + (m.pout || 0).toFixed(3));
  check('output stays below 1.0', m.pout <= 1.0001, 'peak ' + (m.pout || 0).toFixed(3));
  // microphone = push to talk. The fake device beeps now and then and the meter holds one 30 ms window, so watch it for a few seconds.
  const watch = ms => page.evaluate(ms => new Promise(res => { let m = 0; const t = setInterval(() => { m = Math.max(m, window.__homoeo.meter.pin || 0); }, 20); setTimeout(() => { clearInterval(t); res(m); }, ms); }), ms);
  // the Input section folds; the hold button stays usable when folded
  const vis = sel => page.evaluate(sel => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return !!(e.offsetParent && r.width > 0 && r.height > 0); }, sel);
  check('unfolded: gain, device and note are visible', (await vis('#micgain')) && (await vis('#micSel')) && (await vis('#micNote')));
  await page.click('#micFold');
  check('folded: details are hidden, hold button, latch and meter stay', !(await vis('#micgain')) && !(await vis('#micSel')) && !(await vis('#micNote')) && (await vis('#ptt')) && (await vis('#latch')) && (await vis('.micmain .meter')));
  check('folding is stored and announced (aria-expanded=false)', (await page.evaluate(() => window.__homoeo.st.micFold)) === true && (await page.getAttribute('#micFold', 'aria-expanded')) === 'false');
  // from here on the Input section stays folded: the hold button must work without the details
  check('before any press: microphone not opened, gate closed', (await page.evaluate(() => window.__homoeo.micStream)) === null && (await page.evaluate(() => window.__homoeo.gate)) === 0);
  const box = await page.locator('#ptt').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.waitForTimeout(1200);
  const held = await page.evaluate(() => ({ open: window.__homoeo.open, gate: window.__homoeo.gate, s: !!window.__homoeo.micStream, live: document.getElementById('ptt').classList.contains('live') }));
  check('holding the button opens the microphone and the gate', held.open && held.gate > 0.9 && held.s && held.live, JSON.stringify(held));
  const note = await page.textContent('#micNote');
  check('captured raw (echo cancel / noise suppression / auto gain off)', /echo cancel false/.test(note) && /noise suppression false/.test(note) && /auto gain false/.test(note), note.slice(0, 80));
  const inHeld = await watch(4500);
  check('microphone level reaches the input meter while held (fake device beep)', inHeld > 0.001, 'peak in ' + inHeld.toFixed(3));
  await page.screenshot({ path: (SHOTS || '/tmp') + '/4-live.png' });
  await page.mouse.up(); await page.waitForTimeout(300);
  const rel = await page.evaluate(() => ({ open: window.__homoeo.open, gate: window.__homoeo.gate, s: !!window.__homoeo.micStream }));
  check('releasing closes the gate; the stream stays open for the next press', !rel.open && rel.gate < 0.01 && rel.s, JSON.stringify(rel));
  const inRel = await watch(4500);
  check('nothing reaches the loop after release, although the device keeps beeping', inRel < 1e-6, 'peak in ' + inRel.toExponential(1));
  // keyboard
  await page.keyboard.down('m'); await page.waitForTimeout(300);
  const k1 = await page.evaluate(() => window.__homoeo.open); await page.keyboard.up('m'); await page.waitForTimeout(300);
  check('key M works as push to talk', k1 === true && (await page.evaluate(() => window.__homoeo.open)) === false);
  // latch
  await page.click('#latch'); await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  const l1 = await page.evaluate(() => ({ open: window.__homoeo.open, gate: window.__homoeo.gate }));
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  const l2 = await page.evaluate(() => ({ open: window.__homoeo.open, gate: window.__homoeo.gate }));
  check('latch mode: one tap switches on, the next switches off', l1.open && l1.gate > 0.9 && !l2.open && l2.gate < 0.01, JSON.stringify([l1, l2]));
  await page.click('#latch');
  await page.focus('#micFold'); await page.keyboard.press('Enter');
  check('the fold header also works from the keyboard (Enter)', (await vis('#micgain')) && (await page.evaluate(() => window.__homoeo.st.micFold)) === false);
  await page.selectOption('#micSel', '__off'); await page.waitForTimeout(300);
  check('"close microphone" releases the device', (await page.evaluate(() => window.__homoeo.micStream)) === null);
  // ---- ranges and spacing ----
  const rngs = await page.evaluate(() => { const o = s => document.querySelector(`input[data-p="${s}"]`); const set = (s, v) => { const e = o(s); e.value = v; e.dispatchEvent(new Event('input')); return e.parentNode.querySelector('output').textContent; };
    const res = { fMax: set('fbase', 1), fMaxP: window.__homoeo.st.params.fbase, fMin: set('fbase', 0), fMinP: window.__homoeo.st.params.fbase, dMin: set('dshift', 0), dMax: set('dshift', 1), dMid: set('dshift', 0.5), qMin: set('q', 0), qMax: set('q', 1), cMid: set('couple', 0.5) };
    set('fbase', 0.5); set('dshift', 0.5); set('q', 0.5); return res; });
  check('filter base goes from 40 Hz to 1600 Hz', rngs.fMax === '1600 Hz' && rngs.fMin === '40 Hz' && Math.abs(rngs.fMaxP - 1600) < 0.01 && Math.abs(rngs.fMinP - 40) < 0.01, `${rngs.fMin} ... ${rngs.fMax}`);
  check('delay shift goes from x0.10 to x6.00, logarithmic (middle x0.77)', rngs.dMin === 'x0.10' && rngs.dMax === 'x6.00' && rngs.dMid === 'x0.77', `${rngs.dMin} / ${rngs.dMid} / ${rngs.dMax}`);
  check('Q goes from 0.7 to 30.0, coupling shows 50 % in the middle', rngs.qMin === '0.7' && rngs.qMax === '30.0' && rngs.cMid === '50 %', `${rngs.qMin} ... ${rngs.qMax}, ${rngs.cMid}`);
  const gap = await page.evaluate(() => { const r = [...document.querySelectorAll('section.loop .row')].map(x => x.getBoundingClientRect()); return r[1].top - r[0].top; });
  check('more air between the faders (row pitch >= 56 px, was 42)', gap >= 56, gap.toFixed(0) + ' px');
  // ---- record: 24-bit WAV download ----
  const enc = await page.evaluate(() => Array.from(window.__homoeo.encodeChunk24(new Float32Array([0, 1, -1, 0.5, 2, -2, 1 / 8388607]), new Float32Array([0, 0, 0, 0, 0, 0, 0]))));
  const exp = [0,0,0, 0,0,0,  255,255,127, 0,0,0,  1,0,128, 0,0,0,  0,0,64, 0,0,0,  255,255,127, 0,0,0,  1,0,128, 0,0,0,  1,0,0, 0,0,0];
  check('24-bit encoder: 0, +1, -1, 0.5, clipped +-2 and one LSB are exact (little-endian, two\'s complement)', JSON.stringify(enc) === JSON.stringify(exp), enc.slice(0, 18).join(','));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#burst'); await page.waitForTimeout(1500);
  await page.click('#rec'); await page.waitForTimeout(500);
  const tOn = await page.textContent('#rec');
  await page.waitForTimeout(3000);
  await page.click('#rec'); await page.waitForSelector('#dl:not([hidden])', { timeout: 8000 });
  const dlText = await page.textContent('#dl'), sr = await page.evaluate(() => window.__homoeo.ctx.sampleRate);
  check('REC shows the elapsed time while recording, Download shows length and size afterwards (compact: "↓ 0:03 · 0.9M")', /^■ \d\d:\d\d$/.test(tOn) && /^↓ 0:0[3-5] · [\d.]+M$/.test(dlText), `"${tOn}" / "${dlText}"`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const fs2 = require('fs'), wav = fs2.readFileSync(await dl.path());
  const u32 = o => wav.readUInt32LE(o), u16 = o => wav.readUInt16LE(o), frames = (wav.length - 44) / 6;
  check('download is a valid stereo 24-bit PCM WAV at the device sample rate', wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE' && u16(20) === 1 && u16(22) === 2 && u32(24) === sr && u16(34) === 24 && u32(28) === sr * 6 && u16(32) === 6 && u32(40) === wav.length - 44 && u32(4) === wav.length - 8 && Number.isInteger(frames), `${sr} Hz, ${frames} frames, ${wav.length} bytes`);
  check('file name carries date, sample rate and bit depth', /^homoeo_\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d_\d+k_24bit\.wav$/.test(dl.suggestedFilename()), dl.suggestedFilename());
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
  check('a recording that was not downloaded is not overwritten silently: REC asks "Replace?"', rp1 === 'Replace?' && (await page.evaluate(() => !!window.__homoeo.take)) && !(await page.evaluate(() => window.__homoeo.recording)), rp1);
  await page.waitForTimeout(3400); const rp2 = await page.textContent('#rec');
  check('the "Replace?" question times out and the take stays', /Rec/.test(rp2) && (await page.evaluate(() => !!window.__homoeo.take)), rp2);
  await page.click('#rec'); await page.click('#rec'); await page.waitForTimeout(700);
  check('second tap on "Replace?" starts a new recording (the old take is gone)', (await page.evaluate(() => window.__homoeo.recording)) && !(await page.evaluate(() => !!window.__homoeo.take)) && (await vis('#discard')));
  await page.click('#discard'); const x1 = await page.textContent('#discard');
  check('cancel a running recording: first tap asks "Delete?"', x1 === 'Delete?' && (await page.evaluate(() => window.__homoeo.recording)), x1);
  await page.click('#discard'); await page.waitForTimeout(900);
  check('second tap cancels the recording: no download appears, the bar is back to normal', !(await page.evaluate(() => window.__homoeo.recording)) && !(await vis('#dl')) && !(await vis('#discard')) && /Rec/.test(await page.textContent('#rec')));
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
  const lfo = await page.evaluate(() => new Promise(res => { let lo = 9, hi = -9; const t = setInterval(() => { const v = window.__homoeo.meter.l1 || 0; lo = Math.min(lo, v); hi = Math.max(hi, v); }, 30); setTimeout(() => { clearInterval(t); res([lo, hi]); }, 2500); }));
  const rateTxt = await page.$eval('input[data-p="l1rate"]', el => el.parentNode.querySelector('output').textContent);
  check('LFO 1 runs and its position indicator moves; rate is shown with its period', lfo[1] - lfo[0] > 0.5 && /1\.00 Hz · 1\.0 s/.test(rateTxt), `range ${lfo[0].toFixed(2)} ... ${lfo[1].toFixed(2)}, "${rateTxt}"`);
  const now = await page.evaluate(() => [document.getElementById('l1now').textContent, document.getElementById('l2now').textContent]);
  check('LFO 1 shows the live delay shift while it runs ("now x1.00"); LFO 2 says off at depth 0', /^now x\d\.\d\d$/.test(now[0]) && now[1] === 'off', now.join(' | '));
  await page.$eval('input[data-p="l2depth"]', el => { el.value = 1; el.dispatchEvent(new Event('input')); }); await page.waitForTimeout(600);
  const now2 = await page.textContent('#l2now'); check('LFO 2 shows the live filter base frequency once its depth is up', /^now \d+ Hz$/.test(now2), now2);
  await page.$eval('input[data-p="l2depth"]', el => { el.value = 0; el.dispatchEvent(new Event('input')); });
  const slow = await page.$eval('input[data-p="l2rate"]', el => { el.value = 0; el.dispatchEvent(new Event('input')); return el.parentNode.querySelector('output').textContent; });
  check('slowest LFO rate is about 8 minutes', /0\.002 Hz · 8\.3 min/.test(slow), slow);
  // controls
  await page.click('.seg[data-p="l1shape"] button:nth-child(2)');
  await page.fill('#master', '0.3');
  await page.$eval('input[data-p="fbg"]', el => { el.value = 0.5; el.dispatchEvent(new Event('input')); });
  const st = await page.evaluate(() => ({ s: window.__homoeo.st.params.l1shape, fbg: window.__homoeo.st.params.fbg }));
  check('segment buttons and sliders change the parameters', st.s === 1 && Math.abs(st.fbg - 1.5) < 0.01, JSON.stringify(st));
  await page.click('#presets button:nth-child(3)');
  const pre = await page.evaluate(() => ({ p: window.__homoeo.st.preset, i: window.__homoeo.st.params.imod, c: window.__homoeo.st.params.couple }));
  check('preset "Intermod storm" applies', pre.p === 'Intermod storm' && pre.i === 1 && Math.abs(pre.c - 0.35) < 1e-9, JSON.stringify(pre));
  await page.click('#reset'); await page.waitForTimeout(600);
  const r = await page.evaluate(() => window.__homoeo.meter);
  check('RESET silences the output (LFO 1 at 1 Hz and the loop keeps running)', r.pout < 0.06, 'peak out ' + (r.pout || 0).toFixed(4));
  const saved = await page.evaluate(() => localStorage.getItem('mmm.homoeo.state'));
  check('state is stored under mmm.homoeo.*', !!saved && JSON.parse(saved).preset === 'Intermod storm');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check('nothing else in localStorage', keys.every(k => k.startsWith('mmm.homoeo.')), keys.join(','));
  if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: SHOTS + '/2-running.png' }); await page.screenshot({ path: SHOTS + '/3-full.png', fullPage: true }); }
  // reload keeps the state, and is silent again
  await page.reload(); const again = await page.evaluate(() => ({ n: window.__ctxCount, p: window.__homoeo.st.preset }));
  check('reload: state restored, silent again', again.n === 0 && again.p === 'Intermod storm', JSON.stringify(again));
  check('no external requests', requests.length === 0, requests.join(' '));
  check('no page or console errors', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
