// toggles features while the sound plays; looks for jumps (clicks) in the output right at the toggles
const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file='/home/user/MMM/'+(process.argv[2]||'cybersynth-v0_69.html');
const ACTS=[['eq on',"S('eq_lo',6);S('eq_hi',-5);"],['eq off',"S('eq_lo',0);S('eq_mid',0);S('eq_hi',0);"],['comp on',"for(let i=0;i<4;i++)T('compOn_'+i,true);"],['comp off',"for(let i=0;i<4;i++)T('compOn_'+i,false);"],['filter on',"S('fxfHp',0.4);S('fxfLp',0.8);S('fxfMix',1);"],['filter off',"S('fxfHp',0);S('fxfLp',1);S('fxfDrive',0);"],['xm on',"T('xmOn',true);"],['xm off',"T('xmOn',false);"],['echo on',"T('ecOn',true);S('ecMix',0.5);"],['echo off',"T('ecOn',false);"],['reverb on',"S('rvMix',0.6);"],['reverb off',"S('rvMix',0);"]];
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));await p.goto('file://'+file);await p.waitForTimeout(500);await p.addScriptTag({content:LIB});
await p.evaluate("window.S=(id,v)=>{const a=document.getElementById(id);a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};window.T=(id,on)=>{const c=document.getElementById(id);c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};");
await p.selectOption('#presetSelect','tudor');await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(600);
await p.evaluate(()=>AUD.start());await p.click('#impulseBtn');await p.waitForTimeout(3000);
const t0=await p.evaluate(()=>audioCtx.currentTime);
const marks=[];for(const [name,js] of ACTS){const t=await p.evaluate(()=>audioCtx.currentTime);await p.evaluate(js);marks.push([name,t-t0]);await p.waitForTimeout(1800);}
const res=await p.evaluate((marks)=>{const buf=AUD.stop();const sr=audioCtx.sampleRate;const out=[];
 const maxd=(a,b)=>{let m=0;for(let i=Math.max(1,Math.floor(a*sr));i<Math.min(buf.length,Math.floor(b*sr));i++){const d=Math.abs(buf[i]-buf[i-1]);if(d>m)m=d;}return m;};
 for(const [name,t] of marks){const base=maxd(t-1,t-0.02),after=maxd(t,t+0.35);out.push({name,base:+base.toFixed(3),after:+after.toFixed(3),ratio:+(after/Math.max(base,1e-3)).toFixed(2)});}return out;},marks);
for(const r of res)console.log(JSON.stringify(r));await b.close();console.log(JSON.stringify({errs}));})();
