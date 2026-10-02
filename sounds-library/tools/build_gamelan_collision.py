#!/usr/bin/env python3
"""MMM Sound Library, Card 03: Gamelan presets for Ableton Collision.

usage: python3 build_gamelan_collision.py <gamelan.html> <Collision.adv> <out_dir>
Same idea as build_gamelan_adv.py: instruments and profiles come from gmln.4, the owner's empty Collision.adv is the
template, only <Manual Value> entries change. All values are computed, not heard.
Collision's Type order is an ASSUMPTION: 0 Beam, 1 Marimba, 2 String, 3 Membrane, 4 Plate, 5 Pipe, 6 Tube.
"""
import gzip, json, math, os, subprocess, sys, xml.etree.ElementTree as ET

html, tmpl, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
src = open(html, encoding='utf8').read()
a = src.index("const NOTE_NAMES"); b = src.index('// ---------- state ----------')
js = src[a:b] + "\nprocess.stdout.write(JSON.stringify({INSTR,PROF}));"
data = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
INSTR = {i['k']: i for i in data['INSTR']}; PROF = data['PROF']

ROOT = ET.fromstring(gzip.decompress(open(tmpl, 'rb').read())); T = ROOT[0]
def rng(el):
    r = el.find('MidiControllerRange')
    return (float(r.find('Min').get('Value')), float(r.find('Max').get('Value'))) if r is not None else None
def setm(dev, path, val):
    e = dev.find(path)
    if e is None: raise KeyError(path)
    m = e.find('Manual'); tgt = m if m is not None else e
    if isinstance(val, bool): s = 'true' if val else 'false'
    else:
        r = rng(e)
        if r and not (r[0] - 1e-9 <= float(val) <= r[1] + 1e-9): raise ValueError(f'{path}={val} outside {r}')
        s = repr(round(float(val), 6)) if isinstance(val, float) else str(val)
    tgt.set('Value', s)
written = []
def write_adv(dev, name):
    root = ET.Element('Ableton', dict(ROOT.attrib)); root.append(dev)
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='unicode'); ET.fromstring(xml)
    open(os.path.join(out, name + '.adv'), 'wb').write(gzip.compress(xml.encode('utf8'), 9)); written.append(name)

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
clamp = lambda v, a, b: max(a, min(b, v))
def dn(sec):                       # decay seconds -> Collision Decay 0..1; anchors from the Sounds-01 Collision values (0.12 ~ 0.1 s, 0.30 ~ 0.3 s): ASSUMPTION
    return clamp(0.495 + 0.375 * math.log10(max(sec, 0.01)), 0.0, 1.0)
def tune(st):                      # semitones -> (Transpose, FineTranspose cents)
    t = int(round(st)); f = int(round((st - t) * 100))
    return clamp(t, -48, 48), clamp(f, -50, 50)
def cents(beat_hz, f): return min(50, int(round(1200 * math.log2(1 + beat_hz / f))))

def base():
    d = ET.fromstring(ET.tostring(T))
    setm(d, 'Polyphony', 6); setm(d, 'Volume', 0.7)
    return d
def mallet(d, vol, stiff, noise, color=0.7, on=True):
    setm(d, 'Mallet/OnOff', on)
    for k, v in dict(Volume=vol, Stiffness=stiff, NoiseAmount=noise, NoiseColor=color, VelToVolume=1.0, VelToStiffness=1.0).items(): setm(d, 'Mallet/' + k, v)
def res(d, n, typ, st=0.0, decay=0.5, damp=0.0, inh=0.0, vol=0.8, hitx=0.5, rnd=0.1, start=0.0, start_t=0.3, tube=1.0, radius=0.5, on=True):
    p = f'Resonator{n}/'
    setm(d, p + 'OnOff', on); setm(d, p + 'Type', typ); setm(d, p + 'Quality', 3)
    t, f = tune(st); setm(d, p + 'Transpose', t); setm(d, p + 'FineTranspose', f); setm(d, p + 'KeyToTranspose', 1.0)
    setm(d, p + 'Decay', decay); setm(d, p + 'Damp', damp); setm(d, p + 'Inharmonics', inh); setm(d, p + 'Radius', radius)
    setm(d, p + 'HitX', hitx); setm(d, p + 'RandomToHitX', rnd); setm(d, p + 'Volume', vol)
    setm(d, p + 'StartTranspose', start); setm(d, p + 'StartTime', start_t); setm(d, p + 'TubeOpening', tube)
