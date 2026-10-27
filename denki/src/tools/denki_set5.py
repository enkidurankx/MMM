#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# DENKI set 5: twenty-one soft electronic FM6 voices after the language of Japanese and other Asian instruments,
# DENKI's own (MMM, 2026). Same helpers as set 2. Soft means: low modulation indices, sine-led tones, chorus from
# detuned pairs, gamelan ombak (paired beating), slow sweeps, gentle pitch scoops and slides. No factory ROM data.
#   python3 denki/src/tools/denki_set5.py > set5.json
import json, sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from denki_set2 import op, voice, pack

SET5 = [
    # ---- 0 soft plucks
    ("古箏", "Guzheng Glow", 0, voice("GuzhengGlw", 5, [
        op(r=(99, 36, 22, 40), l=(99, 80, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 50, 30, 45), l=(99, 50, 0, 0), ol=72, fc=1, kvs=3, rs=2),
        op(r=(99, 34, 21, 40), l=(99, 82, 0, 0), ol=94, fc=1, det=10, kvs=2, rs=2),
        op(r=(99, 55, 30, 45), l=(99, 45, 0, 0), ol=66, fc=2, kvs=3, rs=2),
        op(r=(99, 38, 22, 40), l=(99, 78, 0, 0), ol=80, fc=2, det=4, kvs=2, rs=2),
        op(r=(99, 60, 32, 45), l=(99, 35, 0, 0), ol=58, fc=3, kvs=3, rs=2),
    ], fb=1, lfs=30, lamd=5)),
    ("伽倻琴", "Gayageum Haze", 0, voice("GayageumHz", 5, [
        op(r=(99, 34, 20, 38), l=(99, 82, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 55, 32, 45), l=(99, 45, 0, 0), ol=74, fc=2, kvs=3, rs=2),
        op(r=(99, 32, 20, 38), l=(99, 84, 0, 0), ol=92, fc=1, det=9, kvs=2, rs=2),
        op(r=(99, 50, 30, 45), l=(99, 50, 0, 0), ol=68, fc=1, kvs=3, rs=2),
        op(r=(99, 36, 21, 38), l=(99, 80, 0, 0), ol=78, fc=0, det=5, kvs=2, rs=2),
        op(r=(99, 58, 32, 45), l=(99, 35, 0, 0), ol=60, fc=1, kvs=3, rs=2),
    ], fb=2, trnsp=12, pr=(45, 99, 99, 99), pl=(50, 50, 50, 54), lfs=26, lfd=50, lpmd=4, lpms=3)),
    ("揚琴", "Yangqin Soft", 0, voice("YangqinSft", 5, [
        op(r=(99, 40, 25, 45), l=(99, 75, 0, 0), ol=99, kvs=3, rs=3),
        op(r=(99, 65, 40, 50), l=(99, 35, 0, 0), ol=76, fc=3, kvs=4, rs=3),
        op(r=(99, 39, 25, 45), l=(99, 76, 0, 0), ol=94, fc=1, det=11, kvs=3, rs=3),
        op(r=(99, 62, 40, 50), l=(99, 35, 0, 0), ol=72, fc=1, kvs=4, rs=3),
        op(r=(99, 41, 25, 45), l=(99, 74, 0, 0), ol=88, fc=1, det=3, kvs=3, rs=3),
        op(r=(99, 70, 42, 50), l=(99, 25, 0, 0), ol=62, fc=4, kvs=4, rs=3),
    ], fb=0, trnsp=24)),
    ("口琴", "Mukkuri", 0, voice("Mukkuri", 5, [
        op(r=(99, 30, 25, 45), l=(99, 85, 30, 0), ol=99, kvs=2),
        op(r=(99, 35, 30, 50), l=(99, 70, 40, 0), ol=84, fc=5, kvs=2, ams=3),
        op(r=(99, 30, 25, 45), l=(99, 85, 30, 0), ol=88, fc=1, det=9, kvs=2),
        op(r=(99, 35, 30, 50), l=(99, 70, 40, 0), ol=80, fc=7, kvs=2, ams=3),
        op(r=(99, 30, 25, 45), l=(99, 85, 30, 0), ol=82, fc=0, kvs=2),
        op(r=(99, 40, 30, 50), l=(99, 60, 30, 0), ol=70, fc=1, kvs=2),
    ], fb=3, trnsp=12, lfs=34, lamd=55, lfw=0, lks=0)),
    ("電シタール", "Soft Sitar", 0, voice("Soft Sitar", 5, [
        op(r=(99, 30, 20, 40), l=(99, 82, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 32, 22, 45), l=(99, 70, 0, 0), ol=76, fc=9, kvs=2, rs=2),
        op(r=(99, 30, 20, 40), l=(99, 82, 0, 0), ol=90, fc=1, det=10, kvs=2, rs=2),
        op(r=(99, 34, 22, 45), l=(99, 65, 0, 0), ol=72, fc=13, kvs=2, rs=2),
        op(r=(99, 32, 20, 40), l=(99, 80, 0, 0), ol=80, fc=0, det=5, kvs=2, rs=2),
        op(r=(99, 50, 30, 45), l=(99, 50, 0, 0), ol=64, fc=1, kvs=3, rs=2),
    ], fb=4, pr=(50, 99, 99, 99), pl=(50, 50, 50, 47), lfs=22, lfd=60, lpmd=5, lpms=3)),
    ("月琴", "Moon Harp", 0, voice("Moon Harp", 5, [
        op(r=(99, 28, 18, 32), l=(99, 82, 0, 0), ol=98, kvs=2, rs=1),
        op(r=(99, 45, 25, 40), l=(99, 45, 0, 0), ol=62, fc=1, kvs=3, rs=1),
        op(r=(99, 27, 18, 32), l=(99, 84, 0, 0), ol=94, fc=2, det=10, kvs=2, rs=1),
        op(r=(99, 45, 25, 40), l=(99, 40, 0, 0), ol=56, fc=2, kvs=3, rs=1),
        op(r=(99, 29, 18, 32), l=(99, 80, 0, 0), ol=86, fc=1, det=4, kvs=2, rs=1),
        op(r=(99, 50, 28, 40), l=(99, 35, 0, 0), ol=54, fc=3, kvs=3, rs=1),
    ], fb=0, trnsp=24, lfs=18, lamd=14, lfw=4)),
    # ---- 1 gamelan and stone
    ("ガムラン", "Gamelan Ombak", 1, voice("GamelanOmb", 5, [
        op(r=(99, 32, 24, 40), l=(99, 75, 0, 0), ol=99, kvs=3, rs=2),
        op(r=(99, 45, 30, 45), l=(99, 45, 0, 0), ol=76, fc=2, ff=76, kvs=3, rs=2),
        op(r=(99, 32, 24, 40), l=(99, 75, 0, 0), ol=98, fc=1, det=11, kvs=3, rs=2),
        op(r=(99, 45, 30, 45), l=(99, 45, 0, 0), ol=76, fc=2, ff=76, det=11, kvs=3, rs=2),
        op(r=(99, 36, 26, 40), l=(99, 65, 0, 0), ol=78, fc=4, ff=10, det=3, kvs=3, rs=2),
        op(r=(99, 55, 32, 45), l=(99, 30, 0, 0), ol=60, fc=1, kvs=3, rs=2),
    ], fb=0, trnsp=24)),
    ("ボナン", "Bonang", 1, voice("Bonang", 5, [
        op(r=(99, 38, 28, 45), l=(99, 65, 0, 0), ol=99, kvs=3, rs=2),
        op(r=(99, 55, 35, 50), l=(99, 40, 0, 0), ol=74, fc=1, ff=50, kvs=3, rs=2),
        op(r=(99, 36, 27, 45), l=(99, 68, 0, 0), ol=92, fc=2, ff=40, det=10, kvs=3, rs=2),
        op(r=(99, 55, 35, 50), l=(99, 35, 0, 0), ol=66, fc=1, kvs=3, rs=2),
        op(r=(99, 40, 28, 45), l=(99, 62, 0, 0), ol=80, fc=3, ff=20, det=4, kvs=3, rs=2),
        op(r=(99, 60, 38, 50), l=(99, 25, 0, 0), ol=56, fc=5, kvs=3, rs=2),
    ], fb=1, trnsp=12)),
    ("アンクルン", "Angklung", 1, voice("Angklung", 5, [
        op(r=(95, 50, 30, 50), l=(99, 80, 0, 0), ol=99, kvs=2, ams=3),
        op(r=(95, 60, 35, 55), l=(99, 50, 0, 0), ol=74, fc=3, kvs=3),
        op(r=(95, 50, 30, 50), l=(99, 80, 0, 0), ol=92, fc=2, det=10, kvs=2, ams=3),
        op(r=(95, 60, 35, 55), l=(99, 45, 0, 0), ol=66, fc=1, kvs=3),
        op(r=(95, 50, 30, 50), l=(99, 80, 0, 0), ol=76, fc=1, det=4, kvs=2, ams=3),
        op(r=(95, 65, 38, 55), l=(99, 35, 0, 0), ol=58, fc=5, kvs=3),
    ], fb=0, trnsp=24, lfs=74, lamd=60, lfw=4, lks=0)),
    ("磬", "Stone Qing", 1, voice("Stone Qing", 5, [
        op(r=(99, 34, 25, 40), l=(99, 70, 0, 0), ol=99, kvs=3, rs=2),
        op(r=(99, 60, 38, 50), l=(99, 30, 0, 0), ol=72, fc=2, ff=40, kvs=4, rs=2),
        op(r=(99, 33, 24, 40), l=(99, 72, 0, 0), ol=90, fc=3, ff=10, kvs=3, rs=2),
        op(r=(99, 60, 38, 50), l=(99, 30, 0, 0), ol=60, fc=1, kvs=4, rs=2),
        op(r=(99, 36, 26, 40), l=(99, 66, 0, 0), ol=80, fc=5, ff=30, det=10, kvs=3, rs=2),
        op(r=(99, 70, 42, 50), l=(99, 20, 0, 0), ol=54, fc=7, kvs=4, rs=2),
    ], fb=0, trnsp=12)),
    # ---- 2 breath and reed
    ("笛子", "Dizi Breath", 2, voice("DiziBreath", 1, [
        op(r=(72, 40, 30, 55), l=(99, 92, 90, 0), ol=99, kvs=2),
        op(r=(72, 40, 30, 55), l=(99, 70, 65, 0), ol=60, fc=1, kvs=2),
        op(r=(72, 40, 30, 55), l=(99, 80, 75, 0), ol=70, fc=2, kvs=2),
        op(r=(72, 40, 30, 55), l=(99, 60, 55, 0), ol=56, fc=1, det=10, kvs=2),
        op(r=(72, 40, 30, 55), l=(99, 50, 45, 0), ol=60, fc=21, kvs=2),
        op(r=(72, 40, 30, 55), l=(99, 70, 65, 0), ol=78, fc=27, kvs=2),
    ], fb=7, trnsp=36, lfs=34, lfd=40, lpmd=6, lpms=3)),
    ("ケーン", "Khene", 2, voice("Khene", 32, [
        op(r=(70, 45, 35, 55), l=(99, 92, 90, 0), ol=94),
        op(r=(70, 45, 35, 55), l=(99, 90, 88, 0), ol=78, fc=2, det=9),
        op(r=(70, 45, 35, 55), l=(99, 90, 88, 0), ol=72, fc=3, det=5),
        op(r=(70, 45, 35, 55), l=(99, 85, 82, 0), ol=62, fc=4, det=10),
        op(r=(70, 45, 35, 55), l=(99, 92, 90, 0), ol=84, fc=0, det=4),
        op(r=(70, 45, 35, 55), l=(99, 85, 82, 0), ol=66, fc=1, ff=50, det=8),
    ], fb=2, lfs=42, lamd=10, lfw=4, lpms=0)),
    ("大笒", "Daegeum Air", 2, voice("DaegeumAir", 1, [
        op(r=(55, 35, 28, 45), l=(99, 94, 92, 0), ol=99, kvs=1),
        op(r=(55, 35, 28, 45), l=(99, 70, 65, 0), ol=62, fc=1, kvs=1),
        op(r=(55, 35, 28, 45), l=(99, 80, 75, 0), ol=70, fc=1, det=10, kvs=1),
        op(r=(55, 35, 28, 45), l=(99, 60, 55, 0), ol=50, fc=3, kvs=1),
        op(r=(55, 35, 28, 45), l=(99, 55, 50, 0), ol=58, fc=17, kvs=1),
        op(r=(55, 35, 28, 45), l=(99, 70, 65, 0), ol=80, fc=23, kvs=1),
    ], fb=7, trnsp=24, lfs=20, lfd=55, lpmd=10, lpms=4, pr=(50, 99, 99, 99), pl=(50, 50, 50, 46))),
    ("二胡", "Erhu Synth", 2, voice("Erhu Synth", 5, [
        op(r=(60, 40, 30, 50), l=(99, 92, 90, 0), ol=99, kvs=2),
        op(r=(55, 40, 30, 50), l=(99, 80, 75, 0), ol=78, fc=1, kvs=2),
        op(r=(60, 40, 30, 50), l=(99, 90, 88, 0), ol=86, fc=1, det=10, kvs=2),
        op(r=(55, 40, 30, 50), l=(99, 75, 70, 0), ol=72, fc=2, kvs=2),
        op(r=(60, 40, 30, 50), l=(99, 88, 85, 0), ol=78, fc=2, det=4, kvs=2),
        op(r=(55, 40, 30, 50), l=(99, 70, 65, 0), ol=66, fc=1, kvs=2),
    ], fb=4, lfs=36, lfd=45, lpmd=8, lpms=4, pr=(45, 99, 99, 99), pl=(50, 50, 50, 45))),
    # ---- 3 soft pads and keys
    ("桜", "Sakura Pad", 3, voice("SakuraPad", 5, [
        op(r=(32, 25, 20, 28), l=(99, 92, 90, 0), ol=96),
        op(r=(22, 22, 20, 28), l=(99, 70, 72, 0), ol=68, fc=2),
        op(r=(30, 25, 20, 28), l=(99, 92, 90, 0), ol=94, fc=1, det=12),
        op(r=(20, 22, 20, 28), l=(99, 70, 72, 0), ol=64, fc=1, det=2),
        op(r=(34, 25, 20, 28), l=(99, 90, 88, 0), ol=86, fc=2, det=5),
        op(r=(18, 20, 20, 28), l=(99, 65, 68, 0), ol=58, fc=3),
    ], fb=1, trnsp=24, lfs=14, lfd=0, lpmd=3, lamd=8, lpms=2)),
    ("雅", "Gagaku Air", 3, voice("Gagaku Air", 32, [
        op(r=(30, 25, 22, 28), l=(99, 92, 90, 0), ol=90),
        op(r=(30, 25, 22, 28), l=(99, 92, 90, 0), ol=84, fc=1, ff=50, det=10),
        op(r=(30, 25, 22, 28), l=(99, 92, 90, 0), ol=82, fc=2, det=4),
        op(r=(30, 25, 22, 28), l=(99, 92, 90, 0), ol=76, fc=2, ff=25, det=11),
        op(r=(30, 25, 22, 28), l=(99, 92, 90, 0), ol=78, fc=3, det=3),
        op(r=(30, 25, 22, 28), l=(99, 92, 90, 0), ol=70, fc=4, ff=50, det=9),
    ], fb=0, trnsp=24, lfs=10, lamd=12, lfw=4)),
    ("夕", "Dusk Keys", 3, voice("Dusk Keys", 5, [
        op(r=(99, 32, 22, 50), l=(99, 75, 0, 0), ol=99, kvs=3, rs=2),
        op(r=(99, 50, 30, 55), l=(99, 40, 0, 0), ol=72, fc=1, kvs=4, rs=2),
        op(r=(99, 31, 22, 50), l=(99, 76, 0, 0), ol=94, fc=1, det=11, kvs=3, rs=2),
        op(r=(99, 70, 45, 60), l=(99, 15, 0, 0), ol=62, fc=14, kvs=5, rs=3),
        op(r=(99, 33, 22, 50), l=(99, 74, 0, 0), ol=80, fc=1, det=3, kvs=3, rs=2),
        op(r=(99, 55, 32, 55), l=(99, 35, 0, 0), ol=60, fc=1, kvs=4, rs=2),
    ], fb=1, lfs=40, lamd=14, lfw=4)),
    ("墨", "Ink Bass", 3, voice("Ink Bass", 5, [
        op(r=(99, 45, 30, 55), l=(99, 92, 85, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 60, 40, 55), l=(99, 60, 40, 0), ol=72, fc=1, kvs=3, rs=2),
        op(r=(99, 45, 30, 55), l=(99, 92, 85, 0), ol=94, fc=0, kvs=2, rs=2),
        op(r=(99, 60, 40, 55), l=(99, 55, 35, 0), ol=60, fc=1, kvs=3, rs=2),
        op(r=(99, 45, 30, 55), l=(99, 90, 82, 0), ol=80, fc=1, det=9, kvs=2, rs=2),
        op(r=(99, 70, 45, 55), l=(99, 40, 20, 0), ol=50, fc=2, kvs=3, rs=2),
    ], fb=2, trnsp=12)),
    # ---- 4 soft drums
    ("タブラ", "Tabla Bend", 4, voice("Tabla Bend", 5, [
        op(r=(99, 50, 38, 55), l=(99, 30, 0, 0), ol=99, kvs=4, rs=2),
        op(r=(99, 75, 55, 60), l=(99, 0, 0, 0), ol=74, fc=1, kvs=4, rs=2),
        op(r=(99, 55, 40, 55), l=(99, 20, 0, 0), ol=90, fc=2, ff=40, kvs=4, rs=2),
        op(r=(99, 80, 60, 60), l=(99, 0, 0, 0), ol=70, fc=3, kvs=4, rs=2),
        op(r=(99, 48, 38, 55), l=(99, 30, 0, 0), ol=84, fc=0, kvs=4, rs=2),
        op(r=(99, 90, 70, 65), l=(99, 0, 0, 0), ol=72, fc=7, kvs=4, rs=2),
    ], fb=3, trnsp=12, pr=(38, 99, 99, 99), pl=(50, 50, 50, 41))),
    ("竹", "Bamboo Pop", 4, voice("Bamboo Pop", 5, [
        op(r=(99, 62, 48, 60), l=(99, 10, 0, 0), ol=99, kvs=4, rs=4),
        op(r=(99, 85, 65, 65), l=(99, 0, 0, 0), ol=72, fc=3, kvs=4, rs=4),
        op(r=(99, 60, 46, 60), l=(99, 10, 0, 0), ol=94, fc=2, ff=50, kvs=4, rs=4),
        op(r=(99, 88, 65, 65), l=(99, 0, 0, 0), ol=64, fc=1, kvs=4, rs=4),
        op(r=(99, 64, 48, 60), l=(99, 10, 0, 0), ol=82, fc=4, ff=20, kvs=4, rs=4),
        op(r=(99, 95, 70, 65), l=(99, 0, 0, 0), ol=60, fc=1, kvs=4, rs=4),
    ], fb=0, trnsp=24, pr=(99, 90, 99, 99), pl=(56, 50, 50, 50))),
    ("鼓動", "Heartbeat", 4, voice("Heartbeat", 5, [
        op(r=(99, 55, 42, 55), l=(99, 0, 0, 0), ol=99, kvs=4, rs=1),
        op(r=(99, 80, 60, 60), l=(99, 0, 0, 0), ol=60, fc=1, kvs=4, rs=1),
        op(r=(99, 52, 40, 55), l=(99, 0, 0, 0), ol=94, fc=0, kvs=4, rs=1),
        op(r=(99, 85, 60, 60), l=(99, 0, 0, 0), ol=56, fc=1, kvs=4, rs=1),
        op(r=(99, 58, 42, 55), l=(99, 0, 0, 0), ol=80, fc=1, det=10, kvs=4, rs=1),
        op(r=(99, 90, 70, 60), l=(99, 0, 0, 0), ol=50, fc=2, kvs=4, rs=1),
    ], fb=0, pr=(99, 70, 99, 99), pl=(64, 50, 50, 50))),
]

if __name__ == "__main__":
    json.dump([[ja, en, fam, pack(v)] for ja, en, fam, v in SET5], sys.stdout, ensure_ascii=False)
