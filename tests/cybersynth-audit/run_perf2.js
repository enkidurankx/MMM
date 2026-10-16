const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.env.FILE||'cybersynth-v0_69.html');const SECS=12;
const PRE="const S=(id,v)=>{const a=document.getElementById(id);a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};const T=(id,on=true)=>{const c=document.getElementById(id);c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};";
const C={base:'',reverb_def:"S('rvMix',0.7);",reverb_long:"S('rvMix',0.7);S('rvTime',1);",echo:"T('ecOn');S('ecMix',0.4);",ring2x2:"T('xmOn');",comps:"for(let i=0;i<4;i++)T('compOn_'+i);",eq:"S('eq_lo',3);S('eq_hi',-3);",filter:"S('fxfHp',0.3);S('fxfLp',0.7);S('fxfMix',1);",mic_file_off:"",all:"S('rvMix',0.7);T('ecOn');S('ecMix',0.4);T('xmOn');for(let i=0;i<4;i++)T('compOn_'+i);S('eq_lo',3);S('fxfHp',0.3);S('fxfMix',1);"};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const out={};
for(const [name,js] of Object.entries(C)){const vals=[];for(let rep=0;rep<3;rep++){const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
 await ctx.addInitScript((secs)=>{window.AudioContext=class extends OfflineAudioContext{constructor(){super(2,Math.floor(48000*secs),48000);}};},SECS);
 const p=await ctx.newPage();p.on('pageerror',()=>{});await p.goto('file://'+file);await p.waitForTimeout(400);await p.selectOption('#presetSelect','tudor');await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(900);
 await p.evaluate(PRE+js);await p.waitForTimeout(700);
 vals.push(await p.evaluate(async()=>{const t0=performance.now();const buf=await audioCtx.startRendering();return +(((performance.now()-t0)/1000)/buf.duration).toFixed(3);}));await ctx.close();}
 vals.sort();out[name]=vals[1];console.log(name,vals.join(' '));}
await b.close();})();