def finish(d, name, note):
    d.find('UserName').set('Value', ''); d.find('Annotation').set('Value', note); write_adv(d, name)

def ref_freq(I, p):
    return p['hz'] if I.get('fixed') else mtof(60 + 12 * I['reg'] + 7)     # G in the instrument's register

BARS = {'DMG': .8, 'SRN': .8, 'PKG': .88, 'SLN': .7, 'JBL': .72, 'JGG': .6, 'GDP': .85, 'GDS': .85, 'PMP': .88, 'PMS': .88, 'KNP': .92, 'KNS': .92}
GONGS = {'GNG': (.25, .10), 'KPR': (.3, .12), 'KMP': (.3, .12), 'KNG': (.45, .15), 'JNG': (.4, .12), 'KMG': (.85, .2),
         'BNB': (.6, .15), 'BNP': (.68, .15), 'RYP': (.7, .15), 'RYS': (.7, .15)}
SMALL = ('KTK', 'KPY', 'KJR')

for key, I in INSTR.items():
    if I.get('cust') in ('drum', 'suling', 'rebab'): continue
    p = PROF[I['prof']]; f0 = ref_freq(I, p)
    beat_scale = 1.5 if key.endswith('S') and key in ('GDS', 'PMS', 'KNS', 'RYS') else 1.0
    oc = cents(p['beat'] * beat_scale, f0)
    d = base()
    if key in BARS or key in ('GDP', 'GDS', 'PMP', 'PMS', 'KNP', 'KNS'):
        mallet(d, .55, BARS[key], .08)
        res(d, 1, 0, decay=dn(p['dec']), damp=-.25, vol=.8, hitx=.5, rnd=.12)
        res(d, 2, 6, st=oc / 100, decay=dn(p['dec'] * 1.2), damp=0.0, vol=.3, hitx=.5, rnd=.05)      # tube resonator, tuned a little off = ombak
        setm(d, 'ResonatorOrder', 0)
        why = 'Bronzebarre (Beam) + Röhre (Tube); Röhre um den Ombak verstimmt'
    elif key == 'GAM':
        mallet(d, .55, .75, .2, .6)
        res(d, 1, 1, decay=dn(p['dec']), damp=.35, vol=.8, hitx=.5, rnd=.12)
        res(d, 2, 6, decay=dn(.5), damp=.2, vol=.2, hitx=.5, rnd=.05)
        why = 'Holzbarre (Marimba) + Trog (Tube)'
    elif key in SMALL:
        mallet(d, .6, .9, .15, .8)
        st = 12 * math.log2(p['hz'] / mtof(I['note']))
        res(d, 1, 4, st=st, decay=dn(p['dec']), damp=-.1, inh=.4, vol=.8, hitx=.45, rnd=.08)
        res(d, 2, 4, st=st + oc / 100, decay=dn(p['dec'] * .8), damp=-.1, inh=.5, vol=.4, hitx=.55, rnd=.08)
        why = 'kleine flache Gongs (Plate), feste Note, Tonhöhe per Transpose auf die App-Frequenz gelegt'
    else:
        stf, noise = GONGS[key]
        mallet(d, .6, stf, noise, .5)
        start = clamp(p['drop'] / 100 / 12, 0, 1)                                                   # ASSUMPTION: StartTranspose +-1 = +-12 semitones
        res(d, 1, 4, decay=dn(p['dec']), damp=-.2, inh=.25, vol=.8, hitx=.45, rnd=.08, start=start, start_t=clamp(p['dropT'] * 1.2, .05, .9))
        res(d, 2, 4, st=oc / 100, decay=dn(p['dec'] * .8), damp=-.1, inh=.35, vol=.5, hitx=.55, rnd=.08, start=start, start_t=clamp(p['dropT'] * 1.2, .05, .9))
        why = 'Gong/Kessel (Plate) + zweite Platte um den Ombak verstimmt'
    suffix = 'Polos' if key in ('GDP', 'PMP', 'KNP', 'RYP') else 'Sangsih' if key in ('GDS', 'PMS', 'KNS', 'RYS') else 'Default'
    finish(d, f'MMM_{key}_{suffix}_Collision', f"{I['name']}: {why} (berechnet, nicht gehört)")

