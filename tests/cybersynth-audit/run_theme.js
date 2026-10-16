const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.argv[2]||'cybersynth-v0_69.html');const out=(process.env.OUT||'/tmp/')+'';
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const o={};
const mk=async(w,h,scheme)=>{const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await p.goto('file://'+file);await p.waitForTimeout(600);return {ctx,p,errs};};
const {ctx,p,errs}=await mk(1280,900,'light');
o.start={light:await p.evaluate(()=>document.documentElement.classList.contains('light'))};
await p.click('#powerBtn');await p.waitForTimeout(800);
const state=()=>p.evaluate(()=>({light:document.documentElement.classList.contains('light'),mode:localStorage.getItem('cybersynth.theme'),label:document.getElementById('themeLabel').textContent,bg:getComputedStyle(document.body).backgroundColor}));
o.s0=await state();
for(const k of ['day','auto','night']){await p.click('#themeBtn');await p.waitForTimeout(300);o['after_'+k]=await state();
 if(k==='day'){await p.screenshot({path:out+'day_1280.png',fullPage:true});}
 if(k==='night'){await p.screenshot({path:out+'night_1280.png',fullPage:true});}}
// contrast check in day
await p.click('#themeBtn');await p.waitForTimeout(300);
const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
async function contrast(){return p.evaluate(()=>{const bgOf=e=>{while(e){const c=getComputedStyle(e).backgroundColor;const m=c.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.5))return c;e=e.parentElement}return 'rgb(255,255,255)'};
 const res=[];const seen=new Set();document.querySelectorAll('body *').forEach(e=>{if(!e.childNodes.length)return;const t=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');if(!t)return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden')return;res.push({t:t.slice(0,24),fg:cs.color,bg:bgOf(e),fs:cs.fontSize,id:e.id||e.className.toString().slice(0,30)});});return res;});}
const L=await contrast();
const bad=L.map(x=>{const a=lum(x.fg),bb=lum(x.bg);const cr=(Math.max(a,bb)+.05)/(Math.min(a,bb)+.05);return {...x,cr:+cr.toFixed(2)}}).filter(x=>x.cr<3.2);
o.day_lowContrast=bad.length;o.day_lowContrastSample=bad.slice(0,25);
await p.evaluate(()=>{localStorage.setItem('cybersynth.theme','night')});await p.click('#themeBtn');await p.waitForTimeout(300);
const N=await contrast();const badN=N.map(x=>{const a=lum(x.fg),bb=lum(x.bg);const cr=(Math.max(a,bb)+.05)/(Math.min(a,bb)+.05);return {...x,cr:+cr.toFixed(2)}}).filter(x=>x.cr<3.2);
o.night_lowContrast=badN.length;o.night_lowContrastSample=badN.slice(0,10);
o.errs=errs;await ctx.close();
// persistence + phone widths + auto follows device
for(const [w,scheme,mode] of [[390,'light','auto'],[390,'dark','auto'],[320,'dark','day']]){
 const c=await b.newContext({viewport:{width:w,height:844},colorScheme:scheme});await c.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));await c.addInitScript(m=>{try{localStorage.setItem('cybersynth.theme',m)}catch(e){}},mode);
 const pg=await c.newPage();const e2=[];pg.on('pageerror',x=>e2.push(x.message));await pg.goto('file://'+file);await pg.waitForTimeout(600);await pg.click('#powerBtn');await pg.waitForTimeout(600);
 const r=await pg.evaluate(()=>({light:document.documentElement.classList.contains('light'),ovf:document.documentElement.scrollWidth>document.documentElement.clientWidth,canvasPx:(()=>{const cv=document.getElementById('scopeCanvas');const d=cv.getContext('2d').getImageData(2,2,1,1).data;return [...d]})()}));
 o[`${w}_${scheme}_${mode}`]={...r,errs:e2.length};await pg.screenshot({path:out+`ph_${w}_${scheme}_${mode}.png`,fullPage:false});await c.close();}
console.log(JSON.stringify(o,null,1));await b.close();})();
