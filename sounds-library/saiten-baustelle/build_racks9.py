# Baut zwei Instrument Racks (.adg) aus der Vorlage Tension_Multichain.adg des Owners.
# Makro-Zuordnung (aus der Vorlage gelesen): am Zielparameter <KeyMidi> mit Channel 16 und NoteOrController = Makro-Index (0 = Makro 1);
# Abbildungsbereich = <MidiControllerRange> des Parameters (Annahme, in der Vorlage nur Vollbereich gesehen).
import re, gzip, os, xml.etree.ElementTree as ET
ns={}; exec(open('build_tension.py').read().replace("OUT='../adv_out'","OUT='/tmp/_discard'").replace("open(f'{OUT}/{name}.adv','wb').write(gzip.compress(x.encode('utf8'),9)); return name","return name").replace('for n,p in P.items(): print(build(n,p))','').replace('for n,p in V.items(): print(build(n,p))','').replace('for n,p in V2.items(): print(build(n,p))',''),ns)
V2=ns['V2']
X=open('../adv/Tension_Multichain.adg.xml',encoding='utf8').read()
i0=X.index('<BranchPresets>')+len('<BranchPresets>'); i1=X.index('</BranchPresets>')
HEAD,BR,TAIL=X[:i0],X[i0:i1],X[i1:]
chains=re.findall(r'<InstrumentBranchPreset Id="\d+">.*?</InstrumentBranchPreset>',BR,re.S)
assert len(chains)==2
BASE=chains[1]; assert '<KeyMidi>' not in BASE
KM='<KeyMidi>\n<PersistentKeyString Value="" />\n<IsNote Value="false" />\n<Channel Value="16" />\n<NoteOrController Value="%d" />\n<LowerRangeNote Value="-1" />\n<UpperRangeNote Value="-1" />\n<ControllerMapMode Value="0" />\n</KeyMidi>\n'
def fmt(v): return str(v).lower() if isinstance(v,bool) else repr(round(float(v),6)).rstrip('0').rstrip('.') if not isinstance(v,(int,str)) else str(v)
def setp(txt,name,val,macro=None,rng=None):
    m=re.search(r'<%s>(.*?)</%s>'%(name,name),txt,re.S); assert m,name
    b=m.group(1)
    b=re.sub(r'(<Manual Value=")[^"]*(")',lambda k:k.group(1)+fmt(val)+k.group(2),b,count=1)
    if macro is not None:
        b=re.sub(r'<KeyMidi>.*?</KeyMidi>\s*','',b,flags=re.S)
        b=b.replace('<LomId Value="0" />','<LomId Value="0" />\n'+KM%macro,1)
        if rng: b=re.sub(r'(<MidiControllerRange>\s*<Min Value=")[^"]*("\s*/>\s*<Max Value=")[^"]*(")',lambda k:k.group(1)+fmt(rng[0])+k.group(2)+fmt(rng[1])+k.group(3),b,count=1)
    return txt[:m.start(1)]+b+txt[m.end(1):]
def chain(name,params,maps,sel=(0,127)):
    t=BASE
    for k,v in params.items(): t=setp(t,k,v)
    for (p,macro,lo,hi) in maps:
        t=setp(t,p,params[p],macro,(lo,hi))
        assert lo<=params[p]<=hi,(p,params[p],lo,hi)
    t=re.sub(r'(<Name Value=")[^"]*(")',lambda k:k.group(1)+name+k.group(2),t,count=1)
    t=re.sub(r'(<BranchSelectorRange>\s*<Min Value=")\d+("\s*/>\s*<Max Value=")\d+("\s*/>\s*<CrossfadeMin Value=")\d+("\s*/>\s*<CrossfadeMax Value=")\d+(")',
             lambda k:f'{k.group(1)}{sel[0]}{k.group(2)}{sel[1]}{k.group(3)}{sel[0]}{k.group(4)}{sel[1]}{k.group(5)}',t,count=1)
    return t
