const { chromium } = require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const TW=fs.readFileSync(process.env.TW_JS||'/tmp/tw.js','utf8');
const file='/home/user/MMM/'+(process.argv[2]||'cybersynth-v0_69.html');const out=(process.env.OUT||'/tmp/')+'';
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const o={};
const mk=async(w,h)=>{const ctx=await b.newContext({viewport:{width:w,height:h}});await ctx.route('**/cdn.tailwindcss.com/**',r=>r.fulfill({contentType:'application/javascript',body:TW}));const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await p.goto('file://'+file);await p.waitForTimeout(600);return {ctx,p,errs};};
for(const w of [320,390,768,1280,1800]){const {ctx,p,errs}=await mk(w,900);
 o['w'+w]=await p.evaluate(()=>({ovf:document.documentElement.scrollWidth>document.documentElement.clientWidth,card:(()=>{const r=document.getElementById('lfoCard').getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})(),knob:Math.round(document.getElementById('lfoSpd0').getBoundingClientRect().width),pan:Math.round(document.getElementById('panKnob_0').getBoundingClientRect().width)}));
 await p.locator('#lfoCard').screenshot({path:out+`lfo_${w}.png`});await p.locator('#channelsContainer').screenshot({path:out+`chs_${w}.png`});o['w'+w].errs=errs.length;await ctx.close();}
const {ctx,p,errs}=await mk(1280,900);
await p.click('#powerBtn');await p.waitForTimeout(800);
const T=async(f)=>p.evaluate(f);
// pan knobs default and set
o.panDef=await T(()=>[0,1,2,3].map(i=>[+document.getElementById('panKnob_'+i).value,channels[i].pan.pan.value.toFixed(2),document.getElementById('panKnob_'+i+'_v').innerText]));
await T(()=>{const e=document.getElementById('panKnob_0');e.value=0.5;e.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(300);
o.panSet=await T(()=>[PAN_BASE[0],channels[0].pan.pan.value.toFixed(2),document.getElementById('panKnob_0_v').innerText]);
await T(()=>{document.getElementById('panKnob_0').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));});await p.waitForTimeout(100);
o.panDbl=await T(()=>+document.getElementById('panKnob_0').value);
// LFO pos: depth 1 on LFO1 fast, record pan over time
await T(()=>{const s=document.getElementById('lfoSpd0');s.value=0.8;s.dispatchEvent(new Event('input',{bubbles:true}));const a=document.getElementById('lfoPos0');a.value=1;a.dispatchEvent(new Event('input',{bubbles:true}));});
const tr=await T(async()=>{const r=[];for(let k=0;k<30;k++){r.push([0,1,2,3].map(i=>+channels[i].pan.pan.value.toFixed(2)));await new Promise(x=>setTimeout(x,100));}return r;});
o.posRange=[0,1,2,3].map(i=>{const v=tr.map(x=>x[i]);return [Math.min(...v),Math.max(...v)]});
// back to 0: pan returns to base
await T(()=>{const a=document.getElementById('lfoPos0');a.value=0;a.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(800);
o.panBack=await T(()=>[0,1,2,3].map(i=>+channels[i].pan.pan.value.toFixed(2)));
// FM: LFO2 frequency effective: detune gets modulated
await T(()=>{const a=document.getElementById('lfoAmt1');a.value=0.5;a.dispatchEvent(new Event('input',{bubbles:true}));});
o.fm=await T(()=>({on:FM.on,a:FM.a,gain:LFO[1].nodes.fm.gain.value}));
await T(()=>document.getElementById('lfoFmBtn').click());await p.waitForTimeout(300);
o.fmOff=await T(()=>({on:FM.on,gain:+LFO[1].nodes.fm.gain.value.toFixed(2)}));
await T(()=>document.getElementById('lfoFmBtn').click());
// phase of LFO2 advances variably when FM on
const hz=await T(async()=>{const a=[];let prev=LFO[1].ph;for(let k=0;k<20;k++){await new Promise(x=>setTimeout(x,50));a.push(+((LFO[1].ph-prev+2*Math.PI)%(2*Math.PI)).toFixed(3));prev=LFO[1].ph;}return a;});
o.fmPhaseStepsRange=[Math.min(...hz),Math.max(...hz)];
// persistence
await T(()=>{const a=document.getElementById('lfoPos1');a.value=0.6;a.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.lfo-ps[data-lfo="1"][data-ps="2"]').click();const e=document.getElementById('panKnob_2');e.value=-0.4;e.dispatchEvent(new Event('input',{bubbles:true}));const f=document.getElementById('lfoFm1');f.value=0.8;f.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForTimeout(1500);
const st=await T(()=>JSON.parse(localStorage.getItem('cybersynth.state.v1')));
o.saved={pos:st.lfo[1].pos,posA:st.lfo[1].posA,fmA:st.lfo[1].fmA,fm:st.lfo[1].fm,pan2:st.ch[2].pan};
await p.screenshot({path:out+'lfo_after.png'});
o.errs=errs;
const p2=await ctx.newPage();await p2.goto('file://'+file);await p2.waitForTimeout(800);
o.restored=await p2.evaluate(()=>({pos:LFO[1].pos,posA:LFO[1].posA,fmA:FM.a,pan2:+document.getElementById('panKnob_2').value}));
console.log(JSON.stringify(o));await b.close();})();
