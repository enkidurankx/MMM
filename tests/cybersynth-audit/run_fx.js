const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file=process.argv[2]||'cybersynth-v0_43.html';const out=process.argv[3]||'fx.jsonl';const engs=(process.argv[4]||'tudor').split(',');const only=process.argv[5]?process.argv[5].split(','):null;
const PRE="window.S=(id,v)=>{const a=document.getElementById(id);a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};window.T=(id,on)=>{const c=document.getElementById(id);c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};";
const C={
 base:"",
 comp4:"for(let i=0;i<4;i++)T('compOn_'+i,true);",
 eqLo12:"S('eq_lo',12);",eqMid12:"S('eq_mid',12);",eqHi12:"S('eq_hi',12);",eqAllMinus12:"S('eq_lo',-12);S('eq_mid',-12);S('eq_hi',-12);",
 hp200:"S('fxfHp',0.5);",lp1k:"S('fxfLp',0.3);",res_max:"S('fxfHp',0.5);S('fxfRes',1);",drive1:"S('fxfDrive',1);S('fxfHp',0.01);",filterMixHalf:"S('fxfHp',0.6);S('fxfMix',0.5);",
 rvHalf:"S('rvMix',0.7);",rvMax:"S('rvMix',1);S('rvTime',1);S('rvLoop',1);S('rvDamp',0);",
 echoDef:"T('ecOn',true);",echoMax:"T('ecOn',true);S('ecFb',0.92);S('ecMix',1);S('ecTime',0.1);S('ecWow',1);",
 ring0:"T('xmOn',true);document.getElementById('xmMode').value=0;document.getElementById('xmMode').dispatchEvent(new Event('change'));S('xmAmt',1);S('xmLoop',1);",
 ring3:"T('xmOn',true);document.getElementById('xmMode').value=3;document.getElementById('xmMode').dispatchEvent(new Event('change'));S('xmAmt',1);S('xmLoop',1);",
 send0dB:"S('mxLvl',1);",sendM3:"S('mxLvl',0.9);",sendM12:"S('mxLvl',0.6);",sendOff:"S('mxLvl',0);",shareOff:"T('mxShareToggle',false);",
 homeoOff:"T('homoeoToggle',false);",
 lfoTune:"S('lfoAmt0',1);S('lfoSpd0',0.6);",
 lfoSpecial:"document.querySelector('button.lfo-sp[data-lfo=\"0\"][data-sp=\"0\"]').click();document.querySelector('button.lfo-sp[data-lfo=\"0\"][data-sp=\"1\"]').click();S('lfoSpA0',1);S('lfoSpd0',0.6);",
 driftMax:"S('driftAmt',1);S('driftTAmt',1);",
 tuneUp12:"S('overallTune',12);",tuneDown24:"S('overallTune',-24);",
 foldMax:"S('foldAmt',1);",
 allModerate:"for(let i=0;i<4;i++)T('compOn_'+i,true);S('eq_lo',3);S('eq_hi',2);S('fxfHp',0.2);S('fxfMix',0.6);S('rvMix',0.6);T('ecOn',true);T('xmOn',true);S('xmAmt',0.4);S('xmLoop',0.2);",
 worst:"for(let i=0;i<4;i++)T('compOn_'+i,true);S('eq_lo',12);S('eq_mid',12);S('eq_hi',12);S('fxfDrive',1);S('fxfRes',1);S('fxfHp',0.3);S('rvMix',1);S('rvTime',1);S('rvLoop',1);T('ecOn',true);S('ecFb',0.92);S('ecMix',1);T('xmOn',true);S('xmAmt',1);S('xmLoop',1);S('mxLvl',1);T('mxShareToggle',false);S('foldAmt',1);S('driftAmt',1);S('driftTAmt',1);S('lfoAmt0',1);S('lfoAmt1',1);S('masterVol',1);"
};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(const eng of engs)for(const [name,js] of Object.entries(C)){ if(only&&!only.includes(name))continue;
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(String(x)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
 await p.goto('file:///home/user/MMM/'+file);await p.waitForTimeout(700);await p.addScriptTag({content:LIB});await p.evaluate(PRE);
 await p.selectOption('#presetSelect',eng);await p.waitForTimeout(150);await p.click('#presetLoadBtn');await p.waitForTimeout(150);
 await p.click('#powerBtn');await p.waitForTimeout(300);
 await p.evaluate(js);await p.waitForTimeout(500);
 await p.evaluate(()=>AUD.start());await p.click('#impulseBtn');
 const states=[];for(let i=0;i<9;i++){await p.waitForTimeout(1000);states.push(await p.evaluate(()=>AUD.sampleState()));}
 const res=await p.evaluate(()=>AUD.analyze(AUD.stop(),audioCtx.sampleRate,3));
 res.limMean=+(states.reduce((a,s)=>a+s.lim,0)/states.length).toFixed(1);res.limMax=+Math.min(...states.map(s=>s.lim)).toFixed(1);res.att=+(states.reduce((a,s)=>a+s.att,0)/states.length).toFixed(2);
 res.kills=await p.evaluate(()=>typeof lowEndKills==='undefined'?-1:lowEndKills);res.cfg=name;res.eng=eng;res.errs=errs;fs.appendFileSync(out,JSON.stringify(res)+'\n');await ctx.close();}
await b.close();})();
