const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.env.FILE||'cybersynth-v0_69.html');const engs=(process.argv[2]||'chua').split(',');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
for(const eng of engs){const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
const p=await ctx.newPage();await p.goto('file://'+file);await p.waitForTimeout(500);
await p.selectOption('#presetSelect',eng);await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(500);await p.click('#impulseBtn');
const r=await p.evaluate(async()=>{await new Promise(r=>setTimeout(r,4000));const acc=[0,1,2,3].map(()=>({lf:0,hf:0,tot:0,n:0,att:0,rms:0,lfShare:0}));const k0=lowEndKills,d0=guardDucks;
 for(let t=0;t<60;t++){await new Promise(r=>setTimeout(r,250));channels.forEach((ch,i)=>{const [lS,hS]=bandShares(ch.gAn);acc[i].lf+=lS;acc[i].hf+=hS;acc[i].tot+=1;acc[i].lfShare+=0;acc[i].tot2=(acc[i].tot2||0)+ch.rms/0.8;acc[i].att+=ch.attenuationFactor;acc[i].rms+=ch.rms;acc[i].n++;});}
 return {kills:lowEndKills-k0,ducks:guardDucks-d0,per:acc.map(a=>({lfShare:+(a.lf/a.n).toFixed(2),hfShare:+(a.hf/a.n).toFixed(2),att:+(a.att/a.n).toFixed(2),rms:+(a.rms/a.n).toFixed(2)}))};});
console.log(eng,JSON.stringify(r));await ctx.close();}
await b.close();})();
