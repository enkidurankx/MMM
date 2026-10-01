#!/usr/bin/env python3
"""MMM Sound Library, Card 03: Gamelan presets for Ableton Live.

Reads the instrument table and the FM profiles straight from gamelan-v2_0.html (gmln.4), so the presets
follow the app. Takes the owner's empty Operator.adv and Tension.adv as templates and only replaces
<Manual Value> entries. Nothing is written from scratch.

usage: python3 build_gamelan_adv.py <gamelan.html> <Operator.adv> <Tension.adv> <out_dir>
All parameter values are computed, not heard. See the README for the list of assumptions.
"""
import gzip, json, math, os, subprocess, sys, xml.etree.ElementTree as ET

html, op_path, ten_path, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)

# ---------- read instruments and profiles from the app ----------
src = open(html, encoding='utf8').read()
a = src.index("const NOTE_NAMES"); b = src.index('// ---------- state ----------')
js = src[a:b] + "\nprocess.stdout.write(JSON.stringify({INSTR,PROF,STROKES,LARAS}));"
data = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
INSTR = {i['k']: i for i in data['INSTR']}; PROF = data['PROF']; STROKES = data['STROKES']

# ---------- templates ----------
def load(path):
    return ET.fromstring(gzip.decompress(open(path, 'rb').read()))
OP_ROOT = load(op_path)
OP_T, TEN_T = OP_ROOT[0], load(ten_path)[0]

def clone(root):
    return ET.fromstring(ET.tostring(root))

def rng(el):
    r = el.find('MidiControllerRange')
    return (float(r.find('Min').get('Value')), float(r.find('Max').get('Value'))) if r is not None else None

def setm(dev, path, val):
    e = dev.find(path)
    if e is None: raise KeyError(path)
    m = e.find('Manual')
    tgt = m if m is not None else e
    if isinstance(val, bool): s = 'true' if val else 'false'
    elif isinstance(val, float): s = repr(round(val, 10))
    else: s = str(val)
    if not isinstance(val, bool):
        r = rng(e)
        if r and not (r[0] - 1e-9 <= float(val) <= r[1] + 1e-9):
            raise ValueError(f'{path}={val} outside {r}')
    tgt.set('Value', s)

ROOT_ATTR = dict(OP_ROOT.attrib)
written = []
def write_adv(root_dev, name):
    root = ET.Element('Ableton', ROOT_ATTR); root.append(root_dev)
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='unicode')
    ET.fromstring(xml)
    p = os.path.join(out, name + '.adv'); open(p, 'wb').write(gzip.compress(xml.encode('utf8'), 9)); written.append(name)

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def ratio_to_tune(x):                       # Operator ratio = Coarse + Fine/1000 (ASSUMPTION)
    c = int(math.floor(x)); f = int(round((x - c) * 1000))
    if f >= 1000: c, f = c + 1, 0
    if not 1 <= c <= 48: raise ValueError(f'ratio {x} out of range')
    return c, f
LOGMIN = 0.0003162277571
ATMIN = 0.1000000015
lin = lambda v: max(LOGMIN, min(1.0, v))
ms = lambda s: max(1.0, min(60000.0, s * 1000))

