const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file=process.argv[2]||'cybersynth-v0_43.html';const o={};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
const mk=async(w,h,touch)=>{const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:!!touch,isMobile:!!touch});const p=await ctx.newPage();const errs=[],warns=[];p.on('pageerror',x=>errs.push(String(x)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());if(m.type()==='warning')warns.push(m.text());});await p.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));await p.goto('file:///home/user/MMM/'+file);await p.waitForTimeout(900);return {ctx,p,errs,warns};};
// 1. layout at many widths
o.layout={};
for(const w of [320,360,390,430,600,768,1024,1280,1600]){const {ctx,p,errs}=await mk(w,800,w<700);
 o.layout[w]=await p.evaluate(()=>{const vw=document.documentElement.clientWidth;const wide=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>vw+1||r.left<-1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.sr-only')&&getComputedStyle(e).visibility!=='hidden'}).slice(0,5).map(e=>(e.id||e.className.toString().slice(0,40))+':'+Math.round(e.getBoundingClientRect().right));return {overflowX:document.documentElement.scrollWidth>vw+1,wide,minTouch:Math.round(Math.min(...[...document.querySelectorAll('button,select,input[type=checkbox]+div,.mk')].filter(e=>e.offsetParent&&!e.closest('.hidden')).map(e=>Math.min(e.getBoundingClientRect().width,e.getBoundingClientRect().height)).filter(v=>v>0)))};});
 o.layout[w].errs=errs.length;await ctx.close();}
// 2. controls inventory, ids, defaults, sweeps
const {ctx,p,errs,warns}=await mk(390,844,true);
o.inv=await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
 const knobs=[...document.querySelectorAll('.mk[id]')].map(e=>e.id),ranges=[...document.querySelectorAll('input[type=range]')].map(e=>e.id),checks=[...document.querySelectorAll('input[type=checkbox]')].map(e=>e.id),sels=[...document.querySelectorAll('select')].map(e=>e.id),btn=[...document.querySelectorAll('button')].length;
 const noLabel=[...document.querySelectorAll('.mk[id]')].filter(e=>!e.parentElement.querySelector('span')).map(e=>e.id);
 return {dup,knobs:knobs.length,ranges:ranges.length,checks:checks.length,selects:sels.length,buttons:btn,knobsWithoutLabel:noLabel};});
await p.click('#powerBtn');await p.waitForTimeout(500);
// every knob and range: min, max, then double click -> compare with the value of a pristine page
const pristine=await p.evaluate(()=>{const r={};document.querySelectorAll('.mk[id],input[type=range]').forEach(e=>r[e.id]=+(+e.value).toFixed(3));return r;});
const res=await p.evaluate(async()=>{const bad=[],nodef=[];const els=[...document.querySelectorAll('.mk[id],input[type=range]')];
 for(const e of els){const mn=e.min!==undefined&&e.min!==''?+e.min:null;const knob=e.classList.contains('mk');const lo=knob?+e.getAttribute('aria-valuemin'):+e.min,hi=knob?+e.getAttribute('aria-valuemax'):+e.max;const keep=+e.value;
  try{for(const v of [lo,hi,(lo+hi)/2]){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));}
   e.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));const host=e.closest('.sl');if(host)host.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
   const after=+(+e.value).toFixed(3);if(Math.abs(after-+(keep).toFixed(3))>1e-6)nodef.push(e.id+':'+after+'≠'+keep);
   e.value=keep;e.dispatchEvent(new Event('input',{bubbles:true}));}catch(err){bad.push(e.id+':'+err.message);}
  await new Promise(r=>setTimeout(r,5));}
 return {bad,nodef};});
o.sweep=res;
// toggles & selects
o.toggles=await p.evaluate(async()=>{const bad=[];for(const c of document.querySelectorAll('input[type=checkbox]')){if(['micOn','fileOn'].includes(c.id))continue;try{const v=c.checked;c.checked=!v;c.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,30));c.checked=v;c.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){bad.push(c.id+':'+e.message);}}
 for(const s of document.querySelectorAll('select')){const k=s.value;try{for(const op of [...s.options]){s.value=op.value;s.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,40));}s.value=k;s.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){bad.push(s.id+':'+e.message);}}
 return bad;});
// 3. everything on: frame times, audio clock, long tasks
await p.evaluate(()=>{window.S=(id,v)=>{const a=document.getElementById(id);a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};window.T=(id,on)=>{const c=document.getElementById(id);c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};
 for(let i=0;i<4;i++)T('compOn_'+i,true);S('eq_lo',6);S('fxfHp',0.2);S('rvMix',0.6);T('ecOn',true);T('xmOn',true);S('xmAmt',0.5);S('lfoAmt0',0.5);document.querySelector('button.lfo-sp[data-lfo="0"][data-sp="0"]').click();S('lfoSpA0',0.5);});
await p.click('#impulseBtn');await p.waitForTimeout(1500);
o.perf=await p.evaluate(async()=>{const fr=[];let last=performance.now();const long=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>long.push(Math.round(e.duration)))).observe({entryTypes:['longtask']});}catch(e){}
 const a0=audioCtx.currentTime,w0=performance.now();await new Promise(res=>{const tick=t=>{fr.push(t-last);last=t;if(t-w0<8000)requestAnimationFrame(tick);else res();};requestAnimationFrame(tick);});
 const a1=audioCtx.currentTime,w1=performance.now();fr.sort((a,b)=>a-b);return {frames:fr.length,meanMs:+(fr.reduce((a,b)=>a+b,0)/fr.length).toFixed(1),p95:+fr[Math.floor(fr.length*0.95)].toFixed(1),max:+fr[fr.length-1].toFixed(1),longTasks:long.length,longMax:long.length?Math.max(...long):0,audioClockRatio:+((a1-a0)/((w1-w0)/1000)).toFixed(3),state:audioCtx.state,baseLatencyMs:Math.round(audioCtx.baseLatency*1000)};});
o.errs=errs;o.warns=warns.slice(0,5);
console.log(JSON.stringify(o,null,1));await b.close();})();
