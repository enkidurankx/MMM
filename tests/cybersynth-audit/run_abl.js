const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.argv[2]||'cybersynth-v0_69.html');const SECS=+(process.argv[3]||12);
const V={
 base:'',
 base2:'',
 echo_cut:`(()=>{const e=EC.nodes;e.in.disconnect(e.send);e.wow.disconnect();e.flt.disconnect();})();`,
 xm_cut:`(()=>{const n=XM.nodes;channels.forEach((ch,i)=>n.sw[i].forEach(g=>ch.lim.disconnect(g)));})();`,
 rv_return_cut:`(()=>{})();`,
 all_idle_cut:`(()=>{channels.forEach(ch=>{for(const e of [ch.eq,ch.eqOut])e.in.disconnect(e.lo);const c=ch.comp;c.in.disconnect(c.abs);c.in.disconnect(c.vca);ch.uf.pre.disconnect();ch.ringWet.disconnect();});const e=EC.nodes;e.in.disconnect(e.send);e.wow.disconnect();e.flt.disconnect();const n=XM.nodes;channels.forEach((ch,i)=>n.sw[i].forEach(g=>ch.lim.disconnect(g)));})();`,
 all_idle_plus_os:`(()=>{channels.forEach(ch=>{for(const e of [ch.eq,ch.eqOut])e.in.disconnect(e.lo);const c=ch.comp;c.in.disconnect(c.abs);c.in.disconnect(c.vca);ch.uf.pre.disconnect();ch.ringWet.disconnect();ch.drive.oversample='2x';});const e=EC.nodes;e.in.disconnect(e.send);e.wow.disconnect();e.flt.disconnect();const n=XM.nodes;channels.forEach((ch,i)=>n.sw[i].forEach(g=>ch.lim.disconnect(g)));})();`,
 ring_mul_cut:`channels.forEach(ch=>{ch.ringDry.disconnect();ch.filter.disconnect();ch.filter.connect(ch.pre);});`,
};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const out={};
for(const [name,js] of Object.entries(V)){const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));
 await ctx.addInitScript((secs)=>{window.AudioContext=class extends OfflineAudioContext{constructor(){super(2,Math.floor(48000*secs),48000);}};},SECS);
 const p=await ctx.newPage();p.on('pageerror',()=>{});
 await p.goto('file://'+file);await p.waitForTimeout(500);await p.selectOption('#presetSelect','tudor');await p.click('#presetLoadBtn');await p.click('#powerBtn');await p.waitForTimeout(1200);
 try{if(js)await p.evaluate(js);}catch(e){out[name]='ERR '+e.message.slice(0,80);await ctx.close();continue;}
 const r=await p.evaluate(async()=>{const t0=performance.now();const buf=await audioCtx.startRendering();return +(((performance.now()-t0)/1000)/buf.duration).toFixed(3);});out[name]=r;await ctx.close();}
console.log(JSON.stringify(out));await b.close();})();
