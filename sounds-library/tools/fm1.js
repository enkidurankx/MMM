const fs=require('fs');
const src=fs.readFileSync('/home/user/MMM/fm1-editor-v1_17.html','utf8');
const core=src.slice(src.indexOf('/*CORE-START*/'),src.indexOf('/*CORE-END*/'));
const M=new Function(core+';return {initVoice,cleanVoice,packBank,vcedMessage,parseSyx,opFreq,algGraph,checksum,voiceToVCED,RANGE};')();
const {initVoice,cleanVoice,packBank,vcedMessage,parseSyx,opFreq,algGraph}=M;
for(const a of [4,31]) console.log('alg',a+1,JSON.stringify(algGraph(a)));
const dbToOl=db=>Math.max(0,Math.round(99+db/0.75));      // ~0.75 dB pro Schritt (Näherung)
function V(name,alg,fb){const v=initVoice();v.name=name;v.alg=alg;v.fb=fb||0;v.lfpms=0;v.pl1=v.pl2=v.pl3=v.pl4=50;v.pr1=v.pr2=v.pr3=v.pr4=99;
  for(const o of v.op){o.ol=0;o.l4=0;}return v;}
// op: {fc,ff,m,ol,det, r:[r1,r2,r3,r4], l:[l1,l2,l3,l4]}  → Hüllkurve: Attack r1→l1, Decay r2→l2 …, danach Halten auf l3
function setOp(v,i,p){const o=v.op[i-1];Object.assign(o,{fc:p.fc,ff:p.ff||0,m:p.m||0,ol:p.ol,det:p.det==null?7:p.det,kvs:p.kvs==null?2:p.kvs});
  const r=p.r||[99,50,99,60],l=p.l||[99,0,0,0];[o.r1,o.r2,o.r3,o.r4]=r;[o.l1,o.l2,o.l3,o.l4]=l;}
const voices=[];
// ───── Kick (Algorithmus 5: drei Zweier-Stapel 2→1, 4→3, 6→5; Feedback an OP6)
function kick(name,{body=true,rumble=true,click=true}){const v=V(name,4,6);
  v.pl4=93;v.pr1=88;v.pl1=50;v.pl2=50;v.pl3=50;v.pr2=99;v.pr3=99;v.pr4=99;      // Pitch-EG: Start ≈ +25 Halbtöne, fällt schnell auf den Grundton (Näherung)
  v.trnp=24;
  if(body){setOp(v,1,{fc:1,ol:99,r:[99,58,99,70]});setOp(v,2,{fc:1,ol:68,r:[99,66,99,70]});}      // Körper + Oberton-Anteil (Ersatz für Drive)
  if(rumble){setOp(v,3,{fc:1,ol:rumble===2?99:dbToOl(-9),det:9,r:[62,34,99,50]});setOp(v,4,{fc:2,ol:48,r:[62,40,99,50]});}   // Rumble: langsamer Einsatz (Duck), lange Decay, leicht verstimmt (Schwebung)
  if(click){setOp(v,5,{m:1,fc:3,ff:15,ol:62,r:[99,92,99,99],kvs:0});setOp(v,6,{m:1,fc:3,ff:50,ol:78,r:[99,90,99,99],kvs:0});}   // Klick: Fixed-Freq 2.3 kHz, FM-Feedback-Rauschen
  return v;}
voices.push(kick('KCK RUMBLE',{}));voices.push(kick('KCK TIGHT',{rumble:false}));
voices.push(kick('KCK TAIL',{body:false,click:false,rumble:2}));
// ───── Ko-tsuzumi (Algorithmus 32: sechs Carrier = additiv)
const KOP=[[1,0,0],[2,1,-5.2],[3,1,-10.5],[4,1,-14.9],[5,1,-22]];   // fc, ff, dB  → Verhältnisse 1 / 2.02 / 3.03 / 4.04 / 5.05
const KDEC=[48,54,60,66,72];                                          // R2 je Teilton (Startwerte)
function kot(name,{db=0,click=-12,decMul=0,bend=0,hard=0}){const v=V(name,31,7);
  if(bend){v.pl4=50-bend;v.pr1=62;v.pl1=50;}                         // Pitch-EG: Start leicht darunter, steigt in ~90 ms (Squeeze-Nachdrücken)
  KOP.forEach(([fc,ff,d],k)=>setOp(v,k+1,{fc,ff,ol:dbToOl(d+db+(k>0?hard*3:0)),r:[99,KDEC[k]+decMul,99,60]}));
  setOp(v,6,{m:1,fc:3,ff:15,ol:dbToOl(click),r:[99,92,99,99],kvs:0});return v;}
