import re, gzip, os, xml.etree.ElementTree as ET
BASE=open('../adv/Tension.adv.xml',encoding='utf8').read()
OUT='../adv_out'
def setv(x,name,val):
    pat=re.compile(r'(<%s>\s*<LomId Value="0" />\s*<Manual Value=")[^"]*(")'%name)
    assert pat.search(x),name
    return pat.sub(lambda m:m.group(1)+str(val).lower()+m.group(2),x,count=1)
def build(name,p):
    x=BASE
    for k,v in p.items(): x=setv(x,k,v)
    ET.fromstring(x)
    open(f'{OUT}/{name}.adv','wb').write(gzip.compress(x.encode('utf8'),9)); return name
# Normalised 0..1 values; ExcitatorType 0..3 = Bow, Hammer, Hammer(bouncing), Plectrum (assumed order). Nothing here was heard in Live.
koto=dict(ExcitatorType=3,ExcitatorParameterX=.6,ExcitatorStiffness=.8,ExcitatorVelocity=.65,ExcitatorDamping=.3,
  GeoExcitatorPosition=.06,PickupToggle=True,PickupPosition=.15,StringDecay=.85,StringDamping=.3,StringDecayRatio=.45,StringInharmonicity=.3,
  Polyphony=6,PitchBendRange=3)
P={}
P['MMM_KOTO_Tsume']=dict(koto)
P['MMM_KOTO_Tsume_Far']=dict(koto,GeoExcitatorPosition=.22,ExcitatorStiffness=.55,ExcitatorDamping=.5,StringDamping=.4)
P['MMM_KOTO_Oshide']=dict(koto,PitchBendRange=3,PortamentoToggle=False)
P['MMM_KOTO_Yuri']=dict(koto,VibratoToggle=True,VibratoSpeed=.5,VibratoAmount=.35,VibratoFadeIn=.6,VibratoDelay=.6,VibratoModWheel=1,VibratoError=.2)
sham=dict(ExcitatorType=1,ExcitatorParameterX=.5,ExcitatorStiffness=.85,ExcitatorVelocity=.9,ExcitatorDamping=.2,
  GeoExcitatorPosition=.13,PickupToggle=True,PickupPosition=.25,StringDecay=.55,StringDamping=.6,StringDecayRatio=.35,StringInharmonicity=.45,
  BodyToggle=True,BodyType=1,BodySize=1,BodyDecay=.15,BodyMix=.45,Polyphony=3)
P['MMM_SHAMISEN_Bachi']=dict(sham)
P['MMM_SHAMISEN_Sawari']=dict(sham,TerminationToggle=True,TerminationFretStiffness=.85,TerminationFingerForce=.25,TerminationFingerStiffness=.4)
P['MMM_SHAMISEN_Sukui']=dict(sham,ExcitatorType=3,ExcitatorStiffness=.9,GeoExcitatorPosition=.09,StringDecay=.5,BodyToggle=False)
for n,p in P.items(): print(build(n,p))
