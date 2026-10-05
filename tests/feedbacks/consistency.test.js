// Consistency test of the feedback series: the three apps must stay ONE design. Run: node tests/feedbacks/consistency.test.js
// - the shared shell (css, icons, js) inside each page is byte-identical to feedbacks/shell.css, icons.svg.html and shell.js
// - each app sets its own base hue and its own six section hues; no two apps share a base hue; no section hue is in the red band (red is for recording and reset only)
// - the app-specific rules and scripts do not redefine the shell (no second copy of the fader, recorder or mute code)
'use strict';
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..');
const PAGES = { vink: 'vink-v1_0.html', homoeo: 'homoeo-v1_0.html', chua: 'chua-v1_0.html', tudor: 'tudor-v0_1.html' };
let ok = true; const check = (n, c, i) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}${i ? '  ' + i : ''}`); if (!c) ok = false; };
const shell = { css: fs.readFileSync(path.join(root, 'feedbacks/shell.css'), 'utf8').trim(), js: fs.readFileSync(path.join(root, 'feedbacks/shell.js'), 'utf8').trim(), icons: fs.readFileSync(path.join(root, 'feedbacks/icons.svg.html'), 'utf8').trim() };
const between = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b); return i < 0 || j < 0 ? null : t.slice(i + a.length, j).trim(); };
const hues = {};
for (const [name, file] of Object.entries(PAGES)) {
  const t = fs.readFileSync(path.join(root, file), 'utf8');
  check(`${name}: shared CSS is identical to feedbacks/shell.css`, between(t, '/*fb:css*/', '/*/fb:css*/') === shell.css);
  check(`${name}: shared icons are identical to feedbacks/icons.svg.html`, between(t, '<!--fb:icons-->', '<!--/fb:icons-->') === shell.icons);
  check(`${name}: shared script is identical to feedbacks/shell.js`, between(t, '/*fb:js*/', '/*/fb:js*/') === shell.js);
  const root_ = t.match(/:root\{\s*--h:(\d+);\s*--t1:(\d+);\s*--t2:(\d+);\s*--t3:(\d+);\s*--t4:(\d+);\s*--t5:(\d+);\s*--t6:(\d+);\s*\}/);
  check(`${name}: sets its base hue and six section hues`, !!root_);
  hues[name] = root_ ? root_.slice(1).map(Number) : [];
  const inRed = hues[name].filter(h => h >= 335 || h <= 25);
  check(`${name}: no hue in the red band (335 ... 25 degrees); red is for recording and reset only`, inRed.length === 0, inRed.join(','));
  check(`${name}: the six section hues are all different`, new Set(hues[name].slice(1)).size === 6);
  const appScript = t.slice(t.indexOf("'use strict';\n(function () {"));
  check(`${name}: the page script uses the shell (no own fader, recorder or mute code)`, /FB\.build\(\)/.test(appScript) && /FB\.bind\(/.test(appScript) && /FB\.recorder\(/.test(appScript) && /FB\.mute\(/.test(appScript) && !/function noJump|function encodeChunk24|function wavHeader|function recStart/.test(appScript));
  const markup = t.slice(t.indexOf('<body'), t.indexOf('<script id="dsp"'));
  const ctls = (markup.match(/class="ctl"/g) || []).length, withHint = (markup.match(/class="ctl"[^>]*data-hint=/g) || []).length;
  check(`${name}: every control in the markup carries a hint`, ctls > 0 && ctls === withHint, `${withHint} of ${ctls}`);
  check(`${name}: every section names an icon from the shared set`, [...markup.matchAll(/<section[^>]*data-icon="([a-z]+)"/g)].every(m => shell.icons.includes('id="i-' + m[1] + '"')) && /<section/.test(markup));
}
const bases = Object.values(hues).map(h => h[0]);
const NAPPS = Object.keys(hues).length;
check('every app has its own base hue', new Set(bases).size === NAPPS, bases.join(' / '));
check('no two apps use the same hue list', new Set(Object.values(hues).map(h => h.join(','))).size === NAPPS);
console.log(ok ? 'ALL OK' : 'FAILED'); process.exit(ok ? 0 : 1);
