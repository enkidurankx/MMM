import xml.etree.ElementTree as ET, copy, gzip, re, sys, json
SRC='played12.xml'
tree=ET.parse(SRC); root=tree.getroot(); ls=root.find('LiveSet'); tracks=ls.find('Tracks')
tmpl=[c for c in tracks if c.tag=='MidiTrack' and c.get('Id')=='18'][0]
returns=[c for c in tracks if c.tag=='ReturnTrack']
def find_dev(name):
    for e in ls.iter(name):
        if e.tag==name: return e
SAT=find_dev('Saturator'); EQ=find_dev('Eq8'); UT=find_dev('StereoGain')
OP0=tmpl.find('DeviceChain/DeviceChain/Devices/Operator')
SAT0,EQ0,UT0=copy.deepcopy(SAT),copy.deepcopy(EQ),copy.deepcopy(UT)
OPT=copy.deepcopy(OP0)
# ---------- helpers
def setp(dev,path,val):
    e=dev.find(path)
    if e is None: raise KeyError(path)
    v=('true' if val else 'false') if isinstance(val,bool) else (repr(float(val)) if isinstance(val,float) else str(val))
    m=e.find('Manual')
    if m is not None: m.set('Value',v)
    else: e.set('Value',v)
SLM=0.0003162277571   # -70 dB
def env(dev,base,init=SLM,attack=0.1,peak=1.0,decay=1000.0,sustain=SLM,release=80.0,end=SLM,dslope=1.0):
    p=base+'/'
    setp(dev,p+'AttackTime',attack); setp(dev,p+'AttackLevel',init); setp(dev,p+'DecayTime',decay); setp(dev,p+'DecayLevel',peak)
    setp(dev,p+'DecaySlope',dslope); setp(dev,p+'SustainLevel',sustain); setp(dev,p+'ReleaseTime',release); setp(dev,p+'ReleaseLevel',end)
def osc(dev,i,coarse,fine=0,vol=1.0,fb=0,pitch=True,vel=50,wave=0,**e):
    b='Operator.%d'%i
    setp(dev,b+'/Tune/Coarse',coarse); setp(dev,b+'/Tune/Fine',fine); setp(dev,b+'/Tune/FixedFrequencyOn',False)
    setp(dev,b+'/Volume',max(vol,SLM)); setp(dev,b+'/IsOn',True); setp(dev,b+'/WaveForm',wave); setp(dev,b+'/Feedback',fb)
    setp(dev,b+'/PitchEnvOn',pitch); setp(dev,b+'/VelScale',vel); setp(dev,b+'/LfoOn',False); setp(dev,b+'/Retrigger',True)
    env(dev,b+'/Envelope',**e)
def pitchenv(dev,on,initial=0.0,decay=150.0):
    setp(dev,'PitchEnv/PitchEnvOn',on)
    p='PitchEnv/PitchEnv/'
    setp(dev,p+'AttackTime',0.1); setp(dev,p+'AttackLevel',initial); setp(dev,p+'DecayLevel',initial); setp(dev,p+'DecayTime',decay)
    setp(dev,p+'DecaySlope',1.0); setp(dev,p+'SustainLevel',0.0); setp(dev,p+'ReleaseLevel',0.0); setp(dev,p+'ReleaseTime',50.0)
    setp(dev,p+'EnvelopeAmount',1.0); setp(dev,'PitchEnv/PitchEnvAmountA',100.0)
def glob(dev,name,alg=10,voices=8,porta=None,vol=0.25,tone=1.0):
    setp(dev,'Globals/Algorithm',alg); setp(dev,'Globals/NumVoices',voices); setp(dev,'Globals/Volume',vol)
    setp(dev,'Globals/PortamentoOn',porta is not None)
    if porta is not None: setp(dev,'Globals/PortamentoTime',float(porta))
    setp(dev,'Globals/Tone',tone)
    setp(dev,'Filter/OnOff',False); setp(dev,'Lfo/LfoOn',False)
    dev.find('UserName').set('Value',name)