# ---------- Operator voice ----------
# Algorithm index 7 = UI "Algorithm 8": A carrier modulated by B, C carrier modulated by D (per EDMProd / MusicTech descriptions).
# pair: dict(ratio, ratioMod, index, indexEnd, indexT, att, dec, level, levelB, drop, dropT, beatRatio)
def op_preset(name, pair, transpose=0, volume=0.2, vel=50, notes=''):
    d = clone(OP_T)
    setm(d, 'Globals/Algorithm', 7)
    setm(d, 'Globals/Transpose', transpose)
    setm(d, 'Globals/Volume', min(1.99, volume))
    p = pair
    pairs = [(0, 1, p['ratio'], p['ratioMod'], 0.6), (2, 3, p['ratio'] * (1 + p['beatRatio']), p['ratioMod'] * (1 + p['beatRatio']), 0.4)]
    for car, mod, rc, rm, share in pairs:
        c, f = ratio_to_tune(rc)
        setm(d, f'Operator.{car}/IsOn', True); setm(d, f'Operator.{car}/Tune/Coarse', c); setm(d, f'Operator.{car}/Tune/Fine', f)
        setm(d, f'Operator.{car}/Volume', lin(share * p['level']))
        e = f'Operator.{car}/Envelope/'
        setm(d, e + 'AttackTime', max(ATMIN, p['att'] * 1000)); setm(d, e + 'AttackLevel', LOGMIN); setm(d, e + 'DecayLevel', 1.0)
        setm(d, e + 'DecayTime', ms(p['dec'])); setm(d, e + 'SustainLevel', p.get('sustain', LOGMIN))
        setm(d, e + 'ReleaseTime', ms(p['dec'] * p.get('rel', 0.7)))
        setm(d, f'Operator.{car}/VelScale', vel); setm(d, f'Operator.{car}/Feedback', p.get('fb', 0))
        c2, f2 = ratio_to_tune(rm)
        setm(d, f'Operator.{mod}/IsOn', True); setm(d, f'Operator.{mod}/Tune/Coarse', c2); setm(d, f'Operator.{mod}/Tune/Fine', f2)
        setm(d, f'Operator.{mod}/Volume', lin(p['index'] / 6.5))        # modulation depth: index / 6.5 is a GUESS
        e = f'Operator.{mod}/Envelope/'
        setm(d, e + 'AttackTime', ATMIN); setm(d, e + 'AttackLevel', 1.0); setm(d, e + 'DecayLevel', 1.0)
        setm(d, e + 'DecayTime', ms(p['indexT'])); setm(d, e + 'SustainLevel', lin(p['indexEnd'])); setm(d, e + 'ReleaseTime', 120.0)
        setm(d, f'Operator.{mod}/VelScale', vel)
    if p.get('drop'):
        setm(d, 'PitchEnv/PitchEnvOn', True)
        pe = 'PitchEnv/PitchEnv/'
        st = p['drop'] / 100.0
        setm(d, pe + 'AttackTime', ATMIN); setm(d, pe + 'AttackLevel', st); setm(d, pe + 'DecayLevel', st)
        setm(d, pe + 'DecayTime', ms(p['dropT'])); setm(d, pe + 'SustainLevel', 0.0)
    else:
        setm(d, 'PitchEnv/PitchEnvOn', False)
    d.find('UserName').set('Value', '')
    d.find('Annotation').set('Value', notes)
    write_adv(d, name)

def fm_pair(key, beat_scale=1.0):
    I = INSTR[key]; p = PROF[I['prof']]
    if I.get('fixed'):
        base = mtof(I['note']); rc = p['hz'] / base
    else:
        rc = 1.0; base = mtof(60 + 12 * I['reg'] + 7)            # typical note for the beat ratio: G in the instrument's register
    beat = p['beat'] * beat_scale
    br = beat / (p['hz'] if I.get('fixed') else base)
    return dict(ratio=rc, ratioMod=p['ratio'], index=p['index'], indexEnd=p['indexEnd'], indexT=p['indexT'], att=p['att'], dec=p['dec'],
                level=p['level'] / 0.30, drop=p['drop'], dropT=p['dropT'], beatRatio=min(0.99, br)), p

# pitched / fixed FM instruments
SKIP = {'KDA', 'KDK', 'KDC', 'KBL', 'KBW', 'CNG', 'SUL', 'RBB'}
for key, I in INSTR.items():
    if key in SKIP: continue
    variants = [('', 1.0)]
    if key in ('GDP', 'PMP', 'KNP', 'RYP'): variants = [('Polos', 1.0)]
    if key in ('GDS', 'PMS', 'KNS', 'RYS'): variants = [('Sangsih', 1.5)]      # ombak: the partner pair is tuned a little wider (ASSUMPTION)
    for v, bs in variants:
        pair, p = fm_pair(key, bs)
        nm = f"MMM_{key}_{v or 'Default'}"
        op_preset(nm, pair, volume=0.2 * p['level'] / 0.30,
                  notes=f"{I['name']} - FM from gmln.4 profile '{I['prof']}' (computed, not heard)")

