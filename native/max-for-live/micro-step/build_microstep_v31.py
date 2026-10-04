#!/usr/bin/env python3
"""micro.step v3 -> v3.1: adds MODE (TRIG = notes advance the step, RUN = Live's
transport clock advances it every 16th) and a dark-grey slider-area panel.
Patches the owner's original micro.step_v3.amxd; the original is not modified."""
import json, struct, copy, hashlib, os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'micro.step_v3.amxd')
OUT = os.path.join(HERE, 'micro.step_v3.1.amxd')

def load(path):
    b = open(path, 'rb').read()
    i = b.index(b'ptch'); n = struct.unpack('<I', b[i+4:i+8])[0]
    d, _ = json.JSONDecoder().raw_decode(b[i+8:i+8+n].decode('utf8'))
    return b[:i], d

def patch(d):
    P = d['patcher']; boxes = P['boxes']; lines = P['lines']
    by = {x['box']['id']: x['box'] for x in boxes}
    # --- dark grey slider area, drawn right after bg/strip (below beat panels) ---
    slbg = copy.deepcopy(by['bg']); slbg['id'] = 'slbg'
    slbg['patching_rect'] = [900, 140, 20, 10]
    slbg['presentation_rect'] = [6, 26, 388, 126]
    slbg['bgcolor'] = [0.20, 0.20, 0.215, 1.0]
    idx = [x['box']['id'] for x in boxes].index('beat1')
    boxes.insert(idx, {'box': slbg})
    for k in ('beat1', 'beat3'):                 # beat groups a little lighter on the grey
        by[k]['bgcolor'] = [0.255, 0.25, 0.275, 1.0]
    # --- MODE switch ---
    mt = copy.deepcopy(by['tab']); mt['id'] = 'modetab'
    mt['patching_rect'] = [240, 640, 124, 14]
    mt['presentation_rect'] = [424, 7, 124, 16]
    mt['fontsize'] = 8.0; mt['spacing_x'] = 2.0
    mt.pop('ignoreclick', None); mt['varname'] = 'Mode'
    v = mt['saved_attribute_attributes']['valueof']
    v.update(parameter_longname='Mode', parameter_shortname='Mode',
             parameter_enum=['TRIG', 'RUN'], parameter_mmax=1, parameter_initial=[1])
    v.pop('parameter_invisible', None)
    boxes.append({'box': mt})
    def obj(id, text, ins, outs, rect, types):
        boxes.append({'box': {'id': id, 'maxclass': 'newobj', 'text': text, 'numinlets': ins,
                              'numoutlets': outs, 'outlettype': types, 'patching_rect': rect}})
    obj('clk', 'metro 16n @quantize 16n', 2, 1, [300, 150, 150, 22], [''])
    obj('eq0', '== 0', 2, 1, [300, 180, 40, 22], ['int'])
    obj('ngate', 'gate 1', 2, 1, [170, 195, 50, 22], [''])
    def conn(s, so, t, ti):
        lines.append({'patchline': {'destination': [t, ti], 'source': [s, so]}})
    lines[:] = [l for l in lines if not (l['patchline']['source'][0] == 'sel1'
                                         and l['patchline']['destination'][0] == 'trans')]
    conn('sel1', 0, 'ngate', 1); conn('ngate', 0, 'trans', 0)
    conn('modetab', 0, 'eq0', 0); conn('eq0', 0, 'ngate', 0)
    conn('modetab', 0, 'clk', 0); conn('clk', 0, 'trans', 0)
    conn('ld', 0, 'modetab', 0)
    P['description'] = (P.get('description', '') + ' | v3.1: MODE TRIG (notes advance) / RUN (Live clock, 16th)').strip(' |')
    return d

def write(prefix, d, path):
    raw = (json.dumps(d, indent='\t', ensure_ascii=False) + '\n\x00').encode('utf8')
    open(path, 'wb').write(prefix + b'ptch' + struct.pack('<I', len(raw)) + raw)
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

if __name__ == '__main__':
    prefix, d = load(SRC)
    d = patch(d)
    print(OUT, write(prefix, d, OUT))
    txt = json.dumps(d['patcher'], indent='\t', ensure_ascii=False)
    open(os.path.join(HERE, 'micro.step_v3.1_paste-into-max.txt'), 'w').write(txt + '\n')
