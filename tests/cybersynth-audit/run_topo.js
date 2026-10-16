const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');const LIB=fs.readFileSync(__dirname+'/lib.js','utf8');
const file=process.argv[2]||'cybersynth-v0_43.html';const out=process.argv[3]||'topo.jsonl';const engs=(process.argv[4]||'tudor,vink,kayn,serge,krell,chua,rungler,ciat,ashby,pll').split(',');const secs=+(process.argv[5]||22);const setup=process.argv[6]||'';
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(const eng of engs){
 const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(String(x)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
 await p.goto('file:///home/user/MMM/'+file);await p.waitForTimeout(800);await p.addScriptTag({content:LIB});
 await p.selectOption('#presetSelect',eng);await p.waitForTimeout(200);await p.click('#presetLoadBtn');await p.waitForTimeout(200);
 if(setup)await p.evaluate(setup);
 await p.click('#powerBtn');await p.waitForTimeout(300);
 await p.evaluate(()=>AUD.start());await p.click('#impulseBtn');
 const states=[];const t0=Date.now();while(Date.now()-t0<secs*1000){await p.waitForTimeout(1000);states.push(await p.evaluate(()=>AUD.sampleState()));}
 const res=await p.evaluate(([secs])=>{const buf=AUD.stop();return AUD.analyze(buf,audioCtx.sampleRate,4);},[secs]);
 const lim=states.map(s=>s.lim);res.limMean=+(lim.reduce((a,b)=>a+b,0)/lim.length).toFixed(1);res.limMax=+Math.min(...lim).toFixed(1);
 res.att=+(states.reduce((a,s)=>a+s.att,0)/states.length).toFixed(2);
 const cvs=states.map(s=>s.cv);res.cvRange=[0,1,2,3].map(i=>+(Math.max(...cvs.map(c=>c[i]))-Math.min(...cvs.map(c=>c[i]))).toFixed(2));
 res.matrixChanges=states.filter((s,i)=>i&&s.mx!==states[i-1].mx).length;
 res.kills=await p.evaluate(()=>typeof lowEndKills==='undefined'?-1:lowEndKills);res.eng=eng;res.tag=process.env.TAG||'';res.errs=errs;fs.appendFileSync(out,JSON.stringify(res)+'\n');await ctx.close();}
await b.close();})();
