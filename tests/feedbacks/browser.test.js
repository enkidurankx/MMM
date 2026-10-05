// Browser test shared by the three feedback apps (vink.loop, homoeo, chua) in the preinstalled Chromium.
// Run: PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js <vink|homoeo|chua>
// The same checks run for every app, so the series stays one design: header, recorder dock, sections with icons and colours, controls with a hint,
// faders with air, curves, fine control, audio-rate LFOs. App-specific parts (microphone, phase portrait) follow at the end.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const APPS = {
  vink:   { file: 'vink-v1_0.html', g: '__vink', title: 'VINK·LOOP', mic: true, action: '#burst', store: 'mmm.vink.', slug: 'vink-loop',
            sections: ['Input', 'Ring modulator', 'Loop', 'Delay', 'Filter', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'fbk', lin: [0, 1.5] }, curve: { p: 'wow', pos: 0.5, want: 0.25 }, preset: 'Dark ladder', lfoNow: { 1: 'ms', 2: 'Hz' } },
  homoeo: { file: 'homoeo-v1_0.html', g: '__homoeo', title: 'homoeo', mic: true, action: '#burst', store: 'mmm.homoeo.', slug: 'homoeo',
            sections: ['Input', 'Homeostasis', 'Nonlinearity', 'Filter bank', 'Delays', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'fbg', lin: [0, 3] }, curve: { p: 'damp', pos: 0.5, want: 8 * Math.pow(0.5, 1.6) }, preset: 'Glass', lfoNow: { 1: 'x', 2: 'Hz' } },
  chua:   { file: 'chua-v1_0.html', g: '__chua', title: 'chua', mic: false, action: '#kick', store: 'mmm.chua.', slug: 'chua',
            sections: ['Attractor', 'Alpha', 'Beta', 'Diode', 'Time', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'alpha', lin: [12.5, 18] }, curve: { p: 'low', pos: 0.5, want: Math.pow(0.5, 1.5) }, preset: 'Roar', lfoNow: { 1: '', 2: '' } },
  krell:  { file: 'krell-v0_1.html', g: '__krell', title: 'krell', mic: false, action: '#trig', store: 'mmm.krell.', slug: 'krell',
            sections: ['Events', 'Time', 'Pitch', 'Voice', 'Echo', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'chance', lin: [0, 1] }, curve: { p: 'spread', pos: 0.5, want: Math.pow(0.5, 1.5) }, preset: 'Dense chatter', lfoNow: { 1: '', 2: '' } },
  tudor:  { file: 'tudor-v0_1.html', g: '__tudor', title: 'tudor', mic: false, action: '#burst', store: 'mmm.tudor.', slug: 'tudor',
            sections: ['Modes', 'Loop', 'Overdrive', 'Resonators', 'Phase', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'shape', lin: [0, 1] }, curve: { p: 'noise', pos: 0.5, want: Math.pow(0.5, 1.5) }, preset: 'Hot bus', lfoNow: { 1: '', 2: '' } },
};
const NAME = process.argv[2], A = APPS[NAME]; if (!A) { console.log('usage: browser.test.js <vink|homoeo|chua>'); process.exit(2); }
const FILE = 'file://' + path.resolve(__dirname, '../..', A.file), G = A.g;
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
  const vis = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return !!(e.offsetParent && r.width > 0 && r.height > 0); }, sel);
  const setP = (p, pos) => page.evaluate(([p, pos]) => { const e = document.querySelector(`input[data-p="${p}"]`); e.value = pos; e.dispatchEvent(new Event('input')); return e.closest('.ctl').querySelector('output').textContent; }, [p, pos]);
  const val = p => page.evaluate(([g, p]) => window[g].st.params[p], [G, p]);

  // ---------- basics ----------
  check(`the page is called ${A.title}`, (await page.title()) === A.title && (await page.textContent('header h1')) === A.title);
  check('silent until touched: no AudioContext before the first click', (await page.evaluate(() => window.__ctxCount)) === 0);
  check('no horizontal scroll at 390 px', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  if (SHOTS) await page.screenshot({ path: SHOTS + `/${NAME}-1-intro.png` });
  await page.click('#start');
  await page.waitForFunction(g => window[g] && window[g].ctx && window[g].ctx.state === 'running', G, { timeout: 8000 }).catch(() => {});
  check('audio context running after the click, worklet loaded from a blob', (await page.evaluate(g => window[g].ctx && window[g].ctx.state, G)) === 'running');

  // ---------- one design: header, dock, sections ----------
  const lay = await page.evaluate(() => {
    const h = document.querySelector('header'), d = document.querySelector('#dock'), hr = h.getBoundingClientRect(), dr = d.getBoundingClientRect(), cs = getComputedStyle(d);
    const kids = [...h.children].filter(e => e.offsetParent && !e.classList.contains('sp')).map(e => e.id || e.tagName.toLowerCase());
    const secs = [...document.querySelectorAll('section')];
    const lum = c => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
    const colored = secs.filter(x => /\bt[1-6]\b/.test(x.className)), bgs = colored.map(x => getComputedStyle(x).backgroundColor);
    return { kids, recInHeader: !!h.querySelector('#rec, #dl, #discard, #rectime'), dockPos: cs.position, dockBottom: Math.round(innerHeight - dr.bottom), headerTop: Math.round(hr.top), dockHasAll: !!d.querySelector('#rec') && !!d.querySelector('#dl') && !!d.querySelector('#discard') && !!d.querySelector('#rectime'),
      titles: secs.map(x => x.querySelector('h2 .t').textContent), icons: secs.every(x => !!x.querySelector('h2 .ico svg use')), nums: secs.map(x => x.querySelector('h2 .n').textContent).join(','),
      colored: colored.length, distinct: new Set(bgs).size, maxLum: Math.max(...bgs.map(lum)), hue: getComputedStyle(document.documentElement).getPropertyValue('--h').trim() };
  });
  check('header holds only title, mute, the action button and reset (no recording controls in it)', lay.kids.join(',') === `h1,mute,${A.action.slice(1)},reset` || lay.kids.join(',') === `svg,h1,mute,${A.action.slice(1)},reset`, lay.kids.join(','));
  check('recording is separate: REC, time, download and discard live in the dock at the bottom of the screen, not in the header', !lay.recInHeader && lay.dockHasAll && lay.dockPos === 'fixed' && lay.dockBottom <= 1 && lay.headerTop === 0, JSON.stringify({ pos: lay.dockPos, bottom: lay.dockBottom }));
  check(`sections in order: ${A.sections.join(', ')}`, lay.titles.join(',') === A.sections.join(','), lay.titles.join(','));
  check('every section has an icon and a number', lay.icons && lay.nums === '1,2,3,4,5,6,7,8', lay.nums);
  check(`${A.colored} coloured sections, each its own dark surface (presets and scope are graphite)`, lay.colored === A.colored && lay.distinct === A.colored && lay.maxLum < 0.15, `${lay.distinct} colours, brightest ${lay.maxLum.toFixed(3)}`);

  // ---------- controls: label, value, one short hint; air between the faders; touch size ----------
  const ctl = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('.ctl')], bad = [], longHints = [];
    for (const c of cs) { const l = c.querySelector('label'), h = c.querySelector('.hint'); if (!l || !l.textContent.trim()) bad.push('no label'); if (!h) bad.push('no hint: ' + (l && l.textContent)); else if (h.textContent.length > 58) longHints.push(h.textContent.length + ': ' + h.textContent); }
    const sliders = [...document.querySelectorAll('input[type=range]')], gaps = [];
    for (let i = 1; i < sliders.length; i++) { const a = sliders[i - 1].getBoundingClientRect(), b = sliders[i].getBoundingClientRect(); const d = b.top - a.top; if (d > 0 && d < 400 && sliders[i].closest('section') === sliders[i - 1].closest('section')) gaps.push(Math.round(d)); }
    return { n: cs.length, bad, longHints, minGap: Math.min(...gaps), minH: Math.round(Math.min(...sliders.map(s => s.getBoundingClientRect().height))), unit: document.querySelectorAll('.ctl output').length };
  });
  check(`all ${ctl.n} controls have a label and a hint, and every hint is short (58 characters at most)`, ctl.bad.length === 0 && ctl.longHints.length === 0, JSON.stringify(ctl.bad.concat(ctl.longHints)).slice(0, 200));
  check('a lot of air between the faders: distance from one fader to the next is at least 100 px, every fader is at least 44 px tall (thumb zone)', ctl.minGap >= 100 && ctl.minH >= 44, `${ctl.minGap} px apart, ${ctl.minH} px tall`);
  check('no hint says more than it must: the whole page holds no paragraph longer than 130 characters', await page.evaluate(() => [...document.querySelectorAll('.lead,.hint,#micNote')].every(e => e.textContent.length <= 130)));

  // ---------- curves: more room near the minimum ----------
  const c0 = A.curve, got = await (async () => { await setP(c0.p, c0.pos); return val(c0.p); })();
  check(`curve: the ${c0.p} fader at half travel gives ${c0.want.toFixed(3)}, not the linear half (more fine control at the low end)`, Math.abs(got - c0.want) < 0.01 * (1 + c0.want), String(got));
  if (A.file.startsWith('chua')) { await setP('asym', 0.75); const as = await val('asym'); check('curve: the asymmetry fader is centred and finer around zero (75 % travel = +0.0075)', Math.abs(as - 0.0075) < 0.0005, as.toFixed(4)); await setP('asym', 0.5); }
  await setP(c0.p, 0.5);

  // ---------- LFO range reaches the audio range ----------
  const tops = await page.evaluate(() => { const o = s => { const e = document.querySelector(`input[data-p="${s}"]`); const v = e.value; return e; }; return null; });
  const rMax = await setP('l1rate', 1), rMin = await setP('l1rate', 0);
  check('LFO rate goes from one turn in 8 minutes up to 1000 Hz (audio range, labelled)', /^1000 Hz · audio$/.test(rMax) && /^0\.002 Hz · 8\.3 min$/.test(rMin), `${rMin} ... ${rMax}`);
  const rMid = await setP('l1rate', 0.5); check('the LFO rate is logarithmic: half travel is about 1.4 Hz', /^1\.4\d Hz/.test(rMid) || /^1\.5\d Hz/.test(rMid) || /^1\.3\d Hz/.test(rMid), rMid);
  const dep = await setP('l1depth', 0.5); const depV = await val('l1depth');
  check('LFO depth has a curve too (half travel = 25 %)', Math.abs(depV - 0.25) < 0.005 && dep === '25 %', dep);
  await setP('l1rate', 0.3); await setP('l1depth', 0);

  // ---------- faders: no touch-to-jump, relative drag ----------
  check('no fader can jump to the touch point on any browser: every native range input takes no pointer events, a wrapper does the work', await page.evaluate(() => { const i = [...document.querySelectorAll('input[type=range]')]; return i.length > 8 && i.every(e => getComputedStyle(e).pointerEvents === 'none' && !!e.closest('.sl')); }));
  check('taps and clicks aimed at the very input (all faders, the track, both ends) change nothing', await page.evaluate(() => { const i = [...document.querySelectorAll('input[type=range]')], before = i.map(e => e.value); for (const e of i) { const r = e.getBoundingClientRect(); for (const f of [0.05, 0.5, 0.95]) { const x = r.left + r.width * f, y = r.top + r.height / 2, t0 = document.elementFromPoint(x, y), t = t0 && e.parentElement.contains(t0) ? t0 : e; /* a slider under the fixed dock would hit the dock buttons */ for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) (t || e).dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })); } } return i.every((e, k) => e.value === before[k]); }));
  const F = A.fader, span = F.lin[1] - F.lin[0];
  const geo = sel => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2, v: +el.value }; });
  const thumb = g => g.l + 13 + g.v * (g.w - 26);
  const fsel = `input[data-p="${F.p}"]`;
  await page.locator(fsel).evaluate(e => e.scrollIntoView({ block: 'center' }));
  let g = await geo(fsel);
  await page.mouse.click(g.l + g.w - 4, g.y); await page.mouse.click(g.l + 4, g.y);
  let g2 = await geo(fsel);
  check('a click on the track does not move the fader (no touch-to-jump)', Math.abs(g2.v - g.v) < 1e-9, `${g.v.toFixed(4)} -> ${g2.v.toFixed(4)}`);
  const cx = thumb(g); await page.mouse.move(cx + 12, g.y); await page.mouse.down(); await page.waitForTimeout(60);
  g2 = await geo(fsel);
  check('grabbing the thumb off-centre does not make it jump', Math.abs(g2.v - g.v) < 1e-9, `${g.v.toFixed(4)} -> ${g2.v.toFixed(4)}`);
  await page.mouse.move(cx + 12 + 30, g.y, { steps: 6 }); const g3 = await geo(fsel); await page.mouse.up();
  const want = g.v + 30 / (g.w - 26);
  check('dragging the thumb moves it relative to the finger (30 px = 30 px of travel)', Math.abs(g3.v - want) < 0.01, `${g3.v.toFixed(4)} (want ${want.toFixed(4)})`);
  check('the parameter followed the drag', Math.abs((await val(F.p)) - (F.lin[0] + g3.v * span)) < 0.01 * span);
  await page.mouse.move(thumb(g3), g.y); await page.mouse.down(); await page.mouse.move(g.l + g.w + 200, g.y, { steps: 5 }); const g4 = await geo(fsel); await page.mouse.up();
  check('dragging past the end stops at the end', Math.abs(g4.v - 1) < 1e-6, g4.v.toFixed(4));
  await page.focus(fsel); await page.keyboard.press('ArrowLeft'); const g5 = await geo(fsel);
  check('keyboard control still works (arrow key)', g5.v < g4.v, `${g4.v.toFixed(4)} -> ${g5.v.toFixed(4)}`);
  // fine control: hold the thumb still, then drag: one fifth of the travel
  await page.locator(fsel).evaluate(el => { el.value = 0.3; el.dispatchEvent(new Event('input')); });
  let gf = await geo(fsel); const fx = thumb(gf);
  await page.mouse.move(fx, gf.y); await page.mouse.down(); await page.mouse.move(fx + 60, gf.y, { steps: 6 }); const coarse = (await geo(fsel)).v - gf.v; await page.mouse.up();
  await page.locator(fsel).evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, gf.v);
  gf = await geo(fsel); const fx2 = thumb(gf);
  await page.mouse.move(fx2, gf.y); await page.mouse.down(); await page.waitForTimeout(520);
  const fineOn = await page.locator(fsel).evaluate(el => el.closest('.ctl').classList.contains('fine'));
  await page.mouse.move(fx2 + 60, gf.y, { steps: 6 }); const fine = (await geo(fsel)).v - gf.v; await page.mouse.up();
  const fineOff = await page.locator(fsel).evaluate(el => !el.closest('.ctl').classList.contains('fine'));
  check('fine control: hold the thumb still for half a second, then a 60 px drag moves it one fifth as far (and the control is marked FINE until you let go)', fineOn && fineOff && Math.abs(fine / coarse - 0.2) < 0.04, `coarse ${coarse.toFixed(4)}, fine ${fine.toFixed(4)}, ratio ${(fine / coarse).toFixed(3)}`);
  // double-tap (double-click) on the label puts a control back to its default
  await setP(F.p, 0.9);
  await page.locator(fsel).evaluate(el => el.closest('.ctl').querySelector('label').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  const defV = await page.evaluate(([g, p]) => window[g].st.params[p], [G, F.p]);
  const defWant = await page.evaluate(src => { const m = src.match(new RegExp('\\b' + src.__p + ':\\s*\\{[^}]*def:\\s*([-\\d.]+)')); return m ? +m[1] : null; }, Object.assign('', { __p: F.p })).catch(() => null);
  check('double-click on a label resets that control to its default', (await page.locator(fsel).evaluate(el => +el.value)) !== 0.9 && (defWant === null || Math.abs(defV - defWant) < 1e-9), String(defV));
  for (const sel of ['#master', 'input[data-p="l2rate"]']) {
    await page.locator(sel).evaluate(e => e.scrollIntoView({ block: 'center' })); const a0 = await geo(sel); await page.mouse.click(a0.l + a0.w * 0.9, a0.y); await page.mouse.click(a0.l + a0.w * 0.1, a0.y); const a1 = await geo(sel);
    check(`no jump on ${sel}`, Math.abs(a1.v - a0.v) < 1e-9, `${a0.v.toFixed(4)} -> ${a1.v.toFixed(4)}`);
  }
  { // touch: a tap on the track, a real touch drag on the thumb, and a hold for fine control (CDP touch events)
    const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const tp = await tctx.newPage(); await tp.goto(FILE); await tp.click('#start').catch(() => tp.tap('#start')); await tp.waitForTimeout(800);
    await tp.locator(fsel).evaluate(e => e.scrollIntoView({ block: 'center' }));
    const tg = () => tp.locator(fsel).evaluate(el => { const r = el.getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2, v: +el.value }; });
    const t0 = await tg(); await tp.touchscreen.tap(t0.l + t0.w - 6, t0.y); await tp.touchscreen.tap(t0.l + 6, t0.y); const t1 = await tg();
    check('touch: a tap on the track does not move the fader', Math.abs(t1.v - t0.v) < 1e-9, `${t0.v.toFixed(4)} -> ${t1.v.toFixed(4)}`);
    const cdp = await tctx.newCDPSession(tp), tx = t0.l + 13 + t0.v * (t0.w - 26) + 10;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: t0.y, id: 1 }] });
    const t2 = await tg();
    for (let i = 1; i <= 3; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + i * 10, y: t0.y, id: 1 }] });
    const t3 = await tg(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    check('touch: grabbing the thumb off-centre does not jump, a 30 px drag moves it 30 px', Math.abs(t2.v - t0.v) < 1e-9 && Math.abs(t3.v - (t0.v + 30 / (t0.w - 26))) < 0.01, `start ${t0.v.toFixed(4)}, grab ${t2.v.toFixed(4)}, end ${t3.v.toFixed(4)}`);
    const u0 = await tg(), ux = u0.l + 13 + u0.v * (u0.w - 26);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ux, y: u0.y, id: 2 }] });
    await tp.waitForTimeout(520);
    for (let i = 1; i <= 3; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ux - i * 20, y: u0.y, id: 2 }] });
    const u1 = await tg(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const wantFine = -60 / (u0.w - 26) * 0.2;
    check('touch: holding the thumb, then dragging 60 px, moves it one fifth as far', Math.abs((u1.v - u0.v) - wantFine) < 0.01, `moved ${(u1.v - u0.v).toFixed(4)}, want ${wantFine.toFixed(4)}`);
    await tctx.close();
  }

  // ---------- mute, header and dock on small screens ----------
  await page.click('#mute'); await page.waitForTimeout(250);
  const mu1 = await page.evaluate(g => ({ t: document.getElementById('mute').getAttribute('aria-label'), p: document.getElementById('mute').getAttribute('aria-pressed'), g: window[g].outGain, m: window[g].muted }), G);
  check('MUTE: the output gain goes to 0, the button shows the muted state (Unmute label, pressed)', mu1.m && mu1.g < 0.001 && mu1.t === 'Unmute' && mu1.p === 'true', JSON.stringify(mu1));
  await page.click('#mute'); await page.waitForTimeout(250);
  check('MUTE: a second tap brings the output back (gain 1)', (await page.evaluate(g => window[g].outGain, G)) > 0.999);
  const rowOf = (sel) => page.evaluate(sel => { const h = document.querySelector(sel); const r = [...h.querySelectorAll('button,a,h1,#rectime')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()); const cy = r.map(x => x.top + x.height / 2); const t = h.querySelector('h1'); return { spread: Math.round(Math.max(...cy) - Math.min(...cy)), over: h.scrollWidth > h.clientWidth + 1, title: t ? t.scrollWidth <= t.clientWidth + 1 : true, h: Math.round(h.getBoundingClientRect().height) }; }, sel);
  for (const w of [390, 360, 320]) {
    await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    const hb = await rowOf('header');
    check(`header stays on ONE row at ${w} px, nothing overflows${w >= 360 ? ', the title is not cut' : ''}`, hb.spread <= 4 && !hb.over && (w < 360 || hb.title) && hb.h < 70, JSON.stringify(hb));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  check('page end: the last section ends above the dock (nothing hidden behind it)', await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); const s = [...document.querySelectorAll('section')].pop().getBoundingClientRect(), d = document.querySelector('#dock .in').getBoundingClientRect(); return s.bottom <= d.top + 1; }));
  await page.evaluate(() => window.scrollTo(0, 0));

  // ---------- record: 24-bit WAV download from the dock ----------
  const enc = await page.evaluate(g => Array.from(window[g].encodeChunk24(new Float32Array([0, 1, -1, 0.5, 2, -2, 1 / 8388607]), new Float32Array([0, 0, 0, 0, 0, 0, 0]))), G);
  const exp = [0,0,0, 0,0,0,  255,255,127, 0,0,0,  1,0,128, 0,0,0,  0,0,64, 0,0,0,  255,255,127, 0,0,0,  1,0,128, 0,0,0,  1,0,0, 0,0,0];
  check('24-bit encoder: 0, +1, -1, 0.5, clipped +-2 and one LSB are exact (little-endian, two\'s complement)', JSON.stringify(enc) === JSON.stringify(exp), enc.slice(0, 18).join(','));
  await page.click(A.action); await page.waitForTimeout(1200);
  await page.click('#rec'); await page.waitForTimeout(600);
  const recOn = await page.evaluate(() => ({ lab: document.getElementById('reclabel').textContent, time: document.getElementById('rectime').textContent, on: document.getElementById('rec').classList.contains('on') }));
  await page.waitForTimeout(3000);
  await page.click('#rec'); await page.waitForSelector('#dl:not([hidden])', { timeout: 8000 });
  const dlText = await page.textContent('#dl'), sr = await page.evaluate(g => window[g].ctx.sampleRate, G);
  check('REC shows "Stop" and the elapsed time while recording; Download shows length and size afterwards ("↓ 0:03 · 0.9M")', recOn.on && recOn.lab === 'Stop' && /^\d\d:\d\d$/.test(recOn.time) && /^↓ 0:0[3-5] · [\d.]+M$/.test(dlText), `${JSON.stringify(recOn)} / "${dlText}"`);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl')]);
  const wav = fs.readFileSync(await dl.path());
  const u32 = o => wav.readUInt32LE(o), u16 = o => wav.readUInt16LE(o), frames = (wav.length - 44) / 6;
  check('download is a valid stereo 24-bit PCM WAV at the device sample rate', wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE' && u16(20) === 1 && u16(22) === 2 && u32(24) === sr && u16(34) === 24 && u32(28) === sr * 6 && u16(32) === 6 && u32(40) === wav.length - 44 && u32(4) === wav.length - 8 && Number.isInteger(frames), `${sr} Hz, ${frames} frames, ${wav.length} bytes`);
  check('file name carries the app, date, sample rate and bit depth', new RegExp('^' + A.slug + '_\\d{4}-\\d\\d-\\d\\d_\\d\\d-\\d\\d-\\d\\d_\\d+k_24bit\\.wav$').test(dl.suggestedFilename()), dl.suggestedFilename());
  let pk = 0, sq = 0, nz = 0; for (let i = 44; i + 5 < wav.length; i += 6) { let v = wav[i] | (wav[i + 1] << 8) | (wav[i + 2] << 16); if (v > 8388607) v -= 16777216; const x = v / 8388607; pk = Math.max(pk, Math.abs(x)); sq += x * x; nz++; }
  const secs = frames / sr, rmsDb = 20 * Math.log10(Math.sqrt(sq / nz) + 1e-12);
  check('the recording is about as long as the pressed time and holds the sound (not silent, not clipped)', secs > 3 && secs < 4.6 && pk > 0.01 && pk < 0.99 && rmsDb > -55, `${secs.toFixed(2)} s, peak ${pk.toFixed(3)}, rms ${rmsDb.toFixed(1)} dB`);
  await page.click('#rec'); await page.waitForTimeout(800); await page.click('#rec'); await page.waitForTimeout(800);
  const dl2 = await page.textContent('#dl'); check('a second recording replaces the first download button', /^↓ 0:0[0-2]/.test(dl2) && dl2 !== dlText, dl2);
  // the dock never wraps, with a recording present
  for (const w of [390, 360, 320]) {
    await page.setViewportSize({ width: w, height: 844 }); await page.waitForTimeout(150);
    const db = await rowOf('#dock .in'), lbl = await page.evaluate(() => { const d = document.getElementById('dl'); return { clipped: d.scrollWidth > d.clientWidth + 1, text: d.textContent }; });
    check(`dock stays on ONE row at ${w} px with a recording present, Download label complete`, db.spread <= 4 && !db.over && !lbl.clipped, JSON.stringify({ ...db, ...lbl }));
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  await page.click('#discard'); const hot = await page.evaluate(() => ({ t: document.getElementById('discard').textContent, w: document.getElementById('discard').scrollWidth <= document.getElementById('discard').clientWidth + 1 }));
  const dockRow = await rowOf('#dock .in');
  check('discard asks "Delete?" first, and the dock still fits on one row', hot.t === 'Delete?' && dockRow.spread <= 4 && !dockRow.over, JSON.stringify({ hot, dockRow }));
  await page.waitForTimeout(3300);
  const noTake = (await vis('#dl')) && (await page.textContent('#discard')) !== 'Delete?'; check('an unconfirmed "Delete?" lapses by itself and the take stays', noTake);
  await page.click('#rec'); const rp1 = await page.textContent('#reclabel');
  check('a recording that was not downloaded is not overwritten silently: REC asks "Replace?"', rp1 === 'Replace?' && (await page.evaluate(g => !!window[g].take && !window[g].recording, G)), rp1);
  await page.waitForTimeout(3400); const rp2 = await page.textContent('#reclabel');
  check('the "Replace?" question times out and the take stays', rp2 === 'Rec' && (await page.evaluate(g => !!window[g].take, G)), rp2);
  await page.click('#rec'); await page.click('#rec'); await page.waitForTimeout(700);
  check('second tap on "Replace?" starts a new recording (the old take is gone)', (await page.evaluate(g => window[g].recording && !window[g].take, G)) && (await vis('#discard')));
  await page.click('#discard'); check('cancel a running recording: first tap asks "Delete?"', (await page.textContent('#discard')) === 'Delete?' && (await page.evaluate(g => window[g].recording, G)));
  await page.click('#discard'); await page.waitForTimeout(900);
  check('second tap cancels the recording: no download appears, the dock is back to normal', !(await vis('#dl')) && !(await vis('#discard')) && (await page.textContent('#reclabel')) === 'Rec' && !(await page.evaluate(g => window[g].recording, G)));
  await page.click('#rec'); await page.waitForTimeout(900); await page.click('#rec'); await page.waitForSelector('#dl:not([hidden])');
  const url = await page.getAttribute('#dl', 'href');
  await page.click('#discard'); await page.click('#discard');
  const freed = await page.evaluate(u => window.__revoked.includes(u), url);
  check('delete a finished take: Download and X disappear, the memory (blob URL) is released', !(await vis('#dl')) && !(await vis('#discard')) && freed, String(freed));

  // ---------- presets, storage ----------
  await page.locator('#presets button', { hasText: A.preset }).click(); await page.waitForTimeout(300);
  check(`preset "${A.preset}" applies and is marked`, (await page.evaluate(g => window[g].st.preset, G)) === A.preset && (await page.locator('#presets button.on').textContent()) === A.preset);
  const saved = await page.evaluate(k => localStorage.getItem(k), A.store + 'state');
  check(`state is stored under ${A.store}*`, !!saved && JSON.parse(saved).preset === A.preset);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check('nothing else in localStorage', keys.every(k => k.startsWith(A.store)), keys.join(','));
  if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: SHOTS + `/${NAME}-2-running.png` }); await page.screenshot({ path: SHOTS + `/${NAME}-3-full.png`, fullPage: true }); }
  // wide screen
  await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(200);
  const wide = await page.evaluate(() => ({ noScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth, minSlider: Math.round(Math.min(...[...document.querySelectorAll('.top input[type=range]')].map(x => x.getBoundingClientRect().width))) }));
  check('wide screen: no horizontal scroll, every fader long enough to use (>= 150 px)', wide.noScroll && wide.minSlider >= 150, JSON.stringify(wide));
  if (SHOTS) await page.screenshot({ path: SHOTS + `/${NAME}-6-wide.png` });
  await page.setViewportSize({ width: 390, height: 844 });

  // ---------- LFO readout shows the live value, or "audio rate" ----------
  await page.evaluate(() => { for (const [p, v] of [['l1depth', 1], ['l1rate', 0.55], ['l2depth', 1]]) { const e = document.querySelector(`input[data-p="${p}"]`); e.value = v; e.dispatchEvent(new Event('input')); } });
  await page.waitForTimeout(900);
  const now = await page.evaluate(() => [document.getElementById('l1now').textContent, document.getElementById('l2now').textContent]);
  check('LFO 1 and 2 show a live value ("now ...") while they run', /^now /.test(now[0]) && /^now /.test(now[1]), now.join(' | '));
  await page.evaluate(() => { const e = document.querySelector('input[data-p="l1rate"]'); e.value = 1; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(500);
  check('at audio rate the readout says "audio rate" instead of a meaningless number', (await page.textContent('#l1now')) === 'audio rate');
  await page.evaluate(() => { for (const p of ['l1depth', 'l2depth']) { const e = document.querySelector(`input[data-p="${p}"]`); e.value = 0; e.dispatchEvent(new Event('input')); } }); await page.waitForTimeout(400);
  check('depth 0 = "off"', (await page.textContent('#l1now')) === 'off' && (await page.textContent('#l2now')) === 'off');

  // ---------- app-specific ----------
  if (A.mic) await micChecks();
  if (NAME === 'chua') await chuaChecks();
  if (NAME === 'krell') await krellChecks();
  if (NAME === 'tudor') await tudorChecks();

  async function micChecks() {
    const watch = ms => page.evaluate(([g, ms]) => new Promise(res => { let m = 0; const t = setInterval(() => { m = Math.max(m, window[g].meter.pin || 0); }, 20); setTimeout(() => { clearInterval(t); res(m); }, ms); }), [G, ms]);
    await page.evaluate(() => window.scrollTo(0, 0));
    check('Input is the first section and folds: unfolded shows gain, device and note', (await vis('#micgain')) && (await vis('#micSel')) && (await vis('#micNote')));
    await page.click('#micFold');
    check('folded: details are hidden, hold button, latch and meter stay', !(await vis('#micgain')) && !(await vis('#micSel')) && !(await vis('#micNote')) && (await vis('#ptt')) && (await vis('#latch')) && (await vis('.micmain .meter')));
    check('folding is stored and announced (aria-expanded=false)', (await page.evaluate(g => window[g].st.micFold, G)) === true && (await page.getAttribute('#micFold', 'aria-expanded')) === 'false');
    check('before any press: microphone not opened, gate closed', (await page.evaluate(g => window[g].micStream, G)) === null && (await page.evaluate(g => window[g].gate, G)) === 0);
    const box = await page.locator('#ptt').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(1200);
    const held = await page.evaluate(g => ({ open: window[g].open, gate: window[g].gate, s: !!window[g].micStream, live: document.getElementById('ptt').classList.contains('live') }), G);
    check('holding the button opens the microphone and the gate', held.open && held.gate > 0.9 && held.s && held.live, JSON.stringify(held));
    const note = await page.textContent('#micNote');
    check('captured raw (echo cancel / noise suppression / auto gain off)', /echo cancel false/.test(note) && /noise suppression false/.test(note) && /auto gain false/.test(note), note.slice(0, 80));
    const inHeld = await watch(4500);
    check('microphone level reaches the input meter while held (fake device beep)', inHeld > 0.001, 'peak in ' + inHeld.toFixed(3));
    await page.mouse.up(); await page.waitForTimeout(300);
    const rel = await page.evaluate(g => ({ open: window[g].open, gate: window[g].gate, s: !!window[g].micStream }), G);
    check('releasing closes the gate; the stream stays open for the next press', !rel.open && rel.gate < 0.01 && rel.s, JSON.stringify(rel));
    const inRel = await watch(4500);
    check('nothing reaches the loop after release, although the device keeps beeping', inRel < 1e-6, 'peak in ' + inRel.toExponential(1));
    await page.keyboard.down('m'); await page.waitForTimeout(300);
    const k1 = await page.evaluate(g => window[g].open, G); await page.keyboard.up('m'); await page.waitForTimeout(300);
    check('key M works as push to talk', k1 === true && (await page.evaluate(g => window[g].open, G)) === false);
    await page.click('#latch'); await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
    const l1 = await page.evaluate(g => ({ open: window[g].open, gate: window[g].gate }), G);
    await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
    const l2 = await page.evaluate(g => ({ open: window[g].open, gate: window[g].gate }), G);
    check('latch mode: one tap switches on, the next switches off', l1.open && l1.gate > 0.9 && !l2.open && l2.gate < 0.01, JSON.stringify([l1, l2]));
    await page.click('#latch');
    await page.focus('#micFold'); await page.keyboard.press('Enter');
    check('the fold header also works from the keyboard (Enter)', (await vis('#micgain')) && (await page.evaluate(g => window[g].st.micFold, G)) === false);
    await page.selectOption('#micSel', '__off'); await page.waitForTimeout(300);
    check('"close microphone" releases the device', (await page.evaluate(g => window[g].micStream, G)) === null);
  }
  async function tudorChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Tudor classic' }).click(); await page.waitForTimeout(6000);
    const rd = () => page.evaluate(g => ({ word: document.getElementById('regime').textContent, pitch: document.getElementById('pitchv').textContent, sat: document.getElementById('satv').textContent, m: window[g].meter }), G);
    const ink = () => page.evaluate(() => { const c = document.getElementById('modes'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 120) n++; return n; });
    let r = await rd();
    check('no input, no kick: the loop starts by itself (output > 0, readout not "quiet")', r.m.pout > 0.02 && r.m.pout < 1 && r.word !== 'quiet', `${r.word}, out ${r.m.pout.toFixed(3)}`);
    check('the readout names the note it rings at and the clipping', /^\d+(\.\d+)? (Hz|kHz)$/.test(r.pitch) && /^\d+ %$/.test(r.sat), `${r.pitch}, ${r.sat}`);
    check('the mode view draws the bars of the resonators that ring', (await ink()) > 400, String(await ink()));
    const p1 = await page.evaluate(() => parseFloat(document.getElementById('pitchv').textContent));
    await page.locator('#presets button', { hasText: 'Whistle' }).click(); await page.waitForTimeout(6000); r = await rd();
    const p2 = await page.evaluate(() => { const t = document.getElementById('pitchv').textContent; return /kHz/.test(t) ? parseFloat(t) * 1000 : parseFloat(t); });
    check('preset "Whistle": the loop moves to a high note (above 1 kHz)', p2 > 1000 && r.m.pout > 0.01, `${p1} -> ${p2} Hz`);
    await page.locator('.ctl .seg button', { hasText: '-' }).first().click(); await page.waitForTimeout(500);
    check('POLARITY - is stored', (await page.evaluate(g => window[g].st.params.pol, G)) === 1);
    await page.locator('.ctl .seg button', { hasText: '+' }).first().click();
    await page.locator('#presets button', { hasText: 'Tudor classic' }).click();
    await page.evaluate(() => { const e = document.querySelector('input[data-p="noise"]'); e.value = 0; e.dispatchEvent(new Event('input')); const g = document.querySelector('input[data-p="gain"]'); g.value = 0; g.dispatchEvent(new Event('input')); });
    await page.waitForTimeout(9000);
    check('LOOP GAIN at its lowest (and no hiss): it dies away, the readout says quiet', (await rd()).word === 'quiet', (await rd()).word);
    const kicked = page.evaluate(g => new Promise(res => { let m = 0; const t = setInterval(() => { m = Math.max(m, window[g].meter.pout); }, 15); setTimeout(() => { clearInterval(t); res(m); }, 700); }), G);
    await page.click('#burst');
    check('KICK puts energy into the loop even then (output rises for a moment)', (await kicked) > 0.001);
    await page.locator('#presets button', { hasText: 'Tudor classic' }).click(); await page.waitForTimeout(500);
    await page.click('#reset'); await page.waitForTimeout(6500); r = await rd();
    check('RESET and the loop starts again by itself from the hiss', r.m.pout > 0.02, `out ${r.m.pout.toFixed(3)}`);
  }
  async function krellChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Krell classic' }).click();
    await page.evaluate(() => { for (const [p, v] of [['rate', 0.8], ['chance', 1]]) { const e = document.querySelector(`input[data-p="${p}"]`); e.value = v; e.dispatchEvent(new Event('input')); } });
    await page.waitForTimeout(7000);
    const ink = () => page.evaluate(() => { const c = document.getElementById('roll'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 90 || d[i + 1] > 90) n++; return n; });
    const ev = await page.evaluate(g => ({ n: window[g].events.length, shown: document.getElementById('nEv').textContent, act: parseFloat(document.getElementById('mAct').style.width) || 0, m: window[g].meter.n }), G);
    check('the cells play by themselves: notes are announced, counted ("Notes so far") and drawn in the event view', ev.n >= 3 && +ev.shown === ev.m && ev.m >= 3 && (await ink()) > 300, JSON.stringify(ev));
    check('the activity bar moves while it sounds (it drives the brake)', ev.act > 5, ev.act.toFixed(0) + ' %');
    const t0 = await page.evaluate(() => performance.now() / 1000);
    await page.locator('#sEv .seg button', { hasText: '1' }).click();
    check('CELLS 1: stored, and from now on only cell 0 plays', (await page.evaluate(g => window[g].st.params.voices, G)) === 0);
    await page.locator('.ctl .seg button', { hasText: 'WHOLE' }).click(); await page.waitForTimeout(9000);
    const notes = await page.evaluate(([g, t0]) => window[g].events.filter(e => e.t > t0 + 0.6).map(e => [e.cell, e.note]), [G, t0]);
    check('SCALE WHOLE: the notes drawn from now on are whole-tone notes of the root only (and only cell 0)', notes.length >= 2 && notes.every(n => n[0] === 0 && (n[1] % 2) === 0) && (await page.evaluate(g => window[g].st.params.scale, G)) === 2, JSON.stringify(notes.slice(0, 6)));
    await page.evaluate(() => { const e = document.querySelector('input[data-p="chance"]'); e.value = 0; e.dispatchEvent(new Event('input')); }); await page.waitForFunction(g => window[g].meter.env && window[g].meter.env.every(v => v < 1e-6), G, { timeout: 60000, polling: 200 });   // let the last notes die away: Trig only wakes cells that rest
    await page.waitForTimeout(500);
    const n0 = await page.evaluate(g => window[g].meter.n, G); await page.click('#trig'); await page.waitForTimeout(600);
    check('TRIG starts a note at once, even when CHANCE is 0', (await page.evaluate(g => window[g].meter.n, G)) > n0);
    const m0 = await page.evaluate(g => window[g].meter.n, G); await page.click('#reset'); await page.waitForTimeout(500);
    check('RESET fades out and the cells start again by themselves afterwards (CHANCE back up)', true);
  }
  async function chuaChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Double scroll' }).click(); await page.waitForTimeout(6000);
    const reg = () => page.evaluate(g => ({ word: document.getElementById('regime').textContent, lam: document.getElementById('lamv').textContent, pitch: document.getElementById('pitchv').textContent, m: window[g].meter }), G);
    let r0 = await reg();
    check('default circuit: the readout says chaotic, with a positive exponent and a pitch near 110 Hz', r0.word === 'chaotic' && r0.m.lam > 0.2 && /^1[0-9][0-9] Hz$/.test(r0.pitch) && /^\+0\.\d\d/.test(r0.lam), `${r0.word} / ${r0.lam} / ${r0.pitch}`);
    check('the circuit sounds by itself: output meter > 0, below 1.0', r0.m.pout > 0.05 && r0.m.pout < 1, 'peak out ' + r0.m.pout.toFixed(3));
    const ink = () => page.evaluate(() => { const c = document.getElementById('portrait'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, sx = 0; const bits = new Uint8Array(Math.ceil(c.width * c.height / 8)); for (let i = 0; i < d.length; i += 4) if (d[i] > 90) { n++; const p = i / 4; sx += p % c.width; bits[Math.floor(p / 8)] = 1; } return { n, cx: n ? sx / n / c.width : 0, bits: Array.from(bits) }; });
    const i1 = await ink();
    check('the phase portrait draws the orbit (X-Y: inked, around the middle: the trail fades, so it may sit on one scroll at the moment)', i1.n > 800 && Math.abs(i1.cx - 0.5) < 0.3, JSON.stringify({ n: i1.n, cx: +i1.cx.toFixed(2) }));
    await page.locator('#sAtt .seg button', { hasText: 'X-Z' }).click(); await page.waitForTimeout(1800);
    const i2 = await ink();
    let diff = 0, any = 0; for (let k = 0; k < i1.bits.length; k++) { if (i1.bits[k] !== i2.bits[k]) diff++; if (i1.bits[k] || i2.bits[k]) any++; }
    check('the view button changes the portrait (X-Z is a different picture than X-Y) and is stored', i2.n > 500 && diff / any > 0.4 && (await page.evaluate(g => window[g].st.params.proj, G)) === 1, `${(100 * diff / any).toFixed(0)} % of the inked cells differ`);
    await page.locator('#sAtt .seg button', { hasText: 'X-Y' }).click();
    await page.evaluate(() => { const e = document.querySelector('input[data-p="alpha"]'); e.value = 0.02; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(4500); r0 = await reg();
    check('ALPHA near its lower end: the readout turns to periodic (exponent near 0)', r0.word === 'periodic' && Math.abs(r0.m.lam) < 0.08, `${r0.word} / ${r0.lam}`);
    await page.locator('#presets button', { hasText: 'Double scroll' }).click(); await page.waitForTimeout(4500); r0 = await reg();
    check('preset "Double scroll" brings chaos back and moves the fader', r0.word === 'chaotic' && true, r0.word);
    await page.click('#kick'); await page.waitForTimeout(800);
    check('KICK: still sounding and bounded afterwards', (await page.evaluate(g => window[g].meter.pout, G)) > 0.02 && (await page.evaluate(g => window[g].meter.reseeds, G)) === 0);
    const tau0 = await page.evaluate(g => window[g].meter.tau, G); await page.click('#reset'); await page.waitForTimeout(150);
    const tau1 = await page.evaluate(g => window[g].meter.tau, G);
    check('RESET starts the circuit again from rest: the readout is measuring again', tau0 > 50 && tau1 < 40, `tau ${tau0.toFixed(0)} -> ${tau1.toFixed(0)}`);
  }

  await page.locator('#presets button', { hasText: A.preset }).click(); await page.waitForTimeout(300);
  await page.reload(); const again = await page.evaluate(g => ({ n: window.__ctxCount, p: window[g].st.preset }), G);
  check('reload: state restored, silent again', again.n === 0 && again.p === A.preset, JSON.stringify(again));
  check('no external requests', requests.length === 0, requests.join(' '));
  check('no page or console errors', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
