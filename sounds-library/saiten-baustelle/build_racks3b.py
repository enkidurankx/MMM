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



# ───── Version 3: nur Modrad, Velocity, Aftertouch. Keine Makros. Velocity wirkt über Tension-VelMod und (Shamisen) über Velocity-Zonen der Chains.
def vel_zone(t,lo,xlo,xhi,hi):
    return re.sub(r'(<VelocityRange>\s*<Min Value=")\d+("\s*/>\s*<Max Value=")\d+("\s*/>\s*<CrossfadeMin Value=")\d+("\s*/>\s*<CrossfadeMax Value=")\d+(")',
        lambda k:f'{k.group(1)}{lo}{k.group(2)}{hi}{k.group(3)}{xlo}{k.group(4)}{xhi}{k.group(5)}',t,count=1)
def plain_chain(name,params,zone=None):
    t=BASE
    for k,v in params.items(): t=setp(t,k,v)
    t=re.sub(r'(<Name Value=")[^"]*(")',lambda k:k.group(1)+name+k.group(2),t,count=1)
    t=re.sub(r'(<BranchSelectorRange>\s*<Min Value=")\d+("\s*/>\s*<Max Value=")\d+("\s*/>\s*<CrossfadeMin Value=")\d+("\s*/>\s*<CrossfadeMax Value=")\d+(")',lambda k:f'{k.group(1)}0{k.group(2)}127{k.group(3)}0{k.group(4)}127{k.group(5)}',t,count=1)
    if zone: t=vel_zone(t,*zone)
    return t
def finish(name,chains):
    x=rack(name,chains,{},selector=None,nvis=1)
    x=x.replace('<AreMacroControlsVisible Value="true" />','<AreMacroControlsVisible Value="false" />')
    return x
VIB=dict(ChannelPressureTarget1=5,ChannelPressureRange1=.4,ChannelPressureTarget2=0,VibratoToggle=True,VibratoSpeed=.5,VibratoFadeIn=.5,VibratoDelay=.4,VibratoModWheel=1,VibratoError=.2)
k=dict(V2['MMM_KOTO_Tsume_Vel2']); k.update(VIB,VibratoAmount=.4,PitchBendRange=3,BodyToggle=False,
    GeoExcitatorPosition=.20,GeoExcitatorVelModulation=-.3,ExcitatorStiffness=.6,ExcitatorStiffnessVelMod=.4,ExcitatorVelocity=.45,ExcitatorVelocityVelMod=.65,ExcitatorParameterX=.55,ExcitatorParameterXVelMod=.1,PickupPosition=.15)
write('MMM_KOTO_Rack_v3b',finish('MMM Koto',[plain_chain('Koto',k)]))
zones={'Sukui':(1,1,55,75),'Bachi':(45,65,95,115),'Sawari':(85,110,127,127)}
ch=[]
for n in ('Sukui','Bachi','Sawari'):
    d=dict(V2['MMM_SHAMISEN_%s_Vel2'%n]); d.update(VIB,VibratoAmount=.3,GeoExcitatorPosition=.15)
    ch.append(plain_chain(n,d,zones[n]))
write('MMM_SHAMISEN_Rack_v3b',finish('MMM Shamisen',ch))
