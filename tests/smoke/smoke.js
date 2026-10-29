// MMM smoke test: loads every app of the hub in Chromium and checks what all apps must have in common. It changes nothing.
//   PW=/opt/node22/lib/node_modules/playwright node tests/smoke/smoke.js [--tab audio|visual|utility|all] [--apps rb88,vink] [--json out.json] [--strict]
// Hard failures (exit code 1): page error, request to the outside, sound already running before a touch, sideways scrolling at 320 px, missing file or redirect.
// Warnings: console errors, text under 12 px, contrast under 5:1, title or version that does not fit the hub, zoom switched off.
// Optional: MMM_TAILWIND=/path/to/tailwind.js serves that file instead of the Tailwind CDN (the request is still counted), so that cybersynth looks as it should.
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || 'playwright');
const root = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const TAB = opt('tab', 'audio'), ONLY = (opt('apps', '') || '').split(',').filter(Boolean), STRICT = !!opt('strict', false), JSON_OUT = opt('json', '');

// ---- the hub is the list of apps ----
const hub = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const groups = {}; for (const m of hub.matchAll(/\{\s*id:\s*"(\w+)",\s*label:\s*"([^"]+)",\s*tab:\s*"(\w+)"/g)) groups[m[1]] = { label: m[2], tab: m[3] };
const tiles = [];
for (const m of hub.matchAll(/\{\s*(?:newTab:\s*true,\s*)?(?:wip:\s*true,\s*)?file:\s*"([^"]+)",\s*ziel:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*ver:\s*"([^"]*)",[^}]*?group:\s*"(\w+)"/g)) tiles.push({ dir: m[1], file: m[2], name: m[3], ver: m[4], group: m[5], tab: (groups[m[5]] || {}).tab });
const sel = tiles.filter(t => (TAB === 'all' || t.tab === TAB) && (!ONLY.length || ONLY.some(o => t.dir.replace(/\/$/, '') === o || t.file.startsWith(o))));
if (!sel.length) { console.log('no apps selected'); process.exit(2); }

const norm = v => (v || '').toLowerCase().replace(/^v/, '').replace(/_/g, '.');
const verIn = s => { const m = (s || '').match(/\b[Vv]_?(\d+)[._](\d+)\b/g); return m ? m.map(norm) : []; };

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const t of sel) {
    const r = { app: t.dir.replace(/\/$/, ''), file: t.file, hard: [], warn: [], info: {} };
    rows.push(r);
    const full = path.join(root, t.file);
    if (!fs.existsSync(full)) { r.hard.push('file missing: ' + t.file); continue; }
    // the redirect of the fixed address
    const ridx = path.join(root, t.dir, 'index.html');
    if (!fs.existsSync(ridx)) r.hard.push('no redirect page ' + t.dir + 'index.html');
    else if (!fs.readFileSync(ridx, 'utf8').includes(t.file)) r.hard.push('redirect does not point to ' + t.file);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [], pageErrs = [], outside = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
    page.on('pageerror', e => pageErrs.push(String(e).slice(0, 160)));
    await page.route(/^https?:/, route => {
      const url = route.request().url(); outside.push(url.slice(0, 90));
      if (/tailwindcss/.test(url) && process.env.MMM_TAILWIND) return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(process.env.MMM_TAILWIND, 'utf8') });
      return route.abort();
    });
    // note every audio context at the moment it is made (page code cannot see this)
    await page.addInitScript(() => {
      window.__ac = [];
      for (const k of ['AudioContext', 'webkitAudioContext']) {
        const C = window[k]; if (!C) continue;
        window[k] = new Proxy(C, { construct(T, a, nt) { const o = Reflect.construct(T, a, nt); window.__ac.push(o); return o; } });
      }
    });
    try { await page.goto('file://' + full, { waitUntil: 'load', timeout: 20000 }); await page.waitForTimeout(1200); }
    catch (e) { r.hard.push('does not load: ' + String(e).slice(0, 80)); await ctx.close(); continue; }
    const m = await page.evaluate(() => {
      const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
      const bgOf = el => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n), c = cs.backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { const a = (c.match(/[\d.]+/g) || [])[3]; if (a === undefined || +a > 0.5) return { c, img: cs.backgroundImage !== 'none' }; } if (getComputedStyle(n).backgroundImage !== 'none') return { c: null, img: true }; } return { c: 'rgb(255,255,255)', img: false }; };
      let n = 0, small = 0, tiny = 0, minSize = 99, low = 0, minCr = 99, worst = null, approx = 0;
      document.querySelectorAll('body *').forEach(el => {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
        if (!['SCRIPT', 'STYLE', 'CANVAS', 'SVG', 'PATH'].includes(el.tagName) && ![...el.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
        n++; const fs = parseFloat(cs.fontSize); if (fs < minSize) minSize = fs; if (fs < 12) small++; if (fs < 10) tiny++;
        const bg = bgOf(el); if (!bg.c) { approx++; return; }
        const a = lum(cs.color), b = lum(bg.c), cr = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        if (bg.img) approx++;
        if (cr < 5) low++; if (cr < minCr) { minCr = cr; worst = (el.textContent.trim().slice(0, 24) + ' ' + cs.fontSize); }
      });
      const vp = document.querySelector('meta[name=viewport]');
      return { n, small, tiny, minSize, low, minCr: +minCr.toFixed(1), worst, approx, title: document.title, zoomOff: !!vp && /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(vp.content),
        ac: (window.__ac || []).map(a => a.state), sw390: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.body.innerText.slice(0, 4000) };
    });
    await page.setViewportSize({ width: 320, height: 700 }); await page.waitForTimeout(300);
    const sw320 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    Object.assign(r.info, { textEls: m.n, under12: m.small, under10: m.tiny, minPx: m.minSize, minContrast: m.minCr, worst: m.worst, approx: m.approx, title: m.title, zoomOff: m.zoomOff, audioContexts: m.ac.length });
    if (pageErrs.length) r.hard.push('page error: ' + pageErrs[0]);
    const external = outside.filter(u => !/^data:/.test(u));
    if (external.length) r.hard.push('request to the outside (' + external.length + '): ' + external[0]);
    if (m.ac.some(s => s === 'running')) r.hard.push('sound context already running before a touch');
    if (sw320 > 1) r.hard.push('sideways scrolling at 320 px (' + sw320 + ' px)');
    if (errs.length) r.warn.push('console errors (' + errs.length + '): ' + errs[0]);
    if (m.small) r.warn.push(m.small + ' text elements under 12 px (smallest ' + m.minSize + ' px, ' + m.tiny + ' under 10 px)');
    if (m.low) r.warn.push(m.low + ' text elements under 5:1 contrast (worst ' + m.minCr + ':1 "' + m.worst + '")');
    const tv = verIn(m.title).concat(verIn(m.text)), hv = norm(t.ver);
    if (tv.length && hv && !tv.includes(hv)) r.warn.push('version in the page (' + [...new Set(tv)].join(', ') + ') differs from hub (' + hv + ')');
    if (m.zoomOff) r.warn.push('pinch zoom is switched off');
    if (!/\S/.test(m.title)) r.warn.push('no page title');
    await ctx.close();
  }
  await browser.close();

  const pad = (s, n) => String(s).padEnd(n);
  console.log('\nMMM smoke test, ' + rows.length + ' apps (tab: ' + TAB + ')\n');
  console.log(pad('app', 22) + pad('hard', 6) + pad('warn', 6) + pad('<12px', 7) + pad('min px', 8) + 'min contrast');
  for (const r of rows) console.log(pad(r.app, 22) + pad(r.hard.length, 6) + pad(r.warn.length, 6) + pad(r.info.under12 ?? '-', 7) + pad(r.info.minPx ?? '-', 8) + (r.info.minContrast ?? '-') + ':1');
  console.log('');
  for (const r of rows) { for (const h of r.hard) console.log('FAIL ' + pad(r.app, 22) + h); for (const w of r.warn) console.log('warn ' + pad(r.app, 22) + w); }
  const hard = rows.reduce((a, r) => a + r.hard.length, 0), warn = rows.reduce((a, r) => a + r.warn.length, 0);
  console.log('\n' + hard + ' hard failures, ' + warn + ' warnings');
  if (JSON_OUT) fs.writeFileSync(JSON_OUT === true ? 'smoke.json' : JSON_OUT, JSON.stringify(rows, null, 1));
  process.exit(hard || (STRICT && warn) ? 1 : 0);
})();
