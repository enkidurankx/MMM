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


# ───── Version 2: wenige Ein-Regler-Makros, jedes bewegt mehrere Parameter gleichzeitig (Min>Max = invertierte Zuordnung, in Live per Map prüfbar)
def val(df,lo,hi): return lo+(hi-lo)*df/127
def build_chain(name,base,macrodefs,sel=(0,127)):
    """macrodefs: {idx:(label,default,[(param,lo,hi)])}; Parameter werden aus den Makro-Defaults berechnet, nur wenn die Chain sie hat."""
    prm=dict(base);maps=[]
    for idx,(lab,df,lst) in macrodefs.items():
        for (p,lo,hi) in lst:
            if p in('BodyMix',) and not base.get('BodyToggle'): continue
            if p=='TerminationFretStiffness' and not base.get('TerminationToggle'): continue
            prm[p]=round(val(df,lo,hi),4); maps.append((p,idx,min(lo,hi),max(lo,hi),lo>hi,lo,hi))
    t=BASE
    for k,v in prm.items(): t=setp(t,k,v)
    for (p,idx,a,b,inv,lo,hi) in maps:
        t=setp(t,p,prm[p],idx,(lo,hi))        # Zuordnung lo->hi (bei lo>hi invertiert)
    t=re.sub(r'(<Name Value=")[^"]*(")',lambda k:k.group(1)+name+k.group(2),t,count=1)
    t=re.sub(r'(<BranchSelectorRange>\s*<Min Value=")\d+("\s*/>\s*<Max Value=")\d+("\s*/>\s*<CrossfadeMin Value=")\d+("\s*/>\s*<CrossfadeMax Value=")\d+(")',
             lambda k:f'{k.group(1)}{sel[0]}{k.group(2)}{sel[1]}{k.group(3)}{sel[0]}{k.group(4)}{sel[1]}{k.group(5)}',t,count=1)
    return t
# KOTO: 4 Regler
k=dict(V2['MMM_KOTO_Tsume_Vel2']); k.update(VibratoToggle=True,VibratoSpeed=.5,VibratoFadeIn=.6,VibratoDelay=.6,VibratoModWheel=1,VibratoError=.2,PitchBendRange=3,BodyToggle=False)
KMAC={0:('Anschlag',90,[('GeoExcitatorPosition',.28,.10),('ExcitatorStiffness',.45,.80),('StringDamping',.50,.25)]),
    1:('Ausdruck',76,[('ExcitatorVelocityVelMod',0,1),('ExcitatorStiffnessVelMod',0,.58),('GeoExcitatorVelModulation',0,-.25),('VibratoAmount',0,.58)]),
    2:('Ausklang',95,[('StringDecay',.4,1),('StringDecayRatio',.6,.3)]),
    3:('Charakter',40,[('StringInharmonicity',.15,.60),('PickupPosition',.08,.40)])}
write('MMM_KOTO_Rack_v2',rack('MMM Koto',[build_chain('Koto',k,KMAC)],{i:(l,d) for i,(l,d,_) in KMAC.items()},nvis=4))
# SHAMISEN: Technik + 3 Regler
SM={1:('Wucht',70,[('GeoExcitatorPosition',.28,.10),('ExcitatorStiffness',.45,.85),('ExcitatorVelocityVelMod',.2,1),('ExcitatorStiffnessVelMod',0,.45)]),
    2:('Länge',55,[('StringDecay',.3,1),('StringDamping',.8,.3)]),
    3:('Körper/Sawari',60,[('BodyMix',.15,.85),('TerminationFretStiffness',.2,1)])}
zones={'Bachi':(0,42),'Sukui':(43,85),'Sawari':(86,127)}
ch=[build_chain(n,dict(V2['MMM_SHAMISEN_%s_Vel2'%n]),SM,zones[n]) for n in zones]
macros={0:('Technik',20)};macros.update({i:(l,d) for i,(l,d,_) in SM.items()})
write('MMM_SHAMISEN_Rack_v2',rack('MMM Shamisen',ch,macros,selector=(0,20),nvis=4))
