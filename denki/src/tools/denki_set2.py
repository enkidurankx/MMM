#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# DENKI set 2: twenty-one more FM6 voices for FuMi-1's engine, DENKI's own (MMM, 2026). Written as readable operator
# settings with the voice() / op() / pack() helpers of FuMi-1's tools/fumi_patches.py (after Felucca's
# tools/gen_fm6_patches.py, (C) 2026 Leo Kuroshita, Hügelton Instruments). No factory ROM data.
#   python3 denki/src/tools/denki_set2.py > set2.json   (the page embeds the packed records)
# Operators OP1..OP6; ratios fc (0 = 0.5), rates and levels 0..99, kvs velocity 0..7, rs rate scaling 0..7.
import json, sys


def op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=0, fc=1, ff=0, det=7, mode=0, kvs=0, ams=0, rs=0,
       bp=39, ld=0, rd=0, lc=0, rc=0):
    return dict(r=r, l=l, ol=ol, fc=fc, ff=ff, det=det, mode=mode, kvs=kvs, ams=ams, rs=rs, bp=bp, ld=ld, rd=rd,
                lc=lc, rc=rc)


def voice(name, alg, ops, fb=0, oks=1, pr=(99, 99, 99, 99), pl=(50, 50, 50, 50), lfs=35, lfd=0, lpmd=0, lamd=0,
          lks=1, lfw=0, lpms=3, trnsp=24):
    assert len(ops) == 6 and 1 <= alg <= 32 and len(name) <= 10
    v = []
    for o in reversed(ops):
        v += list(o["r"]) + list(o["l"]) + [o["bp"], o["ld"], o["rd"], o["lc"], o["rc"], o["rs"], o["ams"],
                                            o["kvs"], o["ol"], o["mode"], o["fc"], o["ff"], o["det"]]
    v += list(pr) + list(pl) + [alg - 1, fb, oks, lfs, lfd, lpmd, lamd, lks, lfw, lpms, trnsp]
    v += [ord(c) for c in name.ljust(10)]
    assert len(v) == 155
    return v


def pack(v):
    b = []
    for k in range(6):
        o = v[k * 21:k * 21 + 21]
        b += o[0:11]
        b += [(o[11] & 3) | (o[12] & 3) << 2, (o[13] & 7) | (o[20] & 15) << 3, (o[14] & 3) | (o[15] & 7) << 2,
              o[16], (o[17] & 1) | (o[18] & 31) << 1, o[19]]
    b += v[126:135]
    b += [(v[135] & 7) | (v[136] & 1) << 3]
    b += v[137:141]
    b += [(v[141] & 1) | (v[142] & 7) << 1 | (v[143] & 7) << 4, v[144]]
    b += v[145:155]
    assert len(b) == 128 and all(0 <= x < 128 for x in b)
    return b