def op(name,**g):
    d=copy.deepcopy(OPT); glob(d,name,**g); return d
# ---------- patches
P=[]
def add(name,color,devs): P.append((name,color,devs))
# 1) Kick: Algorithmus 11 (Index 10) = vier Carrier parallel
def kick(name,body_ms,dive_st,dive_ms,rumble_gain,rumble_ms,porta=None,drive=9.0):
    d=op(name,alg=10,voices=1 if porta else 8,porta=porta,vol=0.25)
    osc(d,0,1,0,1.0,decay=body_ms,release=60)                                             # A Koerper
    osc(d,1,1,13,rumble_gain,pitch=False,attack=50.0,decay=rumble_ms,release=200)          # B Rumble (Fine 13 = +0.6 Hz Schwebung, wenn Fine = Tausendstel-Verhaeltnis)
    osc(d,2,3,0,0.18,decay=body_ms*0.4,release=40)                                         # C 3. Harmonische (Saettigungs-Ersatz)
    osc(d,3,48,0,0.28,fb=80,pitch=False,decay=6.0,release=10)                              # D Klick (46 Hz x 48 = 2.2 kHz, Feedback = Rauschen)
    pitchenv(d,True,dive_st,dive_ms)
    s=copy.deepcopy(SAT0); setp(s,'BaseDrive',drive); setp(s,'DryWet',1.0); setp(s,'ColorOn',False); setp(s,'Type',0); setp(s,'PostDrive',0.0)
    return [d,s]
add('KCK Modern',7,kick('KCK Modern',900,28,150,0.35,1700))
add('KCK Tight',7,kick('KCK Tight',450,28,120,0.0001,300))
add('KCK Slide',7,kick('KCK Slide',2300,14,200,0.2,1700,porta=90,drive=12.0))
# 2) Rumble (Operator + Saturator + EQ Eight + Utility)
def rumble():
    d=op('KCK Rumble',alg=10,vol=0.25)
    osc(d,0,1,0,1.0,pitch=False,attack=50.0,decay=1700.0,release=300)
    osc(d,1,1,13,0.6,pitch=False,attack=50.0,decay=1500.0,release=300)
    osc(d,2,2,0,0.15,pitch=False,attack=60.0,decay=900.0,release=300)
    osc(d,3,3,0,0.08,pitch=False,attack=60.0,decay=600.0,release=300)
    pitchenv(d,False)
    s=copy.deepcopy(SAT0); setp(s,'BaseDrive',15.0); setp(s,'DryWet',1.0); setp(s,'ColorOn',False); setp(s,'Type',0)
    e=copy.deepcopy(EQ0)
    setp(e,'Bands.0/ParameterA/IsOn',True); setp(e,'Bands.0/ParameterA/Mode',0); setp(e,'Bands.0/ParameterA/Freq',30.0); setp(e,'Bands.0/ParameterA/Gain',0.0); setp(e,'Bands.0/ParameterA/Q',0.7071)
    for b in range(1,7): setp(e,'Bands.%d/ParameterA/IsOn'%b,False)
    setp(e,'Bands.7/ParameterA/IsOn',True); setp(e,'Bands.7/ParameterA/Mode',7); setp(e,'Bands.7/ParameterA/Freq',180.0); setp(e,'Bands.7/ParameterA/Gain',0.0); setp(e,'Bands.7/ParameterA/Q',0.7071)
    u=copy.deepcopy(UT0); setp(u,'Mono',True)
    return [d,s,e,u]
add('KCK Rumble',7,rumble())
# 3) Ko-tsuzumi: Algorithmus 11, drei Teiltoene + Klick (nur 4 Operatoren)
def kot(name,fine=(20,30),dec=(410,257,164),click=0.25,bend=0.0):
    d=op(name,alg=10,vol=0.25)
    osc(d,0,1,0,1.0,decay=dec[0],release=120)
    osc(d,1,2,fine[0],0.55,decay=dec[1],release=100)
    osc(d,2,3,fine[1],0.30,decay=dec[2],release=80)
    osc(d,3,8,0,click,fb=70,pitch=False,vel=100,decay=5.0,release=10)
    if bend: pitchenv(d,True,-bend,90.0)
    else: pitchenv(d,False)
    return [d]