# ---------- drums: designed for C3 (Drum Rack) ----------
DRUMS = {   # f, f2, level, level2, dec, dec2, upMultiplier, click index, kind
  ('KDA', 'dang'): (105, 163, .9, .25, .55, .12, 1.9, 1.6, 'open'), ('KDA', 'dhe'): (105, 163, .8, .1, .12, .06, 1.6, 1.2, 'damped'),
  ('KDK', 'tung'): (230, 529, .9, .15, .22, .08, 1.3, 1.0, 'open'), ('KDK', 'tak'): (690, 552, .5, .3, .05, .04, 1.25, 4.0, 'slap'),
  ('KDC', 'dang'): (170, 264, .9, .25, .45, .12, 1.9, 1.6, 'open'), ('KDC', 'dhe'): (170, 264, .8, .1, .12, .06, 1.6, 1.2, 'damped'),
  ('KDC', 'tak'): (510, 408, .5, .3, .05, .04, 1.25, 4.0, 'slap'), ('KDC', 'tung'): (221, 508, .9, .15, .22, .08, 1.3, 1.0, 'open'),
  ('KDC', 'plak'): (340, 340, .5, .3, .08, .05, 1.6, 3.2, 'slap'),
  ('KBL', 'tak'): (570, 456, .5, .3, .05, .04, 1.25, 4.0, 'slap'), ('KBL', 'tut'): (418, 418, .7, .2, .07, .05, 1.1, 2.4, 'slap'),
  ('KBW', 'dag'): (125, 188, .95, .2, .2, .08, 1.7, 2.0, 'open'), ('KBW', 'pung'): (125, 188, .9, .15, .35, .12, 1.5, 1.2, 'open'),
}
for (key, stroke), (f, f2, lv, lv2, dec, dec2, up, click, kind) in DRUMS.items():
    d = base()
    damp = {'open': .15, 'damped': .55, 'slap': .4}[kind]; hit = {'open': .35, 'damped': .45, 'slap': .85}[kind]
    mallet(d, .6, clamp(.4 + click / 8, .4, .95), .6 if kind == 'slap' else .3, .8)
    st1 = 12 * math.log2(f / mtof(60)); st2 = 12 * math.log2(f2 / mtof(60))
    start = clamp(12 * math.log2(up) / 12 * 0.5, 0, 1)                                              # ASSUMPTION: +-1 = +-12 semitones, halved
    res(d, 1, 3, st=st1, decay=dn(dec), damp=damp, inh=.05, vol=.8, hitx=hit, rnd=.15, start=start, start_t=.15)
    res(d, 2, 3, st=st2, decay=dn(dec2), damp=damp, inh=.1, vol=clamp(.8 * lv2 / lv + .1, 0, 1), hitx=.6, rnd=.15)
    finish(d, f'MMM_{key}_{stroke}_Collision', f"{INSTR[key]['name']} Anschlag {stroke}: zwei Membranen (Membrane), für C3 gebaut (Drum Rack). Berechnet, nicht gehört.")
for stroke, dec, dec2 in (('ceng', .25, .2), ('cheng', .06, .05)):
    d = base(); mallet(d, .6, 1.0, .9, 1.0)
    res(d, 1, 4, st=12 * math.log2(800 / mtof(60)), decay=dn(dec), damp=-.4, inh=.6, vol=.8, hitx=.7, rnd=.2)
    res(d, 2, 4, st=12 * math.log2(1072 / mtof(60)), decay=dn(dec2), damp=-.4, inh=.7, vol=.5, hitx=.6, rnd=.2)
    finish(d, f'MMM_CNG_{stroke}_Collision', f'Ceng-ceng {stroke}: zwei hohe Platten (Plate), hartes Rausch-Mallet. Berechnet, nicht gehört.')

# ---------- melody: noise exciter with sustain keeps the resonator singing ----------
for key, typ, dec, damp, hit, why in (('SUL', 5, 3.0, .1, .5, 'Pipe, Atemrauschen mit Sustain'), ('RBB', 2, 4.0, .1, .3, 'String, Rauschen mit Sustain als Strich')):
    d = base(); mallet(d, .3, .3, .2, .5, on=False)
    setm(d, 'Noise/OnOff', True)
    for k, v in dict(Volume=.45, Freq=.6, Q=.3, Attack=.12, Decay=.3, Sustain=.75, Release=.25).items(): setm(d, 'Noise/' + k, v)
    res(d, 1, typ, decay=dn(dec), damp=damp, inh=.05, vol=.8, hitx=hit, rnd=.05)
    setm(d, 'Polyphony', 2)
    finish(d, f'MMM_{key}_{"Suling" if key == "SUL" else "Rebab"}_Collision', f"{INSTR[key]['name']}: {why}. Ohne Vibrato (von Hand per LFO). Berechnet, nicht gehört.")
print(len(written), 'presets written to', out)
