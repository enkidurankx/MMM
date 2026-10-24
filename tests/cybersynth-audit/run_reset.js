const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file='/home/user/MMM/cybersynth-v0_70.html';const o={};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));await p.goto('file://'+file);await p.waitForTimeout(500);await p.addScriptTag({content:LIB});
await p.evaluate("window.S=(id,v)=>{const a=document.getElementById(id);a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};window.T=(id,on)=>{const c=document.getElementById(id);c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};");
await p.selectOption('#presetSelect','serge');await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(800);
// make a mess
await p.evaluate(`T('ecOn',true);S('ecMix',0.7);S('ecFb',0.6);S('rvMix',0.8);S('eq_lo',8);S('eq_mid',-5);S('eq_hi',6);for(let i=0;i<4;i++){T('compOn_'+i,true);S('fDrive_'+i,0.7);S('fbKnob_'+i,0.6);S('dwKnob_'+i,0.9);}
S('fxfHp',0.5);S('fxfLp',0.4);S('fxfDrive',0.5);S('fxfMix',1);T('xmOn',true);S('xmAmt',0.8);S('foldAmt',0.9);S('driftAmt',0.9);S('driftTAmt',0.8);S('overallTune',7);S('lfoAmt0',0.8);S('lfoPos0',0.7);S('masterVol',0.9);S('mxLvl',0.5);S('panKnob_0',0.9);`);
await p.waitForTimeout(500);
const snap=()=>p.evaluate(()=>({eng:currentEngine,echo:[EC.on,EC.mix,EC.fb],rv:RV.mix,eq:[EQ.lo,EQ.mid,EQ.hi],comp:COMP.join(),flt:[FXF.hp,FXF.lp,FXF.drive,FXF.mix],xm:[XM.on,XM.amt,XM.loop],fold:foldAmount,drift:[driftAmount,driftTAmount],overall:overallSt,lfo:[LFO[0].amt,LFO[0].posA,LFO[1].amt],master:+document.getElementById('masterVol').value,mx:+MXL.pos.toFixed(3),
 ch:[0,1,2,3].map(i=>{const c=readChannelUI(i);return [c.drive,c.fb,c.dw,c.pan].join('/')}),spark:[spark.hp,spark.lp],bottom:[document.getElementById('mxLvl2').value,document.getElementById('masterVol2').value],tuning}));
o.before=await snap();
// one tap only arms
await p.click('#resetAll');await p.waitForTimeout(200);o.afterOneTap=await p.evaluate(()=>({text:document.getElementById('resetAll').textContent,echoOn:EC.on}));
await p.click('#resetAll');await p.waitForTimeout(1500);
o.after=await snap();
o.alive=await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,3000));return channels.map(c=>+c.rms.toFixed(2)).join(' ');});
// sound check: record
await p.evaluate(()=>AUD.start());await p.waitForTimeout(5000);o.rec=await p.evaluate(()=>{const r=AUD.analyze(AUD.stop(),audioCtx.sampleRate,1);return {rms:r.rms,peak:r.peak,nan:r.nan,dead:r.dead};});
// bottom bar sync
await p.evaluate("S('mxLvl2',0.4);S('masterVol2',0.3);");await p.waitForTimeout(200);o.sync=await p.evaluate(()=>({mxLvl:document.getElementById('mxLvl').value,mxLvl_v:document.getElementById('mxLvl_v').innerText,mxLvl2_v:document.getElementById('mxLvl2_v').innerText,master:document.getElementById('masterVol').value,masterVal:document.getElementById('masterVal').innerText}));
// the armed text reverts
await p.click('#resetAll');await p.waitForTimeout(3300);o.revert=await p.evaluate(()=>document.getElementById('resetAll').textContent);
o.errs=errs;console.log(JSON.stringify(o,null,1));await b.close();})();