# ---------- drums: designed for the note C3 (Drum Rack sends C3 to every chain) ----------
# voice: (freq Hz, level, decay s, start-pitch multiplier, pitch tau s); click = (mod ratio, index, decay s)
DRUMS = {
  ('KDA', 'dang'):  dict(f=105, lv=0.9, dec=0.55, up=1.9, tau=0.05, f2=1.55 * 105, lv2=0.25, dec2=0.12, click=(5.6, 1.6, 0.025)),
  ('KDA', 'dhe'):   dict(f=105, lv=0.8, dec=0.12, up=1.6, tau=0.03, f2=1.55 * 105, lv2=0.1, dec2=0.06, click=(5.6, 1.2, 0.02)),
  ('KDK', 'tung'):  dict(f=230, lv=0.9, dec=0.22, up=1.3, tau=0.03, f2=2.3 * 230, lv2=0.15, dec2=0.08, click=(7.3, 1.0, 0.015)),
  ('KDK', 'tak'):   dict(f=690, lv=0.5, dec=0.05, up=1.25, tau=0.02, f2=2.4 * 230, lv2=0.3, dec2=0.04, click=(7.3, 4.0, 0.04)),
  ('KDC', 'dang'):  dict(f=170, lv=0.9, dec=0.45, up=1.9, tau=0.05, f2=1.55 * 170, lv2=0.25, dec2=0.12, click=(5.6, 1.6, 0.025)),
  ('KDC', 'dhe'):   dict(f=170, lv=0.8, dec=0.12, up=1.6, tau=0.03, f2=1.55 * 170, lv2=0.1, dec2=0.06, click=(5.6, 1.2, 0.02)),
  ('KDC', 'tak'):   dict(f=510, lv=0.5, dec=0.05, up=1.25, tau=0.02, f2=2.4 * 170, lv2=0.3, dec2=0.04, click=(7.3, 4.0, 0.04)),
  ('KDC', 'tung'):  dict(f=221, lv=0.9, dec=0.22, up=1.3, tau=0.03, f2=2.3 * 221, lv2=0.15, dec2=0.08, click=(7.3, 1.0, 0.015)),
  ('KDC', 'plak'):  dict(f=340, lv=0.5, dec=0.08, up=1.6, tau=0.02, f2=2.0 * 170, lv2=0.3, dec2=0.05, click=(6.1, 3.2, 0.04)),
  ('KBL', 'tak'):   dict(f=570, lv=0.5, dec=0.05, up=1.25, tau=0.02, f2=2.4 * 190, lv2=0.3, dec2=0.04, click=(7.3, 4.0, 0.04)),
  ('KBL', 'tut'):   dict(f=418, lv=0.7, dec=0.07, up=1.1, tau=0.02, f2=2.2 * 190, lv2=0.2, dec2=0.05, click=(8.0, 2.4, 0.025)),
  ('KBW', 'dag'):   dict(f=125, lv=0.95, dec=0.2, up=1.7, tau=0.04, f2=1.5 * 125, lv2=0.2, dec2=0.08, click=(5.6, 2.0, 0.02)),
  ('KBW', 'pung'):  dict(f=125, lv=0.9, dec=0.35, up=1.5, tau=0.05, f2=1.5 * 125, lv2=0.15, dec2=0.12, click=(5.6, 1.2, 0.015)),
  ('CNG', 'ceng'):  dict(f=800, lv=0.7, dec=0.25, up=1.0, tau=0.01, f2=1.34 * 800, lv2=0.5, dec2=0.2, click=(2.76, 5.5, 0.12)),
  ('CNG', 'cheng'): dict(f=800, lv=0.8, dec=0.06, up=1.0, tau=0.01, f2=1.34 * 800, lv2=0.5, dec2=0.05, click=(2.76, 5.5, 0.04)),
}
for (key, stroke), s in DRUMS.items():
    I = INSTR[key]
    r0 = min(s['f'], s['f2']) / mtof(60)
    # choose a transpose in whole octaves so the carrier ratio lands between 1 and 2
    oct_shift = math.ceil(-math.log2(r0)); T = -12 * oct_shift
    rc = s['f'] / mtof(60) * 2 ** oct_shift
    c, f = ratio_to_tune(rc)
    d = clone(OP_T)
    setm(d, 'Globals/Algorithm', 7); setm(d, 'Globals/Transpose', T); setm(d, 'Globals/Volume', 0.2)
    mr, mi, mdec = s['click']
    r2 = s['f2'] / mtof(60) * 2 ** oct_shift
    c2, f2 = ratio_to_tune(r2)
    for car, mod, cc, ff, lv, dec, ratio_mod in [(0, 1, c, f, s['lv'], s['dec'], mr), (2, 3, c2, f2, s['lv2'], s['dec2'], mr * 0.7)]:
        setm(d, f'Operator.{car}/IsOn', True); setm(d, f'Operator.{car}/Tune/Coarse', cc); setm(d, f'Operator.{car}/Tune/Fine', ff)
        setm(d, f'Operator.{car}/Volume', lin(lv))
        e = f'Operator.{car}/Envelope/'
        setm(d, e + 'AttackTime', 0.3); setm(d, e + 'AttackLevel', LOGMIN); setm(d, e + 'DecayLevel', 1.0)
        setm(d, e + 'DecayTime', ms(dec)); setm(d, e + 'SustainLevel', LOGMIN); setm(d, e + 'ReleaseTime', ms(dec * 0.5))
        cm, fm_ = ratio_to_tune(ratio_mod * rc)
        setm(d, f'Operator.{mod}/IsOn', True); setm(d, f'Operator.{mod}/Tune/Coarse', cm); setm(d, f'Operator.{mod}/Tune/Fine', fm_)
        setm(d, f'Operator.{mod}/Volume', lin(mi / 6.5))
        e = f'Operator.{mod}/Envelope/'
        setm(d, e + 'AttackTime', ATMIN); setm(d, e + 'AttackLevel', 1.0); setm(d, e + 'DecayLevel', 1.0)
        setm(d, e + 'DecayTime', ms(mdec)); setm(d, e + 'SustainLevel', LOGMIN); setm(d, e + 'ReleaseTime', 50.0)
    st = 12 * math.log2(s['up']) if s['up'] > 1 else 0
    if st:
        setm(d, 'PitchEnv/PitchEnvOn', True); pe = 'PitchEnv/PitchEnv/'
        setm(d, pe + 'AttackTime', ATMIN); setm(d, pe + 'AttackLevel', st); setm(d, pe + 'DecayLevel', st)
        setm(d, pe + 'DecayTime', ms(s['tau'])); setm(d, pe + 'SustainLevel', 0.0)
    else:
        setm(d, 'PitchEnv/PitchEnvOn', False)
    d.find('Annotation').set('Value', f"{I['name']} stroke {stroke}: designed for C3 (Drum Rack). FM approximation of the gmln.4 drum voice; no noise source, so slaps are FM bursts.")
    write_adv(d, f'MMM_{key}_{stroke}')

