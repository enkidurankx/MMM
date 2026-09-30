// Hub integration: the FM-1 tile exists in the Editors rack, is unique, and its link resolves through fm1-editor/ to the editor.
'use strict';
const path = require('path'), assert = require('assert'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ROOT = path.join(__dirname, '..', '..');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  const info = await page.evaluate(() => ({ tiles: TOOLS.filter(t => t.file === 'fm1-editor/'), syms: TOOLS.map(t => t.sym), n: TOOLS.length, files: TOOLS.map(t => t.ziel) }));
  assert.strictEqual(info.tiles.length, 1); const t = info.tiles[0];
  assert.strictEqual(t.group, 'editors'); assert.strictEqual(t.ziel, 'fm1-editor-v1_2.html'); assert.match(t.date, /^\d\d\.\d\d\.\d{4}$/);
  assert.strictEqual(info.syms.filter(s => s === t.sym).length, 1, 'sym must be unique'); assert.ok(/[▀-◿ -ÿ]/.test(t.sym));
  for (const f of info.files) assert.ok(fs.existsSync(path.join(ROOT, f)), 'missing target ' + f);
  console.log('ok  - tile present once, group editors, unique glyph ' + t.sym + ', all ' + info.n + ' targets exist');
  assert.deepStrictEqual(errs, [], 'hub page errors'); console.log('ok  - hub loads without errors');
  await page.goto('file://' + path.join(ROOT, 'fm1-editor', 'index.html'));
  await page.waitForURL(/fm1-editor-v1_1\.html/, { timeout: 5000 }); await page.waitForFunction(() => window.__fm1);
  // the redirect page probes its target with fetch(), which Chrome blocks on file:// (fine over https) - ignore only that
  errs.splice(0, errs.length, ...errs.filter(e => !/CORS policy|ERR_FAILED/.test(e)));
  assert.match(await page.title(), /FM-1/); console.log('ok  - fm1-editor/ redirects to the editor and the editor boots');
  assert.deepStrictEqual(errs, []); await b.close(); console.log('no errors');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
