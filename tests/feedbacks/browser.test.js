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
  chua:   { file: 'chua-v1_1.html', g: '__chua', title: 'chua', mic: false, action: '#kick', store: 'mmm.chua.', slug: 'chua',
            sections: ['Attractor', 'Alpha', 'Beta', 'Time', 'Twin', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'alpha', lin: [12.5, 18] }, curve: { p: 'low', pos: 0.5, want: Math.pow(0.5, 1.5) }, preset: 'Roar', lfoNow: { 1: '', 2: '' } },
  serge:  { file: 'serge-v0_1.html', g: '__serge', title: 'serge', mic: false, action: '#ping', store: 'mmm.serge.', slug: 'serge',
            sections: ['Keys', 'Strike', 'Wave multiplier', 'Body', 'Loop', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'spread', lin: [0, 1] }, curve: { p: 'damp', pos: 0.5, want: 0.5 * 0.25 }, preset: 'Glass', lfoNow: { 1: '', 2: '' } },
  lattice:{ file: 'lattice-v0_2.html', g: '__lattice', title: 'lattice', mic: false, action: '#strike', store: 'mmm.lattice.', slug: 'lattice',
            sections: ['Space', 'Life & Evolution', 'Tuning', 'Bell partial', 'Coupling', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'regen', lin: [0.6, 1.6] }, curve: { p: 'hiss', pos: 0.5, want: Math.pow(0.5, 1.5) }, preset: 'Swarm', lfoNow: { 1: '', 2: '' } },
  knot:   { file: 'knot-v0_2.html', g: '__knot', title: 'knot', mic: false, action: '#shake', store: 'mmm.knot.', slug: 'knot',
            sections: ['Knot', 'Life & Evolution', 'Voices', 'Colour', 'Coupling', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'fold', lin: [0, 1] }, curve: { p: 'wander', pos: 0.5, want: Math.pow(0.5, 1.5) }, preset: 'Swarm', lfoNow: { 1: '', 2: '' } },
  lichen: { file: 'lichen-v0_1.html', g: '__lichen', title: 'lichen', mic: false, action: '#seed', store: 'mmm.lichen.', slug: 'lichen',
            sections: ['Field', 'Life & Evolution', 'Material', 'Texture', 'Regulation', 'Output', 'Presets', 'Scope'], colored: 6,
            fader: { p: 'regulate', lin: [0, 1] }, curve: { p: 'shimmer', pos: 0.5, want: Math.pow(0.5, 1.4) }, preset: 'Coral', lfoNow: { 1: '', 2: '' } },
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
    const sliders = [...document.querySelectorAll('input[type=range]')].filter(x => x.offsetParent), gaps = [];   // only the faders that are shown (a folded section hides its own)
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
  if (NAME === 'serge') await page.keyboard.down('a');   // a played instrument: the sound is held by a key while recording
  await page.click('#rec'); await page.waitForTimeout(600);
  const recOn = await page.evaluate(() => ({ lab: document.getElementById('reclabel').textContent, time: document.getElementById('rectime').textContent, on: document.getElementById('rec').classList.contains('on') }));
  await page.waitForTimeout(3000);
  await page.click('#rec'); await page.waitForSelector('#dl:not([hidden])', { timeout: 8000 }); if (NAME === 'serge') await page.keyboard.up('a');
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
  const wide = await page.evaluate(() => ({ noScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth, minSlider: Math.round(Math.min(...[...document.querySelectorAll('.top input[type=range]')].filter(x => x.offsetParent).map(x => x.getBoundingClientRect().width))) }));
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
  if (NAME === 'serge') await sergeChecks();
  if (NAME === 'lattice') await latticeChecks();
  if (NAME === 'lichen') await lichenChecks();
  if (NAME === 'knot') await knotChecks();

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
  async function knotChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Knot' }).first().click(); await page.waitForTimeout(6000);
    const rd = () => page.evaluate(g => ({ pout: window[g].meter.pout, locked: document.getElementById('locked').textContent, g: window[g].meter.g.slice(), rho: window[g].meter.rho.slice() }), G);
    let r = await rd();
    check('the knot sounds by itself (output > 0, below 1) and reports its locked pairs', r.pout > 0.02 && r.pout < 1 && /^\d+ of \d+$/.test(r.locked), JSON.stringify({ pout: +r.pout.toFixed(3), locked: r.locked }));
    const ink = sel => page.evaluate(sel => { const c = document.querySelector(sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 || d[i + 1] > 120 || d[i + 2] > 120) n++; return n; }, sel);
    check('the ring view and the pad are drawn', (await ink('#ring')) > 1500 && (await ink('#pad')) > 300, `${await ink('#ring')} / ${await ink('#pad')}`);
    const g1 = (await rd()).g; await page.waitForTimeout(15000); const g2 = (await rd()).g;
    let dg = 0; for (let i = 0; i < 36; i++) dg += Math.abs(g1[i] - g2[i]);
    check('it develops by itself: the grip of the links has changed 15 s later (sum of differences > 0.05)', dg > 0.05, dg.toFixed(2));
    check('the second pad (ADAPT across, WEATHER up) is drawn, and dragging it moves both', await (async () => {
      await page.evaluate(() => document.getElementById('padLife').scrollIntoView({ block: 'center' })); await page.waitForTimeout(250);
      const b = await page.locator('#padLife').boundingBox(); const before = await page.evaluate(g => ({ a: window[g].st.params.adapt, w: window[g].st.params.weather }), G);
      await page.mouse.move(b.x + b.width * 0.2, b.y + b.height * 0.8); await page.mouse.down(); await page.mouse.move(b.x + b.width * 0.97, b.y + b.height * 0.2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
      const after = await page.evaluate(g => ({ a: window[g].st.params.adapt, w: window[g].st.params.weather }), G);
      return (await ink('#padLife')) > 300 && (await ink('#padLife')) > 300 && after.a > before.a + 0.05 && after.w > 0.6; })());
    check('the detail sections fold: COLOUR has MOD and CLEAN in view and RING, SELF, FOLD, SKEW behind a fold', await (async () => {
      const vis = n => page.evaluate(n => { const e = document.querySelector('input[data-p="' + n + '"]'); return !!e && e.offsetParent !== null; }, n);
      const before = await vis('ring'), mod = await vis('mod'), cl = await vis('clean');
      await page.evaluate(() => document.getElementById('fCol').click()); await page.waitForTimeout(150);
      const closed = await vis('ring'), still = await vis('mod'); await page.evaluate(() => document.getElementById('fCol').click()); await page.waitForTimeout(150);
      return before === true && mod && cl && closed === false && still === true; })());
    check('CLEAN is stored and the sound stays alive at both ends', await (async () => {
      const out = [];
      for (const v of [0, 1]) { await page.evaluate(v => { const e = document.querySelector('input[data-p="clean"]'); e.value = v; e.dispatchEvent(new Event('input')); }, v); await page.waitForTimeout(1500); out.push(await page.evaluate(g => [window[g].st.params.clean, window[g].meter.pout], G)); }
      await page.evaluate(() => { const e = document.querySelector('input[data-p="clean"]'); e.value = 0.6; e.dispatchEvent(new Event('input')); });
      return out[0][1] > 0.02 && out[1][1] > 0.02 && out[0][0] < 0.01 && out[1][0] > 0.99; })());
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
    const pb = await page.locator('#pad').boundingBox();
    await page.mouse.click(pb.x + pb.width * 0.9, pb.y + pb.height * 0.1); await page.waitForTimeout(400);
    const p1 = await page.evaluate(g => ({ lock: window[g].st.params.lock, mod: window[g].st.params.mod }), G);
    await page.mouse.click(pb.x + pb.width * 0.1, pb.y + pb.height * 0.9); await page.waitForTimeout(400);
    const p2 = await page.evaluate(g => ({ lock: window[g].st.params.lock, mod: window[g].st.params.mod }), G);
    check('the pad sets LOCK across and MOD up (top right: lock high, mod high; bottom left: both low), stored', p1.lock > 0.8 && p1.mod > 4 && p2.lock < 0.2 && p2.mod < 1, JSON.stringify([p1, p2]));
    const sl = await page.evaluate(() => +document.querySelector('input[data-p="lock"]').value);
    check('and the LOCK fader follows the pad', sl < 0.3, String(sl));
    await page.locator('#presets button', { hasText: 'Slow tide' }).click(); await page.click('#shake'); await page.waitForTimeout(2500);
    check('SHAKE and preset "Slow tide": still sounding', (await rd()).pout > 0.02, '');
    await page.click('#reset'); await page.waitForTimeout(2500);
    check('RESET: the knot starts again at once', (await rd()).pout > 0.02, '');
  }
  async function lichenChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Garden' }).click(); await page.waitForTimeout(9000);
    const rd = () => page.evaluate(g => ({ pout: window[g].meter.pout, v: Array.from(window[g].meter.v), spores: window[g].meter.spores, alive: document.getElementById('alive').textContent, loud: document.getElementById('loud').textContent, motion: document.getElementById('motion').textContent }), G);
    let r = await rd();
    check('no touch: the field grows by itself from its three seeds (output > 0, partials alive)', r.pout > 0.01 && r.pout < 1 && /^[1-9]\d* of \d+$/.test(r.alive), JSON.stringify({ pout: +r.pout.toFixed(3), alive: r.alive }));
    check('the readout names the loudest partial with its frequency and note, and says how the field moves', /^\d+(\.\d+)? (Hz|kHz) \u00b7 [A-G]#?\d[+\u2212]?$/.test(r.loud) && /^(frozen|slowly|steadily|restlessly) \u00b7 \d\.\d\d$/.test(r.motion), r.loud + ' / ' + r.motion);
    const ink = sel => page.evaluate(sel => { const c = document.querySelector(sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 || d[i + 1] > 120) n++; return n; }, sel);
    check('the field view draws the partials and the picture of the last minute', (await ink('#field')) > 1500, String(await ink('#field')));
    const a = (await rd()).v; await page.waitForTimeout(12000); const b = (await rd()).v;
    let diff = 0; for (let k = 0; k < 128; k++) diff += Math.abs(a[k] - b[k]);
    check('it develops by itself: the field has changed 12 s later (sum of differences > 0.3)', diff > 0.3, diff.toFixed(2));
    await page.evaluate(() => document.getElementById('field').scrollIntoView({ block: 'center' })); await page.waitForTimeout(250);
    const fb = await page.locator('#field').boundingBox(); const sp0 = (await rd()).spores;
    await page.mouse.move(fb.x + fb.width * 0.9, fb.y + fb.height * 0.4); await page.mouse.down(); await page.mouse.move(fb.x + fb.width * 0.7, fb.y + fb.height * 0.4, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(600);
    check('touch on the field plants seeds (the seed count rises by at least 2)', (await rd()).spores >= sp0 + 2, `${sp0} -> ${(await rd()).spores}`);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#seed'); await page.waitForTimeout(300);
    check('the Seed button plants one more', (await rd()).spores >= sp0 + 3, String((await rd()).spores));
    check('the two pads are drawn and dragging the first moves GROWTH and DECAY', await (async () => {
      await page.evaluate(() => document.getElementById('padLife').scrollIntoView({ block: 'center' })); await page.waitForTimeout(250);
      const pb = await page.locator('#padLife').boundingBox(); const before = await page.evaluate(g => ({ f: window[g].st.params.growth, k: window[g].st.params.decay }), G);
      await page.mouse.move(pb.x + pb.width * 0.2, pb.y + pb.height * 0.8); await page.mouse.down(); await page.mouse.move(pb.x + pb.width * 0.8, pb.y + pb.height * 0.2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(200);
      const after = await page.evaluate(g => ({ f: window[g].st.params.growth, k: window[g].st.params.decay }), G);
      return (await ink('#padLife')) > 300 && (await ink('#padEvo')) > 300 && after.f > before.f + 0.01 && after.k > before.k + 0.005; })());
    check('ORDER has six steps, BELL is stored as step 3, and the Material section folds', await (async () => {
      const seg = '.seg[data-p="order"] button'; const n = await page.locator(seg).count();
      await page.locator(seg, { hasText: 'BELL' }).click(); const v = await page.evaluate(g => window[g].st.params.order, G);
      const vis = () => page.evaluate(() => { const e = document.querySelector('.seg[data-p="order"]'); return !!e && e.offsetParent !== null; });
      const open = await vis(); await page.evaluate(() => document.getElementById('fMat').click()); await page.waitForTimeout(150); const shut = await vis(); await page.evaluate(() => document.getElementById('fMat').click()); await page.waitForTimeout(150);
      await page.locator(seg, { hasText: 'HARMONIC' }).click();
      return n === 6 && v === 3 && open === true && shut === false; })());
    check('REGULATE and SPORES are stored; the sound stays alive with both at 0 (the field may freeze, the partials keep sounding)', await (async () => {
      await page.evaluate(() => { for (const k of ['regulate', 'spores']) { const e = document.querySelector('input[data-p="' + k + '"]'); e.value = 0; e.dispatchEvent(new Event('input')); } }); await page.waitForTimeout(2500);
      const o = await page.evaluate(g => [window[g].st.params.regulate, window[g].st.params.spores, window[g].meter.pout], G);
      await page.locator('#presets button', { hasText: 'Garden' }).click(); return o[0] === 0 && o[1] === 0 && o[2] > 0.01; })());
  }

  async function latticeChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Plate' }).click(); await page.waitForTimeout(9000);
    const rd = () => page.evaluate(g => ({ pout: window[g].meter.pout, e: window[g].meter.e, awake: document.getElementById('awake').textContent, loud: document.getElementById('loud').textContent }), G);
    let r = await rd();
    check('no touch, no strike: the cells start by themselves from the hiss (output > 0, some cells awake)', r.pout > 0.01 && r.pout < 1 && /^[1-9]\d* of \d+$/.test(r.awake), JSON.stringify({ pout: +r.pout.toFixed(3), awake: r.awake }));
    check('the readout names the loudest cell with its frequency and note', /^\d+(\.\d+)? (Hz|kHz) \u00b7 [A-G]#?\d[+\u2212]?$/.test(r.loud), r.loud);
    const ink = () => page.evaluate(() => { const c = document.getElementById('grid'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 120 || d[i + 1] > 120) n++; return n; });
    check('the grid view draws the cells', (await ink()) > 1500, String(await ink()));
    const snap = () => page.evaluate(g => window[g].meter.e.slice(), G);
    const a = await snap(); await page.waitForTimeout(12000); const b = await snap();
    let diff = 0; for (let k = 0; k < 16; k++) diff += Math.abs(a[k] - b[k]);
    check('it develops by itself: the pattern of loud and quiet cells has changed 12 s later (sum of differences > 0.5)', diff > 0.5, diff.toFixed(2));
    // the two pads, the folds, ORDER, QUALITY, the warp seed
    await page.evaluate(() => window.scrollTo(0, 0)); await page.locator('#padLife').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(200);
    const pbx = await page.locator('#padLife').boundingBox();
    await page.mouse.click(pbx.x + pbx.width * 0.9, pbx.y + pbx.height * 0.1); await page.waitForTimeout(300);
    const pr1 = await page.evaluate(g => ({ r: window[g].st.params.regen, f: window[g].st.params.fatigue }), G);
    await page.mouse.click(pbx.x + pbx.width * 0.1, pbx.y + pbx.height * 0.9); await page.waitForTimeout(300);
    const pr2 = await page.evaluate(g => ({ r: window[g].st.params.regen, f: window[g].st.params.fatigue, sl: +document.querySelector('input[data-p="regen"]').value }), G);
    check('the REGEN x TIRING pad sets both (top right: regen high, tiring high; bottom left: both low), and the faders follow', pr1.r > 1.4 && pr1.f > 0.8 && pr2.r < 0.75 && pr2.f < 0.2 && pr2.sl < 0.25, JSON.stringify([pr1, pr2]));
    await page.locator('#padEvo').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(200);
    const pbe = await page.locator('#padEvo').boundingBox(); await page.mouse.click(pbe.x + pbe.width * 0.9, pbe.y + pbe.height * 0.1); await page.waitForTimeout(300);
    const pe = await page.evaluate(g => ({ rv: window[g].st.params.rival, t: window[g].st.params.tire }), G);
    check('the RIVALRY x REST TIME pad sets both (top right: both high)', pe.rv > 1 && pe.t > 25, JSON.stringify(pe));
    await page.locator('#presets button', { hasText: 'Plate' }).click();
    check('the sections Life & Evolution and Space are open and not foldable, Tuning is open, Bell partial and Coupling are folded at the start', await page.evaluate(() => { const c = id => document.getElementById(id).closest('section').classList.contains('closed'); return !c('fTun') && c('fBell') && c('fCpl') && c('fScope'); }));
    await page.locator('#fCpl').evaluate(e => e.scrollIntoView({ block: 'center' })); await page.click('#fCpl'); await page.waitForTimeout(200);
    check('clicking the header of Coupling unfolds it (its faders are visible) and the state is stored', (await page.locator('input[data-p="couple"]').isVisible()) && (await page.evaluate(g => window[g].st.folds.fCpl, G)) === false);
    await page.click('#fCpl');
    await page.locator('#fTun').evaluate(e => e.scrollIntoView({ block: 'center' }));
    check('ORDER offers nine orders', (await page.locator('.seg[data-p="set"] button').count()) === 9);
    await page.locator('.seg[data-p="set"] button', { hasText: 'JUST' }).click(); await page.waitForTimeout(1500);
    const f4 = await page.evaluate(g => window[g].meter.f.slice(0, 4), G);
    check('ORDER JUST: the first row sits at 4/3, 1, 3/2 and 9/8 of the pitch (fifths folded into one octave), within 3 %', Math.abs(f4[0] / f4[1] - 4 / 3) < 0.04 && Math.abs(f4[2] / f4[1] - 1.5) < 0.04 && Math.abs(f4[3] / f4[1] - 1.125) < 0.04, f4.map(x => x.toFixed(1)).join(' '));
    const sd0 = await page.evaluate(g => window[g].st.params.seed, G); await page.click('#newseed');
    check('"New warp" changes the seed', (await page.evaluate(g => window[g].st.params.seed, G)) === sd0 + 1);
    await page.locator('.seg[data-p="quality"] button', { hasText: 'FULL' }).click(); await page.waitForTimeout(800);
    check('QUALITY FULL: stored, and the space keeps sounding', (await page.evaluate(g => window[g].st.params.quality, G)) === 2 && (await rd()).pout > 0.005);
    await page.locator('.seg[data-p="quality"] button', { hasText: 'LITE' }).click(); await page.waitForTimeout(800);
    // quiet the cells below the singing threshold, then strike the corner by hand
    await page.evaluate(() => { const e = document.querySelector('input[data-p="regen"]'); e.value = 0; e.dispatchEvent(new Event('input')); const h = document.querySelector('input[data-p="hiss"]'); h.value = 0; h.dispatchEvent(new Event('input')); });
    await page.waitForFunction(g => Math.max.apply(null, window[g].meter.e) < 0.05, G, { timeout: 60000, polling: 300 });
    check('REGEN at its lowest and no hiss: all cells die away', true);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200);
    const gb = await page.locator('#grid').boundingBox();
    await page.mouse.move(gb.x + gb.width * 0.12, gb.y + gb.height * 0.12); await page.mouse.down(); await page.waitForTimeout(500);
    const t1 = await page.evaluate(g => ({ n: window[g].touches.size, e: window[g].meter.e.slice(), pout: window[g].meter.pout }), G);
    const top = t1.e.indexOf(Math.max.apply(null, t1.e));
    check('a touch at the top left strikes the cell there (the loudest cell is in the top-left corner) and sounds', t1.n === 1 && [0, 1, 4, 5].indexOf(top) >= 0 && Math.max.apply(null, t1.e) > 0.004 && t1.pout > 0.001, JSON.stringify({ n: t1.n, top, max: +Math.max.apply(null, t1.e).toFixed(2), pout: +t1.pout.toFixed(3) }));
    const br = e => Math.max(e[10], e[11], e[14], e[15]), before = br(t1.e);
    await page.mouse.move(gb.x + gb.width * 0.88, gb.y + gb.height * 0.88, { steps: 8 }); await page.waitForTimeout(700);
    const t2 = await page.evaluate(g => window[g].meter.e.slice(), G);
    check('dragging the finger to the bottom right rubs the cells there (their energy rises by 3 x or more)', br(t2) > 3 * before && br(t2) > 0.004, `${before.toExponential(1)} -> ${br(t2).toExponential(1)}`);
    await page.mouse.up(); await page.waitForTimeout(300);
    check('lifting the finger lets go', (await page.evaluate(g => window[g].touches.size, G)) === 0);
    await page.evaluate(() => { const e = document.querySelector('input[data-p="regen"]'); e.value = 0.6; e.dispatchEvent(new Event('input')); const h = document.querySelector('input[data-p="hiss"]'); h.value = 0.8; h.dispatchEvent(new Event('input')); });
    await page.locator('#presets button', { hasText: 'Whirl' }).click(); await page.click('#reset'); await page.waitForTimeout(9000);
    check('preset "Whirl" and RESET: the space starts again by itself', (await rd()).pout > 0.01, '');
  }
  async function sergeChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    const m = () => page.evaluate(g => ({ nv: window[g].meter.nv, pout: window[g].meter.pout, notes: window[g].meter.notes, down: Array.from(window[g].down.keys()), txt: document.getElementById('voices').textContent }), G);
    const m0 = await m(); check('before any key: no voice, silence', m0.nv === 0 && m0.pout < 1e-6, JSON.stringify(m0));
    const ink = () => page.evaluate(() => { const c = document.getElementById('curve'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 150) n++; return n; });
    check('the folder curve is drawn', (await ink()) > 300, String(await ink()));
    await page.keyboard.down('a'); await page.waitForTimeout(1800);
    const k1 = await m();
    check('computer key A plays C (the first note of the keyboard), the voice sings, the readout names it', k1.down.length === 1 && k1.nv === 1 && k1.pout > 0.02 && /C3/.test(k1.txt), JSON.stringify(k1));
    await page.keyboard.up('a'); await page.waitForTimeout(500);
    check('letting go releases the key (and the voice rings out by itself)', (await m()).down.length === 0);
    await page.waitForFunction(g => window[g].meter.nv === 0, G, { timeout: 30000, polling: 200 });
    check('the voice dies away after the key, no voice left', (await m()).nv === 0);
    const kb = await page.locator('#kb').boundingBox();
    await page.mouse.move(kb.x + kb.width * 0.2, kb.y + kb.height - 20); await page.mouse.down(); await page.waitForTimeout(900);
    const d1 = await m(); const on1 = await page.evaluate(() => document.querySelectorAll('#kb .on').length);
    check('touching a key plays it and lights it', d1.down.length === 1 && on1 === 1 && d1.nv >= 1, JSON.stringify(d1));
    await page.mouse.move(kb.x + kb.width * 0.5, kb.y + kb.height - 20, { steps: 6 }); await page.waitForTimeout(900);
    const d2 = await m(); check('sliding to another key plays that one (glissando) and lets the first go', d2.down.length === 1 && d2.down[0] !== d1.down[0], JSON.stringify([d1.down, d2.down]));
    await page.mouse.up(); await page.waitForTimeout(300);
    check('lifting the finger releases the key', (await m()).down.length === 0 && (await page.evaluate(() => document.querySelectorAll('#kb .on').length)) === 0);
    const o0 = await page.textContent('#octv'); await page.click('#octup'); const o1 = await page.textContent('#octv');
    check('+ OCT moves the keyboard up an octave and the label follows; stored', o0 !== o1 && (await page.evaluate(g => window[g].st.oct, G)) === 4, `${o0} -> ${o1}`);
    await page.click('#octdn');
    await page.locator('.ctl .seg button', { hasText: 'ON' }).first().click(); await page.keyboard.down('a'); await page.waitForTimeout(500); await page.keyboard.up('a'); await page.waitForTimeout(3500);
    check('HOLD ON: after the key is let go the note keeps singing', (await m()).nv >= 1 && (await m()).pout > 0.02, JSON.stringify(await m()));
    await page.locator('.ctl .seg button', { hasText: 'OFF' }).first().click(); await page.waitForFunction(g => window[g].meter.nv === 0, G, { timeout: 30000, polling: 200 });
    check('HOLD OFF lets it go', (await m()).nv === 0);
    await page.locator('#presets button', { hasText: 'Glass' }).click(); await page.click('#ping'); await page.waitForTimeout(900);
    check('PING plays a note with the preset "Glass" (and the preset is stored)', (await m()).nv >= 1 && (await page.evaluate(g => window[g].st.preset, G)) === 'Glass');
    await page.click('#reset'); await page.waitForTimeout(600);
    check('RESET silences every voice', (await m()).nv === 0);
  }
  async function chuaChecks() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#presets button', { hasText: 'Double scroll' }).click(); await page.waitForTimeout(6000);
    const reg = () => page.evaluate(g => ({ word: document.getElementById('regime').textContent, lam: document.getElementById('lamv').textContent, pitch: document.getElementById('pitchv').textContent, m: window[g].meter }), G);
    let r0 = await reg();
    check('default circuit: the readout says chaotic, with a positive exponent and a pitch near 220 Hz (the first circuit; the twin sits a fifth above)', r0.word === 'chaotic' && r0.m.lam > 0.2 && /^2[0-9][0-9] Hz$/.test(r0.pitch) && /^\+0\.\d\d/.test(r0.lam), `${r0.word} / ${r0.lam} / ${r0.pitch}`);
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
    check('ALPHA near its lower end: the readout turns steady (periodic, or locked by the twin)', (r0.word === 'periodic' && Math.abs(r0.m.lam) < 0.08) || r0.word === 'locked', `${r0.word} / ${r0.lam}`);
    await page.locator('#presets button', { hasText: 'Double scroll' }).click(); await page.waitForTimeout(4500); r0 = await reg();
    check('preset "Double scroll" brings chaos back and moves the fader', r0.word === 'chaotic' && true, r0.word);
    check('TWIN: the INTERVAL control has 8 steps, and 2:1 is stored as step 4', (await page.locator('.seg[data-p="ival"] button').count()) === 8 && (await (async () => { await page.locator('.seg[data-p="ival"] button', { hasText: '2:1' }).click(); return page.evaluate(g => window[g].st.params.ival, G); })()) === 4);
    await page.evaluate(() => { const e = document.querySelector('input[data-p="twin"]'); e.value = 0; e.dispatchEvent(new Event('input')); }); await page.waitForTimeout(1500);
    check('TWIN at 0 is stored and the circuit still sounds', (await page.evaluate(g => window[g].st.params.twin, G)) === 0 && (await page.evaluate(g => window[g].meter.pout, G)) > 0.02);
    await page.locator('#presets button', { hasText: 'Double scroll' }).click(); await page.waitForTimeout(1500);
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
