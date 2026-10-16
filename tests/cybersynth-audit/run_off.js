const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file='/home/user/MMM/cybersynth-v0_70.html';const o={};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+file);await p.waitForTimeout(500);await p.addScriptTag({content:LIB});
await p.evaluate("window.S=(id,v)=>{const a=document.getElementById(id);a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};window.T=(id,on)=>{const c=document.getElementById(id);c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};");
const st=()=>p.evaluate(()=>({ctx:audioCtx?audioCtx.state:'null',running:isAudioRunning,status:document.getElementById('systemStatusText').innerText,btn:document.getElementById('powerBtn').innerText.trim(),ch:channels.length,rms:channels.map(c=>+c.rms.toFixed(2)).join(' ')}));
// cycle 1..3 with different engines
for(const [i,eng] of [[1,'tudor'],[2,'knot'],[3,'chua'],[4,'lattice']]){
 await p.selectOption('#presetSelect',eng);await p.click('#presetLoadBtn');
 await p.click('#powerBtn');await p.waitForTimeout(2500);o['on'+i]=await st();
 // loop count per second
 o['fps'+i]=await p.evaluate(async()=>{let n=0;const orig=window.requestAnimationFrame;window.requestAnimationFrame=function(cb){if(cb===window.processLoop)n++;return orig.call(window,cb);};await new Promise(r=>setTimeout(r,1000));window.requestAnimationFrame=orig;return n;});
 await p.click('#powerBtn');await p.waitForTimeout(800);o['off'+i]=await st();
}
// restart sound level check with recording
await p.selectOption('#presetSelect','tudor');await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(500);
await p.evaluate(()=>AUD.start());await p.click('#impulseBtn');await p.waitForTimeout(5000);o.after_restart=await p.evaluate(()=>{const r=AUD.analyze(AUD.stop(),audioCtx.sampleRate,1);return {rms:r.rms,peak:r.peak,nan:r.nan,dead:r.dead};});
// effects on, then off and on: effects still on after the restart?
await p.evaluate("T('ecOn',true);S('ecMix',0.4);S('rvMix',0.6);S('eq_lo',4);for(let i=0;i<4;i++)T('compOn_'+i,true);");
await p.click('#powerBtn');await p.waitForTimeout(800);await p.click('#powerBtn');await p.waitForTimeout(2500);
o.fx_after_restart=await p.evaluate(()=>({echoNodes:!!EC.nodes,echoGate:EC.nodes&&EC.nodes.gWet.conn,rv:RV.on,eq:channels[0].eq.gate.conn,comp:channels[0].comp.gate.conn,rms:channels.map(c=>+c.rms.toFixed(2)).join(' ')}));
// mic & file off after off
o.errs=errs;console.log(JSON.stringify(o,null,1));await b.close();})();
