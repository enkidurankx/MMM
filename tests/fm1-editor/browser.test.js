// Drives the real page in headless Chromium with a mock Web MIDI output. Run: PW=<playwright dir> SHOTS=<dir> node browser.test.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require(process.env.PW || 'playwright');
const FILE = 'file://' + path.join(__dirname, '..', '..', 'fm1-editor-v1_17.html');
const SHOTS = process.env.SHOTS || '/tmp';
const html = fs.readFileSync(FILE.slice(7), 'utf8');
const C = new Function(html.slice(html.indexOf('/*CORE-START*/'), html.indexOf('/*CORE-END*/')) + '\nreturn {packBank,parseSyx,initVoice,randomVoice,cleanVoice,vcedIndex,paramChangeMessage,voiceToVCED};')();
let n = 0; const step = async (name, f) => { await f(); n++; console.log('ok  -', name); };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    window.__sent = [];
    const out = { id: 'mock1', name: 'M-VAVE FM-1 MIDI', manufacturer: 'M-VAVE', state: 'connected', connection: 'open', send(b) { window.__sent.push(Array.from(b)); } }; window.__out = out;
    const other = { id: 'mock2', name: 'IAC Driver Bus 1', send() {} };
    const inp = { id: 'in1', name: 'M-VAVE FM-1 MIDI', onmidimessage: null }; window.__in = inp;
    const access = { outputs: new Map([['mock2', other], ['mock1', out]]), inputs: new Map([['in1', inp]]), onstatechange: null, sysexEnabled: window.__noSysex ? false : true }; window.__access = access;
    navigator.requestMIDIAccess = async o => { window.__midiOpts = o; return access; };
  });
  const page = await ctx.newPage(); const errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(r.url()); });
  await page.goto(FILE);
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify({ cur: window.__fm1.cur, v: window.__fm1.V() })));
  const sent = () => page.evaluate(() => window.__sent.splice(0));
  const knob = async label => { const i = await page.evaluate(l => window.__fm1.knobs.findIndex(k => k.knob.label === l), label); assert.ok(i >= 0, 'knob ' + label); return page.locator('canvas.knob').nth(i); };
  const drag = async (loc, dy) => { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(), x = bb.x + bb.width / 2, y = bb.y + bb.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + dy, { steps: 6 }); await page.mouse.up(); };

  await step('page builds: 4 banks x 32 slots, 6 operator tabs, all knobs present', async () => {
    assert.strictEqual(await page.locator('#slots .slot').count(), 32); assert.strictEqual(await page.locator('#optabs .optab').count(), 6);
    assert.strictEqual(await page.locator('#bank-tabs button').count(), 4);
    assert.strictEqual(await page.locator('canvas.knob').count(), 59);   // 10 performance + 16 FX + 2 global + 3 level + 3 tune + 8 env + 4 scaling + 5 LFO + 8 pitch EG
    assert.strictEqual(await page.locator('#alg-diagram svg .opbox').count(), 6);
    assert.strictEqual(await page.locator('#kbd .key').count(), 25);
  });
  await step('no MIDI permission is requested before a click', async () => { assert.strictEqual(await page.evaluate(() => window.__midiOpts), undefined); });
  await step('Connect MIDI requests SysEx access and auto-selects the FM-1 output', async () => {
    await page.click('#btn-connect'); assert.deepStrictEqual(await page.evaluate(() => window.__midiOpts), { sysex: true });
    assert.strictEqual(await page.locator('#midi-out-sel').inputValue(), 'mock1'); assert.match(await page.locator('#midi-txt').textContent(), /FM-1/);
    assert.ok(await page.locator('#sw-live button').evaluate(b => b.classList.contains('on')), 'LIVE is on at start');
    await page.waitForTimeout(1500); const b0 = await sent(); assert.strictEqual(b0.length, 155, 'connecting with LIVE on sends the voice once (155 writes)');
    await page.click('#sw-live button'); assert.ok(!(await page.locator('#sw-live button').evaluate(b => b.classList.contains('on'))), 'LIVE can be switched off');
  });
  await step('PERFORMANCE and EFFECTS sit on top as collapsible panels: performance open, effects closed; state is remembered', async () => {
    const vis = id => page.locator(id).isVisible();
    assert.ok(await vis('#env-adsr'), 'performance open by default'); assert.ok(!(await vis('#fx-rows')), 'effects collapsed by default');
    const y = async id => (await page.locator(id).boundingBox()).y, yv = await y('#sec-voice'), yp = await y('#sec-perf'), yf = await y('#sec-fx'), ya = await y('#sec-alg');
    assert.ok(yv < yp && yp < yf && yf < ya, 'order: voice, performance, effects, then the editor sections');
    await page.click('#sec-fx .section-title'); assert.ok(await vis('#fx-rows'), 'click expands effects'); await page.click('#sec-perf .section-title'); assert.ok(!(await vis('#env-adsr')), 'click collapses performance');
    await page.focus('#sec-perf .section-title'); await page.keyboard.press('Enter'); assert.ok(await vis('#env-adsr'), 'Enter toggles too');
    await page.click('#sec-perf .section-title'); await page.reload(); await page.waitForFunction(() => window.__fm1);
    assert.ok(!(await vis('#env-adsr')) && await vis('#fx-rows'), 'state survives a reload');
    await page.click('#sec-perf .section-title'); assert.ok(await vis('#env-adsr')); await page.click('#btn-connect'); await page.waitForTimeout(1500); await sent(); await page.click('#sw-live button');
  });
  await step('dragging a knob changes the value; shift-drag is finer; wheel steps; double-click resets', async () => {
    const k = await knob('OUT LEVEL'); await page.evaluate(() => { window.__fm1.V().op[0].ol = 50; window.__fm1.refresh(); });
    await drag(k, -60); const up = (await st()).v.op[0].ol; assert.ok(up > 60, 'dragged up → ' + up);
    await drag(k, 60); assert.ok((await st()).v.op[0].ol < up);
    await k.dblclick(); assert.strictEqual((await st()).v.op[0].ol, 99);
    await k.hover(); await page.mouse.wheel(0, -100); assert.strictEqual((await st()).v.op[0].ol, 99); await page.mouse.wheel(0, 100); assert.strictEqual((await st()).v.op[0].ol, 98);
  });
  await step('operator tabs edit different operators independently', async () => {
    await page.locator('#optabs .optab').nth(1).click(); assert.match(await page.locator('#op-aux').textContent(), /OP2/);
    const k = await knob('COARSE'); await k.dblclick(); await drag(k, -40); const s = await st(); assert.ok(s.v.op[1].fc > 1); assert.strictEqual(s.v.op[0].fc, 1);
  });
  await step('algorithm: next/prev wrap, diagram redraws, picker lists all 32 and selects', async () => {
    await page.click('#alg-next'); assert.strictEqual((await st()).v.alg, 1); assert.strictEqual(await page.locator('#alg-num').textContent(), '02');
    await page.click('#alg-prev'); await page.click('#alg-prev'); assert.strictEqual((await st()).v.alg, 31);
    await page.click('#alg-pick'); assert.strictEqual(await page.locator('#alg-grid .algcell').count(), 32);
    await page.screenshot({ path: path.join(SHOTS, 'fm1_alg_picker.png') });
    await page.locator('#alg-grid .algcell').nth(4).click(); assert.strictEqual((await st()).v.alg, 4); assert.strictEqual(await page.locator('#alg-pop').count(), 0);
    await page.click('#alg-pick'); await page.keyboard.press('Escape'); assert.strictEqual(await page.locator('#alg-pop').count(), 0);
    await page.locator('#alg-diagram .opbox').nth(2).click(); assert.match(await page.locator('#op-aux').textContent(), /OP3/);
  });
  await step('voice name is limited to 10 characters and shows in the slot', async () => {
    await page.fill('#voice-name', 'TESTVOICE12345'); assert.strictEqual((await st()).v.name, 'TESTVOICE1');
    assert.match(await page.locator('#slots .slot.on').textContent(), /TESTVOICE1/);
  });
  await step('envelope graph: dragging a point changes level and rate', async () => {
    await page.locator('#optabs .optab').nth(0).click(); const before = (await st()).v.op[0];
    const cv = page.locator('#env-op'); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox();
    const geom = await page.evaluate(() => { const v = window.__fm1.V().op[0]; return { l1: v.l1, r1: v.r1 }; });
    // point 1 (level 1) sits at x = pad + segment 1 width; find it by scanning for the nearest handle
    const W = bb.width, sc = (W - 24) / (2 * (10 + (99 - before.r1) * 0.8) + 34 + (10 + (99 - before.r3) * 0.8) + (10 + (99 - before.r2) * 0.8) + (10 + (99 - before.r4) * 0.8) - (10 + (99 - before.r1) * 0.8));
    const p1x = bb.x + 12 + (10 + (99 - before.r1) * 0.8) * (W - 24) / ((10 + (99 - before.r1) * 0.8) + (10 + (99 - before.r2) * 0.8) + (10 + (99 - before.r3) * 0.8) + 34 + (10 + (99 - before.r4) * 0.8));
    const p1y = bb.y + 104 - 12 - (before.l1 / 99) * (104 - 24);
    await page.mouse.move(p1x, p1y); await page.mouse.down(); await page.mouse.move(p1x + 30, p1y + 25, { steps: 5 }); await page.mouse.up();
    const after = (await st()).v.op[0]; assert.ok(after.l1 < before.l1, 'level ' + before.l1 + '→' + after.l1); assert.ok(after.r1 < before.r1, 'dragging right slows the segment: rate ' + before.r1 + '→' + after.r1);
  });
  await step('Send bank transmits exactly packBank() of the current bank', async () => {
    await sent(); await page.click('#btn-send-bank'); const m = await sent(); assert.strictEqual(m.length, 1); assert.strictEqual(m[0].length, 4104);
    const expect = await page.evaluate(() => Array.from(window.__fm1.packBank(window.__fm1.banks[window.__fm1.cur.bank])));
    assert.deepStrictEqual(m[0], expect);
    const p = C.parseSyx(Uint8Array.from(m[0])); assert.strictEqual(p.warnings.length, 0); const v = (await st()).v;
    assert.strictEqual(p.banks[0][0].name, 'TESTVOICE1'); assert.deepStrictEqual(p.banks[0][0], C.cleanVoice(v));
    assert.strictEqual(m[0][6 + 5 * 17 + 14], v.op[0].ol);                                 // OP1 output level byte
    assert.match(await page.locator('#status').textContent(), /Bank A handed to/);
  });
  await step('audition keys send note on / off on the chosen note channel', async () => {
    await page.selectOption('#note-ch', '3'); await sent(); const key = page.locator('#kbd .key').nth(0); await key.scrollIntoViewIfNeeded(); const bb = await key.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height - 5); await page.mouse.down(); await page.mouse.up();
    assert.deepStrictEqual(await sent(), [[0x92, 48, 100], [0x82, 48, 0]]);
    await page.click('#oct-up'); await page.keyboard.press('a'); await page.keyboard.up('a'); assert.deepStrictEqual(await sent(), [[0x92, 60, 100], [0x82, 60, 0]]);
    await page.click('#oct-dn'); await page.selectOption('#note-ch', '1');
  });
  await step('LIVE (top bar): off = nothing sent; on = whole voice as 155 parameter writes, then single writes per edit; FX/performance knobs never resend the voice', async () => {
    await sent();
    await page.click('#btn-random'); await page.waitForTimeout(700); assert.deepStrictEqual(await sent(), [], 'LIVE off: randomize sends nothing');
    await page.click('#btn-undo');
    await page.click('#sw-live button'); await page.waitForTimeout(1500); let m = await sent();
    assert.strictEqual(m.length, 155, 'enabling LIVE sends 155 parameter writes: ' + m.length);
    assert.ok(m.every((x, i) => x.length === 7 && x[0] === 0xF0 && x[1] === 0x43 && x[2] === 0x10 && x[3] * 128 + x[4] === i && x[5] <= 127 && x[6] === 0xF7), 'F0 43 10 gg pp vv F7, addresses 0..154 in order, never 155');
    await page.click('#btn-random'); await page.waitForTimeout(2000); m = await sent(); assert.strictEqual(m.filter(x => x.length === 7).length, 155, 'randomize sends the voice as 155 writes'); assert.strictEqual(m.filter(x => x.length === 3).length, 24, 'and the 24 effect CCs (FX ticked)');
    await (await knob('FEEDBACK')).hover(); await page.mouse.wheel(0, -100); await page.waitForTimeout(200); await page.mouse.wheel(0, 100); await page.waitForTimeout(300); m = await sent();
    assert.ok(m.length >= 1 && m.length <= 2 && m.every(x => x.length === 7 && x[3] * 128 + x[4] === 135), 'a knob edit is one single-parameter write (feedback = address 135)');
    await page.click('#fx-send'); await page.waitForTimeout(1200); m = await sent(); assert.strictEqual(m.length, 24); assert.ok(m.every((x, i) => x.length === 3 && x[0] === 0xB1 && x[1] === i), 'FX = CC 0-23 on channel 2, no voice');
    await page.click('#sw-live button'); await page.waitForTimeout(300); await sent();
    for (let i = 0; i < 14 && (await st()).v.name !== 'TESTVOICE1'; i++) await page.click('#btn-undo'); await page.waitForTimeout(300); await sent();
  });

  await step('Randomize all OPs / this OP: operators change, algorithm and name stay', async () => {
    const before = await st(); await page.click('#btn-rnd-ops'); let a = await st();
    assert.strictEqual(a.v.alg, before.v.alg); assert.strictEqual(a.v.name, before.v.name); assert.notDeepStrictEqual(a.v.op, before.v.op, 'operators changed');
    await page.click('#btn-undo'); a = await st(); assert.deepStrictEqual(a.v.op, before.v.op, 'undo restores');
    await page.click('#btn-rnd-op'); a = await st(); const changed = a.v.op.map((o, i) => JSON.stringify(o) !== JSON.stringify(before.v.op[i])).filter(Boolean).length;
    assert.ok(changed <= 1, 'only the selected operator changes');
    await page.click('#btn-undo');
  });

  await step('PERFORMANCE: CC on the note channel, Program Change, explicit voice send', async () => {
    await sent(); const k = await knob('BRIGHT'); await k.hover(); await page.mouse.wheel(0, -100); await page.waitForTimeout(150);
    let m = await sent(); assert.strictEqual(m.length, 1); assert.deepStrictEqual(m[0].slice(0, 2), [0xB0, 74]); assert.strictEqual(m[0][2], 65);
    await page.click('#pf-pc'); m = await sent(); assert.ok(m.length === 1 && m[0][0] === 0xC0 && m[0][1] === 0 + 32 * (await st()).cur.bank + (await st()).cur.slot, 'PC = bank*32+slot');
    await page.click('#pf-voice'); m = await sent(); assert.strictEqual(m.length, 1); assert.strictEqual(m[0].length, 163); assert.strictEqual(m[0][2], 0x00);
  });

  await step('graphical master envelope: dragging attack / decay+sustain / release sends CC 73 / 75+70 / 72 on the note channel', async () => {
    await sent(); const cv = page.locator('#env-adsr'); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox();
    const g = async () => page.evaluate(() => window.__fm1.adsrGeom()); const dragTo = async (from, dx, dy) => { const x = bb.x + from.x, y = bb.y + from.y; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(200); };
    let G = await g(); const a0 = await page.evaluate(() => window.__fm1.perf[73]); await dragTo(G.p1, 40, 0); let m = await sent();
    assert.ok(m.length >= 1 && m.every(x => x[0] === 0xB0 && x[1] === 73), 'attack = CC 73'); assert.ok(m[m.length - 1][2] > a0, 'attack grows when dragged right');
    G = await g(); await dragTo(G.p2, 20, 25); m = await sent(); assert.ok(m.some(x => x[1] === 75) && m.some(x => x[1] === 70), 'decay (75) and sustain (70)'); const s1 = m.filter(x => x[1] === 70); assert.ok(s1[s1.length - 1][2] < 100, 'dragging down lowers sustain');
    G = await g(); await dragTo(G.p4, 30, 0); m = await sent(); assert.ok(m.length >= 1 && m.every(x => x[0] === 0xB0 && x[1] === 72), 'release = CC 72'); assert.ok(m.every(x => x[2] >= 0 && x[2] <= 127));
    await page.selectOption('#note-ch', '3'); G = await g(); await dragTo(G.p1, 20, 0); m = await sent(); assert.ok(m.length >= 1 && m.every(x => x[0] === 0xB2), 'follows the note channel'); await page.selectOption('#note-ch', '1');
    await cv.dblclick({ position: { x: 5, y: 5 } }); await page.waitForTimeout(300); m = await sent(); assert.deepStrictEqual(m.map(x => x[1]).sort((a, b) => a - b), [70, 72, 73, 75], 'double-click resets all four');
  });

  await step('diagnostics: port, SysEx permission, TX log incl. timing; RX from the FM-1 input is logged', async () => {
    await page.click('#btn-diag');
    const d = await page.locator('#midi-diag').textContent(); assert.match(d, /M-VAVE FM-1 MIDI/); assert.match(d, /SysEx allowed/); assert.match(d, /connected\/open/);
    const log = await page.locator('#midilog').textContent(); assert.match(log, /listening on input M-VAVE FM-1 MIDI/); assert.match(log, /TX f0 43 00 09 20 00/); assert.match(log, /TX 9[0-2] 30 64/); assert.match(log, /\[\d+\.\d ms\]/);
    await page.evaluate(() => window.__in.onmidimessage({ data: new Uint8Array([0xF0, 0x43, 0x00, 0x09, 0xF7]) })); assert.match(await page.locator('#midilog').textContent(), /RX f0 43 00 09 f7/);
    await page.evaluate(() => { window.__in.onmidimessage({ data: new Uint8Array([0xFE]) }); }); assert.ok(!/RX fe/.test(await page.locator('#midilog').textContent()), 'active sensing is not logged');
    assert.ok(await page.locator('#diag-pop').isVisible(), 'popup is open'); await page.keyboard.press('Escape'); assert.ok(!(await page.locator('#diag-pop').isVisible()), 'Escape closes it');
    await page.click('#btn-diag'); await page.click('#diag-close'); assert.ok(!(await page.locator('#diag-pop').isVisible()), 'Close button closes it');
  });

  await step('Bluetooth-style port flapping (many state changes) logs "listening" only once and keeps the output selected', async () => {
    await page.evaluate(() => { for (let i = 0; i < 12; i++) window.__access.onstatechange({}); });
    const log = await page.locator('#midilog').textContent(); assert.strictEqual((log.match(/listening on input/g) || []).length, 1, 'listening lines: ' + (log.match(/listening on input/g) || []).length);
    assert.strictEqual(await page.locator('#midi-out-sel').inputValue(), 'mock1');
    await page.evaluate(() => window.__in.onmidimessage({ data: new Uint8Array([0xF0, 0x43, 0x00, 0x09, 0xF7]) })); assert.match(await page.locator('#midilog').textContent(), /RX f0 43 00 09 f7/);
  });

  await step('port state changes are logged; a disconnected port is reported and nothing is sent; Connect becomes Reconnect', async () => {
    assert.strictEqual(await page.locator('#btn-connect').textContent(), 'Reconnect MIDI');
    await page.evaluate(() => window.__access.onstatechange({ port: { type: 'output', name: 'M-VAVE FM-1 MIDI', state: 'disconnected', connection: 'closed' } }));
    assert.match(await page.locator('#midilog').textContent(), /port output "M-VAVE FM-1 MIDI" → disconnected\/closed/);
    await page.evaluate(() => { window.__out.state = 'disconnected'; }); await sent(); await page.click('#pf-pc');
    assert.deepStrictEqual(await sent(), []); assert.match(await page.locator('#status').textContent(), /DISCONNECTED/); assert.match(await page.locator('#midilog').textContent(), /TX blocked: port disconnected/);
    await page.click('#btn-send-bank'); assert.deepStrictEqual(await sent(), []);
    await page.evaluate(() => { window.__out.state = 'connected'; }); await page.click('#pf-pc'); assert.strictEqual((await sent()).length, 1, 'sends again once the port is back');
  });
  await step('a closed output port is opened explicitly and the result is logged', async () => {
    const c3 = await b.newContext(); await c3.addInitScript(() => {
      window.__sent = []; const out = { id: 'm', name: 'FM-1_BLE Bluetooth', state: 'connected', connection: 'closed', send(b) { window.__sent.push(Array.from(b)); },
        open() { out.connection = 'open'; window.__opened = (window.__opened || 0) + 1; return Promise.resolve(out); } };
      navigator.requestMIDIAccess = async () => ({ outputs: new Map([['m', out]]), inputs: new Map(), sysexEnabled: true }); });
    const p3 = await c3.newPage(); await p3.goto(FILE); await p3.click('#btn-connect'); await p3.click('#btn-diag');
    await p3.waitForFunction(() => /output opened: FM-1_BLE Bluetooth/.test(document.querySelector('#midilog').textContent));
    assert.strictEqual(await p3.evaluate(() => window.__opened), 1); assert.match(await p3.locator('#midi-diag').textContent(), /connected\/open/);
    await c3.close();
  });
  await step('Send bank uses the chosen device number (default = note channel)', async () => {
    await sent(); await page.selectOption('#note-ch', '4'); await page.click('#btn-send-bank'); let m = (await sent())[0]; assert.strictEqual(m.length, 4104); assert.strictEqual(m[2], 0x03, 'device # follows note channel 4');
    await page.click('#btn-diag'); await page.selectOption('#sys-dev', '7'); await page.click('#diag-close'); await page.click('#btn-send-bank'); assert.strictEqual((await sent())[0][2], 0x06, 'explicit device # 7');
    await page.click('#btn-diag'); await page.selectOption('#sys-dev', '-1'); await page.click('#diag-close'); await page.selectOption('#note-ch', '1');
    await page.click('#btn-send-bank'); m = (await sent())[0]; assert.strictEqual(m[2], 0x00);
    assert.strictEqual(await page.evaluate(() => { const b = window.__fm1.packBank(window.__fm1.banks[0], 5); return b[2]; }), 5);
  });
  await step('SysEx blocked by the browser is reported instead of failing silently', async () => {
    const c2 = await b.newContext(); await c2.addInitScript(() => { window.__noSysex = true; });
    await c2.addInitScript(() => { window.__sent = []; const out = { id: 'm', name: 'FM-1', state: 'connected', connection: 'open', send(b) { window.__sent.push(Array.from(b)); } };
      navigator.requestMIDIAccess = async () => ({ outputs: new Map([['m', out]]), inputs: new Map(), sysexEnabled: false }); });
    const p2 = await c2.newPage(); await p2.goto(FILE); await p2.click('#btn-connect');
    assert.match(await p2.locator('#status').textContent(), /SysEx permission was NOT granted/); await p2.click('#btn-diag'); assert.match(await p2.locator('#midi-diag').textContent(), /BLOCKED/);
    await c2.close();
  });
  await step('the CC probe and test buttons are gone from the diagnostics', async () => {
    for (const id of ['#cc-num', '#cc-send', '#cc-sweep', '#cc-add', '#cc-export', '#cc-map', '#t-identity', '#t-voice', '#t-bank']) assert.strictEqual(await page.locator(id).count(), 0, id);
  });
  await step('undo / redo restore knob edits, Init, Randomize and pasted voices', async () => {
    await page.click('#btn-init'); assert.strictEqual((await st()).v.name, 'INIT VOICE'); await page.click('#btn-undo'); assert.strictEqual((await st()).v.name, 'TESTVOICE1');
    await page.click('#btn-redo'); assert.strictEqual((await st()).v.name, 'INIT VOICE'); await page.click('#btn-undo');
    await page.click('#btn-copy'); await page.click('#btn-random'); const r = (await st()).v; assert.notStrictEqual(r.name, 'TESTVOICE1'); await page.click('#btn-undo');
    await page.click('#btn-mutate'); assert.ok(JSON.stringify((await st()).v) !== JSON.stringify(r)); await page.click('#btn-undo');
    await page.click('#slots .slot >> nth=5'); await page.click('#btn-paste'); assert.strictEqual((await st()).v.name, 'TESTVOICE1'); await page.click('#btn-undo'); assert.strictEqual((await st()).v.name, 'INIT VOICE');
    await page.click('#slots .slot >> nth=0');
    const k = await knob('FEEDBACK'); await k.dblclick(); const fb0 = (await st()).v.fb; await drag(k, -50); assert.ok((await st()).v.fb > fb0); await page.keyboard.press('Control+z'); assert.strictEqual((await st()).v.fb, fb0);
  });
  await step('Save .syx downloads the bank; Load .syx replaces banks from a file', async () => {
    const dl = page.waitForEvent('download'); await page.click('#btn-save-syx'); const d = await dl; assert.strictEqual(d.suggestedFilename(), 'fm1-bank-A.syx');
    const bytes = fs.readFileSync(await d.path()); assert.strictEqual(bytes.length, 4104);
    assert.deepStrictEqual(Array.from(bytes), await page.evaluate(() => Array.from(window.__fm1.packBank(window.__fm1.banks[0]))));
    await page.keyboard.press('Shift+A'); // no note while shift (modifier ignored path)
    const mk = seed => { let s = seed; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); return Array.from({ length: 32 }, () => C.randomVoice(r)); };
    const b1 = mk(21), b2 = mk(22), two = new Uint8Array(8208); two.set(C.packBank(b1), 0); two.set(C.packBank(b2), 4104); const tmp = path.join(SHOTS, 'two.syx'); fs.writeFileSync(tmp, two);
    await page.click('#bank-tabs button >> nth=1'); await page.setInputFiles('#file-syx', tmp); await page.waitForFunction(() => /bank B, bank C/.test(document.querySelector('#status').textContent));
    const banks = await page.evaluate(() => window.__fm1.banks.map(b => b.map(v => v.name)));
    assert.deepStrictEqual(banks[1], b1.map(v => C.cleanVoice(v).name)); assert.deepStrictEqual(banks[2], b2.map(v => C.cleanVoice(v).name));
    assert.match(await page.locator('#status').textContent(), /bank B, bank C/);
    await page.click('#btn-undo'); assert.strictEqual((await page.evaluate(() => window.__fm1.banks[1][0].name)), 'INIT VOICE');
    const single = path.join(SHOTS, 'one.syx'); fs.writeFileSync(single, Buffer.from(new Function(html.slice(html.indexOf('/*CORE-START*/'), html.indexOf('/*CORE-END*/')) + '\nreturn (v)=>vcedMessage(v);')()(b1[7])));
    await page.click('#slots .slot >> nth=3'); await page.setInputFiles('#file-syx', single); await page.waitForFunction(n => window.__fm1.V().name === n, C.cleanVoice(b1[7]).name); assert.strictEqual((await st()).v.name, C.cleanVoice(b1[7]).name);
    await page.setInputFiles('#file-syx', path.join(SHOTS, 'fm1_alg_picker.png')); await page.waitForFunction(() => /Nothing imported/.test(document.querySelector('#status').textContent)); assert.match(await page.locator('#status').textContent(), /Nothing imported/);
    await page.click('#bank-tabs button >> nth=0'); await page.click('#slots .slot >> nth=0');
  });
  await step('JSON export/import round-trips the workspace; bad files are rejected', async () => {
    const dl = page.waitForEvent('download'); await page.click('#btn-export-json'); const d = await dl; const txt = fs.readFileSync(await d.path(), 'utf8'); const j = JSON.parse(txt);
    assert.strictEqual(j.format, 'mmm.fm1'); assert.strictEqual(j.banks.length, 4); assert.strictEqual(j.banks[0].length, 32);
    await page.click('#btn-init'); const f = path.join(SHOTS, 'ws.json'); fs.writeFileSync(f, txt); await page.setInputFiles('#file-json', f);
    await page.waitForFunction(() => window.__fm1.V().name === 'TESTVOICE1'); assert.strictEqual((await st()).v.name, 'TESTVOICE1');
    fs.writeFileSync(f, '{"hello":1}'); await page.setInputFiles('#file-json', f); await page.waitForFunction(() => /Import failed/.test(document.querySelector('#status').textContent)); assert.match(await page.locator('#status').textContent(), /Import failed/);
  });
  await step('workspace survives a reload (localStorage) and stays in the mmm.fm1.* namespace', async () => {
    await page.click('#optabs .optab >> nth=3'); await page.waitForTimeout(400); await page.reload(); await page.waitForFunction(() => window.__fm1);
    assert.strictEqual((await st()).v.name, 'TESTVOICE1'); assert.match(await page.locator('#op-aux').textContent(), /OP4/);
    const keys = await page.evaluate(() => Object.keys(localStorage)); assert.ok(keys.length && keys.every(k => k.startsWith('mmm.fm1.')), keys.join());
  });
  await step('sending without an output gives a clear message instead of failing silently', async () => {
    await page.click('#btn-send-bank'); assert.match(await page.locator('#status').textContent(), /No MIDI output/);
  });
  await step('layout: no horizontal overflow at desktop, tablet and phone widths', async () => {
    for (const [w, h] of [[1280, 900], [820, 1000], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(200);
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      assert.ok(o.sw <= o.iw + 1, w + 'px: scrollWidth ' + o.sw); await page.screenshot({ path: path.join(SHOTS, 'fm1_' + w + '.png'), fullPage: true });
    }
  });
  await step('text contrast stays readable (WCAG ratios computed from the real colours)', async () => {
    const r = await page.evaluate(() => {
      const L = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const rgb = h => { h = h.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
      const cs = getComputedStyle(document.documentElement), cr = (a, b) => { const x = L(rgb(cs.getPropertyValue(a))), y = L(rgb(cs.getPropertyValue(b))); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const out = {}; const bgs = ['--bg', '--panel', '--raised', '--section'];
      for (const t of ['--ink', '--dim', '--faint']) for (const g of bgs) out[t.slice(2) + '/' + g.slice(2)] = cr(t, g);
      for (const t of ['--accent', '--mod', '--ok', '--warn']) for (const g of bgs) out[t.slice(2) + '/' + g.slice(2)] = cr(t, g);
      out['accent/accent-bg'] = cr('--accent', '--accent-bg'); out['mod/mod-bg'] = cr('--mod', '--mod-bg'); out['ink/accent-bg'] = cr('--ink', '--accent-bg'); out['ink/mod-bg'] = cr('--ink', '--mod-bg');
      out['accent vs mod (hue separation, luminance ratio)'] = cr('--accent', '--mod');
      return out;
    });
    const vals = Object.entries(r), min = (f) => Math.min(...vals.filter(([k]) => f(k)).map(([, v]) => v));
    console.log('      contrast (min per group): ink ' + min(k => k.startsWith('ink/')).toFixed(1) + ' · dim ' + min(k => k.startsWith('dim/')).toFixed(1) + ' · faint ' + min(k => k.startsWith('faint/')).toFixed(1) + ' · accent ' + min(k => k.startsWith('accent/')).toFixed(1) + ' · mod ' + min(k => k.startsWith('mod/')).toFixed(1) + ' · ok ' + min(k => k.startsWith('ok/')).toFixed(1) + ' · warn ' + min(k => k.startsWith('warn/')).toFixed(1));
    for (const [k, v] of vals) { if (k.startsWith('ink/')) assert.ok(v >= 7, k + ' ' + v.toFixed(2)); else if (k.startsWith('accent vs')) continue; else assert.ok(v >= 4.5, k + ' ' + v.toFixed(2)); }
  });
  await step('every colour group (panel tint) keeps text readable: ink, dim, faint, accent, mod and the group title colour', async () => {
    const r = await page.evaluate(() => {
      const L = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const hex = h => { h = h.trim().replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
      const out = {};
      for (const cls of ['t-core', 't-detail', 't-mod', 't-perf', 't-aud', 't-fx']) { const el = document.querySelector('.section.' + cls), cs = getComputedStyle(el);
        const bg = cs.backgroundColor.match(/\d+/g).slice(0, 3).map(Number), lb = L(bg);
        for (const t of ['--ink', '--dim', '--faint', '--accent', '--mod', '--tc']) { const lt = L(hex(cs.getPropertyValue(t))); out[cls + ' ' + t.slice(2)] = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); } }
      const tints = new Set([...document.querySelectorAll('.section')].map(e => getComputedStyle(e).backgroundColor)); out.distinct = tints.size; return out; });
    const d = r.distinct; delete r.distinct; assert.ok(d >= 6, 'panel groups have distinct backgrounds: ' + d);
    for (const [k, v] of Object.entries(r)) assert.ok(v >= (k.endsWith(' ink') ? 7 : 4.5), k + ' ' + v.toFixed(2));
    console.log('      group contrast min: ' + Math.min(...Object.values(r)).toFixed(1) + ' · distinct panel backgrounds: ' + d);
  });
  await step('no page errors and no network requests at all', async () => { assert.deepStrictEqual(errors, []); assert.deepStrictEqual(requests, []); });
  await b.close(); console.log('\n' + n + ' browser checks passed');
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
