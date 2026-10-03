// Browser test for vink-v0_2.html in the preinstalled Chromium (fake microphone). Run: PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/vink/browser.test.js
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const FILE = 'file://' + path.resolve(__dirname, '../../vink-v0_2.html');
const SHOTS = process.env.SHOTS; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let ok = true; const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  const page = await ctx.newPage(); const errors = [], requests = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(r.url()); });
  await page.addInitScript(() => { window.__ctxCount = 0; const A = window.AudioContext; window.AudioContext = function (...a) { window.__ctxCount++; return new A(...a); }; window.AudioContext.prototype = A.prototype; });
  await page.goto(FILE);
  check('silent until touched: no AudioContext before the first click', (await page.evaluate(() => window.__ctxCount)) === 0);
  check('no horizontal scroll at 390 px', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/1-intro.png' });
  await page.click('#start');
  await page.waitForFunction(() => window.__vink && window.__vink.ctx && window.__vink.ctx.state === 'running', null, { timeout: 8000 }).catch(() => {});
  const state = await page.evaluate(() => window.__vink.ctx && window.__vink.ctx.state);
  check('audio context running after the click, worklet loaded from a blob', state === 'running', 'state ' + state);
  await page.click('#burst'); await page.waitForTimeout(2500);
  const m = await page.evaluate(() => window.__vink.meter);
  check('the loop makes sound by itself (burst + noise floor): output meter > 0', m.pout > 0.01, 'peak out ' + (m.pout || 0).toFixed(3));
  check('output stays below 1.0', m.pout <= 1.0001, 'peak ' + (m.pout || 0).toFixed(3));
  // microphone = push to talk. The fake device beeps now and then and the meter holds one 30 ms window, so watch it for a few seconds.
  const watch = ms => page.evaluate(ms => new Promise(res => { let m = 0; const t = setInterval(() => { m = Math.max(m, window.__vink.meter.pin || 0); }, 20); setTimeout(() => { clearInterval(t); res(m); }, ms); }), ms);
  check('before any press: microphone not opened, gate closed', (await page.evaluate(() => window.__vink.micStream)) === null && (await page.evaluate(() => window.__vink.gate)) === 0);
  const box = await page.locator('#ptt').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.waitForTimeout(1200);
  const held = await page.evaluate(() => ({ open: window.__vink.open, gate: window.__vink.gate, s: !!window.__vink.micStream, live: document.getElementById('ptt').classList.contains('live') }));
  check('holding the button opens the microphone and the gate', held.open && held.gate > 0.9 && held.s && held.live, JSON.stringify(held));
  const note = await page.textContent('#micNote');
  check('captured raw (echo cancel / noise suppression / auto gain off)', /echo cancel false/.test(note) && /noise suppression false/.test(note) && /auto gain false/.test(note), note.slice(0, 80));
  const inHeld = await watch(4500);
  check('microphone level reaches the input meter while held (fake device beep)', inHeld > 0.001, 'peak in ' + inHeld.toFixed(3));
  await page.screenshot({ path: (SHOTS || '/tmp') + '/4-live.png' });
  await page.mouse.up(); await page.waitForTimeout(300);
  const rel = await page.evaluate(() => ({ open: window.__vink.open, gate: window.__vink.gate, s: !!window.__vink.micStream }));
  check('releasing closes the gate; the stream stays open for the next press', !rel.open && rel.gate < 0.01 && rel.s, JSON.stringify(rel));
  const inRel = await watch(4500);
  check('nothing reaches the loop after release, although the device keeps beeping', inRel < 1e-6, 'peak in ' + inRel.toExponential(1));
  // keyboard
  await page.keyboard.down('m'); await page.waitForTimeout(300);
  const k1 = await page.evaluate(() => window.__vink.open); await page.keyboard.up('m'); await page.waitForTimeout(300);
  check('key M works as push to talk', k1 === true && (await page.evaluate(() => window.__vink.open)) === false);
  // latch
  await page.click('#latch'); await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  const l1 = await page.evaluate(() => ({ open: window.__vink.open, gate: window.__vink.gate }));
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  const l2 = await page.evaluate(() => ({ open: window.__vink.open, gate: window.__vink.gate }));
  check('latch mode: one tap switches on, the next switches off', l1.open && l1.gate > 0.9 && !l2.open && l2.gate < 0.01, JSON.stringify([l1, l2]));
  await page.click('#latch');
  await page.selectOption('#micSel', '__off'); await page.waitForTimeout(300);
  check('"close microphone" releases the device', (await page.evaluate(() => window.__vink.micStream)) === null);
  // LFOs: fastest setting, full depth: the position indicator must move
  await page.$eval('input[data-p="l1rate"]', el => { el.value = 1; el.dispatchEvent(new Event('input')); });
  await page.$eval('input[data-p="l1depth"]', el => { el.value = 1; el.dispatchEvent(new Event('input')); });
  const lfo = await page.evaluate(() => new Promise(res => { let lo = 9, hi = -9; const t = setInterval(() => { const v = window.__vink.meter.l1 || 0; lo = Math.min(lo, v); hi = Math.max(hi, v); }, 30); setTimeout(() => { clearInterval(t); res([lo, hi]); }, 2500); }));
  const rateTxt = await page.$eval('input[data-p="l1rate"]', el => el.parentNode.querySelector('output').textContent);
  check('LFO 1 runs and its position indicator moves; rate is shown with its period', lfo[1] - lfo[0] > 0.5 && /1\.00 Hz · 1\.0 s/.test(rateTxt), `range ${lfo[0].toFixed(2)} ... ${lfo[1].toFixed(2)}, "${rateTxt}"`);
  const slow = await page.$eval('input[data-p="l2rate"]', el => { el.value = 0; el.dispatchEvent(new Event('input')); return el.parentNode.querySelector('output').textContent; });
  check('slowest LFO rate is about 8 minutes', /0\.002 Hz · 8\.3 min/.test(slow), slow);
  // controls
  await page.click('.seg[data-p="ftype"] button:nth-child(2)');
  await page.fill('#master', '0.3');
  await page.$eval('input[data-p="fbk"]', el => { el.value = 0.5; el.dispatchEvent(new Event('input')); });
  const st = await page.evaluate(() => ({ f: window.__vink.st.params.ftype, fbk: window.__vink.st.params.fbk }));
  check('segment buttons and sliders change the parameters', st.f === 1 && Math.abs(st.fbk - 0.75) < 0.01, JSON.stringify(st));
  await page.click('#presets button:nth-child(3)');
  const pre = await page.evaluate(() => ({ p: window.__vink.st.preset, f: window.__vink.st.params.ftype }));
  check('preset "Dark ladder" applies', pre.p === 'Dark ladder' && pre.f === 1, JSON.stringify(pre));
  await page.click('#reset'); await page.waitForTimeout(600);
  const r = await page.evaluate(() => window.__vink.meter);
  check('RESET silences the output (LFO 1 at 1 Hz and the loop keeps running)', r.pout < 0.06, 'peak out ' + (r.pout || 0).toFixed(4));
  const saved = await page.evaluate(() => localStorage.getItem('mmm.vink.state'));
  check('state is stored under mmm.vink.*', !!saved && JSON.parse(saved).preset === 'Dark ladder');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check('nothing else in localStorage', keys.every(k => k.startsWith('mmm.vink.')), keys.join(','));
  if (SHOTS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: SHOTS + '/2-running.png' }); await page.screenshot({ path: SHOTS + '/3-full.png', fullPage: true }); }
  // reload keeps the state, and is silent again
  await page.reload(); const again = await page.evaluate(() => ({ n: window.__ctxCount, p: window.__vink.st.preset }));
  check('reload: state restored, silent again', again.n === 0 && again.p === 'Dark ladder', JSON.stringify(again));
  check('no external requests', requests.length === 0, requests.join(' '));
  check('no page or console errors', errors.length === 0, errors.join(' | '));
  await browser.close(); console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