add('KOT pon',20,kot('KOT pon'))
add('KOT dry',20,kot('KOT dry',fine=(40,60),dec=(246,154,98),click=0.32))
add('KOT wet',20,kot('KOT wet',fine=(4,6),dec=(574,360,230),click=0.18))
add('KOT bend',20,kot('KOT bend',bend=2.0))
# 4) O-tsuzumi: Bessel-Verhaeltnisse (3 Teiltoene) + Klick
def ots(name,click):
    d=op(name,alg=10,vol=0.25)
    osc(d,0,1,0,1.0,decay=140,release=40)
    osc(d,1,1,594,0.70,decay=105,release=40)
    osc(d,2,2,136,0.55,decay=94,release=40)
    osc(d,3,6,0,click,fb=85,pitch=False,vel=100,decay=4.0,release=10)
    pitchenv(d,False)
    s=copy.deepcopy(SAT0); setp(s,'BaseDrive',4.0); setp(s,'DryWet',1.0); setp(s,'ColorOn',False); setp(s,'Type',0)
    return [d,s]
add('OTS chon',25,ots('OTS chon',0.6))
add('OTS kan',25,ots('OTS kan',0.8))
# ---------- assemble tracks
IDS=[]
def renumber(el,start):
    n=start
    for e in el.iter():
        if e.get('Id') is not None and (e.tag in('AutomationTarget','ModulationTarget','Pointee') or e.tag.startswith('ControllerTargets') or e.tag.endswith('ModulationTarget')):
            e.set('Id',str(n)); n+=1
    return n
nextid=int(ls.find('NextPointeeId').get('Value'))+100
ntracks=[]
for k,(name,color,devs) in enumerate(P):
    t=copy.deepcopy(tmpl)
    t.set('Id',str(31+k))
    t.find('Name/EffectiveName').set('Value',name); t.find('Name/UserName').set('Value',name)
    t.find('Color').set('Value',str(color))
    t.find('TrackGroupId').set('Value','-1')
    # clean user content
    for ev in list(t.iter('Events')):
        for c in list(ev): ev.remove(c)
    for cs in t.find('DeviceChain/MainSequencer/ClipSlotList'):
        v=cs.find('ClipSlot/Value')
        for c in list(v): v.remove(c)
    t.find('DeviceChain/AudioOutputRouting/Target').set('Value','AudioOut/Main')
    t.find('DeviceChain/AudioOutputRouting/UpperDisplayString').set('Value','Master')
    chain=t.find('DeviceChain/DeviceChain/Devices')
    for c in list(chain): chain.remove(c)
    for i,dv in enumerate(devs):
        dv=copy.deepcopy(dv); dv.set('Id',str(i)); chain.append(dv)
    # tail/whitespace tidy
    nextid=renumber(t,nextid)
    ntracks.append(t)
for c in list(tracks):
    if c.tag in('GroupTrack','MidiTrack','AudioTrack'): tracks.remove(c)
for i,t in enumerate(ntracks): tracks.insert(i,t)
ls.find('NextPointeeId').set('Value',str(nextid+10))
ls.find('HighlightedTrackIndex').set('Value','0')
# scenes: clear names
for sc in ls.find('Scenes'): sc.find('Name').set('Value','')
out=sys.argv[1]
xml='<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(root,encoding='unicode')
open(out+'.xml','w',encoding='utf8').write(xml)
open(out,'wb').write(gzip.compress(xml.encode('utf8'),9))
print('tracks',len(ntracks),'xml bytes',len(xml),'gz bytes',len(gzip.compress(xml.encode('utf8'),9)))