def macro_val(p,lo,hi): return round((p-lo)/(hi-lo)*127,2)
def rack(name,chain_txts,macros,selector=None,nvis=8):
    chain_txts=[c.replace('<InstrumentBranchPreset Id="1">','<InstrumentBranchPreset Id="%d">'%i,1) for i,c in enumerate(chain_txts)]
    x=HEAD+'\n'.join(chain_txts)+TAIL
    x=re.sub(r'(<UserName Value=")[^"]*(")',lambda k:k.group(1)+name+k.group(2),x,count=1)
    x=x.replace('<NumVisibleMacroControls Value="8" />','<NumVisibleMacroControls Value="%d" />'%nvis)
    for i in range(16):
        nm,val=macros.get(i,('Macro %d'%(i+1),0))
        x=x.replace('<MacroDisplayNames.%d Value="Macro %d" />'%(i,i+1),'<MacroDisplayNames.%d Value="%s" />'%(i,nm))
        x=re.sub(r'(<MacroControls\.%d>\s*<LomId Value="0" />\s*<Manual Value=")[^"]*(")'%i,lambda k:k.group(1)+str(val)+k.group(2),x,count=1)
    # Chain Selector
    m=re.search(r'<ChainSelector>(.*?)</ChainSelector>',x,re.S);b=m.group(1)
    if selector is not None:
        b=re.sub(r'(<NoteOrController Value=")\d+(")',lambda k:k.group(1)+str(selector[0])+k.group(2),b,count=1)
        b=re.sub(r'(<Manual Value=")[^"]*(")',lambda k:k.group(1)+str(selector[1])+k.group(2),b,count=1)
    else:
        b=re.sub(r'<KeyMidi>.*?</KeyMidi>\s*','',b,flags=re.S)
        pass
    x=x[:m.start(1)]+b+x[m.end(1):]
    ET.fromstring(x)
    return x
def write(name,x):
    open(f'../adv_out/{name}.adg','wb').write(gzip.compress(x.encode('utf8'),9)); print(name,len(x))



# ───── Version 4: Technik-Wahl über Chain Selector (Makro "Technik", einmal auf das Modrad legen); Velocity = Dynamik/Helligkeit (Tension-VelMod); Aftertouch = Tension Pressure.
PR=dict(ChannelPressureTarget1=5,ChannelPressureRange1=.4,ChannelPressureTarget2=0)
def tech(name,params,zone): return chain(name,params,[],sel=zone)
def pack(name,chains,default):
    x=rack(name,chains,{0:('Technik',default)},selector=(0,default),nvis=1)
    return x
OFF=dict(VibratoToggle=False,VibratoModWheel=0)

# ───── Version 6: stark übertriebene Velocity-Wirkung (Rückmeldung: v4/v5 kaum hörbar). Grundwert niedrig, Velocity-Anteil maximal.
VELMAX=dict(ExcitatorVelocity=.42,ExcitatorVelocityVelMod=.5,ExcitatorStiffness=.58,ExcitatorStiffnessVelMod=.35,ExcitatorParameterXVelMod=.15,GeoExcitatorVelModulation=-.15)
kbase='MMM_KOTO_Tsume_Vel2'
VIBOFF=dict(VibratoToggle=False,VibratoModWheel=0)
KT=[ # Name, Zone, Änderungen gegenüber Tsume (deutlich hörbar)
 ('Tsume',(0,25),{}),
 ('Far',(26,51),dict(GeoExcitatorPosition=.26,ExcitatorStiffness=.45,ExcitatorDamping=.5,StringDamping=.5)),
 ('Keshi',(52,76),dict(StringDecay=.28,StringDamping=.72,StringDecayRatio=.3)),                     # kurz, gedämpft
 ('Yuri',(77,101),dict(VibratoToggle=True,VibratoSpeed=.55,VibratoAmount=.85,VibratoFadeIn=.2,VibratoDelay=.15,VibratoModWheel=0,VibratoError=.1)),   # starkes Vibrato
 ('Suri',(102,127),dict(PortamentoToggle=True,PortamentoLegato=True,PortamentoTime=.4,StringDecay=.9)),  # Gleiten zwischen Noten
]
ch=[]
for n,zone,ex in KT:
    d=dict(V2[kbase]); d.update(PR); d.update(VIBOFF); d['PitchBendRange']=3; d.update(VELMAX); d.update(ex); ch.append(tech(n,d,zone))
write('MMM_KOTO_Rack_v9',pack('MMM Koto',ch,12))
