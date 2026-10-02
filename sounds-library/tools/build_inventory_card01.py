#!/usr/bin/env python3
"""MMM Sound Library: adds Karte 01 (Drums + Tsuzumi, 02.10.2026 abgeglichen) to inventory.csv. Idempotent: removes old '01 ...' rows first.
usage: python3 build_inventory_card01.py inventory.csv
Koto/Shamisen (Sounds 02) sind absichtlich NICHT enthalten, siehe sounds-library/saiten-baustelle/README.md.
Die Dateien liegen im Paket MMM-Sounds-01.zip beim Owner (nicht im Repo); Status 'berechnet' = nichts in Live/am Gerät gehört.
"""
import csv, sys
P = sys.argv[1] if len(sys.argv) > 1 else 'inventory.csv'
rows = [r for r in csv.reader(open(P, encoding='utf8')) if not r or not r[0].startswith('01 ')]
K = '01 Drums + Tsuzumi'; SRC = 'cards.js (Karte 01)'
def add(gruppe, inst, kz, var, dev, datei, note=''): rows.append([K, gruppe, inst, kz, var, dev, datei, SRC, 'berechnet', note])
for v, f in [('Modern', 'MMM_KCK_Modern'), ('Tight', 'MMM_KCK_Tight'), ('Slide', 'MMM_KCK_Slide'), ('Rumble', 'MMM_KCK_Rumble_OperatorOnly')]:
    add('Kick', 'Kick (Glide + Rumble)', 'KCK', v, 'Operator', f + '.adv', 'Rumble: eigene Spur unter dem Kick' if v == 'Rumble' else '')
for v in ['pon', 'dry', 'wet', 'bend']:
    add('Trommeln', 'Ko-Tsuzumi', 'KOT', v, 'Operator', f'MMM_KOT_{v}.adv'); add('Trommeln', 'Ko-Tsuzumi', 'KOT', v, 'Collision', f'MMM_KOT_{v}_Collision.adv', 'String-Resonator')
for v in ['chon', 'kan']:
    add('Trommeln', 'Ō-Tsuzumi', 'OTS', v, 'Operator', f'MMM_OTS_{v}.adv'); add('Trommeln', 'Ō-Tsuzumi', 'OTS', v, 'Collision', f'MMM_OTS_{v}_Collision.adv', 'Membrane-Resonator')
for g, i, v, f, n in [('Snare', 'Snare', 'Modern', 'MMM_DS_Snare_Modern', ''), ('Hi-Hat', 'Hi-Hat', 'Closed', 'MMM_DS_HH_Closed', ''), ('Hi-Hat', 'Hi-Hat', 'Open', 'MMM_DS_HH_Open', ''),
                      ('Clap', 'Clap', 'Modern', 'MMM_DS_Clap_Modern', ''), ('Clap', 'Clap', 'Loose', 'MMM_DS_Clap_Loose', ''), ('Becken', 'Cymbal (DS-HH-Näherung)', 'CymbalLike', 'MMM_DS_HH_CymbalLike', 'DS HH ist eine Hi-Hat, Näherung')]:
    add(g, i, '', v, 'Drum Synth', f + '.adv', n or 'Parameter-Mapping DS unbekannt, Startwerte')
add('Becken', 'Cymbal (Platte)', '', 'Plate', 'Collision', 'MMM_Collision_Cymbal_Plate.adv')
add('Set', 'Live Set mit allen Operator-Spuren', '', '', 'Ableton Live', 'MMM-Sounds-01.als', 'Live 12.3.2, aus Played_12.als')
for f in ['KCK RUMBLE', 'KCK TIGHT', 'KCK TAIL', 'KOT PON', 'KOT PU', 'KOT TACHI', 'KOT P DRY', 'KOT P WET', 'KOT P BEND', 'OTS CHON', 'OTS KAN']:
    add('Voice', f.split()[0], f.split()[0], f.split(' ', 1)[1], 'M-VAVE FM-1', f.replace(' ', '_') + '.syx', 'VCED 163 Byte; Raten/Pitch-EG geschätzt')
for f in ['KCK', 'KCK_SLD', 'RUMBLE', 'KOT_PON', 'OTS_CHON']:
    add('Patch', f.split('_')[0], f.split('_')[0], f, 'Arturia MicroFreak', f'mf-MMM_{f}.json', 'Matrix-Beträge am Gerät von Hand')
add('Set', 'Parts 1-4 (Kick, Rumble, KOT, OTS)', '', '', 'Korg Volca Drum', 'MMM-Sounds-01-parts1-4.mid', 'CC-Setup + Hörprobe; Wert->Modell ungeprüft')
add('Hörprobe', 'Audition-Seite (Referenz-Renderer)', '', '', 'Browser', 'MMM-Sounds-01-audition.html', 'nicht im Hub')
csv.writer(open(P, 'w', newline='', encoding='utf8')).writerows(rows)
print(len(rows) - 1, 'rows')
