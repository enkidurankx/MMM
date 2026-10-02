#!/usr/bin/env python3
"""MMM Sound Library: inventory (one row per sound and device) for the Gamelan card plus the Japanese Operator set.

usage: python3 build_inventory.py <gamelan.html> <operator_dir> <collision_dir> <out.csv>
The Status column starts as 'berechnet' for everything generated here; the owner maintains it in the sheet.
"""
import csv, glob, json, os, subprocess, sys
html, opdir, coldir, out = sys.argv[1:5]
src = open(html, encoding='utf8').read()
a = src.index("const NOTE_NAMES"); b = src.index('// ---------- state ----------')
js = src[a:b] + "\nprocess.stdout.write(JSON.stringify({INSTR,STROKES,LANES}));"
d = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
INSTR = {i['k']: i for i in d['INSTR']}; STROKES = d['STROKES']
LANE = ['Colotomy', 'Balungan', 'Kotekan polos', 'Kotekan sangsih', 'Elaboration', 'Drums', 'Melody']
rows = [['Karte', 'Gruppe', 'Instrument', 'Kürzel', 'Variante', 'Gerät', 'Datei', 'Quelle', 'Status', 'Notiz']]
def add(folder, device):
    for f in sorted(glob.glob(os.path.join(folder, '*.adv'))):
        name = os.path.basename(f)[:-4]; p = name.split('_'); key = p[1]; var = p[2]
        I = INSTR[key]; dev = device
        if name.endswith('_Tension'): dev = 'Tension'
        elif name.endswith('_Operator'): dev = 'Operator'
        var = var if var != 'Default' else ''
        note = ''
        if I['lane'] == 5:
            note = 'Drum Rack, gebaut für C3; Pad-Note ' + str(I['note'] + STROKES.index(var)) if var in STROKES else ''
        elif I.get('fixed'): note = 'feste Note ' + str(I['note'])
        rows.append(['03 Gamelan', LANE[I['lane']], I['name'], key, var, dev, name + '.adv', 'gmln.4 v2.0', 'berechnet', note])
add(opdir, 'Operator'); add(coldir, 'Collision')
jp = [('Trommeln', 'O-Daiko', ''), ('Trommeln', 'Okedo-Daiko', ''), ('Trommeln', 'Shime-Daiko', ''), ('Trommeln', 'Taiko Ka', ''), ('Trommeln', 'Ko-Tsuzumi', ''),
      ('Trommeln', 'O-Tsuzumi', ''), ('Trommeln', 'Kakko', ''), ('Holz', 'Hyoshigi', ''), ('Holz', 'Mokugyo', ''), ('Holz', 'Yotsudake', ''),
      ('Metall', 'Atarigane', 'v3.2'), ('Metall', 'Bonsho', 'v3.2'), ('Metall', 'Chappa', 'v3.2'), ('Metall', 'Rin', 'v3.2'), ('Metall', 'Shoko', 'v3.2'), ('Metall', 'Kagura-Suzu', 'v3')]
for g, n, v in jp:
    rows.append(['00 Japan Operator-Set (Bestand)', g, n, '', v, 'Operator', n.replace(' ', '_') + '.adv', 'japanische_instrumente_operator.md', 'vorhanden', 'Dateien nicht von mir gesehen' + (', Version ' + v if v else '')])
for n in ['01 C shinsen', '02 Cs kamimu', '03 D ichikotsu', '04 Ds tangin', '05 E hyojo', '06 F shosetsu', '07 Fs shimomu', '08 G sojo', '09 Gs fusho', '10 A oshiki', '11 As rankei', '12 B banshiki']:
    rows.append(['00 Japan Operator-Set (Bestand)', 'Metall', 'Atarigane Jūni-ritsu', '', n.split(' ', 1)[1], 'Operator', n + '.adv', 'japanische_instrumente_operator.md', 'vorhanden', 'fester Ton und Cent-Versatz eingebaut'])
for n, t in [('D Hirajoshi', 'D E F A A#'), ('D In-Sen', 'D D# G A C'), ('D Iwato', 'D D# G G# C'), ('D Kumoi', 'D E F A B'), ('D Miyako-bushi', 'D D# G A A#'), ('D Yo', 'D E G A B')]:
    rows.append(['00 Japan Operator-Set (Bestand)', 'Tonleiter', n, '', '', 'Scale (MIDI-Effekt)', n + '.adv', 'japanische_instrumente_operator.md', 'vorhanden', 'Töne ab D: ' + t])
w = csv.writer(open(out, 'w', newline='', encoding='utf8')); w.writerows(rows)
print(len(rows) - 1, 'rows')
