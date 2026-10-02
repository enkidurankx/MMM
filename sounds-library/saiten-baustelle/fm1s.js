const fs=require('fs');
const src=fs.readFileSync('/home/user/MMM/fm1-editor-v1_17.html','utf8');
const core=src.slice(src.indexOf('/*CORE-START*/'),src.indexOf('/*CORE-END*/'));
const M=new Function(core+';return {initVoice,cleanVoice,packBank,vcedMessage,parseSyx,opFreq,algGraph,checksum,voiceToVCED,RANGE};')();
const {initVoice,cleanVoice,packBank,vcedMessage,parseSyx,opFreq,algGraph}=M;
const dbToOl=db=>Math.max(0,Math.round(99+db/0.75));      // ~0.75 dB pro Schritt (Näherung)
function V(name,alg,fb){const v=initVoice();v.name=name;v.alg=alg;v.fb=fb||0;v.lfpms=0;v.pl1=v.pl2=v.pl3=v.pl4=50;v.pr1=v.pr2=v.pr3=v.pr4=99;
  for(const o of v.op){o.ol=0;o.l4=0;}return v;}
// op: {fc,ff,m,ol,det, r:[r1,r2,r3,r4], l:[l1,l2,l3,l4]}  → Hüllkurve: Attack r1→l1, Decay r2→l2 …, danach Halten auf l3
function setOp(v,i,p){const o=v.op[i-1];Object.assign(o,{fc:p.fc,ff:p.ff||0,m:p.m||0,ol:p.ol,det:p.det==null?7:p.det,kvs:p.kvs==null?2:p.kvs});
  const r=p.r||[99,50,99,60],l=p.l||[99,0,0,0];[o.r1,o.r2,o.r3,o.r4]=r;[o.l1,o.l2,o.l3,o.l4]=l;}
// ═════ Sound Cards 02 — koto & shamisen (alg 5 = three 2-op stacks: 2→1, 4→3, 6→5; OP6 feedback). Rates/levels are estimates, not heard on the FM-1.
const voices=[];
function lfo(v,{lfs=0,lfd=0,lpmd=0,lpms=3,lfw=0}){Object.assign(v,{lfs,lfd,lpmd,lpms,lfw});}
function koto(name,{oshi=0,yuri=0,mod=78,click=-14}){const v=V(name,4,3);
  setOp(v,1,{fc:1,ol:99,r:[99,38,99,55]});                 setOp(v,2,{fc:1,ol:dbToOl(-4+(mod-78)/3),r:[99,66,99,60]});     // stack A: fundamental, nasal attack that mellows (mod decays fast)
  setOp(v,3,{fc:1,ol:dbToOl(-5),det:10,r:[99,40,99,55]}); setOp(v,4,{fc:2,ol:dbToOl(-12),r:[99,72,99,60]});                    // stack B: detuned twin = silk-string shimmer
  setOp(v,5,{m:1,fc:3,ff:15,ol:dbToOl(click),r:[99,92,99,99],kvs:0}); setOp(v,6,{m:1,fc:3,ff:45,ol:dbToOl(click+6),r:[99,90,99,99],kvs:0});   // stack C: tsume click (fixed ~2.3 kHz / 5 kHz)
  if(oshi){v.pl1=50;v.pl2=50+oshi;v.pl3=50+oshi;v.pl4=50;v.pr1=99;v.pr2=62;v.pr3=99;v.pr4=70;}                                  // oshide: pitch rises after the pluck (PEG L2 ≈ +2 st — check by ear)
  if(yuri)lfo(v,{lfs:38,lfd:58,lpmd:yuri,lpms:4});return v;}
function shami(name,{thump=true,bloom=0,click=-6}){const v=V(name,4,5);
  setOp(v,1,{fc:1,ol:99,r:[99,50,99,60]});                setOp(v,2,{fc:3,ol:dbToOl(-5),r:[99,62,99,60]});                  // stack A: hollow nasal (odd 3rd ratio) body of the string
  setOp(v,3,{fc:2,ol:dbToOl(-9),r:[99,58,99,60]});        setOp(v,4,{fc:1,ol:dbToOl(-14+bloom*3),r:bloom?[78,60,99,60]:[99,70,99,60],l:bloom?[99,72,0,0]:[99,0,0,0]}); // stack B: sawari bloom (modulator swells later when bloom>0)
  setOp(v,5,thump?{fc:2,ff:10,m:1,ol:dbToOl(-3),r:[99,78,99,90],kvs:0}:{m:1,fc:3,ff:15,ol:dbToOl(-18),r:[99,95,99,99],kvs:0});   // thump: fixed ~190 Hz skin mode
  setOp(v,6,{m:1,fc:3,ff:15,ol:dbToOl(click),r:[99,92,99,99],kvs:0});return v;}                                              // slap: fixed ~2.3 kHz feedback noise
voices.push(koto('KOTO TSUME',{}));voices.push(koto('KOTO OSHI',{oshi:2}));voices.push(koto('KOTO YURI',{yuri:6}));
voices.push(shami('SHM UCHI',{}));voices.push(shami('SHM SAWARI',{bloom:2}));voices.push(shami('SHM SUKUI',{thump:false,click:-12}));
const clean=voices.map(cleanVoice),bank=packBank(clean);
const res=parseSyx(bank);console.log('roundtrip',res.banks[0].slice(0,6).map(v=>v.name).join('|'));
fs.mkdirSync('out2/FM-1',{recursive:true});
fs.writeFileSync('out2/FM-1/MMM-Sounds-02-bank.syx',Buffer.from(bank));
clean.forEach((v,i)=>fs.writeFileSync('out2/FM-1/'+String(i+1).padStart(2,'0')+'-'+v.name.replace(/ /g,'_')+'.syx',Buffer.from(vcedMessage(v))));
console.log(fs.readdirSync('out2/FM-1').map(f=>f+' '+fs.statSync('out2/FM-1/'+f).size).join('\n'));
for(const v of clean){console.log(v.name,'alg',v.alg+1,'fb',v.fb,'PEG',v.pl1,v.pl2,v.pl3,v.pl4,'LFO',v.lfs,v.lfd,v.lpmd);v.op.forEach((o,i)=>{if(!o.ol)return;const f=opFreq(o);console.log(`  OP${i+1} ${f.fixed?'fix '+f.value.toFixed(0)+'Hz':'x'+f.value.toFixed(3)} OL ${o.ol} R ${o.r1}/${o.r2}`);});}
