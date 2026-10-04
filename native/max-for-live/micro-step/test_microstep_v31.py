#!/usr/bin/env python3
"""Wiring + clock-logic checks for micro.step v3.1 (simulation of the patcher JSON; NOT a Live test)."""
import json, struct, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_microstep_v31 import load, OUT
_, d = load(OUT); P = d['patcher']
bx = {x['box']['id']: x['box'] for x in P['boxes']}
ln = {(l['patchline']['source'][0], l['patchline']['source'][1], l['patchline']['destination'][0], l['patchline']['destination'][1]) for l in P['lines']}
fails = []
def ok(c, m):
    print(('ok   ' if c else 'FAIL ') + m); (c or fails.append(m))
ok(len(bx) == len(P['boxes']), 'unique box ids')
ok(all(s in bx and t in bx for s, _, t, _ in ln), 'every line connects existing boxes')
for need in [('sel1',0,'ngate',1),('ngate',0,'trans',0),('modetab',0,'eq0',0),('eq0',0,'ngate',0),('modetab',0,'clk',0),('clk',0,'trans',0),('ld',0,'modetab',0)]:
    ok(need in ln, 'line %s.%d -> %s.%d' % need)
ok(('sel1',0,'trans',0) not in ln, 'note-on no longer bypasses the mode gate')
ok(all(i < bx[t]['numinlets'] for _, _, t, i in ln), 'inlet indexes valid')
ok(all(o < bx[s]['numoutlets'] for s, o, _, _ in ln), 'outlet indexes valid')
ids = [x['box']['id'] for x in P['boxes']]
ok(ids.index('bg') < ids.index('slbg') < ids.index('beat1'), 'slider-area panel sits above app bg, below the beat panels')
ok(bx['slbg']['bgcolor'][:3] > bx['bg']['bgcolor'][:3], 'slider area lighter than app background %s vs %s' % (bx['slbg']['bgcolor'][:3], bx['bg']['bgcolor'][:3]))
ok(bx['slbg']['presentation_rect'][0] <= 10 and bx['slbg']['presentation_rect'][0]+bx['slbg']['presentation_rect'][2] >= 390 and bx['slbg']['presentation_rect'][1] <= 30 and bx['slbg']['presentation_rect'][1]+bx['slbg']['presentation_rect'][3] >= 148, 'panel covers all 16 sliders and the STEP strip')
ok(bx['modetab']['presentation_rect'][0] >= 412 and bx['modetab']['presentation_rect'][1]+bx['modetab']['presentation_rect'][3] <= 28, 'MODE tab fits in free top-right strip, no overlap with readouts')
# clock logic: step = ((bar-1)*4+(beat-1))*4 + int((units+60)/120), %16   (units 480/beat)
def step(bar, beat, units): return ((((bar-1)*4+(beat-1))*4+int((units+60.)/120.)) % 16)
seq = []
for n in range(40):
    sixteenths = n; bar = sixteenths//16+1; beat = (sixteenths//4) % 4+1; u = (sixteenths % 4)*120 - 5  # tick slightly early
    seq.append(step(bar, beat, max(u, 0) if u >= 0 else 0))
ok(seq == [n % 16 for n in range(40)], 'RUN: 40 consecutive 16th ticks -> steps 0..15 wrapping, no skips')
print('FAILED' if fails else 'ALL OK'); sys.exit(1 if fails else 0)
