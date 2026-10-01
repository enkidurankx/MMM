import xml.etree.ElementTree as ET, copy, gzip, os, re, sys
src=open('build_als.py',encoding='utf8').read()
src=src[:src.index('# ---------- assemble tracks')]
src=src.replace("SRC='played12.xml'","SRC='played12.xml'")
ns={}; exec(compile(src,'build_als_part','exec'),ns)
P=ns['P']
OUT='../adv_out'; os.makedirs(OUT,exist_ok=True)
ROOT_ATTR={'MajorVersion':'5','MinorVersion':'12.0_12402','SchemaChangeCount':'5','Creator':'Ableton Live 12.4.6','Revision':'0de5c8fa9a692293676cb7700a15afb2046ee1f7'}
def write_adv(dev,name):
    root=ET.Element('Ableton',ROOT_ATTR); root.append(dev)
    xml='<?xml version="1.0" encoding="UTF-8"?>\n'+ET.tostring(root,encoding='unicode')
    ET.fromstring(xml)   # validate
    p=os.path.join(OUT,name+'.adv'); open(p,'wb').write(gzip.compress(xml.encode('utf8'),9)); return p
def sanitize(dev,devid):
    d=copy.deepcopy(dev)
    if 'Id' in d.attrib: del d.attrib['Id']
    for e in d.iter():
        if e.get('Id') is not None and (e.tag=='Pointee' or e.tag.endswith('Target') or e.tag.startswith('ControllerTargets')): e.set('Id','0')
    lp=d.find('LastPresetRef')
    if lp is not None:
        d.remove(lp)
    new=ET.fromstring('<LastPresetRef><Value><AbletonDefaultPresetRef Id="0"><FileRef><RelativePathType Value="0" /><RelativePath Value="" /><Path Value="" /><Type Value="2" /><LivePackName Value="" /><LivePackId Value="" /><OriginalFileSize Value="0" /><OriginalCrc Value="0" /><SourceHint Value="" /></FileRef><DeviceId Name="%s" /></AbletonDefaultPresetRef></Value></LastPresetRef>'%devid)
    idx=list(d).index(d.find('LastSelectedClipEnvelopeIndex'))+1; d.insert(idx,new)
    sc=d.find('SourceContext')
    if sc is not None:
        for c in list(sc): sc.remove(c)
        ET.SubElement(sc,'Value')
    d.find('UserName').set('Value','')
    d.find('OverwriteProtectionNumber').set('Value','3076')
    return d
made=[]
# ---- Operator (aus den Set-Patches)
for name,color,devs in P:
    if name=='KCK Rumble': fn='MMM_KCK_Rumble_OperatorOnly'
    else: fn='MMM_'+name.replace(' ','_')
    made.append(write_adv(sanitize(devs[0],'Operator'),fn))
# ---- Collision / DS aus den Nutzer-Vorlagen
UP='../adv/'
def load(n): return ET.parse(UP+n).getroot()[0]
def setm(dev,path,val):
    e=dev.find(path)
    if e is None: raise KeyError(path)
    m=e.find('Manual'); v=('true' if val is True else 'false' if val is False else str(val))
    (m if m is not None else e).set('Value',v)
def collision(fn,res,mallet,noise=None,r2=None,vol=0.7):
    d=load('Collision.adv.xml')
    for k,v in mallet.items(): setm(d,'Mallet/'+k,v)
    for k,v in res.items(): setm(d,'Resonator1/'+k,v)
    setm(d,'Resonator1/OnOff',True)
    if noise:
        setm(d,'Noise/OnOff',True)
        for k,v in noise.items(): setm(d,'Noise/'+k,v)
    setm(d,'Volume',vol)
    made.append(write_adv(d,fn))
# Beam 0, Marimba 1, String 2, Membrane 3, Plate 4, Pipe 5, Tube 6 (Reihenfolge angenommen)
collision('MMM_OTS_chon_Collision',
  dict(Type=3,Quality=3,Decay=0.12,Damp=0.45,Radius=0.5,Inharmonics=0.0,Bleed=0.0,HitX=0.7,RandomToHitX=0.15,Volume=0.8,KeyToTranspose=1),
  dict(Volume=0.65,Stiffness=0.92,VelToStiffness=1.0,NoiseAmount=0.55,NoiseColor=0.85,VelToVolume=1.0))
collision('MMM_OTS_kan_Collision',
  dict(Type=3,Quality=3,Decay=0.12,Damp=0.45,Radius=0.4,Inharmonics=0.0,Bleed=0.0,HitX=0.9,RandomToHitX=0.15,Volume=0.8,KeyToTranspose=1),
  dict(Volume=0.7,Stiffness=1.0,VelToStiffness=1.0,NoiseAmount=0.7,NoiseColor=0.9,VelToVolume=1.0))
def kotc(fn,decay,damp,inh,start=0.0):
    collision(fn,dict(Type=2,Quality=3,Decay=decay,Damp=damp,Radius=0.5,Inharmonics=inh,HitX=0.35,RandomToHitX=0.1,Volume=0.8,StartTranspose=start,StartTime=0.4,KeyToTranspose=1),
      dict(Volume=0.55,Stiffness=0.6,VelToStiffness=1.5,NoiseAmount=0.35,NoiseColor=0.6,VelToVolume=1.0))
kotc('MMM_KOT_pon_Collision',0.30,0.10,0.10)
kotc('MMM_KOT_dry_Collision',0.18,0.40,0.30)
kotc('MMM_KOT_wet_Collision',0.45,-0.20,0.03)
kotc('MMM_KOT_bend_Collision',0.30,0.10,0.10,start=-0.10)
def ds(src,fn,vals):
    d=load(src)
    for p in d.iter():
        if p.tag in('MxDFloatParameter','MxDEnumParameter'):
            nm=p.find('Name').get('Value')
            if nm in vals: p.find('Timeable/Manual').set('Value',str(vals[nm]))
    made.append(write_adv(d,fn))
ds('DS_Snare.adv.xml','MMM_DS_Snare_Modern',{'Color':72,'Decay':20,'Filter Type':2,'Tone':55,'Tune':38,'Volume':-9.8})
ds('DS_HH.adv.xml','MMM_DS_HH_Closed',{'Attack':0,'Decay':24,'Filter Slope':1,'Noise Color':0,'Pitch':41,'Tone':92,'Volume':-10.9})
ds('DS_HH.adv.xml','MMM_DS_HH_Open',{'Attack':0,'Decay':62,'Filter Slope':1,'Noise Color':0,'Pitch':41,'Tone':92,'Volume':-11.9})
for p in made: print(os.path.basename(p),os.path.getsize(p))
