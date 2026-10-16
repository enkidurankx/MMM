const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.argv[2]||'cybersynth-v0_69.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(const [w,eng] of [[390,'tudor'],[390,'lattice'],[1280,'tudor']]){const ctx=await b.newContext({viewport:{width:w,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
const p=await ctx.newPage();await p.goto('file://'+file);await p.waitForTimeout(500);await p.selectOption('#presetSelect',eng);await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(800);
const r=await p.evaluate(async()=>{const T={loop:0,osc:0,xy:0,spec:0,graph:0,n:0};const wrap=(name,key)=>{const f=window[name];window[name]=function(...a){const t=performance.now();const r=f.apply(this,a);T[key]+=performance.now()-t;return r;};};
 // functions are global declarations: wrap them
 ['renderOscilloscope','renderXYPhase','renderSpectrum','renderGraphVisualizer'].forEach((n,i)=>wrap(n,['osc','xy','spec','graph'][i]));
 const pl=window.processLoop;window.processLoop=function(t){const s=performance.now();const r=pl(t);T.loop+=performance.now()-s;T.n++;return r;};
 await new Promise(r=>setTimeout(r,6000));return {frames:T.n,loopMsPerFrame:+(T.loop/T.n).toFixed(2),visualizersMs:+((T.osc+T.xy+T.spec+T.graph)/T.n).toFixed(2),osc:+(T.osc/T.n).toFixed(2),xy:+(T.xy/T.n).toFixed(2),spec:+(T.spec/T.n).toFixed(2),graph:+(T.graph/T.n).toFixed(2)};});
console.log(w,eng,JSON.stringify(r));await ctx.close();}
await b.close();})();
