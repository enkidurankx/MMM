const C = require('./cards.js'), SR = C.SR;
function fft(re, im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}}
function spec(buf,start,len,N=16384){const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<len&&start+i<buf.length;i++){const w=0.5-0.5*Math.cos(2*Math.PI*i/(len-1));re[i]=buf[start+i]*w;}fft(re,im);const m=new Float64Array(N/2);for(let i=0;i<N/2;i++)m[i]=Math.hypot(re[i],im[i]);return m;}
function peaks(m,N,fmin,fmax,thr,max=12){const out=[];const b0=Math.floor(fmin*N/SR),b1=Math.floor(fmax*N/SR);let mx=0;for(let i=b0;i<b1;i++)mx=Math.max(mx,m[i]);
 for(let i=b0+1;i<b1-1;i++)if(m[i]>m[i-1]&&m[i]>=m[i+1]&&m[i]>mx*thr){const a=m[i-1],b=m[i],c=m[i+1],d=(a-c)/(a-2*b+c)/2;out.push([(i+d)*SR/N,m[i]/mx]);}return out.sort((x,y)=>y[1]-x[1]).slice(0,max).sort((x,y)=>x[0]-y[0]);}
// instantaneous frequency of a quasi-sinusoid via zero crossings in windows
function zc(buf,t0,t1){let c=0,first=-1,last=-1;const a=Math.floor(t0*SR),b=Math.floor(t1*SR);for(let i=a+1;i<b;i++)if(buf[i-1]<=0&&buf[i]>0){c++;const f=i;if(first<0)first=f;last=f;}return c>1?(c-1)*SR/(last-first):NaN;}
const rms=(b,t0,t1)=>{let s=0,a=Math.floor(t0*SR),e=Math.floor(t1*SR);for(let i=a;i<e;i++)s+=b[i]*b[i];return Math.sqrt(s/(e-a));};
const db=x=>(20*Math.log10(x+1e-12)).toFixed(1);
// ---- Kick
const k=C.renderKick({}, {seed:1}), kg=C.renderKick({}, {seed:1, prevHz:73.4});
console.log('KICK main pitch (zero-crossing):');
for(const [a,b] of [[0.003,0.010],[0.010,0.020],[0.020,0.040],[0.040,0.080],[0.08,0.14]]) console.log(`  ${a*1000}-${b*1000} ms: ${zc(k.main,a,b).toFixed(1)} Hz (Ziel ${C.KICK.tune})`);
console.log('KICK mit Glide von 73.4 Hz (D2), Grundtonanteil 120-250ms:', zc(kg.main,0.12,0.25).toFixed(1),'Hz  vs ohne Glide', zc(k.main,0.12,0.25).toFixed(1));
console.log('RMS main/rumble dB @ 10ms, 60ms, 150ms, 400ms, 800ms:');
for(const t of [0.01,0.06,0.15,0.4,0.8]) console.log(`  t=${t*1000}ms main ${db(rms(k.main,t,t+0.02))}  rumble ${db(rms(k.rumble,t,t+0.02))}`);
const m=spec(k.rumble,Math.floor(0.3*SR),16384);console.log('Rumble Spektrum-Peaks (0.3s..):',peaks(m,16384,20,400,0.05,5).map(p=>p[0].toFixed(1)+'Hz@'+p[1].toFixed(2)).join(' '));
const hs=spec(k.mix,0,4096,4096);let lo=0,hi=0;for(let i=0;i<2048;i++){const f=i*SR/4096;(f<200?lo+=hs[i]**2:f>1000?hi+=hs[i]**2:0);}console.log('Mix erste 93ms: Energie <200Hz vs >1k:',db(Math.sqrt(lo)),db(Math.sqrt(hi)));
console.log('Rumble-Spitze (max |x|) mix:',Math.max(...k.mix.map(Math.abs)).toFixed(2));
// ---- Ko-tsuzumi
for(const st of ['pon','pu','ta','chi']){const b=C.renderKot({}, {state:st}),N=16384,m=spec(b,Math.floor(0.004*SR),Math.floor(0.12*SR),N);
 const f0=C.KOT.f0*Math.pow(2,C.KOT.states[st].st/12);const pk=peaks(m,N,100,3500,0.04,8);
 console.log(`KOT ${st}: f0 soll ${f0.toFixed(1)}  Peaks:`,pk.map(p=>p[0].toFixed(0)+'('+(p[0]/f0).toFixed(2)+')').join(' '));}
for(const h of [0,0.5,1]){const b=C.renderKot({humidity:h},{state:'pon'});console.log(`KOT pon humidity ${h}: decay RMS 30ms->200ms ${db(rms(b,0.03,0.05))} -> ${db(rms(b,0.2,0.22))}`);}
// ---- Ō-tsuzumi
for(const st of ['chon','kan']){const b=C.renderOts({}, {state:st}),N=16384,m=spec(b,Math.floor(0.001*SR),Math.floor(0.06*SR),N);const f0=C.OTS.f0*Math.pow(2,C.OTS.states[st].st/12);
 console.log(`OTS ${st}: f0 soll ${f0.toFixed(1)} Peaks:`,peaks(m,N,100,4500,0.05,9).map(p=>p[0].toFixed(0)+'('+(p[0]/f0).toFixed(2)+')').join(' '));
 console.log('   Länge bis -40dB:', (()=>{const pk=Math.max(...b.map(Math.abs));for(let i=b.length-1;i>0;i--)if(Math.abs(b[i])>pk*0.01)return (i/SR*1000).toFixed(0)+' ms';})());}
// Variation
const v1=C.renderKot({}, {state:'pon',vary:1,seed:11}),v2=C.renderKot({}, {state:'pon',vary:1,seed:12});let d=0;for(let i=0;i<v1.length;i++)d+=(v1[i]-v2[i])**2;console.log('Variation: Differenz-RMS zwischen 2 Anschlägen',db(Math.sqrt(d/v1.length)),'vs Signal',db(rms(v1,0,0.2)));
// write wavs
const fs=require('fs');fs.mkdirSync('wav',{recursive:true});
fs.writeFileSync('wav/kick_mix.wav',C.wav16(k.mix));fs.writeFileSync('wav/kick_main.wav',C.wav16(k.main));fs.writeFileSync('wav/kick_rumble.wav',C.wav16(k.rumble));
