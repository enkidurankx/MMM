const S=require('./strings.js'),SR=S.SR;
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}}}
function spec(b,s,l,N=65536){const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<l&&s+i<b.length;i++)re[i]=b[s+i]*(0.5-0.5*Math.cos(2*Math.PI*i/(l-1)));fft(re,im);const m=new Float64Array(N/2);for(let i=0;i<N/2;i++)m[i]=Math.hypot(re[i],im[i]);return m;}
function f0of(b,s,l,lo,hi){const N=65536,m=spec(b,s,l,N);let bi=0,bv=0;for(let i=Math.floor(lo*N/SR);i<hi*N/SR;i++)if(m[i]>bv){bv=m[i];bi=i;}const a=m[bi-1],c=m[bi],d=m[bi+1];return (bi+(a-d)/(a-2*c+d)/2)*SR/N;}
const rms=(b,t0,t1)=>{let s=0,a=Math.floor(t0*SR),e=Math.floor(t1*SR);for(let i=a;i<e;i++)s+=b[i]*b[i];return Math.sqrt(s/(e-a));};
const db=x=>(20*Math.log10(x+1e-12)).toFixed(1);
const k=S.koto({}, {gesture:'tsume'});
console.log('koto f0 target',S.ROOT.toFixed(2),'measured',f0of(k,Math.floor(.3*SR),Math.floor(.5*SR),100,200).toFixed(2));
console.log('koto level dB at .1/.5/1.0/2.0/3.0 s:',[.1,.5,1,2,3].map(t=>db(rms(k,t,t+.05))).join(' '),' (T60 setting 3.2s ⇒ −60 dB/3.2 s on fundamental)');
const ko=S.koto({}, {gesture:'oshi'});
const fa=f0of(ko,Math.floor(.0*SR),Math.floor(.09*SR),100,200),fb=f0of(ko,Math.floor(.45*SR),Math.floor(.5*SR),100,260);
console.log('oshi: f before',fa.toFixed(2),'after',fb.toFixed(2),'semitones',(12*Math.log2(fb/fa)).toFixed(2));
const kn=S.koto({}, {gesture:'tsume',note:12});console.log('koto +12 st f0',f0of(kn,Math.floor(.3*SR),Math.floor(.4*SR),200,400).toFixed(2),'expected',(S.ROOT*2).toFixed(2));
// pluck position comb: partials at multiples of 1/beta should be suppressed (beta .05 ⇒ 20th partial)
const m=spec(k,Math.floor(.002*SR),Math.floor(.15*SR));const f=S.ROOT;const pk=n=>{const c=Math.round(f*n*65536/SR);let v=0;for(let i=c-12;i<=c+12;i++)v=Math.max(v,m[i]);return v;};
console.log('partials 3,10,20,40 rel to 1 (dB)',[3,10,20,40].map(n=>db(pk(n)/pk(1))).join(' '),'(20th/40th should dip: comb)');
const sh=S.shamisen({}, {gesture:'uchi',tuning:'honchoshi',string:0}), sh0=S.shamisen({}, {gesture:'uchi',string:0,sawari:0});
const hf=(b)=>{const m=spec(b,Math.floor(.15*SR),Math.floor(.4*SR));let lo=0,hi=0;for(let i=0;i<m.length;i++){const f=i*SR/65536;if(f>300&&f<1500)lo+=m[i]**2;if(f>3000&&f<9000)hi+=m[i]**2;}return db(Math.sqrt(hi/lo));};
console.log('shamisen f0',f0of(sh,Math.floor(.4*SR),Math.floor(.5*SR),100,200).toFixed(2),' high/mid band ratio with sawari',hf(sh),'dB, without',hf(sh0),'dB');
const e=(b,t0,t1)=>db(rms(b,t0,t1));console.log('sawari rms at .1/.5/1.2 s',e(sh,.1,.15),e(sh,.5,.55),e(sh,1.2,1.25),'| no sawari',e(sh0,.1,.15),e(sh0,.5,.55),e(sh0,1.2,1.25));
const su=S.shamisen({}, {gesture:'sukui'});console.log('thump energy 0-60ms uchi vs sukui (dB):',e(sh,0,.06),e(su,0,.06));
const fs=require('fs');fs.mkdirSync('wav2',{recursive:true});
const w=(n,b)=>fs.writeFileSync('wav2/'+n+'.wav',S.wav16(b));
['tsume','oshi','hanashi','yuri','awase'].forEach(g=>w('koto_'+g,S.koto({}, {gesture:g,vary:1})));
['uchi','sukui','hajiki','suri'].forEach(g=>w('shami_'+g,S.shamisen({}, {gesture:g,vary:1})));
console.log('nan check',[k,ko,sh,su].every(b=>b.every(Number.isFinite)));
// --- sawari persistence & skin thump
const bandE=(b,t0,t1,f0,f1)=>{const m=spec(b,Math.floor(t0*SR),Math.floor((t1-t0)*SR));let s=0;for(let i=0;i<m.length;i++){const f=i*SR/65536;if(f>=f0&&f<=f1)s+=m[i]**2;}return Math.sqrt(s);};
const sa=S.shamisen({}, {gesture:'sukui',string:0}),sn=S.shamisen({}, {gesture:'sukui',string:0,sawari:0});
for(const [a,b] of [[.05,.25],[.3,.6],[.7,1.0]])console.log(`sawari: 2-9 kHz energy ${a}-${b}s: on ${db(bandE(sa,a,b,2000,9000))} off ${db(bandE(sn,a,b,2000,9000))} dB (diff ${(db(bandE(sa,a,b,2000,9000))-db(bandE(sn,a,b,2000,9000))).toFixed(1)})`);
const ski=S.shamisen({}, {gesture:'uchi'});const sk0=S.shamisen({}, {gesture:'uchi'},);
const noskin=S.shamisen({skin:Object.assign({},S.SHAMI.skin,{level:0,slap:0})}, {gesture:'uchi'});
console.log('skin: 120-450 Hz energy 0-80ms with',db(bandE(ski,0,.08,120,450)),'without',db(bandE(noskin,0,.08,120,450)),'| 1-4 kHz',db(bandE(ski,0,.04,1000,4000)),db(bandE(noskin,0,.04,1000,4000)));