OFF = op(ol=0)
# (Japanese name, latin name, family 0 plucked / 1 bells / 2 winds / 3 sustained / 4 percussion, voice)
SET2 = [
    # ---- 0 plucked: buzz (sawari) from a high-ratio modulator with feedback, fast-falling index
    ("三味線", "Shamisen", 0, voice("Shamisen", 5, [
        op(r=(99, 50, 28, 50), l=(99, 78, 0, 0), ol=99, kvs=3, rs=3),
        op(r=(99, 78, 40, 60), l=(99, 55, 0, 0), ol=88, fc=3, kvs=4, rs=4),
        op(r=(99, 55, 25, 50), l=(99, 80, 0, 0), ol=92, kvs=3, rs=3),
        op(r=(99, 90, 50, 60), l=(99, 40, 0, 0), ol=80, fc=1, kvs=3, rs=3),
        op(r=(99, 85, 40, 55), l=(99, 50, 0, 0), ol=76, fc=1, det=9, kvs=2, rs=3),
        op(r=(99, 95, 60, 60), l=(99, 30, 0, 0), ol=70, fc=5, kvs=3, rs=4),
    ], fb=6)),
    ("琵琶", "Biwa", 0, voice("Biwa", 5, [
        op(r=(97, 48, 22, 45), l=(99, 82, 0, 0), ol=99, kvs=3, rs=2),
        op(r=(99, 70, 35, 50), l=(99, 50, 0, 0), ol=84, fc=2, kvs=3, rs=3),
        op(r=(97, 40, 20, 45), l=(99, 85, 0, 0), ol=94, kvs=3, rs=2),
        op(r=(99, 80, 45, 55), l=(99, 45, 0, 0), ol=78, fc=1, kvs=2, rs=3),
        op(r=(97, 60, 30, 50), l=(99, 70, 0, 0), ol=80, fc=0, det=6, kvs=2, rs=2),
        op(r=(99, 85, 45, 55), l=(99, 40, 0, 0), ol=74, fc=7, kvs=3, rs=3),
    ], fb=7, trnsp=12)),
    ("月琴", "Gekkin", 0, voice("Gekkin", 5, [
        op(r=(99, 55, 32, 55), l=(99, 75, 0, 0), ol=99, kvs=3, rs=4),
        op(r=(99, 88, 50, 60), l=(99, 40, 0, 0), ol=80, fc=4, kvs=4, rs=5),
        op(r=(99, 52, 30, 55), l=(99, 78, 0, 0), ol=97, fc=2, kvs=3, rs=4),
        op(r=(99, 85, 50, 60), l=(99, 40, 0, 0), ol=72, fc=2, kvs=3, rs=4),
        op(r=(99, 75, 40, 55), l=(99, 60, 0, 0), ol=78, fc=1, det=10, kvs=2, rs=4),
        op(r=(99, 90, 55, 60), l=(99, 30, 0, 0), ol=66, fc=3, kvs=3, rs=4),
    ], fb=4)),
    ("硝子箏", "Glass Koto", 0, voice("Glass Koto", 5, [
        op(r=(99, 40, 22, 40), l=(99, 85, 0, 0), ol=96, kvs=2, rs=2),
        op(r=(99, 60, 30, 50), l=(99, 50, 0, 0), ol=74, fc=7, kvs=3, rs=3),
        op(r=(99, 35, 20, 40), l=(99, 88, 0, 0), ol=94, fc=1, kvs=2, rs=2),
        op(r=(99, 50, 28, 45), l=(99, 60, 0, 0), ol=70, fc=3, ff=50, kvs=3, rs=3),
        op(r=(99, 45, 25, 40), l=(99, 80, 0, 0), ol=84, fc=2, det=11, kvs=2, rs=2),
        op(r=(99, 70, 35, 50), l=(99, 30, 0, 0), ol=60, fc=9, kvs=3, rs=3),
    ], fb=2)),
    ("雨粒", "Rain", 0, voice("Rain", 5, [
        op(r=(99, 66, 45, 70), l=(99, 20, 0, 0), ol=99, kvs=4, rs=5),
        op(r=(99, 95, 70, 70), l=(99, 0, 0, 0), ol=82, fc=5, kvs=5, rs=6),
        op(r=(99, 62, 42, 65), l=(99, 40, 0, 0), ol=97, fc=2, kvs=4, rs=5),
        op(r=(99, 90, 65, 70), l=(99, 0, 0, 0), ol=70, fc=7, kvs=4, rs=6),
        op(r=(99, 70, 50, 65), l=(99, 40, 0, 0), ol=80, fc=4, det=12, kvs=3, rs=5),
        op(r=(99, 99, 70, 70), l=(99, 0, 0, 0), ol=60, fc=11, kvs=4, rs=6),
    ], fb=3, trnsp=36)),
    ("電箏", "Neon Koto", 0, voice("Neon Koto", 2, [
        op(r=(99, 55, 28, 45), l=(99, 80, 0, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 70, 40, 55), l=(99, 70, 30, 0), ol=90, fc=2, kvs=3, rs=3),
        op(r=(99, 50, 25, 45), l=(99, 82, 0, 0), ol=92, kvs=2, rs=3),
        op(r=(99, 65, 35, 50), l=(99, 75, 20, 0), ol=88, fc=1, det=9, kvs=3, rs=3),
        op(r=(99, 60, 30, 50), l=(99, 70, 0, 0), ol=82, fc=3, det=5, kvs=3, rs=3),
        op(r=(99, 75, 45, 55), l=(99, 50, 0, 0), ol=80, fc=1, det=10, kvs=3, rs=3),
    ], fb=6)),
    # ---- 1 bells: inharmonic ratios, long decays
    ("梵鐘", "Temple Bell", 1, voice("TempleBell", 5, [
        op(r=(99, 25, 18, 30), l=(99, 80, 0, 0), ol=99, kvs=2, rs=1),
        op(r=(99, 30, 20, 35), l=(99, 70, 0, 0), ol=82, fc=1, ff=41, kvs=2, rs=1),
        op(r=(99, 22, 16, 30), l=(99, 85, 0, 0), ol=88, fc=2, ff=20, kvs=2, rs=1),
        op(r=(99, 35, 22, 35), l=(99, 60, 0, 0), ol=70, fc=3, ff=55, kvs=2, rs=1),
        op(r=(99, 28, 20, 30), l=(99, 75, 0, 0), ol=80, fc=0, det=9, kvs=2, rs=1),
        op(r=(99, 40, 25, 35), l=(99, 50, 0, 0), ol=68, fc=1, ff=73, kvs=2, rs=1),
    ], fb=1, trnsp=12, lfs=8, lamd=10)),
    ("風鈴", "Wind Chime", 1, voice("WindChime", 5, [
        op(r=(99, 32, 24, 45), l=(99, 70, 0, 0), ol=94, kvs=3, rs=3),
        op(r=(99, 55, 35, 50), l=(99, 50, 0, 0), ol=78, fc=3, ff=50, kvs=3, rs=3),
        op(r=(99, 30, 22, 45), l=(99, 75, 0, 0), ol=94, fc=4, ff=30, kvs=3, rs=3),
        op(r=(99, 60, 40, 50), l=(99, 40, 0, 0), ol=72, fc=7, ff=10, kvs=3, rs=3),
        op(r=(99, 48, 32, 45), l=(99, 65, 0, 0), ol=82, fc=6, ff=60, det=11, kvs=3, rs=3),
        op(r=(99, 65, 45, 50), l=(99, 30, 0, 0), ol=64, fc=9, kvs=3, rs=3),
    ], fb=0, trnsp=36)),
    ("鉦", "Kane", 1, voice("Kane", 5, [
        op(r=(99, 38, 28, 50), l=(99, 60, 0, 0), ol=97, kvs=3, rs=3),
        op(r=(99, 60, 40, 50), l=(99, 50, 0, 0), ol=88, fc=1, ff=60, kvs=3, rs=3),
        op(r=(99, 35, 25, 50), l=(99, 70, 0, 0), ol=92, fc=2, ff=70, kvs=3, rs=3),
        op(r=(99, 70, 45, 50), l=(99, 40, 0, 0), ol=82, fc=5, ff=20, kvs=3, rs=3),
        op(r=(99, 55, 38, 50), l=(99, 55, 0, 0), ol=84, fc=3, ff=40, det=10, kvs=3, rs=3),
        op(r=(99, 75, 50, 50), l=(99, 30, 0, 0), ol=76, fc=8, ff=30, kvs=3, rs=3),
    ], fb=5, trnsp=24)),
    ("木琴", "Mokkin", 1, voice("Mokkin", 5, [
        op(r=(99, 58, 42, 60), l=(99, 45, 0, 0), ol=99, kvs=3, rs=4),
        op(r=(99, 92, 70, 70), l=(99, 0, 0, 0), ol=80, fc=3, ff=93, kvs=4, rs=5),
        op(r=(99, 55, 40, 60), l=(99, 50, 0, 0), ol=94, fc=4, kvs=3, rs=4),
        op(r=(99, 95, 70, 70), l=(99, 0, 0, 0), ol=60, fc=1, kvs=3, rs=5),
        op(r=(99, 75, 55, 60), l=(99, 30, 0, 0), ol=70, fc=10, kvs=3, rs=5),
        op(r=(99, 99, 80, 70), l=(99, 0, 0, 0), ol=50, fc=1, kvs=3, rs=5),
    ], fb=0)),
    # ---- 2 winds: a slow attack, breath (noise-ish feedback), vibrato from the LFO
    ("篳篥", "Hichiriki", 2, voice("Hichiriki", 1, [
        op(r=(60, 40, 30, 50), l=(99, 92, 90, 0), ol=99, kvs=2),
        op(r=(65, 40, 30, 50), l=(99, 88, 85, 0), ol=86, fc=1, kvs=2),
        op(r=(70, 40, 30, 50), l=(99, 85, 80, 0), ol=80, fc=3, kvs=2),
        op(r=(72, 40, 30, 50), l=(99, 80, 75, 0), ol=74, fc=1, det=9, kvs=2),
        op(r=(55, 40, 30, 50), l=(99, 90, 88, 0), ol=78, fc=2, kvs=1),
        op(r=(60, 40, 30, 50), l=(99, 70, 65, 0), ol=72, fc=1, kvs=1),
    ], fb=5, lfs=30, lfd=30, lpmd=6, lpms=3)),
    ("法螺", "Horagai", 2, voice("Horagai", 1, [
        op(r=(45, 35, 30, 45), l=(99, 95, 92, 0), ol=99, kvs=2),
        op(r=(50, 35, 30, 45), l=(99, 85, 80, 0), ol=82, fc=1, kvs=2),
        op(r=(55, 35, 30, 45), l=(99, 75, 70, 0), ol=70, fc=2, kvs=2),
        op(r=(55, 35, 30, 45), l=(99, 70, 65, 0), ol=60, fc=1, det=10, kvs=2),
        op(r=(40, 35, 30, 45), l=(99, 92, 90, 0), ol=80, fc=0, kvs=1),
        op(r=(45, 35, 30, 45), l=(99, 60, 55, 0), ol=66, fc=1, kvs=1),
    ], fb=3, trnsp=12, lfs=25, lfd=40, lpmd=4, lpms=3)),
    ("能管", "Nokan", 2, voice("Nokan", 5, [
        op(r=(75, 45, 30, 55), l=(99, 92, 90, 0), ol=99, kvs=2),
        op(r=(80, 45, 30, 55), l=(99, 60, 55, 0), ol=72, fc=2, kvs=2),
        op(r=(70, 45, 30, 55), l=(99, 85, 82, 0), ol=82, fc=2, kvs=2),
        op(r=(80, 45, 30, 55), l=(99, 50, 45, 0), ol=60, fc=1, kvs=2),
        op(r=(85, 50, 30, 55), l=(99, 50, 45, 0), ol=70, fc=1, det=12, kvs=1),
        op(r=(90, 50, 30, 55), l=(99, 70, 65, 0), ol=82, fc=1, kvs=1),
    ], fb=7, trnsp=36, lfs=40, lfd=20, lpmd=8, lpms=4)),
    ("電笛", "Neon Lead", 2, voice("Neon Lead", 5, [
        op(r=(95, 50, 35, 55), l=(99, 90, 88, 0), ol=99, kvs=1),
        op(r=(95, 50, 35, 55), l=(99, 85, 80, 0), ol=88, fc=1, kvs=1),
        op(r=(95, 50, 35, 55), l=(99, 90, 88, 0), ol=90, fc=1, det=10, kvs=1),
        op(r=(95, 50, 35, 55), l=(99, 85, 80, 0), ol=86, fc=1, det=10, kvs=1),
        op(r=(95, 50, 35, 55), l=(99, 90, 88, 0), ol=84, fc=2, det=4, kvs=1),
        op(r=(95, 50, 35, 55), l=(99, 80, 75, 0), ol=82, fc=1, det=4, kvs=1),
    ], fb=6, lfs=35, lfd=45, lpmd=5, lpms=3)),
    # ---- 3 sustained: pads, an electric piano, a bass
    ("霞", "Mist Pad", 3, voice("Mist Pad", 5, [
        op(r=(30, 25, 20, 30), l=(99, 92, 90, 0), ol=96, kvs=0),
        op(r=(25, 20, 18, 30), l=(99, 80, 75, 0), ol=70, fc=1, kvs=0),
        op(r=(28, 25, 20, 30), l=(99, 92, 90, 0), ol=94, fc=1, det=11, kvs=0),
        op(r=(22, 20, 18, 30), l=(99, 75, 70, 0), ol=66, fc=2, kvs=0),
        op(r=(32, 25, 20, 30), l=(99, 90, 88, 0), ol=90, fc=1, det=3, kvs=0),
        op(r=(20, 18, 15, 30), l=(99, 70, 65, 0), ol=62, fc=3, kvs=0),
    ], fb=1, lfs=12, lfd=20, lpmd=3, lamd=8, lpms=2)),
    ("夜", "Night Pad", 3, voice("Night Pad", 5, [
        op(r=(35, 30, 22, 28), l=(99, 90, 88, 0), ol=98, kvs=0),
        op(r=(30, 25, 20, 28), l=(99, 85, 80, 0), ol=76, fc=0, kvs=0),
        op(r=(33, 30, 22, 28), l=(99, 90, 88, 0), ol=94, fc=0, det=10, kvs=0),
        op(r=(28, 25, 20, 28), l=(99, 80, 75, 0), ol=72, fc=1, kvs=0),
        op(r=(36, 30, 22, 28), l=(99, 88, 85, 0), ol=88, fc=1, det=4, kvs=0),
        op(r=(25, 22, 18, 28), l=(99, 75, 70, 0), ol=70, fc=5, kvs=0),
    ], fb=2, trnsp=12, lfs=10, lfd=15, lpmd=2, lamd=12, lpms=2)),
    ("硝子", "Glass EP", 3, voice("Glass EP", 5, [
        op(r=(96, 30, 22, 50), l=(99, 75, 0, 0), ol=99, kvs=3, rs=3),
        op(r=(99, 65, 40, 60), l=(99, 30, 0, 0), ol=80, fc=14, kvs=5, rs=4),
        op(r=(95, 28, 20, 50), l=(99, 78, 0, 0), ol=96, fc=1, kvs=3, rs=3),
        op(r=(99, 50, 30, 55), l=(99, 50, 0, 0), ol=72, fc=1, kvs=4, rs=3),
        op(r=(95, 32, 22, 50), l=(99, 70, 0, 0), ol=82, fc=1, det=10, kvs=3, rs=3),
        op(r=(99, 55, 35, 55), l=(99, 40, 0, 0), ol=66, fc=1, det=4, kvs=4, rs=3),
    ], fb=3, lfs=40, lamd=6)),
    ("低音", "Neon Bass", 3, voice("Neon Bass", 1, [
        op(r=(99, 50, 35, 60), l=(99, 92, 88, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 70, 45, 60), l=(99, 65, 40, 0), ol=88, fc=1, kvs=3, rs=2),
        op(r=(99, 80, 50, 60), l=(99, 50, 30, 0), ol=80, fc=1, kvs=3, rs=2),
        op(r=(99, 85, 55, 60), l=(99, 40, 20, 0), ol=70, fc=2, kvs=3, rs=2),
        op(r=(99, 50, 35, 60), l=(99, 92, 88, 0), ol=94, fc=0, kvs=2, rs=2),
        op(r=(99, 75, 45, 60), l=(99, 50, 30, 0), ol=72, fc=1, kvs=3, rs=2),
    ], fb=6, trnsp=12)),
    # ---- 4 percussion: fast pitch falls through the ratios, short decays
    ("小鼓", "Kotsuzumi", 4, voice("Kotsuzumi", 5, [
        op(r=(99, 58, 45, 70), l=(99, 0, 0, 0), ol=99, kvs=4, rs=5),
        op(r=(99, 90, 70, 75), l=(99, 0, 0, 0), ol=78, fc=1, ff=50, kvs=5, rs=6),
        op(r=(99, 55, 42, 70), l=(99, 0, 0, 0), ol=96, fc=2, kvs=4, rs=5),
        op(r=(99, 92, 75, 75), l=(99, 0, 0, 0), ol=70, fc=3, ff=40, kvs=5, rs=6),
        op(r=(99, 99, 80, 80), l=(99, 0, 0, 0), ol=82, fc=5, kvs=5, rs=6),
        op(r=(99, 99, 85, 80), l=(99, 0, 0, 0), ol=92, fc=11, kvs=5, rs=6),
    ], fb=7, trnsp=24)),
    ("大鼓", "Otsuzumi", 4, voice("Otsuzumi", 5, [
        op(r=(99, 66, 50, 75), l=(99, 0, 0, 0), ol=99, kvs=5, rs=5),
        op(r=(99, 95, 80, 80), l=(99, 0, 0, 0), ol=84, fc=3, ff=30, kvs=5, rs=6),
        op(r=(99, 70, 55, 75), l=(99, 0, 0, 0), ol=96, fc=5, kvs=5, rs=5),
        op(r=(99, 97, 85, 80), l=(99, 0, 0, 0), ol=80, fc=7, kvs=5, rs=6),
        op(r=(99, 99, 90, 85), l=(99, 0, 0, 0), ol=88, fc=9, kvs=5, rs=6),
        op(r=(99, 99, 95, 85), l=(99, 0, 0, 0), ol=96, fc=13, kvs=5, rs=6),
    ], fb=7, trnsp=36)),
    ("銅鑼", "Dora Gong", 4, voice("Dora Gong", 5, [
        op(r=(80, 22, 16, 30), l=(99, 85, 0, 0), ol=99, kvs=3, rs=1),
        op(r=(70, 25, 18, 30), l=(99, 80, 0, 0), ol=90, fc=1, ff=41, kvs=3, rs=1),
        op(r=(78, 20, 15, 30), l=(99, 85, 0, 0), ol=92, fc=2, ff=73, kvs=3, rs=1),
        op(r=(65, 28, 20, 30), l=(99, 75, 0, 0), ol=86, fc=3, ff=31, kvs=3, rs=1),
        op(r=(75, 24, 18, 30), l=(99, 80, 0, 0), ol=84, fc=0, ff=50, det=10, kvs=3, rs=1),
        op(r=(60, 30, 22, 30), l=(99, 70, 0, 0), ol=80, fc=5, ff=11, kvs=3, rs=1),
    ], fb=6, trnsp=12, lfs=5, lamd=14)),
]

if __name__ == "__main__":
    json.dump([[ja, en, fam, pack(v)] for ja, en, fam, v in SET2], sys.stdout, ensure_ascii=False)
