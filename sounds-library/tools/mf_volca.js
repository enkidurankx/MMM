const fs=require('fs');fs.mkdirSync('out/MicroFreak',{recursive:true});fs.mkdirSync('out/VolcaDrum',{recursive:true});
// ───── MicroFreak (JSON für den μFREAK-Editor v4.2; Matrix-Werte müssen am Gerät von Hand gesetzt werden, es gibt keinen CC dafür)
const base=()=>({oscTypeIdx:0,oscWave:64,oscTimbre:64,oscShape:64,fCut:64,fRes:0,fMode:0,fEnvAmt:64,fEnvAmt2:64,eAtk:0,eDcy:64,eSus:64,cRise:64,cFall:64,cHold:0,cAmt:64,cRiseShape:64,cFallShape:64,lfoFree:64,lfoSync:64,lfoShape:0,arpFree:64,arpSync:64,swing:0,glide:0,spice:0,uniSpread:0,master:100,arpMode:'arp',arpPat:'up',arpOct:1,uniCount:2,bendRange:2,octShift:0,kbMode:'pressure',ampMod:false,snappy:false,cycOn:false,lfoSyncBtn:false,lfoRetrig:false,kHold:false,kRand:false,para:false,envLegato:false,envReset:false,presetName:'Init',presetNum:1,matrixAmounts:Array.from({length:5},()=>Array(7).fill(0)),assignDests:[0,0,0]});
const IDX={basic:0,fm:7,modal:11,bass:13};
function mf(name,o,mx){const p=Object.assign(base(),o,{presetName:name});for(const [si,di,a] of mx||[])p.matrixAmounts[si][di]=a;return p;}
// Matrix: Quelle 0 = CycEnv, 1 = Env, 2 = LFO, 3 = Press, 4 = Key/Arp; Ziel 0 = Pitch, 1 = Wave, 2 = Timbre, 3 = Cutoff
const P=[
 mf('MMM KCK',{oscTypeIdx:IDX.bass,oscWave:40,oscTimbre:18,oscShape:22,fCut:127,fRes:0,fEnvAmt:64,fEnvAmt2:64,eAtk:0,eDcy:44,eSus:0,cRise:0,cFall:30,cHold:0,cAmt:100,cycOn:false,glide:0,envReset:true},[[0,0,80]]),
 mf('MMM KCK SLD',{oscTypeIdx:IDX.bass,oscWave:55,oscTimbre:22,oscShape:12,fCut:127,eAtk:0,eDcy:80,eSus:0,cRise:0,cFall:40,cHold:0,cAmt:100,glide:48,envLegato:true},[[0,0,45]]),
 mf('MMM RUMBLE',{oscTypeIdx:IDX.bass,oscWave:78,oscTimbre:8,oscShape:10,fCut:58,fRes:0,fEnvAmt:64,eAtk:24,eDcy:112,eSus:0,cycOn:false,envReset:true},[]),
 mf('MMM KOT PON',{oscTypeIdx:IDX.modal,oscWave:10,oscTimbre:72,oscShape:46,fCut:127,fRes:0,eAtk:0,eDcy:44,eSus:0,cRise:0,cFall:26,cHold:0,cAmt:64,cycOn:false,envReset:true},[[0,0,-10]]),
 mf('MMM OTS CHON',{oscTypeIdx:IDX.modal,oscWave:96,oscTimbre:110,oscShape:10,fCut:127,fRes:0,eAtk:0,eDcy:14,eSus:0,cycOn:false,envReset:true},[])
];
P.forEach(p=>fs.writeFileSync('out/MicroFreak/mf-'+p.presetName.replace(/ /g,'_')+'.json',JSON.stringify(p,null,2)));
// ───── Volca Drum: SMF Typ 0, PPQ 96. Takt 1: CC-Setup für Part 1-4 (Kanal 1-4) bei Tick 0, danach 2 Takte Hörprobe
const PPQ=96,ev=[];
const cc=(ch,n,v)=>ev.push([0,[0xB0|ch,n,v]]);
const part=(ch,o)=>{for(const [n,v] of o)cc(ch,n,v);};
const SEL={sine:6,saw:32,tri:58,square:84,noise:120};  // Zonen-Mitten von 5 (Reihenfolge ungeprüft)
// CC: 10 pan | 14/15 Select L1/L2 | 17/18 Level | 20/21 EG Attack | 23/24 EG Release | 26/27 Pitch | 29/30 Mod Amount | 46/47 Mod Rate | 49 Bit | 50 Fold | 51 Drive | 52 Dry | 103 Send | 116 WG Model | 117 WG Decay | 118 Body | 119 Tune
part(0,[[10,64],[14,SEL.sine],[15,SEL.noise],[17,127],[18,34],[20,0],[21,0],[23,46],[24,8],[26,34],[27,104],[29,112],[30,0],[46,96],[47,64],[49,0],[50,16],[51,76],[52,127],[103,0],[117,0],[118,0],[119,64]]);   // KCK
part(1,[[10,64],[14,SEL.sine],[15,SEL.sine],[17,110],[18,96],[20,38],[21,38],[23,104],[24,104],[26,34],[27,35],[29,24],[30,10],[46,64],[47,64],[49,0],[50,0],[51,104],[52,127],[103,0],[116,10],[117,40],[118,30],[119,40]]);  // RUMBLE (Layer 2 +1 Pitch-Schritt = Schwebung)
part(2,[[10,64],[14,SEL.sine],[15,SEL.tri],[17,110],[18,40],[20,0],[21,0],[23,30],[24,12],[26,64],[27,64],[29,36],[30,0],[46,80],[49,0],[50,6],[51,22],[52,100],[103,0],[116,100],[117,64],[118,72],[119,64]]);  // KOT (WG: Strings = harmonische Reihe)
part(3,[[10,64],[14,SEL.noise],[15,SEL.sine],[17,96],[18,70],[20,0],[21,0],[23,10],[24,12],[26,64],[27,86],[29,0],[30,20],[46,64],[49,0],[50,30],[51,84],[52,127],[103,0],[116,10],[117,16],[118,100],[119,76]]);  // OTS (WG: Tube, kurz)
const N=(ch,tick,len,vel)=>{ev.push([tick,[0x90|ch,60,vel]]);ev.push([tick+len,[0x80|ch,60,0]]);};
const T0=PPQ*4;                                   // Hörprobe ab Takt 2
for(let bar=0;bar<2;bar++){const b=T0+bar*PPQ*4;
 N(0,b,PPQ/2,120);N(0,b+PPQ*2.5,PPQ/4,100);N(1,b,PPQ*1.9,100);
 N(2,b+PPQ*1,PPQ/4,100);N(2,b+PPQ*1.75,PPQ/4,70);N(2,b+PPQ*3,PPQ/4,110);N(3,b+PPQ*2,PPQ/8,110);N(3,b+PPQ*3.5,PPQ/8,90);}
ev.sort((a,b)=>a[0]-b[0]);
function vlq(n){const b=[n&0x7f];while(n>>=7)b.unshift((n&0x7f)|0x80);return b;}
let trk=[0,0xFF,0x51,3,0x07,0xA1,0x20];let last=0;     // 120 BPM
for(const [t,m] of ev){trk.push(...vlq(t-last),...m);last=t;}trk.push(...vlq(PPQ*4),0xFF,0x2F,0);
const hdr=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,0,PPQ];const len=trk.length;
const smf=Buffer.from([...hdr,0x4D,0x54,0x72,0x6B,(len>>24)&255,(len>>16)&255,(len>>8)&255,len&255,...trk]);
fs.writeFileSync('out/VolcaDrum/MMM-Sounds-01-parts1-4.mid',smf);
console.log('SMF',smf.length,'bytes, events',ev.length);
console.log(fs.readdirSync('out/MicroFreak').join(', '));
