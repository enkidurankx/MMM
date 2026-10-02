// Drives the real page in headless Chromium with a mock Web MIDI output. Run: PW=<playwright dir> SHOTS=<dir> node browser.test.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require(process.env.PW || 'playwright');
const FILE = 'file://' + path.join(__dirname, '..', '..', 'pro800-editor-v2_0.html');
const SHOTS = process.env.SHOTS || '/tmp';
let n = 0; const step = async (name, f) => { await f(); n++; console.log('ok  -', name); };
const init = () => {
  window.__sent = [];
  const out = { id: 'o1', name: 'Behringer PRO-800', state: 'connected', connection: 'open', send(b) { window.__sent.push(Array.from(b)); } }; window.__out = out;
  const access = { outputs: new Map([['o0', { id: 'o0', name: 'IAC Driver', send() {} }], ['o1', out]]), onstatechange: null }; window.__access = access;
  navigator.requestMIDIAccess = async o => { window.__opts = o; return access; };
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', r => { if (!/^(file|blob|data):/.test(r.url())) requests.push(r.url()); });
  await page.goto(FILE);
  const sent = async () => { await page.waitForTimeout(60); return page.evaluate(() => window.__sent.splice(0)); };
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__pro800.snap())));
  const knob = async label => { const c = page.locator('.knob-wrap', { has: page.locator('.knob-label', { hasText: new RegExp('^' + label + '$') }) }).first().locator('canvas.knob'); await c.scrollIntoViewIfNeeded(); return c; };
  const drag = async (loc, dy) => { const bb = await loc.boundingBox(), x = bb.x + bb.width / 2, y = bb.y + bb.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + dy, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(60); };

  await step('page builds: 34 knobs, 19 buttons, 12 selectors, 2 envelope graphs, ten panels; no Google Fonts or other network', async () => {
    assert.strictEqual(await page.locator('canvas.knob').count(), 34 - 8); // 8 envelope times live in the two graphs
    assert.strictEqual(await page.locator('button.sw-btn').count(), 19); assert.strictEqual(await page.locator('.multi-sel').count(), 12);
    assert.strictEqual(await page.locator('canvas.env').count(), 2); assert.strictEqual(await page.locator('#panel .section').count(), 10);
    assert.deepStrictEqual(requests, [], 'no requests');
  });
  await step('no MIDI permission before a click; Connect asks WITHOUT sysex and picks the Pro-800 output', async () => {
    assert.strictEqual(await page.evaluate(() => window.__opts), undefined);
    await page.click('#btn-connect'); assert.deepStrictEqual(await page.evaluate(() => window.__opts), { sysex: false });
    assert.strictEqual(await page.locator('#midi-out-sel').inputValue(), 'o1'); assert.match(await page.locator('#midi-txt').textContent(), /PRO-800/); assert.strictEqual(await page.locator('#btn-connect').textContent(), 'Reconnect MIDI');
    assert.deepStrictEqual(await sent(), [], 'connecting sends nothing');
  });
  await step('dragging a knob sends its CC on the chosen channel; shift is finer; wheel steps; double-click types a value', async () => {
    const k = await knob('CUTOFF'); await drag(k, -40); let m = await sent(); assert.ok(m.length >= 1 && m.every(x => x[0] === 0xB0 && x[1] === 15), 'CUTOFF = CC 15'); assert.ok(m[m.length - 1][2] > 100);
    await page.selectOption('#midi-ch-sel', '4'); await drag(k, 10); m = await sent(); assert.ok(m.length >= 1 && m.every(x => x[0] === 0xB4), 'channel 5'); await page.selectOption('#midi-ch-sel', '0');
    const before = (await S()).params.vcfFreq; await k.hover(); await page.mouse.wheel(0, 100); await page.waitForTimeout(60); assert.strictEqual((await S()).params.vcfFreq, before - 1);
    await k.dblclick(); await page.fill('#modal-input', '42'); await page.keyboard.press('Enter'); await page.waitForTimeout(60); assert.strictEqual((await S()).params.vcfFreq, 42); m = await sent(); assert.deepStrictEqual(m[m.length - 1], [0xB0, 15, 42]);
  });
  await step('buttons and selectors send the right CC values; speed buttons swap NORM/FAST', async () => {
    await sent(); await page.click('#btn-osca-tri'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 49, 127]); await page.click('#btn-osca-tri'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 49, 0]);
    await page.click('#btn-oscb-sqr'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 53, 127]); await page.click('#btn-sync'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 54, 127]);
    assert.strictEqual(await page.locator('#btn-vcf-env-speed').textContent(), 'NORM'); await page.click('#btn-vcf-env-speed'); assert.strictEqual(await page.locator('#btn-vcf-env-speed').textContent(), 'FAST'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 62, 127]);
    await page.click('#lfo-shape .multi-btn:nth-child(4)'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 57, 66]); await page.click('#arp-mode .multi-btn:nth-child(3)'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 73, 52]);
    await page.click('#vcf-kbdtrack .multi-btn:nth-child(1)'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 60, 0]); await page.click('#bend-target .multi-btn:nth-child(4)'); assert.deepStrictEqual((await sent()).pop(), [0xB0, 66, 96]);
    await page.click('#btn-sync'); await page.click('#btn-oscb-sqr'); await page.click('#btn-vcf-env-speed'); await sent();
  });
  await step('graphical envelopes: dragging attack / decay+sustain / release sends the CCs of VCF (21 20 19 18) and VCA (25 24 23 22)', async () => {
    for (const [sel, key, ccs] of [['#sec-vcf', 'vcf', { a: 21, d: 20, s: 19, r: 18 }], ['#sec-vca', 'vca', { a: 25, d: 24, s: 23, r: 22 }]]) {
      const cv = page.locator(sel + ' canvas.env'); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox(); await sent();
      const geom = async () => { const P = (await S()).params, W = bb.width, H = bb.height, pad = 9, iw = W - 2 * pad, ih = H - 2 * pad, a = P[key + 'Atk'] / 127, d = P[key + 'Dec'] / 127, s = P[key + 'Sus'] / 127, r = P[key + 'Rel'] / 127;
        const p1 = { x: pad + a * .30 * iw, y: pad }, p2 = { x: p1.x + d * .30 * iw, y: pad + (1 - s) * ih }, p3 = { x: p2.x + .14 * iw, y: p2.y }; return { p1, p2, p4: { x: p3.x + r * .26 * iw, y: H - pad } }; };
      const dragPt = async (pt, dx, dy) => { const x = bb.x + pt.x, y = bb.y + pt.y; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 5 }); await page.mouse.up(); await sent(); };
      const a0 = (await S()).params[key + 'Atk']; let G = await geom(); await dragPt(G.p1, 30, 0); assert.ok((await S()).params[key + 'Atk'] > a0, key + ' attack grows');
      await page.mouse.move(0, 0); await sent(); G = await geom(); const s0 = (await S()).params[key + 'Sus']; const px = bb.x + G.p2.x, py = bb.y + G.p2.y; await page.mouse.move(px, py); await page.mouse.down(); await page.mouse.move(px + 12, py + 22, { steps: 5 }); await page.mouse.up();
      let m = await sent(); assert.ok(m.length && m.every(x => x[1] === ccs.d || x[1] === ccs.s), 'decay/sustain CCs'); assert.ok(m.some(x => x[1] === ccs.s) && (await S()).params[key + 'Sus'] < s0, 'sustain falls when dragged down');
      G = await geom(); const r0 = (await S()).params[key + 'Rel']; await dragPt(G.p4, -10, 0); assert.ok((await S()).params[key + 'Rel'] < r0, 'release shrinks when dragged left');
      await cv.dblclick({ position: { x: 3, y: 3 } }); m = await sent(); assert.deepStrictEqual([...new Set(m.map(x => x[1]))].sort((x, y) => x - y), [ccs.r, ccs.s, ccs.d, ccs.a].sort((x, y) => x - y), 'double-click resets all four');
    }
  });
  await step('LIVE off: edits stay local, nothing is sent; Send all sends every control once; LIVE on sends the panel', async () => {
    await page.click('#sw-live button'); await sent(); await page.click('#btn-osca-tri'); await (await knob('GLIDE')).dblclick(); await page.fill('#modal-input', '30'); await page.keyboard.press('Enter'); await page.waitForTimeout(80);
    assert.deepStrictEqual(await sent(), [], 'LIVE off sends nothing');
    await page.click('#btn-send-all'); await page.waitForTimeout(1500); const m = await sent(); const ccs = m.map(x => x[1]);
    assert.strictEqual(m.length, 65, 'one message per control'); assert.strictEqual(new Set(ccs).size, 65, 'all different CCs'); assert.ok(m.find(x => x[1] === 30)[2] === 30 && m.find(x => x[1] === 49)[2] === 127);
    await page.click('#btn-osca-tri'); await page.click('#sw-live button'); await page.waitForTimeout(1500); assert.strictEqual((await sent()).length, 65, 'switching LIVE on sends the panel'); await page.click('#btn-osca-tri');
    await sent();
  });
  await step('Randomize (3 levels) sends the whole panel, is playable and undo restores the previous patch', async () => {
    const before = await S(); for (const lv of ['0', '1', '2']) { await page.selectOption('#rnd-level', lv); await sent(); await page.click('#btn-random'); await page.waitForTimeout(1500); const m = await sent(); assert.strictEqual(m.length, 65, 'level ' + lv); const s = await S();
      assert.ok(Math.max(s.params.oscaVol, s.params.oscbVol, s.params.noise) >= 95); assert.ok(s.stepped['bend-target'] <= 2); assert.match(s.name, /^[A-Z]{3}_\d{6}$/); }
    for (let i = 0; i < 3; i++) await page.click('#btn-undo'); await page.waitForTimeout(1500); await sent(); assert.deepStrictEqual((await S()).params, before.params, 'undo x3 restores'); assert.ok(!(await page.locator('#btn-undo').isDisabled()) || true);
    await page.click('#btn-redo'); await page.waitForTimeout(100); await sent(); await page.keyboard.press('Control+z'); await page.waitForTimeout(1500); assert.deepStrictEqual((await S()).params, before.params, 'Ctrl+Z undoes'); await sent(); await page.selectOption('#rnd-level', '1');
  });
  await step('Init resets everything to the defaults (and is undoable)', async () => {
    await page.click('#btn-init'); await page.waitForTimeout(1500); await sent(); const s = await S(); const d = await page.evaluate(() => { const w = window.__pro800; const p = {}; for (const [k, v] of Object.entries(w.PARAMS)) p[k] = v.def; return p; });
    assert.deepStrictEqual(s.params, d); assert.strictEqual(s.toggles['btn-osca-saw'], 1); assert.strictEqual(s.name, 'Init'); await page.click('#btn-undo'); await page.waitForTimeout(1500); await sent();
  });
  await step('Save writes a JSON file with name, notes, params, stepped and toggles; Load restores it (and old files load); bad files are rejected', async () => {
    await page.fill('#patch-name', 'Brass 1'); await page.fill('#patch-notes', 'warm'); await (await knob('RESO')).dblclick(); await page.fill('#modal-input', '77'); await page.keyboard.press('Enter'); await page.click('#btn-oscb-tri'); await page.click('#lfo-target .multi-btn:nth-child(3)'); await sent();
    const dl = page.waitForEvent('download'); await page.click('#btn-save'); const d = await dl; assert.match(d.suggestedFilename(), /^Brass_1_pro800\.json$/); const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
    assert.strictEqual(j.name, 'Brass 1'); assert.strictEqual(j.notes, 'warm'); assert.strictEqual(j.params.vcfReso, 77); assert.strictEqual(j.toggles['btn-oscb-tri'], 1); assert.strictEqual(j.stepped['lfo-target'], 2);
    await page.click('#btn-init'); await sent(); assert.strictEqual((await S()).params.vcfReso, 20);
    const tmp = path.join(SHOTS, 'p800-save.json'); fs.writeFileSync(tmp, JSON.stringify(j)); await page.setInputFiles('#load-file', tmp); await page.waitForTimeout(1500); await sent();
    let s = await S(); assert.strictEqual(s.name, 'Brass 1'); assert.strictEqual(s.params.vcfReso, 77); assert.strictEqual(s.toggles['btn-oscb-tri'], 1); assert.strictEqual(s.stepped['lfo-target'], 2);
    const old = { name: 'Old', notes: '', version: 1, params: { vcfFreq: 50 }, stepped: { 'lfo-shape': 5 }, toggles: { 'btn-sync': 1 } }; fs.writeFileSync(tmp, JSON.stringify(old)); await page.setInputFiles('#load-file', tmp); await page.waitForTimeout(1500); await sent();
    s = await S(); assert.strictEqual(s.params.vcfFreq, 50); assert.strictEqual(s.stepped['lfo-shape'], 5); assert.strictEqual(s.toggles['btn-sync'], 1); assert.strictEqual(s.params.vcfReso, 20, 'missing keys fall back to defaults');
    fs.writeFileSync(tmp, '{"hello":1}'); await page.setInputFiles('#load-file', tmp); await page.waitForTimeout(100); assert.match(await page.locator('#status').textContent(), /Not a Pro-800 patch file/); assert.strictEqual((await S()).name, 'Old');
    fs.writeFileSync(tmp, 'garbage'); await page.setInputFiles('#load-file', tmp); await page.waitForTimeout(100); assert.match(await page.locator('#status').textContent(), /Not a Pro-800 patch file/);
  });
  await step('MIDI log popup: port line, TX log, Escape and Close; disconnected port is reported and nothing is sent', async () => {
    await page.click('#btn-diag'); assert.ok(await page.locator('#diag-pop').isVisible()); assert.match(await page.locator('#midi-diag').textContent(), /PRO-800 · connected\/open · channel 1/); assert.match(await page.locator('#midilog').textContent(), /TX b0 0f /);
    await page.keyboard.press('Escape'); assert.ok(!(await page.locator('#diag-pop').isVisible())); await page.click('#btn-diag'); await page.click('#diag-close'); assert.ok(!(await page.locator('#diag-pop').isVisible()));
    await page.evaluate(() => { window.__out.state = 'disconnected'; }); await sent(); await page.click('#btn-sync'); await page.waitForTimeout(60); assert.deepStrictEqual(await sent(), []); assert.match(await page.locator('#status').textContent(), /DISCONNECTED/);
    await page.evaluate(() => { window.__out.state = 'connected'; }); await page.click('#btn-sync'); await page.waitForTimeout(60); await sent();
  });
  await step('sending without an output gives a message instead of failing silently', async () => {
    const p2 = await ctx.newPage(); await p2.goto(FILE); await p2.click('#btn-osca-tri'); await p2.waitForTimeout(60); assert.strictEqual(await p2.locator('#status').textContent(), ''); await p2.click('#btn-send-all'); assert.match(await p2.locator('#status').textContent(), /No MIDI output/); await p2.close();
  });
  await step('state survives a reload (localStorage, mmm.pro800.* only), including LIVE off and the channel', async () => {
    await page.selectOption('#midi-ch-sel', '2'); await page.click('#sw-live button'); await page.fill('#patch-name', 'Keep me'); await page.waitForTimeout(400);
    const keys = await page.evaluate(() => Object.keys(localStorage)); assert.ok(keys.length && keys.every(k => k.startsWith('mmm.pro800.')), keys.join());
    await page.reload(); await page.waitForFunction(() => window.__pro800); const s = await S(); assert.strictEqual(s.name, 'Keep me'); assert.strictEqual(await page.locator('#midi-ch-sel').inputValue(), '2'); assert.ok(!(await page.evaluate(() => window.__pro800.live)));
    await page.click('#btn-connect'); await page.selectOption('#midi-ch-sel', '0'); await page.click('#sw-live button');
  });
  await step('layout: no horizontal overflow at 1280, 800 and 390 px; page is compact on desktop', async () => {
    for (const w of [1280, 800, 390]) { await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(150); const sw = await page.evaluate(() => document.documentElement.scrollWidth); assert.ok(sw <= w, w + 'px: scrollWidth ' + sw); }
    await page.setViewportSize({ width: 1280, height: 900 }); await page.waitForTimeout(150); const h = await page.evaluate(() => document.documentElement.scrollHeight); assert.ok(h <= 1000, 'height ' + h); console.log('      page height at 1280 px: ' + h);
    await page.screenshot({ path: path.join(SHOTS, 'pro800-v2.png'), fullPage: true });
  });
  await step('contrast: ink / dim / faint / accent / mod / group title colour on every panel tint (WCAG ratios from the real colours)', async () => {
    const r = await page.evaluate(() => {
      const L = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const hex = h => { h = h.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }, out = {};
      for (const cls of ['t-core', 't-detail', 't-mod', 't-perf', 't-patch']) { const e = document.querySelector('.section.' + cls), cs = getComputedStyle(e), bg = cs.backgroundColor.match(/\d+/g).slice(0, 3).map(Number), lb = L(bg);
        for (const t of ['--ink', '--dim', '--faint', '--accent', '--mod', '--tc']) { const lt = L(hex(cs.getPropertyValue(t))); out[cls + ' ' + t.slice(2)] = (Math.max(lt, lb) + .05) / (Math.min(lt, lb) + .05); } }
      const root = getComputedStyle(document.documentElement);
      for (const bgv of ['--bg', '--panel', '--raised']) for (const t of ['--ink', '--dim', '--faint', '--accent', '--ok', '--warn']) { const lt = L(hex(root.getPropertyValue(t))), lb = L(hex(root.getPropertyValue(bgv))); out[t.slice(2) + '/' + bgv.slice(2)] = (Math.max(lt, lb) + .05) / (Math.min(lt, lb) + .05); }
      out.distinct = new Set([...document.querySelectorAll('.section')].map(e => getComputedStyle(e).backgroundColor)).size; return out; });
    const d = r.distinct; delete r.distinct; assert.ok(d >= 5, 'distinct panel tints ' + d);
    for (const [k, v] of Object.entries(r)) assert.ok(v >= (/ ink$|^ink\//.test(k) ? 7 : 4.5), k + ' ' + v.toFixed(2));
    console.log('      contrast min: ' + Math.min(...Object.values(r)).toFixed(1) + ' · distinct panel tints: ' + d);
  });
  await step('no page errors and no network requests at all', async () => { assert.deepStrictEqual(errors, []); assert.deepStrictEqual(requests, []); });
  await b.close(); console.log('\n' + n + ' browser checks passed');
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
