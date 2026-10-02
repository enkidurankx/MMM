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
def rack(name,chain_txts,macros,selector=None):
    chain_txts=[c.replace('<InstrumentBranchPreset Id="1">','<InstrumentBranchPreset Id="%d">'%i,1) for i,c in enumerate(chain_txts)]
    x=HEAD+'\n'.join(chain_txts)+TAIL
    x=re.sub(r'(<UserName Value=")[^"]*(")',lambda k:k.group(1)+name+k.group(2),x,count=1)
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

# ───── KOTO: eine Chain; Tsume/Far = Makro Position, Oshide = Pitchrad (Bend-Bereich 3), Yuri = Modrad (Vibrato-Tiefe per Makro)
k=dict(V2['MMM_KOTO_Tsume_Vel2']); k.update(VibratoToggle=True,VibratoSpeed=.5,VibratoAmount=.35,VibratoFadeIn=.6,VibratoDelay=.6,VibratoModWheel=1,VibratoError=.2,PitchBendRange=3,
    BodyToggle=False,PickupPosition=.15,GeoExcitatorPosition=.16)
M=[('Position','GeoExcitatorPosition',.05,.30),('Härte','ExcitatorStiffness',.4,.9),('Dynamik','ExcitatorVelocityVelMod',0,1),
   ('Ausklang','StringDecay',.4,1),('Dämpfung','StringDamping',.1,.6),('Yuri','VibratoAmount',0,1),('Inharm','StringInharmonicity',.1,.6),('Abnahme','PickupPosition',.05,.5)]
maps=[(p,i,lo,hi) for i,(n,p,lo,hi) in enumerate(M)]+[('ExcitatorStiffnessVelMod',2,0,.58)]
macros={i:(n,macro_val(k[p],lo,hi)) for i,(n,p,lo,hi) in enumerate(M)}
write('MMM_KOTO_Rack',rack('MMM Koto',[chain('Koto',k,maps)],macros))

# ───── SHAMISEN: drei Chains (Bachi / Sukui / Sawari) über Makro 1 "Technik"; Makros wirken in allen Chains
sh={n:dict(V2['MMM_SHAMISEN_%s_Vel2'%n]) for n in ('Bachi','Sukui','Sawari')}
for d in sh.values(): d.update(GeoExcitatorPosition=.15)
SM=[('Position','GeoExcitatorPosition',.08,.30),('Härte','ExcitatorStiffness',.4,.9),('Dynamik','ExcitatorVelocityVelMod',0,1),
    ('Dämpfung','StringDamping',.2,.8),('Ausklang','StringDecay',.3,1),('Körper','BodyMix',0,1)]
def smaps(d,extra=()):
    mp=[(p,i+1,lo,hi) for i,(n,p,lo,hi) in enumerate(SM)]+[('ExcitatorStiffnessVelMod',3,0,.45)]
    return mp+list(extra)
zones={'Bachi':(0,42),'Sukui':(43,85),'Sawari':(86,127)}
ch=[]
for n,d in sh.items():
    ex=[('TerminationFretStiffness',7,.1,1)] if n=='Sawari' else []
    mm=[m for m in smaps(d,ex) if not (m[0]=='BodyMix' and not d.get('BodyToggle'))]
    if n=='Sawari': mm=[(p,i,lo,(.27 if p=='ExcitatorStiffnessVelMod' else hi)) for (p,i,lo,hi) in mm]
    if n=='Sukui': mm=[(p,i,lo,(.86 if p=='StringDecay' else hi)) for (p,i,lo,hi) in mm]
    ch.append(chain(n,d,mm,zones[n]))
b=sh['Bachi']
macros={0:('Technik',20)}
for i,(n,p,lo,hi) in enumerate(SM): macros[i+1]=(n,macro_val(b[p],lo,hi))
macros[7]=('Sawari',macro_val(sh['Sawari']['TerminationFretStiffness'],.1,1))
write('MMM_SHAMISEN_Rack',rack('MMM Shamisen',ch,macros,selector=(0,20)))
