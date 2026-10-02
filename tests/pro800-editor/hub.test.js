// Hub integration: the PRO-800 tile exists once in the Editors rack, its glyph is unique, and its link resolves through pro800-editor/ to the editor.
'use strict';
const path = require('path'), assert = require('assert'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ROOT = path.join(__dirname, '..', '..');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  const info = await page.evaluate(() => ({ tiles: TOOLS.filter(t => t.file === 'pro800-editor/'), syms: TOOLS.map(t => t.sym), n: TOOLS.length, files: TOOLS.map(t => t.ziel) }));
  assert.strictEqual(info.tiles.length, 1); const t = info.tiles[0];
  assert.strictEqual(t.group, 'editors'); assert.strictEqual(t.ziel, 'pro800-editor-v2_0.html'); assert.match(t.date, /^\d\d\.\d\d\.\d{4}$/); assert.strictEqual(t.ver, 'v2.0');
  assert.strictEqual(info.syms.filter(s => s === t.sym).length, 1, 'sym must be unique');
  for (const f of info.files) assert.ok(fs.existsSync(path.join(ROOT, f)), 'missing target ' + f);
  console.log('ok  - tile present once, group editors, unique glyph ' + t.sym + ', all ' + info.n + ' targets exist');
  assert.deepStrictEqual(errs, [], 'hub page errors'); console.log('ok  - hub loads without errors');
  await page.goto('file://' + path.join(ROOT, 'pro800-editor', 'index.html'));
  await page.waitForURL(/pro800-editor-v2_0\.html/, { timeout: 5000 }); await page.waitForFunction(() => window.__pro800);
  errs.splice(0, errs.length, ...errs.filter(e => !/CORS policy|ERR_FAILED/.test(e)));   // the redirect page probes its target with fetch(), blocked on file://
  assert.match(await page.title(), /Pro-800/); console.log('ok  - pro800-editor/ redirects to the editor and the editor boots');
  assert.deepStrictEqual(errs, []); await b.close(); console.log('no errors');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
