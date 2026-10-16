// soft-preset tuner: node run_soft.js <file> <out.jsonl> <cfgs.json>   cfgs = [{eng, ms, q, drive, gain, sl, sp:{id:val}, secs, tag}]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file='/home/user/MMM/'+process.argv[2],out=process.argv[3],cfgs=JSON.parse(fs.readFileSync(process.argv[4],'utf8'));
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(const cfg of cfgs){const secs=cfg.secs||18;const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
 const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(String(x)));
 await p.goto(file.startsWith('file')?file:'file://'+file);await p.waitForTimeout(600);await p.addScriptTag({content:LIB});
 await p.selectOption('#presetSelect',cfg.eng);await p.waitForTimeout(150);await p.click('#presetLoadBtn');await p.waitForTimeout(150);
 await p.evaluate((cfg)=>{
  const r2=v=>Math.round(v*100)/100;
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){setMatrixEntry(i,j,r2(matrixValues[i][j]*(cfg.ms===undefined?1:cfg.ms)));}
  for(let i=0;i<4;i++){const c=readChannelUI(i);let type=c.type,freq=c.freq;if(cfg.soft){if(type==='highpass'||type==='notch')type='bandpass';else if(type==='allpass'){type='lowpass';freq=freq*3;}}setChannelUI(i,Object.assign({},c,{type,freq,q:Math.min(c.q,cfg.q||99),drive:Math.min(c.drive,cfg.drive===undefined?9:cfg.drive),gain:cfg.gain||c.gain,fb:0,dw:0}));}
  if(cfg.lm!==undefined){ENGINES[cfg.eng].loop=cfg.lm;engineParams();}
  if(cfg.sp)for(const id in cfg.sp){const a=document.getElementById(id);if(a){a.value=cfg.sp[id];a.dispatchEvent(new Event('input',{bubbles:true}));}}
  if(cfg.sl!==undefined){CHUA_LEVEL=cfg.sl;for(const k in SRC4)SRC4[k].level=cfg.sl;}
  if(cfg.ui)for(const id in cfg.ui){const a=document.getElementById(id);if(a){a.value=cfg.ui[id];a.dispatchEvent(new Event('input',{bubbles:true}));}}
  if(cfg.fold!==undefined){const a=document.getElementById('foldAmt');a.value=cfg.fold;a.dispatchEvent(new Event('input',{bubbles:true}));}
 },cfg);
 await p.click('#powerBtn');await p.waitForTimeout(400);
 await p.evaluate(()=>{AUD.start();});await p.click('#impulseBtn');
 const samples=await p.evaluate(async(secs)=>{const rows=[];const k0=lowEndKills,d0=guardDucks;for(let t=0;t<secs*4;t++){await new Promise(r=>setTimeout(r,250));rows.push(channels.map(c=>c.rms));}return {rows,kills:lowEndKills-k0,ducks:guardDucks-d0};},secs);
 const res=await p.evaluate(()=>AUD.analyze(AUD.stop(),audioCtx.sampleRate,3));
 const rows=samples.rows.slice(Math.floor(samples.rows.length*0.2));const mx=rows.map(r=>Math.max(...r)),mean=rows.map(r=>r.reduce((a,b)=>a+b,0)/4);
 const alive=mx.filter(v=>v>0.03).length/mx.length;const loopMean=mean.reduce((a,b)=>a+b,0)/mean.length;
 const row={tag:cfg.tag||'',eng:cfg.eng,ms:cfg.ms,q:cfg.q,drive:cfg.drive,gain:cfg.gain,sl:cfg.sl,sp:cfg.sp,alive:+alive.toFixed(2),loop:+loopMean.toFixed(3),rms:res.rms,peak:res.peak,dead:res.dead,cent:res.centroid,gt8k:res.bands.b8k_,kills:samples.kills,ducks:samples.ducks,nan:res.nan,errs:errs.length};
 fs.appendFileSync(out,JSON.stringify(row)+'\n');await ctx.close();}
await b.close();})();