voices.push(kot('KOT PON',{}));voices.push(kot('KOT PU',{db:-3,click:-20}));voices.push(kot('KOT TACHI',{click:-6,hard:1}));
voices.push(kot('KOT P DRY',{decMul:+10,hard:1,click:-9}));voices.push(kot('KOT P WET',{decMul:-8,db:-1,click:-16}));
voices.push(kot('KOT P BEND',{bend:2}));
// ───── Ō-tsuzumi (Algorithmus 32, Bessel-Verhältnisse)
const OP=[[1,0,0],[1,59,-3.1],[2,7,-5.2],[2,15,-6],[2,33,-8]];       // 1 / 1.59 / 2.14 / 2.30 / 2.66  (Soll: 1 / 1.594 / 2.136 / 2.295 / 2.653)
function ots(name,{click=-4,hard=0}){const v=V(name,31,7);
  OP.forEach(([fc,ff,d],k)=>setOp(v,k+1,{fc,ff,ol:dbToOl(d),r:[99,78+k*2,99,80],kvs:3}));
  setOp(v,6,{m:1,fc:3,ff:25,ol:dbToOl(click+hard*3),r:[99,95,99,99],kvs:0});return v;}
voices.push(ots('OTS CHON',{}));voices.push(ots('OTS KAN',{click:-1,hard:1}));
console.log('Voices:',voices.map(v=>v.name).join(' | '));
for(const v of voices){const f=v.op.map(o=>o.ol?((x)=>x.fixed?x.value.toFixed(0)+'Hz':x.value.toFixed(3))(opFreq(o)):'-').join(' ');console.log(v.name.padEnd(12),'alg',v.alg+1,'fb',v.fb,'ratios/fixed:',f);}
const clean=voices.map(cleanVoice);
const bank=packBank(clean);
// round trip
const res=parseSyx(bank);console.log('roundtrip banks',res.banks.length,'warnings',res.warnings.length,'name0',res.banks[0][0].name,'ol op5',res.banks[0][0].op[4].ol,'pl4',res.banks[0][0].pl4);
fs.mkdirSync('out/FM-1',{recursive:true});
fs.writeFileSync('out/FM-1/MMM-Sounds-01-bank.syx',Buffer.from(bank));
const bankArr=[clean.concat(Array.from({length:32-clean.length},()=>cleanVoice(null)))];
fs.writeFileSync('out/FM-1/MMM-Sounds-01-workspace.json',JSON.stringify({format:'mmm.fm1',version:1,banks:[bankArr[0],[],[],[]]},null,1));
clean.forEach((v,i)=>fs.writeFileSync('out/FM-1/'+String(i+1).padStart(2,'0')+'-'+v.name.replace(/ /g,'_')+'.syx',Buffer.from(vcedMessage(v))));
console.log(fs.readdirSync('out/FM-1').map(f=>f+' '+fs.statSync('out/FM-1/'+f).size).join('\n'));
console.log('\n=== TABLE');
for(const v of clean){console.log(`${v.name} | alg ${v.alg+1} fb ${v.fb} | PEG L4 ${v.pl4} R1 ${v.pr1} L1 ${v.pl1}`);
 v.op.forEach((o,i)=>{if(!o.ol)return;const f=opFreq(o);console.log(`  OP${i+1} ${f.fixed?'fix '+f.value.toFixed(0)+'Hz':'x'+f.value.toFixed(3)} (c${o.fc} f${o.ff} d${o.det}) OL ${o.ol} | R ${o.r1}/${o.r2}/${o.r3}/${o.r4} L ${o.l1}/${o.l2}/${o.l3}/${o.l4} kvs ${o.kvs}`);});}
