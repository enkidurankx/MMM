const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file=process.argv[2]||'cybersynth-v0_51.html';const out=process.argv[3]||'storm.jsonl';const eng=process.argv[4]||'tudor';const n=+(process.argv[5]||12);const secs=+(process.argv[6]||12);const seed0=+(process.argv[7]||1);
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(let t=0;t<n;t++){const seed=seed0+t;
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(String(x)));
 await p.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
 await p.goto('file:///home/user/MMM/'+file);await p.waitForTimeout(700);await p.addScriptTag({content:LIB});
 await p.selectOption('#presetSelect',eng);await p.waitForTimeout(150);
 const cfg=await p.evaluate((seed)=>{let s=seed*2654435761%4294967296;const R=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};
  const S=(id,v)=>{const a=document.getElementById(id);if(!a)return;a.value=v;a.dispatchEvent(new Event('input',{bubbles:true}));};const T=(id,on)=>{const c=document.getElementById(id);if(!c)return;c.checked=on;c.dispatchEvent(new Event('change',{bubbles:true}));};
  const cfg={};const pick=(id,lo,hi,p=0.6)=>{if(R()<p){const v=lo+R()*(hi-lo);S(id,v);cfg[id]=+v.toFixed(2);}};
  pick('eq_lo',-12,12);pick('eq_mid',-12,12);pick('eq_hi',-12,12);pick('fxfHp',0,1,0.4);pick('fxfLp',0,1,0.4);pick('fxfRes',0,1,0.4);pick('fxfDrive',0,1,0.4);pick('fxfMix',0,1,0.3);
  pick('rvMix',0,1);pick('rvTime',0,1);pick('rvDamp',0,1);pick('rvLoop',0,1);
  if(R()<0.5){T('ecOn',true);cfg.echo=1;pick('ecFb',0,0.92,1);pick('ecMix',0,1,1);pick('ecTime',0,1,1);pick('ecTone',0,1,1);pick('ecWow',0,1,1);}
  if(R()<0.4){T('xmOn',true);cfg.ring=1;document.getElementById('xmMode').value=String(Math.floor(R()*4));document.getElementById('xmMode').dispatchEvent(new Event('change'));pick('xmAmt',0,1,1);pick('xmLoop',0,1,1);}
  for(let i=0;i<4;i++)if(R()<0.4){T('compOn_'+i,true);cfg['comp'+i]=1;}
  pick('mxLvl',0.3,1,0.7);if(R()<0.3){T('mxShareToggle',false);cfg.shareOff=1;}
  pick('lfoAmt0',0,1,0.4);pick('lfoAmt1',0,1,0.4);pick('lfoSpd0',0,1,0.5);if(R()<0.3){document.querySelector('button.lfo-sp[data-lfo="0"][data-sp="0"]').click();pick('lfoSpA0',0,1,1);}
  for(let i=0;i<4;i++){pick('fQ_'+i,0,1,0.5);pick('fDrive_'+i,0,1,0.5);pick('delayKnob_'+i,0,1,0.4);pick('fbKnob_'+i,0,0.95,0.4);pick('dwKnob_'+i,0,1,0.3);pick('fFreq_'+i,0,1,0.5);pick('gainKnob_'+i,0,1.2,0.4);}
  pick('foldAmt',0,1,0.5);pick('driftAmt',0,1,0.4);pick('driftTAmt',0,1,0.4);pick('overallTune',-24,24,0.4);
  const pre=R();if(pre<0.33){document.getElementById('presetBestMatrix').click();cfg.pre='bestMatrix';}else if(pre<0.66){document.getElementById('presetBestCh').click();cfg.pre='bestCh';}else{cfg.pre='none';}
  return cfg;},seed);
 await p.click('#powerBtn');await p.waitForTimeout(300);
 await p.evaluate(()=>AUD.start());await p.click('#impulseBtn');
 const states=[];for(let i=0;i<secs;i++){await p.waitForTimeout(1000);states.push(await p.evaluate(()=>AUD.sampleState()));}
 const res=await p.evaluate(()=>AUD.analyze(AUD.stop(),audioCtx.sampleRate,3));
 res.limMean=+(states.reduce((a,s)=>a+s.lim,0)/states.length).toFixed(1);res.limMax=+Math.min(...states.map(s=>s.lim)).toFixed(1);
 res.ducks=await p.evaluate(()=>typeof guardDucks==='undefined'?-1:guardDucks);res.seed=seed;res.eng=eng;res.cfg=cfg;res.errs=errs;fs.appendFileSync(out,JSON.stringify(res)+'\n');await ctx.close();}
await b.close();})();
