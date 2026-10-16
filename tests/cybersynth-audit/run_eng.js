const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.argv[2]||'cybersynth-v0_69.html');const o={};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1280,height:900}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+file);await p.waitForTimeout(600);await p.click('#powerBtn');await p.waitForTimeout(600);
const st=()=>p.evaluate(()=>({eng:currentEngine,title:document.getElementById('engineTitle').innerText,badge:document.getElementById('engineBadge').innerText,spec:[...document.querySelectorAll('#specialParamsContainer input')].map(i=>i.id+'='+i.value),knot:!!SRC4.knot.node,lat:!!SRC4.lattice.node,knotG:SRC4.knot.gains?+SRC4.knot.gains[0].gain.value.toFixed(2):null,latG:SRC4.lattice.gains?+SRC4.lattice.gains[0].gain.value.toFixed(2):null,tap:SRC4.lattice.taps?+SRC4.lattice.taps[0].gain.value.toFixed(2):null,opts:document.getElementById('presetSelect').options.length}));
for(const e of ['knot','lattice','tudor','knot']){await p.selectOption('#presetSelect',e);await p.waitForTimeout(1200);o[e+'_'+Math.random().toString(36).slice(2,5)]=await st();}
// best matrix / best channels / load button
await p.selectOption('#presetSelect','lattice');await p.waitForTimeout(500);
await p.click('#presetBestMatrix');await p.click('#presetBestCh');await p.waitForTimeout(300);
o.best=await p.evaluate(()=>({mx:matrixValues.map(r=>r.map(v=>+v.toFixed(2)).join(',')).join(' | '),freqs:cutoffHz.map(Math.round)}));
// LFO onto the special parameter of knot
await p.selectOption('#presetSelect','knot');await p.waitForTimeout(800);
await p.evaluate(()=>{LFO[0].sp=[true,true];const a=document.getElementById('lfoSpA0');a.value=0.8;a.dispatchEvent(new Event('input',{bubbles:true}));const s=document.getElementById('lfoSpd0');s.value=0.7;s.dispatchEvent(new Event('input',{bubbles:true}));lfoLabels();});
const mod=await p.evaluate(async()=>{const a=[];for(let k=0;k<20;k++){await new Promise(x=>setTimeout(x,150));a.push([+spVal('knotLock').toFixed(2),+spVal('knotMod').toFixed(2)]);}return a;});
o.modRange=[Math.min(...mod.map(x=>x[0])),Math.max(...mod.map(x=>x[0])),Math.min(...mod.map(x=>x[1])),Math.max(...mod.map(x=>x[1]))];
// persistence
await p.evaluate(()=>{const s=document.getElementById('knotLock');s.value=1.1;s.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(1500);
o.saved=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('cybersynth.state.v1'));return {engine:s.engine,mem:s.specialAll&&s.specialAll.knot};});
const p2=await ctx.newPage();await p2.goto('file://'+file);await p2.waitForTimeout(900);
o.restored=await p2.evaluate(()=>({eng:currentEngine,sel:document.getElementById('presetSelect').value,lock:document.getElementById('knotLock')&&document.getElementById('knotLock').value}));
o.errs=errs;console.log(JSON.stringify(o,null,1));await b.close();})();
