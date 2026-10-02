import json, struct, collections
from genexpr import code, DEFAULTS, HEADS
VERSION = 'v0.5.5'
boxes, lines = [], []
def box(bid, maxclass, text=None, ins=1, outs=1, rect=None, pres=None, **extra):
    rect = rect or (1500 + (len(boxes) % 20) * 60, 20 + (len(boxes) // 20) * 30, 50, 22)
    b = {'id': bid, 'varname': bid, 'maxclass': maxclass, 'numinlets': ins, 'numoutlets': outs,
         'outlettype': [''] * outs, 'patching_rect': list(rect)}
    if text is not None: b['text'] = text
    if pres: b['presentation'] = 1; b['presentation_rect'] = list(pres)
    b.update(extra); boxes.append({'box': b}); return b
def line(src, so, dst, di): lines.append({'patchline': {'source': [src, so], 'destination': [dst, di]}})
def pv(longname, short, typ, lo=0, hi=1, init=0, unit=1, enum=None, invisible=0, expo=1.0):
    v = {'parameter_longname': longname, 'parameter_shortname': short, 'parameter_type': typ,
         'parameter_initial_enable': 1, 'parameter_initial': [init], 'parameter_invisible': invisible}
    if enum: v.update(parameter_enum=enum, parameter_mmax=len(enum) - 1)
    else: v.update(parameter_mmin=lo, parameter_mmax=hi, parameter_unitstyle=unit, parameter_exponent=expo)
    return {'parameter_enable': 1, 'saved_attribute_attributes': {'valueof': v}}

INK   = [0.105, 0.102, 0.118, 1.0]; MID = [0.235, 0.235, 0.255, 1.0]; SHADE = [0.155, 0.150, 0.172, 1.0]
SHU   = [0.878, 0.282, 0.192, 1.0]; GOLD = [0.867, 0.690, 0.357, 1.0]
PAPER = [0.937, 0.906, 0.847, 1.0]; DIM = [0.760, 0.740, 0.710, 1.0]
HCOL  = {'a': [0.30, 0.82, 0.92, 1.0], 'b': [1.00, 0.58, 0.52, 1.0], 'c': [1.00, 0.74, 0.28, 1.0], 'd': [0.76, 0.64, 1.00, 1.0]}
dark  = lambda c: [c[i] * 0.5 + MID[i] * 0.5 for i in range(3)] + [1.0]      # loop band: head colour, half strength
def label(bid, text, pres, col=DIM, size=8.0, bold=1, **kw):
    box(bid, 'comment', text, 1, 0, None, pres, textcolor=col, fontsize=size, fontface=bold, **kw)

# ================= engine =================
NOUT = 16
gp = {'fileversion': 1, 'appversion': {'major': 8, 'minor': 6, 'revision': 0, 'architecture': 'x64', 'modernui': 1},
      'classnamespace': 'dsp.gen', 'rect': [60.0, 60.0, 900.0, 640.0], 'default_fontsize': 12.0, 'default_fontface': 0,
      'default_fontname': 'Arial', 'gridsize': [15.0, 15.0],
      'boxes': [{'box': {'id': 'g-in', 'maxclass': 'newobj', 'text': 'in 1', 'numinlets': 0, 'numoutlets': 1, 'outlettype': [''], 'patching_rect': [20, 15, 30, 22]}},
                {'box': {'id': 'g-code', 'maxclass': 'codebox', 'code': code(), 'fontface': 0, 'fontname': '<Monospaced>', 'fontsize': 12.0,
                         'numinlets': 0, 'numoutlets': NOUT, 'outlettype': [''] * NOUT, 'patching_rect': [20, 50, 840, 500]}}]
               + [{'box': {'id': f'g-o{k}', 'maxclass': 'newobj', 'text': f'out {k}', 'numinlets': 1, 'numoutlets': 0,
                           'patching_rect': [20 + (k - 1) * 110, 580, 40, 22]}} for k in range(1, NOUT + 1)],
      'lines': [{'patchline': {'source': ['g-code', k - 1], 'destination': [f'g-o{k}', 0]}} for k in range(1, NOUT + 1)]}
g = box('gen', 'newobj', 'gen~', 1, NOUT, (20, 700, 60, 22), patcher=gp); g['outlettype'] = ['signal'] * NOUT
box('out', 'newobj', 'plugout~', 2, 0, (20, 740, 60, 22)); line('gen', 0, 'out', 0); line('gen', 1, 'out', 1)

# ================= init / scripting =================
box('ld', 'newobj', 'live.thisdevice', 1, 3, (20, 20, 90, 22))
box('init', 'newobj', 't b b b b', 1, 4, (20, 50, 80, 22))
box('m_src', 'message', 'src ---gran2src', 2, 1, (160, 80, 110, 22))
box('m_selA', 'message', '0', 2, 1, (320, 80, 30, 22))
box('dfl', 'newobj', 'deferlow', 1, 1, (900, 700, 60, 22))
box('tp', 'newobj', 'thispatcher', 1, 2, (900, 730, 70, 22))
line('dfl', 0, 'tp', 0)
line('ld', 0, 'init', 0); line('init', 3, 'm_src', 0); line('m_src', 0, 'gen', 0)

# ================= sample =================
W, H, Y0, Y1 = 660, 169, 24, 165
WX, WW = 10, 250                                          # waveform / lanes x-range
box('drop', 'live.drop', None, 1, 2, (400, 40, 150, 40), (WX, 48, WW, 64),
    legend='', bgcolor=[0.0, 0.0, 0.0, 0.0], bordercolor=[0.0, 0.0, 0.0, 0.0], textcolor=[0.0, 0.0, 0.0, 0.0], activebgcolor=[0.0, 0.0, 0.0, 0.0], focusbordercolor=GOLD)
label('drophint', 'drop a sample onto the waveform  \u00b7  or', (WX, 30, 190, 14), DIM, 7.5, 0)
lb = box('load', 'live.text', None, 1, 2, (560, 40, 50, 16), (WX + WW - 52, 28, 52, 17), mode=0, texton='LOAD', fontsize=9.0, fontface=1,
         bgcolor=SHADE, bgoncolor=GOLD, activebgcolor=SHADE, activebgoncolor=GOLD, textcolor=PAPER, textoncolor=INK,
         activetextcolor=PAPER, activetextoncolor=INK, bordercolor=GOLD, focusbordercolor=GOLD, **pv('Load', 'Load', 2, init=0, enum=['off', 'on'], invisible=2))
lb['text'] = 'LOAD'
box('loadsel', 'newobj', 'route bang 1', 3, 3, (560, 65, 80, 22))
box('m_dialog', 'message', 'replace', 2, 1, (560, 90, 60, 22))
line('load', 0, 'loadsel', 0); line('loadsel', 0, 'm_dialog', 0); line('loadsel', 1, 'm_dialog', 0); line('m_dialog', 0, 'buf', 0)
box('nobang', 'newobj', 'route bang', 2, 2, (400, 115, 70, 22))
box('repl', 'newobj', 'prepend replace', 1, 1, (400, 140, 100, 22))
box('buf', 'newobj', 'buffer~ ---gran2src', 1, 2, (400, 165, 130, 22))
box('loaded', 'newobj', 't b b b', 1, 3, (400, 190, 60, 22))
box('info', 'newobj', 'info~ ---gran2src', 1, 10, (400, 215, 120, 22))
box('bsr', 'newobj', 'prepend bsr', 1, 1, (400, 240, 80, 22))
box('m_set', 'message', 'set ---gran2src', 2, 1, (540, 215, 110, 22))
box('wave', 'waveform~', None, 5, 6, (540, 250, 200, 80), (WX, 48, WW, 64),
    background=1, ruler=0, vlabels=0, bgcolor=SHADE, waveformcolor=[0.50, 0.49, 0.53, 1.0], bordercolor=INK, selectioncolor=[0.867, 0.690, 0.357, 0.25])
line('drop', 0, 'nobang', 0); line('nobang', 1, 'repl', 0); line('repl', 0, 'buf', 0)
line('buf', 1, 'loaded', 0)
line('loaded', 2, 'info', 0); line('info', 0, 'bsr', 0); line('bsr', 0, 'gen', 0)
line('loaded', 1, 'm_set', 0); line('m_set', 0, 'wave', 0); line('loaded', 0, 'm_src', 0)

# ================= MIDI: note stack, last held note wins =================
# The held keys live in one list, newest first, always ending with the sentinel -1 (so it is never empty).
# note-on:  remove the pitch if present, put it in front.   note-off: remove the pitch.
# Front of the list = pitch to play; front == -1 means no key is held -> gate closes, the cloud rings out.
box('min', 'newobj', 'midiin', 1, 1, (700, 20, 50, 22)); box('mp', 'newobj', 'midiparse', 1, 8, (700, 45, 90, 22))
box('unp', 'newobj', 'unpack i i', 1, 2, (700, 70, 60, 22))
box('isOn', 'newobj', '> 0', 2, 1, (760, 95, 30, 22))
box('plus1', 'newobj', '+ 1', 2, 1, (760, 120, 30, 22))
box('route2', 'newobj', 'gate 2', 2, 2, (700, 150, 50, 22))
line('min', 0, 'mp', 0); line('mp', 0, 'unp', 0)
line('unp', 1, 'isOn', 0); line('isOn', 0, 'plus1', 0); line('plus1', 0, 'route2', 0)   # velocity first: 1 = off path, 2 = on path
line('unp', 0, 'route2', 1)
box('stack', 'newobj', 'zl reg', 2, 2, (700, 330, 50, 22))
box('filt', 'newobj', 'zl filter', 2, 2, (700, 360, 60, 22))
line('stack', 0, 'filt', 0)
# off path: pitch -> filter's right inlet, then bang the stack through the filter
box('offT', 'newobj', 't b i', 1, 2, (700, 185, 40, 22))
box('offPre', 'newobj', 't i b', 1, 2, (700, 170, 40, 22)); line('route2', 0, 'offPre', 0); line('offPre', 0, 'offT', 0); line('offT', 1, 'filt', 1); line('offT', 0, 'stack', 0)
# on path: pitch -> filter right, pitch -> held int, bang stack; filtered list goes behind the new pitch
box('onT', 'newobj', 't b i i', 1, 3, (800, 185, 60, 22))
box('newp', 'newobj', 'i', 2, 1, (800, 215, 30, 22))
box('filtT', 'newobj', 't b l', 1, 2, (800, 400, 40, 22))
box('join', 'newobj', 'zl join', 2, 2, (800, 430, 50, 22))
box('onGate', 'newobj', 'gate 1 0', 2, 1, (700, 395, 60, 22))     # filter output goes to join only on the on path
box('offGate', 'newobj', 'gate 1 1', 2, 1, (760, 395, 60, 22))
box('onPre', 'newobj', 't i b', 1, 2, (800, 170, 40, 22)); line('route2', 1, 'onPre', 0); line('onPre', 0, 'onT', 0); line('onT', 2, 'filt', 1); line('onT', 1, 'newp', 1); line('onT', 0, 'stack', 0)
box('m_on', 'message', '1', 2, 1, (860, 160, 30, 22)); box('m_off', 'message', '0', 2, 1, (900, 160, 30, 22))
# before each path fires, point the filter output at the right branch
line('onPre', 1, 'm_on', 0); line('offPre', 1, 'm_off', 0)
line('m_on', 0, 'onGate', 0); line('m_off', 0, 'onGate', 0)
box('inv', 'newobj', '== 0', 2, 1, (940, 185, 40, 22)); line('m_on', 0, 'inv', 0); line('m_off', 0, 'inv', 0); line('inv', 0, 'offGate', 0)
line('filt', 0, 'onGate', 1); line('filt', 0, 'offGate', 1)
line('onGate', 0, 'filtT', 0); line('filtT', 1, 'join', 1); line('filtT', 0, 'newp', 0); line('newp', 0, 'join', 0)
# whichever path produced the new list: store it, then evaluate its front
box('newList', 'newobj', 't l l', 1, 2, (700, 470, 50, 22))
line('join', 0, 'newList', 0); line('offGate', 0, 'newList', 0)
line('newList', 1, 'stack', 1)
box('front', 'newobj', 'zl slice 1', 2, 2, (700, 500, 70, 22))
box('none', 'newobj', 'sel -1', 2, 2, (700, 530, 50, 22))
box('m_g0', 'message', '0', 2, 1, (700, 560, 30, 22))
box('play', 'newobj', 't b i', 1, 2, (760, 560, 40, 22))
box('m_g1', 'message', '1', 2, 1, (760, 590, 30, 22))
box('m60', 'newobj', '- 60', 2, 1, (810, 590, 40, 22)); box('tr', 'newobj', 'prepend transp', 1, 1, (810, 620, 100, 22))
box('gate', 'newobj', 'prepend gate', 1, 1, (700, 650, 90, 22))
line('newList', 0, 'front', 0); line('front', 0, 'none', 0)
line('none', 0, 'm_g0', 0); line('m_g0', 0, 'gate', 0)
line('none', 1, 'play', 0); line('play', 1, 'm60', 0); line('m60', 0, 'tr', 0); line('tr', 0, 'gen', 0)   # pitch first
line('play', 0, 'm_g1', 0); line('m_g1', 0, 'gate', 0); line('gate', 0, 'gen', 0)                            # then the gate
# reset: empty stack (just the sentinel), gate closed
box('m_clear', 'message', '-1', 2, 1, (960, 330, 30, 22))
line('init', 1, 'm_clear', 0); line('m_clear', 0, 'stack', 1)
box('m_zero', 'message', '0', 2, 1, (280, 80, 30, 22)); line('init', 1, 'm_zero', 0); line('m_zero', 0, 'gate', 0)

# ================= playhead lanes under the waveform =================
box('snapdur', 'newobj', 'snapshot~ 250', 2, 1, (900, 780, 90, 22)); line('gen', 2, 'snapdur', 0)
LY, LH = 116, 12                                           # lane r spans y LY + r*LH .. +LH
for r, h in enumerate(HEADS):
    y = LY + r * LH
    label(f'ln_{h}', h.upper(), (WX + WW + 3, y - 1, 10, 12), HCOL[h], 8)
    # loop band (from START/END) and playhead marker (from the engine); marker is taller, so it stays visible on the band
    box(f'bd_{h}', 'panel', None, 1, 0, None, (WX, y + 4, WW, 3), ignoreclick=1, bgcolor=dark(HCOL[h]),
        bgfillcolor_type='color', bgfillcolor_color=dark(HCOL[h]), border=0, rounded=0, mode=0)
    box(f'mk_{h}', 'live.line', None, 1, 0, None, (WX, y, 4, LH - 1), ignoreclick=1, linecolor=HCOL[h], thickness=2.0, justification=1)
    box(f'snap_{h}', 'newobj', 'snapshot~ 40', 2, 1, (1000 + r * 120, 700, 80, 22))
    box(f'ov_{h}', 'live.line', None, 1, 0, None, (WX, 48, 3, 64), ignoreclick=1, linecolor=HCOL[h], thickness=1.0, justification=1)
    # exact position in seconds, in the head's colour
    box(f'sec_{h}', 'newobj', '* 0.', 2, 1, (1000 + r * 120, 1020, 40, 22))
    box(f'tm_{h}', 'flonum', None, 1, 2, (1000 + r * 120, 1045, 50, 22), (WX + WW + 14, y, 44, 12), fontsize=8.5, fontface=1,
        numdecimalplaces=1, format=6, textcolor=HCOL[h], bgcolor=MID, bordercolor=MID, triangle=0, ignoreclick=1)
    line(f'snap_{h}', 0, f'sec_{h}', 0); line(f'sec_{h}', 0, f'tm_{h}', 0); line('snapdur', 0, f'sec_{h}', 1)
    box(f'mx_{h}', 'newobj', f'expr int({WX - 1}. + min(max($f1\\, 0.)\\, 1.) * {WW - 2}.)', 1, 1, (1000 + r * 120, 730, 110, 22))
    box(f'mkm_{h}', 'message', f'script sendbox mk_{h} presentation_rect $1 {y} 4 {LH - 1}, script sendbox ov_{h} presentation_rect $1 48 3 64', 2, 1, (1000 + r * 120, 760, 110, 22))
    line('gen', 4 + r, f'snap_{h}', 0); line(f'snap_{h}', 0, f'mx_{h}', 0); box(f'ch_{h}', 'newobj', 'change', 1, 3, (1000 + r * 120, 745, 50, 22))
    line(f'mx_{h}', 0, f'ch_{h}', 0); line(f'ch_{h}', 0, f'mkm_{h}', 0); line(f'mkm_{h}', 0, 'dfl', 0)
    # band geometry from START / END
    box(f'pk_{h}', 'newobj', 'pak 0. 100.', 2, 1, (1000 + r * 120, 800, 80, 22))
    box(f'tb_{h}', 'newobj', 't l l', 1, 2, (1000 + r * 120, 825, 50, 22))
    box(f'bx_{h}', 'newobj', f'expr {WX}. + $f1 * {WW}. / 100.', 2, 1, (1000 + r * 120, 850, 110, 22))
    box(f'bw_{h}', 'newobj', f'expr max(2.\\, ($f2 - $f1) * {WW}. / 100.)', 2, 1, (1060 + r * 120, 875, 110, 22))
    box(f'bp_{h}', 'newobj', 'pack 0. 0.', 2, 1, (1000 + r * 120, 900, 70, 22))
    box(f'bdm_{h}', 'message', f'script sendbox bd_{h} presentation_rect $1 {y + 4} $2 3', 2, 1, (1000 + r * 120, 925, 110, 22))
    line(f'pk_{h}', 0, f'tb_{h}', 0); line(f'tb_{h}', 1, f'bw_{h}', 0); line(f'tb_{h}', 0, f'bx_{h}', 0)
    line(f'bw_{h}', 0, f'bp_{h}', 1); line(f'bx_{h}', 0, f'bp_{h}', 0); line(f'bp_{h}', 0, f'bdm_{h}', 0); line(f'bdm_{h}', 0, 'dfl', 0)
    # head off -> its lane goes dark
    box(f'off_{h}', 'newobj', '== 0', 2, 1, (1000 + r * 120, 960, 40, 22))
    box(f'hid_{h}', 'message', f'script sendbox mk_{h} hidden $1, script sendbox bd_{h} hidden $1, script sendbox ov_{h} hidden $1, script sendbox tm_{h} hidden $1', 2, 1, (1000 + r * 120, 985, 110, 22))
    line(f'off_{h}', 0, f'hid_{h}', 0); line(f'hid_{h}', 0, 'dfl', 0)

# ================= head selector + knobs =================
KX, KY = 324, 28
SPEED_POS = {10: 40, 5: 31, 8: 37, 12: 42}
KNOBS = [  # key, shortname, lo, hi, unitstyle, exponent, row, col   (live.dial unitstyles: 1 float 2 ms 3 Hz 5 % 7 st)
    ('start', 'Start', 0, 100, 5, 1.0, 0, 0), ('end', 'End', 0, 100, 5, 1.0, 0, 1), ('vol', 'Level', 0, 1.5, 1, 1.0, 0, 2),
    ('pitch', 'Pitch', -24, 24, 7, 1.0, 0, 3), ('pan', 'Pan', -1, 1, 1, 1.0, 0, 4),
    ('size', 'Size', 10, 1000, 2, 2.0, 1, 0), ('dens', 'Density', 1, 50, 3, 1.5, 1, 1), ('scat', 'Scatter', 0, 1, 1, 2.0, 1, 2),
    ('drift', 'Speed', -100, 100, 0, 1.0, 1, 3), ('lfo', 'LFO', 0, 1, 1, 2.0, 1, 4)]
DW, DH = 48, 54
TOG = [('en', 'OFF', 'ON', 'On', ['off', 'on']), ('loop', 'ONE', 'LOOP', 'Loop', ['one-shot', 'loop'])]
sel_msgs = {h: [] for h in HEADS}
for r, h in enumerate(HEADS):
    # selector tab
    t = box(f'tab_{h}', 'live.text', None, 1, 2, (600 + r * 50, 400, 40, 18), (KX + r * 40, KY, 36, 18), mode=1,
            texton=h.upper(), fontsize=10.0, fontface=1, bgcolor=SHADE, bgoncolor=HCOL[h], activebgcolor=SHADE,
            activebgoncolor=HCOL[h], textcolor=HCOL[h], textoncolor=INK, activetextcolor=HCOL[h], activetextoncolor=INK,
            bordercolor=HCOL[h], focusbordercolor=HCOL[h], **pv(f'Show {h.upper()}', h.upper(), 2, init=0, enum=['off', 'on'], invisible=2))
    t['text'] = h.upper()
    box(f'tsel_{h}', 'newobj', 't b', 1, 1, (600 + r * 50, 425, 30, 22))
    box(f'tidx_{h}', 'message', str(r), 2, 1, (600 + r * 50, 450, 30, 22))
    line(f'tab_{h}', 0, f'tsel_{h}', 0); line(f'tsel_{h}', 0, f'tidx_{h}', 0)
    ctrl_ids = []
    for c, (key, lab, labon, pname, enum) in enumerate(TOG):
        bid = f'{h}_{key}'; ctrl_ids.append(bid)
        b = box(bid, 'live.text', None, 1, 2, (1100 + c * 50, 40 + r * 30, 44, 18), (KX + 164 + c * 40, KY, 36, 18), mode=1,
                texton=labon, fontsize=9.0, fontface=1, bgcolor=SHADE, bgoncolor=HCOL[h], activebgcolor=SHADE, activebgoncolor=HCOL[h],
                textcolor=PAPER, textoncolor=INK, activetextcolor=PAPER, activetextoncolor=INK, bordercolor=INK, focusbordercolor=GOLD,
                **pv(f'{h.upper()} {pname}', pname, 2, init=1, enum=enum))
        b['text'] = lab
    for key, short, lo, hi, unit, expo, row, col in KNOBS:
        bid = f'{h}_{key}'; ctrl_ids.append(bid)
        box(bid, 'live.dial', None, 1, 2, (1100 + (len(ctrl_ids) % 12) * 55, 40 + r * 60, 44, 48),
            (KX + col * DW, KY + 22 + row * DH, DW - 2, DH - 2), showname=1, shownumber=0 if key == 'drift' else 1, fontsize=8.5,
            activedialcolor=HCOL[h], dialcolor=SHADE, activeneedlecolor=PAPER, needlecolor=PAPER,
            textcolor=PAPER, activetextcolor=PAPER, focusbordercolor=GOLD,
            **pv(f'{h.upper()} {short}', short, 1 if key in ('pitch', 'dens', 'drift') else 0, lo, hi,
                 SPEED_POS[DEFAULTS[key][r]] if key == 'drift' else DEFAULTS[key][r], unit, expo=expo))
        if key == 'drift':                     # real speed in %, shown under the knob
            box(f'{h}_spdval', 'flonum', None, 1, 2, None, (KX + col * DW + 4, KY + 22 + row * DH + DH - 16, DW - 10, 13),
                fontsize=8.5, fontface=1, numdecimalplaces=1, format=6, textcolor=PAPER, bgcolor=MID, bordercolor=MID,
                triangle=0, ignoreclick=1, **({'hidden': 1} if h != 'a' else {}))
    for bid in ctrl_ids:
        if h != 'a': ids_ = {x['box']['id']: x['box'] for x in boxes}; ids_[bid]['hidden'] = 1
        key = bid[2:]
        box(f'p_{bid}', 'newobj', f'prepend {bid}', 1, 1, None)
        if key == 'drift':
            box(f'sx_{bid}', 'newobj', 'expr (($i1 > 0) - ($i1 < 0)) * 0.5 * pow(2000.\\, (abs($i1) - 1.) / 99.)', 1, 1, None)
            line(bid, 0, f'sx_{bid}', 0); line(f'sx_{bid}', 0, f'p_{bid}', 0); line(f'sx_{bid}', 0, f'{h}_spdval', 0)
        else: line(bid, 0, f'p_{bid}', 0)
        line(f'p_{bid}', 0, 'gen', 0)
        if key not in ('en', 'loop'): line('init', 0, bid, 0)      # a bang flips a toggle, so toggles are never banged
    line(f'{h}_start', 0, f'pk_{h}', 0); line(f'{h}_end', 0, f'pk_{h}', 1); line(f'{h}_en', 0, f'off_{h}', 0)
    for k, hh in enumerate(HEADS):                         # when head r is selected: show r's controls, hide the rest
        sel_msgs[hh] += [f'script sendbox {cid} hidden {0 if hh == h else 1}' for cid in ctrl_ids]
        sel_msgs[hh] += [f'script sendbox {h}_spdval hidden {0 if hh == h else 1}']
# selection: index -> one message box per head (shows its controls) + tab states
box('selr', 'newobj', 'route 0 1 2 3', 2, 5, (600, 490, 110, 22))
for r, h in enumerate(HEADS):
    line(f'tidx_{h}', 0, 'selr', 0)
    box(f'show_{h}', 'message', ', '.join(sel_msgs[h] + [f'script sendbox tab_{x} hidden 0' for x in HEADS]), 2, 1, (600 + r * 60, 520, 50, 22))
    box(f'tabs_{h}', 'message', 'set 1' if True else '', 2, 1, None)
    line('selr', r, f'show_{h}', 0); line(f'show_{h}', 0, 'dfl', 0)
    for x in HEADS:                                        # radio behaviour for the four tabs
        mid = f'ts_{h}_{x}'
        box(mid, 'message', f'set {1 if x == h else 0}', 2, 1, None)
        line('selr', r, mid, 0); line(mid, 0, f'tab_{x}', 0)
boxes[:] = [b for b in boxes if not b['box']['id'].startswith('tabs_')]
box('seldefer', 'newobj', 'deferlow', 1, 1, (330, 110, 60, 22))
line('init', 0, 'seldefer', 0); line('seldefer', 0, 'm_selA', 0); line('m_selA', 0, 'selr', 0)   # head A shown after load
# the route passes a bang-less "0"? route with a bare number outputs a bang on the matching outlet: message boxes accept bang
# ================= globals =================
RX = KX + 5 * DW + 10                                     # right column
g = box('hold', 'live.text', None, 1, 2, (1000, 500, 50, 20), (RX, KY, 64, 20), mode=1, texton='HOLD', fontsize=9.5, fontface=1,
        bgcolor=SHADE, bgoncolor=GOLD, activebgcolor=SHADE, activebgoncolor=GOLD, textcolor=PAPER, textoncolor=INK,
        activetextcolor=PAPER, activetextoncolor=INK, bordercolor=GOLD, focusbordercolor=GOLD, **pv('Hold', 'Hold', 2, init=0, enum=['off', 'on']))
g['text'] = 'HOLD'
box('master', 'live.dial', None, 1, 2, (1060, 500, 44, 48), (RX + 8, KY + 24, DW, DH - 2), showname=1, shownumber=1, fontsize=8.5,
    activedialcolor=GOLD, dialcolor=SHADE, activeneedlecolor=PAPER, needlecolor=PAPER, textcolor=PAPER, activetextcolor=PAPER,
    focusbordercolor=GOLD, **pv('Master', 'Master', 0, 0.0, 4.0, 1.0, 1))
for bid in ('hold', 'master'):
    box(f'p_{bid}', 'newobj', f'prepend {bid}', 1, 1, None); line(bid, 0, f'p_{bid}', 0); line(f'p_{bid}', 0, 'gen', 0)
    if bid != 'hold': line('init', 0, bid, 0)
label('lnote', 'NOTE', (RX, KY + 84, 34, 14))
box('note', 'number', None, 1, 2, (860, 130, 50, 22), (RX + 32, KY + 82, 34, 18), format=4, fontsize=11.0, fontface=1,
    textcolor=PAPER, bgcolor=MID, bordercolor=MID, triangle=0, ignoreclick=1)
line('play', 1, 'note', 0)
label('lvoc', 'VOICES', (RX, KY + 104, 40, 14))
box('dvoc', 'number', None, 1, 2, (220, 770, 50, 22), (RX + 40, KY + 102, 28, 18), fontsize=10.0, fontface=1,
    textcolor=PAPER, bgcolor=MID, bordercolor=MID, triangle=0, ignoreclick=1)
box('snap4', 'newobj', 'snapshot~ 250', 2, 1, (220, 740, 90, 22)); line('gen', 3, 'snap4', 0); line('snap4', 0, 'dvoc', 0)
box('meter', 'live.meter~', None, 1, 5, (320, 740, 60, 10), (RX, KY + 124, 64, 8), orientation=0)
line('gen', 0, 'meter', 0)

numstyle = dict(bgcolor=SHADE, activebgcolor=SHADE, textcolor=PAPER, activetextcolor=PAPER, tricolor=GOLD, activetricolor=GOLD, bordercolor=INK, focusbordercolor=GOLD, fontsize=9.0)
# ================= sends: every head as its own stereo signal for "gran2 return" devices =================
box('sid', 'live.numbox', None, 1, 2, (1400, 900, 40, 17), (W - 40, 5, 32, 15), **numstyle, **pv('Send ID', 'Send ID', 1, 1, 16, 1, 0))
label('lsid', 'SEND ID', (W - 92, 6, 50, 14), DIM, 8)
line('init', 0, 'sid', 0)
# the bus: a shared buffer~ the engine writes (A..D + sum + index) and every "gran2 listen" reads
box('busbuf', 'newobj', 'buffer~ gran2bus_1 200 11', 1, 2, (1400, 930, 170, 22))
box('sf_name', 'newobj', 'sprintf name gran2bus_%ld', 1, 1, (1400, 960, 170, 22))
box('sf_bus', 'newobj', 'sprintf bus gran2bus_%ld', 1, 1, (1580, 960, 170, 22))
line('sid', 0, 'sf_bus', 0); line('sid', 0, 'sf_name', 0); line('sf_name', 0, 'busbuf', 0); line('sf_bus', 0, 'gen', 0)

# ================= frame: flat, non-overlapping tiles =================
def panel(bid, rect, colr):
    box(bid, 'panel', None, 1, 0, None, rect, background=1, ignoreclick=1, bgcolor=colr, bgfillcolor_type='color',
        bgfillcolor_color=colr, border=0, rounded=0, mode=0)
tiles = [('strip', (0, 0, W, 3), SHU), ('top', (0, 3, W, Y0 - 3), INK), ('bottom', (0, Y1, W, H - Y1), INK),
         ('left', (0, Y0, 4, Y1 - Y0), INK), ('right', (W - 4, Y0, 4, Y1 - Y0), INK),
         # plate around the waveform, with a hole where the waveform sits (it lives in the background layer itself)
         ('plateT', (4, Y0, 314, 48 - Y0), MID), ('plateL', (4, 48, WX - 4, 64), MID), ('plateR', (WX + WW, 48, 318 - WX - WW, 64), MID),
         ('plateB', (4, 112, 314, Y1 - 112), MID), ('div1', (318, Y0, 1, Y1 - Y0), INK),
         ('knobs', (319, Y0, RX - 6 - 319, Y1 - Y0), MID), ('div2', (RX - 6, Y0, 1, Y1 - Y0), INK), ('side', (RX - 5, Y0, W - 4 - (RX - 5), Y1 - Y0), MID)]
for t in tiles: panel(*t)
for i, (a, ra, _) in enumerate(tiles):
    for b2, rb, _ in tiles[i + 1:]:
        assert not (min(ra[0] + ra[2], rb[0] + rb[2]) > max(ra[0], rb[0]) and min(ra[1] + ra[3], rb[1] + rb[3]) > max(ra[1], rb[1])), (a, b2)
for _n, _r, _ in tiles:
    assert not (min(_r[0] + _r[2], WX + WW) > max(_r[0], WX) and min(_r[1] + _r[3], 112) > max(_r[1], 48)), ('tile under waveform', _n)
assert sum(r[2] * r[3] for _, r, _ in tiles) + WW * 64 == W * H     # everything covered except the waveform hole
label('title', 'gran2', (8, 3, 80, 22), PAPER, 15)
label('sub', f'granular  ·  4 heads  ·  MIDI transposes (C3 = original)  ·  {VERSION}', (64, 8, 420, 16), GOLD, 9)

# ================= checks =================
boxes.sort(key=lambda x: 0 if x['box']['id'].startswith('ov_') else 1)
dup = [k for k, n in collections.Counter(b['box']['id'] for b in boxes).items() if n > 1]; assert not dup, dup
ids = {b['box']['id']: b['box'] for b in boxes}
for l in lines:
    (s, so), (d, di) = l['patchline']['source'], l['patchline']['destination']
    assert s in ids and d in ids and so < ids[s]['numoutlets'] and di < ids[d]['numinlets'], (s, so, d, di)
names = [b['box']['saved_attribute_attributes']['valueof']['parameter_longname'] for b in boxes if 'saved_attribute_attributes' in b['box']]
assert len(names) == len(set(names)) == 48 + 2 + 4 + 1 + 1, len(names)
gparams = {l.split('(')[0].split()[1] for l in code().splitlines() if l.startswith('Param ')}
sent = {b['box']['text'].split()[1] for b in boxes if b['box'].get('text', '').startswith('prepend ') and b['box']['text'] != 'prepend replace'}
assert sent <= gparams, sent - gparams
scripted = set()
for b in boxes:
    t = b['box'].get('text', '')
    for part in t.split(','):
        w = part.split()
        if len(w) > 2 and w[0] == 'script' and w[1] == 'sendbox': scripted.add(w[2])
assert scripted <= set(ids), scripted - set(ids)
def lum(c):
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
def ratio(a, b): x, y = sorted((lum(a), lum(b)), reverse=True); return (x + 0.05) / (y + 0.05)
def surface(bx):
    X, Y, w, h = bx['presentation_rect']; cx, cy = X + w / 2, Y + h / 2
    for _, (px_, py, pw, ph), colr in tiles:
        if px_ <= cx < px_ + pw and py <= cy < py + ph: return colr
audit = []
for bx in [b['box'] for b in boxes if b['box'].get('presentation')]:
    m = bx['maxclass']
    if m in ('comment', 'number', 'flonum'): audit.append((bx['id'], bx['textcolor'], surface(bx)))
    if m == 'live.dial': audit.append((bx['id'] + ':text', bx['textcolor'], surface(bx)))
    for tk, bk in (('textcolor', 'bgcolor'), ('activetextcolor', 'activebgcolor'), ('textoncolor', 'bgoncolor'), ('activetextoncolor', 'activebgoncolor')):
        if m == 'live.text' and tk in bx and bk in bx: audit.append((bx['id'] + ':' + tk, bx[tk], bx[bk]))
low = [(i, round(ratio(t, b), 2)) for i, t, b in audit if ratio(t, b) < 4.5]
print('contrast pairs', len(audit), 'worst', round(min(ratio(t, b) for _, t, b in audit), 2), 'low', low); assert not low
over = [b['box']['id'] for b in boxes if b['box'].get('presentation') and (b['box']['presentation_rect'][0] + b['box']['presentation_rect'][2] > W or b['box']['presentation_rect'][1] + b['box']['presentation_rect'][3] > H)]
assert not over, over

patcher = {'patcher': {'fileversion': 1, 'appversion': {'major': 8, 'minor': 6, 'revision': 0, 'architecture': 'x64', 'modernui': 1},
    'classnamespace': 'box', 'rect': [80.0, 80.0, 1600.0, 900.0], 'openinpresentation': 1, 'default_fontsize': 10.0,
    'default_fontface': 0, 'default_fontname': 'Arial Bold', 'gridsize': [8.0, 8.0], 'boxes': boxes, 'lines': lines,
    'dependency_cache': [], 'latency': 0, 'is_mpe': 0, 'autosave': 0, 'devicewidth': float(W),
    'description': 'gran2 granular instrument, 4 heads', 'digest': '', 'tags': ''}}
data = json.dumps(patcher, indent='\t').encode('utf-8') + b'\n\x00'
hdr = b'ampf' + struct.pack('<I', 4) + b'iiii' + b'meta' + struct.pack('<I', 4) + struct.pack('<I', 0) + b'ptch' + struct.pack('<I', len(data))
open(f'gran2 {VERSION}.amxd', 'wb').write(hdr + data); open(f'gran2 {VERSION}_engine.genexpr', 'w').write(code())
print(len(boxes), 'boxes', len(lines), 'lines', len(hdr + data), 'bytes; params', len(names))
