#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
# DENKI set 4: twenty-one fully digital, strange FM6 voices, still after Japanese instruments, DENKI's own (MMM,
# 2026). Same helpers as set 2. Means: fixed-frequency operators (mode=1: fc 0..3 = 1, 10, 100, 1000 Hz, ff the
# fine factor 10^(ff/100)) for formants, ring-mod buzz and keyless clicks; extreme pitch envelopes; the LFO as a
# gate (square into the amplitude), as random pitch (S&H), as octave hops (square into the pitch) and as a ratchet
# (saw into the modulators); feedback noise. No factory ROM data.
#   python3 denki/src/tools/denki_set4.py > set4.json
import json, sys, os
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from denki_set2 import op, voice, pack


def fx(hz):
    """fixed frequency: coarse decade and fine for hz (1 Hz .. ~9.9 kHz)"""
    import math
    c = min(3, max(0, int(math.floor(math.log10(hz)))))
    return dict(mode=1, fc=c, ff=max(0, min(99, round(100 * math.log10(hz / 10 ** c)))))


HOLD = dict(r=(99, 99, 99, 99), l=(99, 99, 99, 0))
SET4 = [
    # ---- 0 cyber plucks
    ("壊琴", "Broken Koto", 0, voice("BrokenKoto", 5, [
        op(r=(99, 48, 28, 50), l=(99, 75, 0, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 60, 35, 55), l=(99, 60, 0, 0), ol=90, fc=3, ff=23, kvs=4, rs=3),
        op(r=(99, 46, 26, 50), l=(99, 78, 0, 0), ol=92, fc=1, det=14, kvs=2, rs=3),
        op(r=(99, 62, 35, 55), l=(99, 55, 0, 0), ol=88, fc=5, ff=67, kvs=4, rs=3),
        op(r=(99, 50, 28, 50), l=(99, 72, 0, 0), ol=80, fc=0, det=0, kvs=2, rs=3),
        op(**HOLD, ol=82, fc=7, ff=19),
    ], fb=7, pr=(99, 70, 99, 99), pl=(38, 52, 50, 50), lfs=80, lpmd=12, lfw=5, lpms=5)),
    ("量子三味線", "Quantum Shamisen", 0, voice("QuantumSha", 5, [
        op(r=(99, 55, 32, 55), l=(99, 70, 0, 0), ol=99, kvs=2, rs=3),
        op(r=(99, 70, 40, 60), l=(99, 50, 0, 0), ol=88, fc=3, kvs=4, rs=3),
        op(r=(99, 52, 30, 55), l=(99, 72, 0, 0), ol=94, fc=2, kvs=2, rs=3),
        op(r=(99, 72, 40, 60), l=(99, 50, 0, 0), ol=84, fc=5, kvs=4, rs=3),
        op(r=(99, 55, 32, 55), l=(99, 70, 0, 0), ol=78, fc=1, det=12, kvs=2, rs=3),
        op(**HOLD, ol=78, fc=1),
    ], fb=6, lfs=86, lpmd=60, lfw=5, lpms=7)),
    ("虫", "Bit Insect", 0, voice("Bit Insect", 5, [
        op(r=(99, 48, 32, 60), l=(99, 70, 0, 0), ol=99, kvs=3, rs=3),
        op(**HOLD, ol=86, **fx(1180)),
        op(r=(99, 46, 30, 60), l=(99, 72, 0, 0), ol=96, fc=1, kvs=3, rs=3),
        op(**HOLD, ol=80, **fx(2730)),
        op(r=(99, 66, 45, 60), l=(99, 50, 0, 0), ol=74, fc=2, kvs=3, rs=4),
        op(**HOLD, ol=70, **fx(7.3)),
    ], fb=0, lfs=95, lamd=45, lfw=3, lks=0)),
    ("反琴", "Reverse Koto", 0, voice("ReverseKto", 5, [
        op(r=(52, 99, 99, 75), l=(99, 99, 99, 0), ol=99, kvs=1),
        op(r=(48, 99, 99, 75), l=(99, 85, 85, 0), ol=88, fc=2, kvs=1),
        op(r=(50, 99, 99, 75), l=(99, 99, 99, 0), ol=92, fc=1, det=12, kvs=1),
        op(r=(46, 99, 99, 75), l=(99, 85, 85, 0), ol=84, fc=3, kvs=1),
        op(r=(55, 99, 99, 75), l=(99, 95, 95, 0), ol=76, fc=0, kvs=1),
        op(r=(44, 99, 99, 75), l=(99, 80, 80, 0), ol=72, fc=5, kvs=1),
    ], fb=4, pr=(40, 99, 99, 99), pl=(50, 50, 50, 44))),
    ("断", "Stutter Pluck", 0, voice("StutterPlk", 5, [
        op(r=(99, 40, 24, 50), l=(99, 80, 0, 0), ol=99, kvs=2, rs=2, ams=3),
        op(r=(99, 60, 35, 55), l=(99, 55, 0, 0), ol=86, fc=2, kvs=4, rs=3),
        op(r=(99, 38, 22, 50), l=(99, 82, 0, 0), ol=94, fc=1, det=11, kvs=2, rs=2, ams=3),
        op(r=(99, 58, 35, 55), l=(99, 55, 0, 0), ol=82, fc=3, kvs=4, rs=3),
        op(r=(99, 40, 24, 50), l=(99, 80, 0, 0), ol=80, fc=0, kvs=2, rs=2, ams=3),
        op(r=(99, 70, 40, 55), l=(99, 40, 0, 0), ol=70, fc=4, kvs=3, rs=3),
    ], fb=5, lfs=78, lamd=99, lfw=3, lks=0)),
    ("電磁", "EM Field", 0, voice("EM Field", 5, [
        op(r=(99, 42, 25, 50), l=(99, 80, 0, 0), ol=99, kvs=2, rs=2),
        op(**HOLD, ol=88, **fx(6.1)),
        op(r=(99, 40, 24, 50), l=(99, 82, 0, 0), ol=92, fc=2, kvs=2, rs=2),
        op(**HOLD, ol=82, **fx(31)),
        op(r=(99, 44, 26, 50), l=(99, 78, 0, 0), ol=80, fc=1, det=13, kvs=2, rs=2),
        op(r=(99, 60, 35, 55), l=(99, 50, 0, 0), ol=78, fc=3, ff=50, kvs=3, rs=3),
    ], fb=3)),
    # ---- 1 glitch bells
    ("鐘渦", "Bell Vortex", 1, voice("BellVortex", 5, [
        op(r=(99, 30, 20, 35), l=(99, 75, 0, 0), ol=99, kvs=2, rs=2),
        op(r=(99, 34, 22, 40), l=(99, 65, 0, 0), ol=86, fc=2, ff=73, kvs=2, rs=2),
        op(r=(99, 28, 20, 35), l=(99, 78, 0, 0), ol=92, fc=3, ff=31, kvs=2, rs=2),
        op(r=(99, 38, 24, 40), l=(99, 60, 0, 0), ol=82, fc=5, ff=11, kvs=2, rs=2),
        op(r=(99, 32, 22, 35), l=(99, 72, 0, 0), ol=84, fc=1, ff=41, det=14, kvs=2, rs=2),
        op(r=(99, 40, 26, 40), l=(99, 55, 0, 0), ol=78, fc=7, ff=7, kvs=2, rs=2),
    ], fb=2, trnsp=24, lfs=30, lpmd=40, lfw=2, lpms=4)),
    ("硅", "Silicon Bell", 1, voice("SiliconBel", 5, [
        op(r=(99, 36, 25, 40), l=(99, 70, 0, 0), ol=99, kvs=3, rs=3),
        op(**HOLD, ol=84, **fx(1000)),
        op(r=(99, 34, 24, 40), l=(99, 72, 0, 0), ol=92, fc=0, kvs=3, rs=3),
        op(r=(99, 50, 30, 45), l=(99, 40, 0, 0), ol=80, **fx(3170)),
        op(r=(99, 38, 26, 40), l=(99, 68, 0, 0), ol=84, fc=4, ff=13, kvs=3, rs=3),
        op(r=(99, 60, 35, 45), l=(99, 30, 0, 0), ol=76, fc=11, ff=50, kvs=3, rs=3),
    ], fb=0, trnsp=24)),
    ("鏡", "Mirror Gong", 1, voice("MirrorGong", 5, [
        op(r=(85, 26, 18, 30), l=(99, 80, 0, 0), ol=99, kvs=3, rs=1),
        op(r=(75, 28, 20, 30), l=(99, 75, 0, 0), ol=90, fc=1, ff=59, kvs=3, rs=1),
        op(r=(82, 24, 17, 30), l=(99, 82, 0, 0), ol=92, fc=2, ff=29, kvs=3, rs=1),
        op(r=(70, 30, 20, 30), l=(99, 70, 0, 0), ol=88, fc=4, ff=47, kvs=3, rs=1),
        op(r=(80, 26, 18, 30), l=(99, 78, 0, 0), ol=84, fc=0, ff=83, det=0, kvs=3, rs=1),
        op(r=(65, 32, 22, 30), l=(99, 65, 0, 0), ol=82, fc=6, ff=37, kvs=3, rs=1),
    ], fb=6, trnsp=12, pr=(25, 99, 99, 99), pl=(50, 50, 50, 30))),
    ("鈴群", "Rin Swarm", 1, voice("Rin Swarm", 32, [
        op(r=(99, 34, 24, 40), l=(99, 70, 0, 0), ol=92, kvs=2, rs=2),
        op(r=(99, 36, 25, 40), l=(99, 70, 0, 0), ol=86, fc=1, ff=41, det=14, kvs=2, rs=2),
        op(r=(99, 32, 23, 40), l=(99, 70, 0, 0), ol=84, fc=2, ff=82, det=0, kvs=2, rs=2),
        op(r=(99, 38, 26, 40), l=(99, 70, 0, 0), ol=82, fc=3, ff=73, det=13, kvs=2, rs=2),
        op(r=(99, 35, 24, 40), l=(99, 70, 0, 0), ol=80, fc=5, ff=19, det=1, kvs=2, rs=2),
        op(r=(99, 40, 28, 40), l=(99, 70, 0, 0), ol=78, fc=7, ff=53, kvs=2, rs=2),
    ], fb=0, trnsp=24, lfs=88, lamd=30, lfw=5, lks=0)),
    # ---- 2 alien leads
    ("声", "Robot Voice", 2, voice("RobotVoice", 5, [
        op(r=(80, 50, 40, 60), l=(99, 92, 90, 0), ol=96, **fx(710)),
        op(r=(80, 50, 40, 60), l=(99, 88, 85, 0), ol=80, fc=1),
        op(r=(80, 50, 40, 60), l=(99, 90, 88, 0), ol=88, **fx(1180)),
        op(r=(80, 50, 40, 60), l=(99, 88, 85, 0), ol=78, fc=1),
        op(r=(80, 50, 40, 60), l=(99, 92, 90, 0), ol=88, fc=1),
        op(r=(80, 50, 40, 60), l=(99, 75, 70, 0), ol=74, fc=1),
    ], fb=7, lfs=33, lfd=40, lpmd=5, lpms=3)),
    ("笛ノイズ", "Noise Flute", 2, voice("NoiseFlute", 1, [
        op(r=(75, 45, 30, 60), l=(99, 92, 90, 0), ol=99, kvs=1),
        op(r=(75, 45, 30, 60), l=(99, 75, 70, 0), ol=66, fc=1, kvs=1),
        op(r=(75, 45, 30, 60), l=(99, 80, 75, 0), ol=82, fc=1, det=11, kvs=1),
        op(r=(75, 45, 30, 60), l=(99, 75, 70, 0), ol=80, **fx(4900)),
        op(r=(75, 45, 30, 60), l=(99, 75, 70, 0), ol=88, fc=17),
        op(r=(75, 45, 30, 60), l=(99, 99, 99, 0), ol=99, fc=23),
    ], fb=7, lfs=36, lfd=30, lpmd=6, lpms=3)),
    ("跳笙", "Hopping Sho", 2, voice("HoppingSho", 32, [
        op(r=(90, 50, 40, 60), l=(99, 95, 95, 0), ol=92),
        op(r=(90, 50, 40, 60), l=(99, 95, 95, 0), ol=86, fc=2, det=10),
        op(r=(90, 50, 40, 60), l=(99, 95, 95, 0), ol=82, fc=3, det=4),
        op(r=(90, 50, 40, 60), l=(99, 95, 95, 0), ol=78, fc=5, det=11),
        op(r=(90, 50, 40, 60), l=(99, 95, 95, 0), ol=84, fc=0, det=3),
        op(r=(90, 50, 40, 60), l=(99, 95, 95, 0), ol=72, fc=7, det=9),
    ], fb=5, lfs=62, lpmd=46, lfw=3, lpms=6, lks=0)),
    ("警報", "Siren Lead", 2, voice("Siren Lead", 5, [
        op(r=(99, 50, 35, 60), l=(99, 90, 88, 0), ol=99, kvs=1),
        op(r=(99, 50, 35, 60), l=(99, 80, 78, 0), ol=88, fc=1, kvs=1),
        op(r=(99, 50, 35, 60), l=(99, 90, 88, 0), ol=92, fc=1, det=13, kvs=1),
        op(r=(99, 50, 35, 60), l=(99, 80, 78, 0), ol=86, fc=2, kvs=1),
        op(r=(99, 50, 35, 60), l=(99, 88, 85, 0), ol=82, fc=0, det=1, kvs=1),
        op(**HOLD, ol=76, fc=1),
    ], fb=7, lfs=40, lfd=0, lpmd=50, lfw=0, lpms=6, lks=0)),
    # ---- 3 data fog: drones, noise pads, ratchet keys, grind bass
    ("宇宙", "Space Drone", 3, voice("SpaceDrone", 32, [
        op(r=(30, 25, 20, 25), l=(99, 92, 90, 0), ol=90),
        op(r=(28, 25, 20, 25), l=(99, 92, 90, 0), ol=84, fc=0, det=14),
        op(r=(32, 25, 20, 25), l=(99, 92, 90, 0), ol=82, fc=1, ff=50, det=0),
        op(r=(26, 25, 20, 25), l=(99, 92, 90, 0), ol=78, fc=2, ff=25, det=13),
        op(r=(30, 25, 20, 25), l=(99, 92, 90, 0), ol=80, **fx(2.3)),
        op(r=(24, 25, 20, 25), l=(99, 92, 90, 0), ol=70, fc=4, ff=75, det=1),
    ], fb=6, trnsp=12, lfs=6, lpmd=10, lamd=20, lfw=4, lpms=3)),
    ("砂", "Sand Pad", 3, voice("Sand Pad", 5, [
        op(r=(30, 25, 20, 30), l=(99, 92, 90, 0), ol=96),
        op(r=(30, 25, 20, 30), l=(99, 80, 78, 0), ol=80, fc=13, ff=30),
        op(r=(28, 25, 20, 30), l=(99, 92, 90, 0), ol=92, fc=1, det=12),
        op(r=(28, 25, 20, 30), l=(99, 80, 78, 0), ol=84, fc=19),
        op(r=(32, 25, 20, 30), l=(99, 90, 88, 0), ol=84, fc=2, det=3),
        op(r=(26, 25, 20, 30), l=(99, 99, 99, 0), ol=92, fc=27),
    ], fb=7, lfs=12, lamd=14, lfw=4)),
    ("液", "Liquid Keys", 3, voice("LiquidKeys", 5, [
        op(r=(99, 35, 25, 55), l=(99, 75, 0, 0), ol=99, kvs=3, rs=3),
        op(r=(99, 50, 30, 60), l=(99, 70, 40, 0), ol=88, fc=3, kvs=4, ams=3),
        op(r=(99, 33, 24, 55), l=(99, 78, 0, 0), ol=94, fc=1, det=11, kvs=3, rs=3),
        op(r=(99, 50, 30, 60), l=(99, 70, 40, 0), ol=84, fc=2, kvs=4, ams=3),
        op(r=(99, 36, 25, 55), l=(99, 72, 0, 0), ol=82, fc=0, kvs=3, rs=3),
        op(r=(99, 55, 35, 60), l=(99, 60, 30, 0), ol=76, fc=5, kvs=4, ams=3),
    ], fb=4, lfs=58, lamd=80, lfw=1, lks=0)),
    ("歪低", "Grind Bass", 3, voice("Grind Bass", 5, [
        op(r=(99, 50, 35, 60), l=(99, 92, 88, 0), ol=99, kvs=1, rs=2),
        op(r=(99, 60, 40, 60), l=(99, 85, 75, 0), ol=94, fc=1, kvs=3),
        op(r=(99, 50, 35, 60), l=(99, 92, 88, 0), ol=94, fc=0, det=12, kvs=1, rs=2),
        op(r=(99, 60, 40, 60), l=(99, 85, 75, 0), ol=90, fc=3, kvs=3, ams=3),
        op(r=(99, 50, 35, 60), l=(99, 90, 85, 0), ol=84, fc=0, det=2, kvs=1, rs=2),
        op(**HOLD, ol=88, fc=1, ams=3),
    ], fb=7, trnsp=12, pr=(99, 85, 99, 99), pl=(56, 50, 50, 50), lfs=70, lamd=60, lfw=3, lks=0)),
    # ---- 4 glitch drums
    ("爆", "Laser Kick", 4, voice("Laser Kick", 5, [
        op(r=(99, 55, 42, 60), l=(99, 0, 0, 0), ol=99, kvs=4, rs=1),
        op(r=(99, 90, 75, 70), l=(99, 0, 0, 0), ol=72, fc=1, kvs=5, rs=2),
        op(r=(99, 52, 40, 60), l=(99, 0, 0, 0), ol=94, fc=0, kvs=4, rs=1),
        op(r=(99, 95, 80, 75), l=(99, 0, 0, 0), ol=70, fc=2, kvs=5, rs=2),
        op(r=(99, 99, 90, 75), l=(99, 0, 0, 0), ol=80, fc=5, kvs=5, rs=2),
        op(r=(99, 99, 95, 80), l=(99, 0, 0, 0), ol=90, fc=11, kvs=5, rs=2),
    ], fb=7, trnsp=12, pr=(99, 58, 99, 99), pl=(99, 50, 50, 50))),
    ("砕", "Crush Snare", 4, voice("CrushSnare", 5, [
        op(r=(99, 62, 48, 65), l=(99, 0, 0, 0), ol=99, kvs=4, rs=3),
        op(**HOLD, ol=96, **fx(3300)),
        op(r=(99, 58, 45, 65), l=(99, 0, 0, 0), ol=94, **fx(200)),
        op(**HOLD, ol=92, **fx(5700)),
        op(r=(99, 70, 50, 65), l=(99, 0, 0, 0), ol=88, fc=1, kvs=4, rs=3),
        op(**HOLD, ol=99, fc=31),
    ], fb=7, pr=(99, 85, 99, 99), pl=(70, 50, 50, 50))),
    ("機", "Machine Click", 4, voice("MachClick", 5, [
        op(r=(99, 64, 50, 70), l=(99, 0, 0, 0), ol=99, kvs=5, rs=4, **fx(3100)),
        op(r=(99, 90, 70, 70), l=(99, 0, 0, 0), ol=90, kvs=5, **fx(1370)),
        op(r=(99, 60, 48, 70), l=(99, 0, 0, 0), ol=99, fc=4, kvs=5, rs=4),
        op(r=(99, 92, 70, 70), l=(99, 0, 0, 0), ol=88, fc=9, ff=50, kvs=5, rs=4),
        op(r=(99, 80, 60, 70), l=(99, 0, 0, 0), ol=86, kvs=5, rs=4, **fx(860)),
        op(**HOLD, ol=90, **fx(41)),
    ], fb=6)),
]

if __name__ == "__main__":
    json.dump([[ja, en, fam, pack(v)] for ja, en, fam, v in SET4], sys.stdout, ensure_ascii=False)
