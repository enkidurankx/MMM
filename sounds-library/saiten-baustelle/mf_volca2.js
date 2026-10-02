const fs=require('fs');fs.mkdirSync('out2/MicroFreak',{recursive:true});fs.mkdirSync('out2/VolcaDrum',{recursive:true});
const base=()=>({oscTypeIdx:0,oscWave:64,oscTimbre:64,oscShape:64,fCut:64,fRes:0,fMode:0,fEnvAmt:64,fEnvAmt2:64,eAtk:0,eDcy:64,eSus:64,cRise:64,cFall:64,cHold:0,cAmt:64,cRiseShape:64,cFallShape:64,lfoFree:64,lfoSync:64,lfoShape:0,arpFree:64,arpSync:64,swing:0,glide:0,spice:0,uniSpread:0,master:100,arpMode:'arp',arpPat:'up',arpOct:1,uniCount:2,bendRange:2,octShift:0,kbMode:'pressure',ampMod:false,snappy:false,cycOn:false,lfoSyncBtn:false,lfoRetrig:false,kHold:false,kRand:false,para:false,envLegato:false,envReset:false,presetName:'Init',presetNum:1,matrixAmounts:Array.from({length:5},()=>Array(7).fill(0)),assignDests:[0,0,0]});
const IDX={karplus:4,modal:11};
function mf(name,o,mx){const p=Object.assign(base(),o,{presetName:name});for(const [si,di,a] of mx||[])p.matrixAmounts[si][di]=a;return p;}
// Karplus Str: Wave = Bow (0 = pure pluck), Timbre = Position, Shape = Decay. Matrix: source 0 CycEnv,1 Env,2 LFO,3 Press,4 Key/Arp; dest 0 Pitch,1 Wave,2 Timbre,3 Cutoff
const K={oscTypeIdx:IDX.karplus,oscWave:0,oscTimbre:16,oscShape:92,fCut:127,fRes:0,eAtk:0,eDcy:86,eSus:0,envReset:true,kbMode:'pressure'};
const P=[
 mf('MMM KOTO TSUME',K,[]),
 mf('MMM KOTO OSHI',Object.assign({},K,{cycOn:false,cRise:46,cFall:127,cHold:96,cAmt:100,bendRange:3}),[[0,0,14]]),   // oshide: CycEnv rises slowly after the pluck → pitch up (set Pitch amount on the device)
 mf('MMM KOTO YURI',Object.assign({},K,{lfoFree:74,lfoShape:0,lfoRetrig:true}),[[2,0,7]]),                         // yuri: LFO → pitch, small
 mf('MMM SHAMI UCHI',{oscTypeIdx:IDX.karplus,oscWave:26,oscTimbre:34,oscShape:58,fCut:118,fRes:22,fEnvAmt:84,eAtk:0,eDcy:58,eSus:0,envReset:true,snappy:true},[[1,3,30]]),
 mf('MMM SHAMI SAWARI',{oscTypeIdx:IDX.karplus,oscWave:78,oscTimbre:30,oscShape:70,fCut:127,fRes:30,eAtk:0,eDcy:76,eSus:0,envReset:true},[]),               // bow noise = sustained buzz (stand-in for the sawari ridge)
];
P.forEach(p=>fs.writeFileSync('out2/MicroFreak/mf-'+p.presetName.replace(/ /g,'_')+'.json',JSON.stringify(p,null,2)));
// ───── Volca Drum: Waveguide, parts 1-4 on ch 1-4.  CC 116 = WG model (value→model unverified), 117 decay, 118 body, 119 tune
const PPQ=96,ev=[];const cc=(ch,n,v)=>ev.push([0,[0xB0|ch,n,v]]);const part=(ch,o)=>{for(const [n,v] of o)cc(ch,n,v);};
const SEL={sine:12,saw:38,tri:64,sqr:90,noise:116};
const PARTS=[ // [name, ccs]
 ['KOTO TSUME',[[10,64],[14,SEL.noise],[15,SEL.sine],[17,70],[18,0],[20,0],[21,0],[23,8],[24,8],[26,64],[27,64],[29,0],[30,0],[46,64],[49,0],[50,6],[51,18],[52,110],[103,0],[116,100],[117,96],[118,50],[119,62]]],
 ['KOTO OSHI',[[10,64],[14,SEL.noise],[15,SEL.sine],[17,70],[18,0],[20,0],[21,0],[23,8],[24,8],[26,64],[27,64],[29,24],[30,0],[46,32],[49,0],[50,6],[51,18],[52,110],[103,0],[116,100],[117,96],[118,50],[119,62]]],
 ['SHAMI UCHI',[[10,64],[14,SEL.noise],[15,SEL.sine],[17,96],[18,60],[20,0],[21,0],[23,10],[24,40],[26,64],[27,40],[29,16],[30,0],[46,64],[49,0],[50,26],[51,70],[52,127],[103,0],[116,100],[117,60],[118,90],[119,50]]],
 ['SHAMI SAWARI',[[10,64],[14,SEL.noise],[15,SEL.saw],[17,80],[18,30],[20,0],[21,12],[23,10],[24,70],[26,64],[27,64],[29,0],[30,30],[46,64],[47,100],[49,0],[50,44],[51,96],[52,127],[103,0],[116,100],[117,80],[118,70],[119,50]]],
];
PARTS.forEach(([n,o],i)=>part(i,o));
const N=(ch,tick,len,vel)=>{ev.push([tick,[0x90|ch,60,vel]]);ev.push([tick+len,[0x80|ch,60,0]]);};
const T0=PPQ*4;
for(let bar=0;bar<2;bar++){const b=T0+bar*PPQ*4;[0,2,3.5].forEach((q,k)=>N(0,b+q*PPQ,PPQ/4,100-k*8));N(1,b+PPQ*1.5,PPQ/4,100);N(2,b,PPQ/8,120);N(2,b+PPQ*2.5,PPQ/8,100);N(3,b+PPQ*1,PPQ/2,100);}
ev.sort((a,b)=>a[0]-b[0]);
function vlq(n){const b=[n&0x7f];while(n>>=7)b.unshift((n&0x7f)|0x80);return b;}
let trk=[0,0xFF,0x51,3,0x07,0xA1,0x20],last=0;for(const [t,m] of ev){trk.push(...vlq(t-last),...m);last=t;}trk.push(...vlq(PPQ*4),0xFF,0x2F,0);
const hdr=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,0,PPQ],L=trk.length;
fs.writeFileSync('out2/VolcaDrum/MMM-Sounds-02-strings-parts1-4.mid',Buffer.from([...hdr,0x4D,0x54,0x72,0x6B,(L>>24)&255,(L>>16)&255,(L>>8)&255,L&255,...trk]));
fs.writeFileSync('out2/VolcaDrum/volca-starters.json',JSON.stringify(PARTS.map(([n,o])=>({name:n,v:Object.fromEntries(o)}))));
console.log(fs.readdirSync('out2/MicroFreak').join(' '),'| mid',L+22);