# ---------- melody ----------
def melody(name, ratio_mod, index, att, dec, rel, fb, lvl2, notes):
    pair = dict(ratio=1.0, ratioMod=ratio_mod, index=index, indexEnd=0.6, indexT=0.4, att=att, dec=dec, level=1.0, drop=0, dropT=0, beatRatio=0.003, sustain=0.8, rel=rel, fb=fb)
    op_preset(name, pair, volume=0.2, vel=40, notes=notes)
melody('MMM_SUL_Suling', 2, 0.3, 0.09, 4.0, 0.04, 0, 0, 'Suling: sine + weak 2nd harmonic, slow attack. No breath noise, no vibrato (set the Operator LFO by hand).')
melody('MMM_RBB_Rebab_Operator', 3, 1.6, 0.06, 4.0, 0.04, 35, 0, 'Rebab (Operator approximation): feedback-driven bowed tone. See MMM_RBB_Rebab_Tension for the string model.')

# ---------- Tension: rebab (bowed) ----------
t = clone(TEN_T)
setm(t, 'ExcitatorToggle', True)
setm(t, 'ExcitatorType', 0)                       # 0 = Bow (ASSUMPTION from the handover)
for k, v in dict(ExcitatorParameterX=0.40, ExcitatorStiffness=0.35, ExcitatorVelocity=0.5, ExcitatorDamping=0.5,
                 StringDecay=0.85, StringDamping=0.40, StringDecayRatio=0.5, StringInharmonicity=0.2,
                 VibratoAmount=0.30, VibratoSpeed=0.55, FilterCutoffFrequency=0.8).items():
    setm(t, k, v)
setm(t, 'VibratoToggle', True)
t.find('Annotation').set('Value', 'Rebab: bowed string (Tension). Values are starting points, not heard.')
write_adv(t, 'MMM_RBB_Rebab_Tension')

print(len(written), 'presets written to', out)
