#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# DENKI set 3: twenty-one electronic FM6 voices after Japanese instruments, DENKI's own (MMM, 2026). Same helpers
# as set 2 (denki_set2.py). Electronic means: square waves from a 1:2 modulator (odd partials), saws from feedback,
# filter-like sweeps from modulator envelopes, ring-mod bells, the pitch envelope for drums and zaps, S&H and
# square LFOs, LFO into the modulators (AMS) for a wobble. No factory ROM data.
#   python3 denki/src/tools/denki_set3.py > set3.json
import json, sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from denki_set2 import op, voice, pack

KICK = dict(pr=(99, 72, 99, 99), pl=(86, 50, 50, 50))     # a fast pitch fall from about an octave up
ZAP = dict(pr=(99, 80, 99, 99), pl=(94, 50, 50, 50))
SCOOP = dict(pr=(55, 99, 99, 99), pl=(50, 50, 50, 46))    # starts a little flat and rises into the note
# (Japanese name, latin name, family 0 pluck / 1 bells / 2 leads / 3 pads keys bass / 4 drums, voice)
SET3 = [
    # ---- 0 synth plucks
    ("回路琴", "Circuit Koto", 0, voice("CircuitKto", 5, [
        op(r=(99, 50, 30, 50), l=(99, 75, 0, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 72, 45, 60), l=(99, 40, 0, 0), ol=86, fc=2, kvs=4, rs=3),
        op(r=(99, 48, 28, 50), l=(99, 78, 0, 0), ol=94, fc=1, det=10, kvs=2, rs=3),
        op(r=(99, 70, 45, 60), l=(99, 40, 0, 0), ol=84, fc=2, det=10, kvs=4, rs=3),
        op(r=(99, 50, 30, 50), l=(99, 75, 0, 0), ol=80, fc=0, kvs=2, rs=3),
        op(r=(99, 70, 40, 60), l=(99, 30, 0, 0), ol=60, fc=1, kvs=3, rs=3),
    ], fb=3)),
    ("電三味線", "Chip Shamisen", 0, voice("ChipShamis", 5, [
        op(r=(99, 45, 28, 55), l=(99, 75, 0, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=82, fc=2, rs=0),
        op(r=(99, 45, 28, 55), l=(99, 75, 0, 0), ol=94, fc=1, det=8, kvs=2, rs=3),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=80, fc=2, rs=0),
        op(r=(99, 60, 40, 60), l=(99, 60, 0, 0), ol=70, fc=1, det=6, kvs=2, rs=4),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=70, fc=1, rs=0),
    ], fb=7, lfs=60, lfw=3)),
    ("鋸琵琶", "Saw Biwa", 0, voice("Saw Biwa", 5, [
        op(r=(99, 42, 25, 50), l=(99, 80, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 58, 35, 55), l=(99, 55, 0, 0), ol=88, fc=1, kvs=4, rs=3),
        op(r=(99, 40, 24, 50), l=(99, 82, 0, 0), ol=92, fc=1, det=11, kvs=2, rs=2),
        op(r=(99, 56, 35, 55), l=(99, 55, 0, 0), ol=86, fc=1, det=3, kvs=4, rs=3),
        op(r=(99, 42, 25, 50), l=(99, 80, 0, 0), ol=88, fc=0, kvs=2, rs=2),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=70, fc=0, rs=0),
    ], fb=7, trnsp=12)),
    ("光箜篌", "Laser Harp", 0, voice("LaserHarp", 5, [
        op(r=(99, 38, 22, 45), l=(99, 80, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 60, 30, 50), l=(99, 45, 0, 0), ol=80, fc=3, kvs=3, rs=3),
        op(r=(99, 36, 20, 45), l=(99, 82, 0, 0), ol=92, fc=1, det=12, kvs=2, rs=2),
        op(r=(99, 55, 30, 50), l=(99, 50, 0, 0), ol=74, fc=2, kvs=3, rs=3),
        op(r=(99, 40, 22, 45), l=(99, 78, 0, 0), ol=80, fc=2, det=2, kvs=2, rs=2),
        op(r=(99, 65, 35, 50), l=(99, 30, 0, 0), ol=66, fc=5, kvs=3, rs=3),
    ], fb=2, pr=(99, 85, 99, 99), pl=(58, 50, 50, 50))),
    ("刻", "Arp Tick", 0, voice("Arp Tick", 5, [
        op(r=(99, 70, 50, 65), l=(99, 40, 0, 0), ol=99, kvs=3, rs=4),
        op(r=(99, 85, 60, 70), l=(99, 20, 0, 0), ol=88, fc=4, kvs=4, rs=5),
        op(r=(99, 68, 50, 65), l=(99, 45, 0, 0), ol=94, fc=1, det=9, kvs=3, rs=4),
        op(r=(99, 82, 60, 70), l=(99, 25, 0, 0), ol=84, fc=2, kvs=4, rs=5),
        op(r=(99, 70, 50, 65), l=(99, 40, 0, 0), ol=82, fc=2, kvs=3, rs=4),
        op(r=(99, 90, 65, 70), l=(99, 10, 0, 0), ol=72, fc=6, kvs=4, rs=5),
    ], fb=4, trnsp=36)),
    ("信号", "Signal", 0, voice("Signal", 5, [
        op(r=(99, 55, 35, 55), l=(99, 70, 0, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 65, 40, 60), l=(99, 55, 0, 0), ol=86, fc=3, ff=50, kvs=3, rs=3),
        op(r=(99, 52, 34, 55), l=(99, 72, 0, 0), ol=90, fc=1, kvs=2, rs=3),
        op(r=(99, 70, 45, 60), l=(99, 45, 0, 0), ol=80, fc=2, kvs=3, rs=3),
        op(r=(99, 55, 35, 55), l=(99, 70, 0, 0), ol=76, fc=4, kvs=2, rs=3),
        op(r=(99, 80, 50, 60), l=(99, 30, 0, 0), ol=70, fc=7, kvs=3, rs=3),
    ], fb=5, lfs=70, lfd=0, lpmd=6, lfw=5, lpms=4, trnsp=24)),
    # ---- 1 digital bells
    ("電鈴", "Digi Rin", 1, voice("Digi Rin", 5, [
        op(r=(99, 30, 22, 35), l=(99, 75, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 45, 30, 40), l=(99, 50, 0, 0), ol=80, fc=3, ff=50, kvs=3, rs=2),
        op(r=(99, 28, 20, 35), l=(99, 78, 0, 0), ol=92, fc=2, kvs=2, rs=2),
        op(r=(99, 50, 32, 40), l=(99, 40, 0, 0), ol=74, fc=7, kvs=3, rs=2),
        op(r=(99, 32, 22, 35), l=(99, 72, 0, 0), ol=84, fc=1, det=11, kvs=2, rs=2),
        op(r=(99, 55, 35, 40), l=(99, 35, 0, 0), ol=70, fc=3, ff=50, det=3, kvs=3, rs=2),
    ], fb=0, trnsp=24, lfs=55, lamd=8)),
    ("水晶", "Crystal", 1, voice("Crystal", 5, [
        op(r=(99, 35, 25, 40), l=(99, 70, 0, 0), ol=98, kvs=3, rs=3),
        op(r=(99, 80, 55, 60), l=(99, 0, 0, 0), ol=88, fc=7, ff=10, kvs=5, rs=4),
        op(r=(99, 33, 24, 40), l=(99, 72, 0, 0), ol=92, fc=3, kvs=3, rs=3),
        op(r=(99, 78, 55, 60), l=(99, 0, 0, 0), ol=82, fc=11, kvs=5, rs=4),
        op(r=(99, 36, 26, 40), l=(99, 68, 0, 0), ol=84, fc=5, det=10, kvs=3, rs=3),
        op(r=(99, 85, 60, 60), l=(99, 0, 0, 0), ol=78, fc=13, kvs=5, rs=4),
    ], fb=0, trnsp=36)),
    ("環", "Ring Bell", 1, voice("Ring Bell", 5, [
        op(r=(99, 32, 22, 40), l=(99, 75, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 34, 24, 40), l=(99, 75, 0, 0), ol=88, fc=1, ff=41, kvs=2, rs=2),
        op(r=(99, 30, 20, 40), l=(99, 78, 0, 0), ol=92, fc=2, kvs=2, rs=2),
        op(r=(99, 36, 24, 40), l=(99, 70, 0, 0), ol=84, fc=2, ff=83, kvs=2, rs=2),
        op(r=(99, 34, 22, 40), l=(99, 72, 0, 0), ol=82, fc=1, det=11, kvs=2, rs=2),
        op(r=(99, 40, 26, 40), l=(99, 60, 0, 0), ol=80, fc=3, ff=17, kvs=2, rs=2),
    ], fb=0, trnsp=24)),
    ("星", "Star Chime", 1, voice("StarChime", 5, [
        op(r=(99, 40, 28, 40), l=(99, 70, 0, 0), ol=96, kvs=2, rs=3),
        op(r=(99, 60, 35, 50), l=(99, 40, 0, 0), ol=76, fc=9, kvs=3, rs=3),
        op(r=(99, 38, 26, 40), l=(99, 72, 0, 0), ol=94, fc=1, det=13, kvs=2, rs=3),
        op(r=(99, 58, 35, 50), l=(99, 40, 0, 0), ol=74, fc=9, det=13, kvs=3, rs=3),
        op(r=(99, 42, 28, 40), l=(99, 68, 0, 0), ol=86, fc=2, det=1, kvs=2, rs=3),
        op(r=(99, 65, 40, 50), l=(99, 30, 0, 0), ol=70, fc=12, kvs=3, rs=3),
    ], fb=0, trnsp=36, lfs=45, lamd=25, lfw=3)),
    # ---- 2 leads and organ
    ("電尺八", "Synth Shaku", 2, voice("SynthShaku", 1, [
        op(r=(70, 40, 30, 55), l=(99, 92, 90, 0), ol=99, kvs=2),
        op(r=(65, 40, 30, 55), l=(99, 70, 60, 0), ol=72, fc=1, kvs=2),
        op(r=(75, 40, 30, 55), l=(99, 85, 80, 0), ol=76, fc=2, kvs=2),
        op(r=(80, 40, 30, 55), l=(99, 60, 50, 0), ol=60, fc=1, det=10, kvs=2),
        op(r=(80, 60, 30, 55), l=(99, 40, 30, 0), ol=66, fc=9, kvs=2),
        op(r=(80, 60, 30, 55), l=(99, 40, 30, 0), ol=80, fc=13, kvs=2),
    ], fb=7, lfs=30, lfd=35, lpmd=8, lpms=4, **SCOOP)),
    ("方笛", "Square Flute", 2, voice("SquareFlut", 5, [
        op(r=(90, 45, 30, 60), l=(99, 92, 90, 0), ol=99, kvs=1),
        op(r=(90, 45, 30, 60), l=(99, 88, 85, 0), ol=84, fc=2, kvs=1),
        op(r=(90, 45, 30, 60), l=(99, 92, 90, 0), ol=88, fc=1, det=9, kvs=1),
        op(r=(90, 45, 30, 60), l=(99, 88, 85, 0), ol=82, fc=2, det=9, kvs=1),
        op(r=(90, 45, 30, 60), l=(99, 90, 88, 0), ol=78, fc=2, kvs=1),
        op(r=(90, 45, 30, 60), l=(99, 80, 75, 0), ol=60, fc=4, kvs=1),
    ], fb=0, trnsp=24, lfs=38, lfd=40, lpmd=5, lpms=3)),
    ("電笙", "Sho Organ", 2, voice("Sho Organ", 32, [
        op(r=(80, 50, 40, 60), l=(99, 95, 95, 0), ol=94),
        op(r=(80, 50, 40, 60), l=(99, 95, 95, 0), ol=86, fc=2, det=9),
        op(r=(80, 50, 40, 60), l=(99, 95, 95, 0), ol=82, fc=3, det=5),
        op(r=(80, 50, 40, 60), l=(99, 95, 95, 0), ol=78, fc=4, det=10),
        op(r=(80, 50, 40, 60), l=(99, 95, 95, 0), ol=84, fc=0, det=4),
        op(r=(80, 50, 40, 60), l=(99, 95, 95, 0), ol=72, fc=6, det=8),
    ], fb=4, lfs=60, lfd=0, lamd=6, lpms=0)),
    ("霧笛", "Sync Lead", 2, voice("Sync Lead", 5, [
        op(r=(99, 50, 35, 60), l=(99, 90, 88, 0), ol=99, kvs=2),
        op(r=(99, 45, 30, 60), l=(99, 75, 65, 0), ol=92, fc=1, kvs=3),
        op(r=(99, 50, 35, 60), l=(99, 90, 88, 0), ol=92, fc=1, det=11, kvs=2),
        op(r=(99, 45, 30, 60), l=(99, 75, 65, 0), ol=88, fc=3, kvs=3),
        op(r=(99, 50, 35, 60), l=(99, 90, 88, 0), ol=84, fc=0, det=4, kvs=2),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=74, fc=0, rs=0),
    ], fb=7, lfs=40, lfd=50, lpmd=4, lpms=3)),
    # ---- 3 pads, keys, bass
    ("雲", "Cloud Sweep", 3, voice("CloudSweep", 5, [
        op(r=(35, 25, 20, 30), l=(99, 92, 90, 0), ol=96),
        op(r=(18, 22, 20, 30), l=(99, 70, 80, 0), ol=82, fc=1),
        op(r=(33, 25, 20, 30), l=(99, 92, 90, 0), ol=94, fc=1, det=12),
        op(r=(16, 20, 20, 30), l=(99, 75, 80, 0), ol=80, fc=2, det=2),
        op(r=(35, 25, 20, 30), l=(99, 90, 88, 0), ol=86, fc=0, det=5),
        op(r=(14, 20, 20, 30), l=(99, 70, 75, 0), ol=72, fc=3),
    ], fb=3, lfs=8, lfd=0, lamd=10, lfw=0, lpms=0)),
    ("都", "City Strings", 3, voice("CityString", 5, [
        op(r=(45, 30, 25, 35), l=(99, 92, 90, 0), ol=96),
        op(r=(45, 30, 25, 35), l=(99, 80, 78, 0), ol=80, fc=1),
        op(r=(43, 30, 25, 35), l=(99, 92, 90, 0), ol=94, fc=1, det=13),
        op(r=(43, 30, 25, 35), l=(99, 80, 78, 0), ol=78, fc=1, det=13),
        op(r=(47, 30, 25, 35), l=(99, 90, 88, 0), ol=92, fc=1, det=1),
        op(r=(47, 30, 25, 35), l=(99, 80, 78, 0), ol=78, fc=1, det=1),
    ], fb=5, lfs=50, lfd=0, lpmd=3, lpms=2)),
    ("電鍵", "FM Keys", 3, voice("FM Keys", 5, [
        op(r=(99, 35, 25, 55), l=(99, 70, 0, 0), ol=99, kvs=4, rs=3),
        op(r=(99, 75, 45, 60), l=(99, 20, 0, 0), ol=84, fc=14, kvs=6, rs=4),
        op(r=(99, 33, 24, 55), l=(99, 72, 0, 0), ol=94, fc=1, det=10, kvs=4, rs=3),
        op(r=(99, 55, 35, 60), l=(99, 45, 0, 0), ol=80, fc=1, kvs=5, rs=3),
        op(r=(99, 36, 25, 55), l=(99, 68, 0, 0), ol=82, fc=2, det=4, kvs=4, rs=3),
        op(r=(99, 70, 45, 60), l=(99, 25, 0, 0), ol=72, fc=4, kvs=5, rs=4),
    ], fb=4, lfs=45, lamd=10, lfw=4)),
    ("重低", "Sub Wobble", 3, voice("Sub Wobble", 5, [
        op(r=(99, 50, 35, 60), l=(99, 92, 88, 0), ol=99, kvs=1, rs=2),
        op(r=(99, 50, 35, 60), l=(99, 85, 80, 0), ol=88, fc=1, kvs=2, ams=3),
        op(r=(99, 50, 35, 60), l=(99, 92, 88, 0), ol=94, fc=0, kvs=1, rs=2),
        op(r=(99, 50, 35, 60), l=(99, 85, 80, 0), ol=80, fc=1, kvs=2, ams=3),
        op(r=(99, 50, 35, 60), l=(99, 90, 85, 0), ol=82, fc=1, det=10, kvs=1, rs=2),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=76, fc=1, ams=2),
    ], fb=7, trnsp=12, lfs=32, lfd=0, lamd=70, lfw=0, lpms=0)),
    # ---- 4 drums and hits
    ("電太鼓", "Synth Taiko", 4, voice("SynthTaiko", 5, [
        op(r=(99, 60, 45, 60), l=(99, 0, 0, 0), ol=99, kvs=4, rs=1),
        op(r=(99, 95, 80, 70), l=(99, 0, 0, 0), ol=70, fc=1, kvs=5, rs=2),
        op(r=(99, 58, 45, 60), l=(99, 0, 0, 0), ol=94, fc=0, kvs=4, rs=1),
        op(r=(99, 99, 90, 75), l=(99, 0, 0, 0), ol=78, fc=3, kvs=5, rs=2),
        op(r=(99, 99, 90, 75), l=(99, 0, 0, 0), ol=72, fc=7, kvs=5, rs=2),
        op(r=(99, 99, 95, 80), l=(99, 0, 0, 0), ol=94, fc=13, kvs=5, rs=2),
    ], fb=7, trnsp=12, **KICK)),
    ("金属", "Metal Hit", 4, voice("Metal Hit", 5, [
        op(r=(99, 55, 40, 55), l=(99, 0, 0, 0), ol=99, kvs=4, rs=3),
        op(r=(99, 70, 50, 60), l=(99, 0, 0, 0), ol=90, fc=1, ff=41, kvs=5, rs=3),
        op(r=(99, 50, 38, 55), l=(99, 0, 0, 0), ol=94, fc=3, ff=73, kvs=4, rs=3),
        op(r=(99, 72, 50, 60), l=(99, 0, 0, 0), ol=88, fc=5, ff=11, kvs=5, rs=3),
        op(r=(99, 58, 42, 55), l=(99, 0, 0, 0), ol=86, fc=2, ff=37, det=12, kvs=4, rs=3),
        op(r=(99, 75, 55, 60), l=(99, 0, 0, 0), ol=92, fc=9, ff=19, kvs=5, rs=3),
    ], fb=7, trnsp=24)),
    ("電拍", "Zap Clap", 4, voice("Zap Clap", 5, [
        op(r=(99, 58, 45, 65), l=(99, 0, 0, 0), ol=99, kvs=4, rs=3),
        op(r=(99, 80, 60, 70), l=(99, 0, 0, 0), ol=94, fc=5, kvs=5, rs=3),
        op(r=(99, 65, 50, 65), l=(99, 0, 0, 0), ol=94, fc=2, kvs=4, rs=3),
        op(r=(99, 85, 60, 70), l=(99, 0, 0, 0), ol=96, fc=11, kvs=5, rs=3),
        op(r=(99, 70, 50, 65), l=(99, 0, 0, 0), ol=84, fc=1, kvs=4, rs=3),
        op(r=(99, 99, 99, 99), l=(99, 99, 99, 0), ol=99, fc=17, rs=0),
    ], fb=7, trnsp=36, **ZAP)),
]

if __name__ == "__main__":
    json.dump([[ja, en, fam, pack(v)] for ja, en, fam, v in SET3], sys.stdout, ensure_ascii=False)
