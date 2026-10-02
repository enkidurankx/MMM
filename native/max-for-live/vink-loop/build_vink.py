#!/usr/bin/env python3
"""Generates VINK·LOOP, a Max for Live audio effect: a recursive feedback network after the structure in
jaap_vink_recursive_sound_technique.md (supplied by the owner; NOT checked against the video or against Vink's own work).

  python3 build_vink.py  ->  VINK.genexpr, VINK.maxpat, VINK.amxd, VINK_min.amxd, VINK_thru.amxd, preview.svg

Loop (per channel, stereo = two loops with slightly different delay/carrier, see SPREAD):

   seed in / noise burst / noise floor --> MIXER (hub) --> RING MOD --> HP+LP FILTER --> TAPE SATURATION --> DELAY --+--> output
                    ^                                         ^ carrier: sine OR cross-feed (a 2nd tap of the delay)  |
                    +------------------------ x FEEDBACK ---------------------------------------------------------+

Saturation is tanh(drive*x)/drive, so its small-signal gain is 1: FEEDBACK is then (before ring-mod/filter losses) the loop gain,
and 1.0 is the metastable point. The delay is read before it is written (min 20 ms), so no one-sample feedback exists.
"""
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../../age12/m4l")
from build_device import finish  # shared outer-patcher template (same one pc-control / age12 use)

DSZ = 131072          # delay buffer per channel (0.5 s * 1.04 at up to 192 kHz)

# name, longname, short, min, max, default, unitstyle(0 int,1 float,3 Hz,2 time), type(0 float,1 int), exponent
PARAMS = [
    ("seedlvl", "Seed Input",  "Seed",   0.0,  1.0,    0.5,   1, 0, 1.0),
    ("nfloor",  "Noise Floor", "Noise",  0.0,  1.0,    0.25,  1, 0, 1.0),
    ("fbk",     "Feedback",    "Fdbk",   0.0,  1.5,    1.3,   1, 0, 1.0),
    ("ringd",   "Ring Depth",  "Ring",   0.0,  1.0,    0.5,   1, 0, 1.0),
    ("cfreq",   "Carrier",     "Carr",   0.5,  2000.0, 55.0,  3, 0, 3.0),
    ("hpf",     "Low Cut",     "LoCut",  20.0, 400.0,  80.0,  3, 0, 3.0),
    ("lpf",     "High Cut",    "HiCut",  1000.0, 16000.0, 8000.0, 3, 0, 3.0),
    ("satur",   "Tape Drive",  "Drive",  0.0,  1.0,    0.4,   1, 0, 1.0),
    ("dtime",   "Delay Time",  "Delay",  20.0, 500.0,  180.0, 2, 0, 2.0),
    ("wow",     "Wow Flutter", "Wow",    0.0,  1.0,    0.25,  1, 0, 1.0),
    ("spread",  "Stereo Spread", "Sprd", 0.0,  1.0,    0.3,   1, 0, 1.0),
    ("level",   "Output Level", "Level", 0.0,  1.0,    0.5,   1, 0, 1.0),
    ("wetmix",  "Mix",         "Mix",    0.0,  1.0,    1.0,   1, 0, 1.0),
]
DEFAULTS_MSG = ", ".join(f"{p[0]} {p[5]}" for p in PARAMS) + ", cmode 0, burst 0"

def channel(c, inp, out, right):
    sp = "(1 + 0.07 * spr)" if right else "1"
    cs = "(1 + 0.013 * spr)" if right else "1"
    return f"""
// ================= channel {c} =================
// wow / flutter / random drift on the delay time
phA{c} = phA{c} + 0.45 / samplerate; phA{c} = phA{c} - floor(phA{c});
phB{c} = phB{c} + 5.3 / samplerate;  phB{c} = phB{c} - floor(phB{c});
nz{c} = nz{c} + 0.0005 * (noise() - nz{c});
wm{c} = wowd * (0.02 * sin(6.283185307179586 * phA{c}) + 0.006 * sin(6.283185307179586 * phB{c}) + 0.09 * nz{c});
td{c} = tau * {sp} * (1 + wm{c});
td{c} = max(64, min({DSZ} - 8, td{c}));
// two taps of the delay line (read before this sample is written)
rp{c} = w{c} - td{c};
if (rp{c} < 0) {{ rp{c} = rp{c} + {DSZ}; }}
i0{c} = floor(rp{c}); fr{c} = rp{c} - i0{c};
x{c} = peek(db{c}, mod(i0{c}, {DSZ})) * (1 - fr{c}) + peek(db{c}, mod(i0{c} + 1, {DSZ})) * fr{c};
rq{c} = w{c} - td{c} * 0.618;
if (rq{c} < 0) {{ rq{c} = rq{c} + {DSZ}; }}
j0{c} = floor(rq{c}); fq{c} = rq{c} - j0{c};
x2{c} = peek(db{c}, mod(j0{c}, {DSZ})) * (1 - fq{c}) + peek(db{c}, mod(j0{c} + 1, {DSZ})) * fq{c};
// carrier: sine oscillator, or the cross-feed tap
if (crs > 0.5) {{
    car{c} = 0.15 + 0.85 * tanh(3 * drv * x2{c});   // 0.15 = leak of an unbalanced ring modulator, lets the loop start
}} else {{
    cph{c} = cph{c} + cf * {cs} / samplerate; cph{c} = cph{c} - floor(cph{c});
    car{c} = sin(6.283185307179586 * cph{c});
}}
// mixer / hub: seed + noise floor + burst + feedback
hub{c} = {inp} * sl + fbk2 * x{c} + nf * noise() + bg * 0.3 * noise() + 0.0000000001 * noise();
// ring modulator (blend: 0 = bypass, 1 = pure multiplication), power-normalised so that FEEDBACK 1.0 stays the unity point
rmo{c} = hub{c} * (1 - rde + rde * car{c}) * rnorm;
// 2-pole high-pass, 2-pole low-pass
hs1{c} = hs1{c} + hpa * (rmo{c} - hs1{c}); vv{c} = rmo{c} - hs1{c};
hs2{c} = hs2{c} + hpa * (vv{c} - hs2{c});  vv{c} = vv{c} - hs2{c};
ls1{c} = ls1{c} + lpa * (vv{c} - ls1{c});
ls2{c} = ls2{c} + lpa * (ls1{c} - ls2{c});
// tape saturation: soft limiter with unity small-signal gain, peak 1/drive
sv{c} = tanh(drv * ls2{c}) / drv;
poke(db{c}, sv{c}, w{c});
w{c} = mod(w{c} + 1, {DSZ});
// output tap = delay output; x <= 1/drive, so wet <= level
{out} = {inp} * (1 - wmx) + x{c} * drv * lvl * wmx;
"""

def genexpr():
    head = f"""// VINK-LOOP: recursive feedback network (ring modulator + filters + tape saturation + delay in a closed loop), stereo.
// Generated by build_vink.py - edit there, not here.
Param seedlvl(0.5, min=0, max=1);          // how much of the track audio seeds the loop
Param nfloor(0.25, min=0, max=1);          // noise floor injected into the loop (self-start)
Param fbk(1.3, min=0, max=1.5);            // loop gain; ring mod + filters lose energy, so the loop only holds from about 1.2 (measured, see test)
Param ringd(0.5, min=0, max=1);            // ring modulator depth
Param cfreq(55, min=0.5, max=2000);        // carrier oscillator Hz
Param cmode(0, min=0, max=1);              // 0 oscillator, 1 cross-feed (carrier = second delay tap)
Param hpf(80, min=20, max=400);
Param lpf(8000, min=1000, max=16000);
Param satur(0.4, min=0, max=1);
Param dtime(180, min=20, max=500);         // ms
Param wow(0.25, min=0, max=1);
Param spread(0.3, min=0, max=1);
Param level(0.5, min=0, max=1);
Param wetmix(1, min=0, max=1);
Param burst(0, min=0, max=1);              // 1 = inject a noise burst (button holds it ~120 ms)

"""
    state = ""
    for c in "LR":
        state += (f"History phA{c}(0); History phB{c}(0); History nz{c}(0); History cph{c}(0); History w{c}(0);\n"
                  f"History hs1{c}(0); History hs2{c}(0); History ls1{c}(0); History ls2{c}(0);\n"
                  f"Data db{c}({DSZ});\n")
    derived = """
// ---- parameters, clamped so that unset/zero values can never produce inf or NaN ----
sl = max(0, min(1, seedlvl));
nzp = max(0, min(1, nfloor));
nf = nzp * nzp * 0.05;
fbk2 = max(0, min(1.5, fbk));
rd = max(0, min(1, ringd));
cf = max(0.5, min(2000, cfreq));
crs = max(0, min(1, cmode));
rde = rd;
if (crs > 0.5) {
    rde = min(rd, 0.85);   // pure product with its own delayed tap would die; the cross-feed ring is capped
}
rnorm = 1 / sqrt((1 - rde) * (1 - rde) + 0.5 * rde * rde);   // tone: (1-rde) stays, rde/2 per sideband -> unit power
hpa = 1 - exp(-6.283185307179586 * max(20, min(400, hpf)) / samplerate);
lpa = 1 - exp(-6.283185307179586 * max(1000, min(16000, lpf)) / samplerate);
drv = 1 + 5 * max(0, min(1, satur));
tau = max(20, min(500, dtime)) * 0.001 * samplerate;
wowd = max(0, min(1, wow));
spr = max(0, min(1, spread));
lvl = max(0, min(1, level));
wmx = max(0, min(1, wetmix));
bg = max(0, min(1, burst));
"""
    return head + state + derived + channel("L", "in1", "out1", False) + channel("R", "in2", "out2", True)

# ---------------------------------------------------------------- patcher
_id = [0]
PREVIEW = []
def nid():
    _id[0] += 1
    return f"obj-{_id[0]}"
def box(**kw):
    return {"box": kw}
def C(r, g, b, a=1.0):
    return [round(r / 255, 4), round(g / 255, 4), round(b / 255, 4), a]

BG1, BG2, EDGE = C(26, 31, 40), C(13, 16, 21), C(52, 62, 78)
GRP, GRPEDGE = C(20, 25, 33), C(44, 54, 68)
ACC, ACCDARK, WARM = C(122, 228, 204), C(8, 36, 30), C(255, 150, 96)
TXT, DIM = C(220, 228, 236), C(122, 138, 156)
TRACK = C(58, 70, 88)

def build_patcher(code, ui=True, thru=False, label=None, loadbang=False):
    boxes, lines = [], []
    def add(b):
        boxes.append(b); return b["box"]["id"]
    def line(src, so, dst, di):
        lines.append({"patchline": {"destination": [dst, di], "source": [src, so]}})

    gin = [box(id=nid(), maxclass="newobj", text=f"in {i}", numinlets=0, numoutlets=1, outlettype=[""], patching_rect=[30 + 80 * (i - 1), 30, 40, 22]) for i in (1, 2)]
    gcode = box(id=nid(), maxclass="codebox", code=code, numinlets=2, numoutlets=2, outlettype=["", ""],
                patching_rect=[30, 80, 700, 400], fontname="Menlo", fontsize=11.0)
    gout = [box(id=nid(), maxclass="newobj", text=f"out {i}", numinlets=1, numoutlets=0, patching_rect=[30 + 80 * (i - 1), 520, 40, 22]) for i in (1, 2)]
    gboxes = [{"box": b["box"]} for b in gin + [gcode] + gout]
    glines = []
    for i in range(2):
        glines.append({"patchline": {"destination": [gcode["box"]["id"], i], "source": [gin[i]["box"]["id"], 0]}})
        glines.append({"patchline": {"destination": [gout[i]["box"]["id"], 0], "source": [gcode["box"]["id"], i]}})
    if thru:
        gboxes = [b for b in gboxes if b["box"].get("maxclass") != "codebox"]
        glines = [{"patchline": {"destination": [gout[i]["box"]["id"], 0], "source": [gin[i]["box"]["id"], 0]}} for i in range(2)]
    gen_patcher = {
        "fileversion": 1, "appversion": {"major": 8, "minor": 6, "revision": 2, "architecture": "x64", "modernui": 1},
        "classnamespace": "dsp.gen", "rect": [100.0, 100.0, 800.0, 600.0],
        "bglocked": 0, "openinpresentation": 0, "default_fontsize": 12.0, "default_fontface": 0,
        "default_fontname": "Arial", "gridonopen": 1, "gridsize": [15.0, 15.0], "gridsnaponopen": 1,
        "objectsnaponopen": 1, "statusbarvisible": 2, "toolbarvisible": 1, "lefttoolbarpinned": 0,
        "toptoolbarpinned": 0, "righttoolbarpinned": 0, "bottomtoolbarpinned": 0, "toolbars_unpinned_last_save": 0,
        "tallnewobj": 0, "boxanimatetime": 200, "enablehscroll": 1, "enablevscroll": 1, "devicewidth": 0.0,
        "description": "", "digest": "", "tags": "", "style": "", "subpatcher_template": "",
        "assistshowspatchername": 0, "boxes": gboxes, "lines": glines,
    }
    plugin = add(box(id=nid(), maxclass="newobj", text="plugin~", numinlets=2, numoutlets=2, outlettype=["signal", "signal"], patching_rect=[30, 340, 60, 22]))
    gen = add(box(id=nid(), maxclass="newobj", text="gen~", numinlets=2, numoutlets=2, outlettype=["signal", "signal"],
                  patching_rect=[30, 400, 60, 22], patcher=gen_patcher))
    plugout = add(box(id=nid(), maxclass="newobj", text="plugout~", numinlets=2, numoutlets=0, patching_rect=[30, 460, 70, 22]))
    for i in range(2):
        line(plugin, i, gen, i); line(gen, i, plugout, i)
    if not ui:
        add(box(id=nid(), maxclass="comment", text=(label or ("VINK pass-through test:\nshould sound unchanged" if thru else "VINK DSP test (no controls):\ndefaults, feedback 0.9, noise floor on")),
                presentation=1, presentation_rect=[8.0, 6.0, 220.0, 34.0], patching_rect=[150, 340, 220, 34], fontsize=12.0))
        if loadbang:
            lb = add(box(id=nid(), maxclass="newobj", text="loadbang", numinlets=1, numoutlets=1, outlettype=["bang"], patching_rect=[150, 380, 60, 22]))
            lm = add(box(id=nid(), maxclass="message", text=DEFAULTS_MSG, numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[150, 410, 600, 22]))
            line(lb, 0, lm, 0); line(lm, 0, gen, 0)
        return finish(boxes, lines, 240.0, "VINK·LOOP DSP-only test device")

    PREVIEW.clear(); deco = []
    def panel(x, y, w, h, color, border=0, bcolor=None, rounded=0.0, grad=None):
        at = dict(id=nid(), maxclass="panel", background=1, ignoreclick=1, bgcolor=color, border=border, rounded=rounded, mode=0,
                  numinlets=1, numoutlets=0, patching_rect=[800.0 + x, 20.0 + y, float(w), float(h)], presentation=1,
                  presentation_rect=[float(x), float(y), float(w), float(h)])
        if bcolor: at["bordercolor"] = bcolor
        if grad:
            at.update(mode=1, grad1=grad[0], grad2=grad[1], proportion=0.5,
                      bgfillcolor={"angle": 270.0, "autogradient": 0, "color": color, "color1": grad[0], "color2": grad[1], "proportion": 0.5, "type": "gradient"})
        deco.append(box(**at)); PREVIEW.append(("panel", x, y, w, h, color, border, bcolor, rounded, grad))
    def text(x, y, w, h, s_, color, size=8.0, bold=0, just=0):
        add(box(id=nid(), maxclass="comment", text=s_, textcolor=color, fontname="Arial", fontsize=size, fontface=bold,
                textjustification=just, presentation=1, presentation_rect=[float(x), float(y), float(w), float(h)],
                patching_rect=[800.0 + x, 20.0 + y, float(w), float(h)]))
        PREVIEW.append(("text", x, y, w, h, s_, color, size, bold, just))

    W = 562
    panel(0, 0, W, 169, BG2, 1, EDGE, 8.0, grad=(BG1, BG2))
    groups = [(8, 102, 142, "SEED"), (118, 58, 142, "MIXER"), (184, 102, 142, "RING MOD"), (294, 102, 74, "FILTER"), (404, 150, 74, "TAPE / DELAY"), (294, 260, 0, "")]
    for x, w, h, name in groups:
        if h:
            panel(x, 6, w, h, GRP, 1, GRPEDGE, 5.0)
            text(x + 6, 8, w - 12, 11, name, ACC, 8.0, 1)
    panel(294 + 0, 84, 260, 64, GRP, 1, GRPEDGE, 5.0)
    text(300, 86, 40, 11, "OUT", ACC, 8.0, 1)
    for gx in (112, 178, 288, 398):                                # flow arrows between the blocks
        text(gx - 2, 62, 12, 14, ">", WARM, 12.0, 1, 1)
    panel(8, 151, 546, 12, GRP, 1, GRPEDGE, 4.0)
    text(8, 152, 546, 10, "<<<<<<   RECURSIVE RETURN:  delay out  x feedback  >>  mixer   <<<<<<", WARM, 7.0, 1, 1)

    dial_ids = {}
    pos = {"seedlvl": (14, 22), "nfloor": (62, 22), "fbk": (123, 22), "ringd": (190, 22), "cfreq": (238, 22),
           "hpf": (300, 22), "lpf": (348, 22), "satur": (410, 22), "dtime": (458, 22), "wow": (506, 22),
           "spread": (330, 88), "level": (398, 88), "wetmix": (466, 88)}
    for n, (name, longn, short, mn, mx, init, unit, typ, expo) in enumerate(PARAMS):
        x, y = pos[name]; rect = [float(x), float(y), 46.0, 56.0]
        pv = {"parameter_initial": [init], "parameter_initial_enable": 1, "parameter_longname": longn, "parameter_mmax": float(mx),
              "parameter_mmin": float(mn), "parameter_shortname": short, "parameter_type": typ, "parameter_unitstyle": unit}
        if expo != 1.0: pv["parameter_exponent"] = expo
        d = add(box(id=nid(), maxclass="live.dial", numinlets=1, numoutlets=2, outlettype=["", "float"], parameter_enable=1,
                    patching_rect=[300 + 70 * (n % 8), 100 + 110 * (n // 8), 44.0, 48.0], presentation=1, presentation_rect=rect,
                    varname=longn.replace(" ", ""), fontname="Arial", fontsize=9.0, fontface=1,
                    dialcolor=TRACK, activedialcolor=ACC, needlecolor=TXT, activeneedlecolor=TXT, textcolor=TXT,
                    saved_attribute_attributes={"valueof": pv}))
        PREVIEW.append(("dial", x, y, 46, 56, short, init, mn, mx, unit))
        dial_ids[name] = d
        p = add(box(id=nid(), maxclass="newobj", text=f"prepend {name}", numinlets=1, numoutlets=1, outlettype=[""], patching_rect=[300 + 70 * (n % 8), 160 + 110 * (n // 8), 100, 22]))
        line(d, 0, p, 0); line(p, 0, gen, 0)

    tg = add(box(id=nid(), maxclass="live.toggle", numinlets=1, numoutlets=1, outlettype=[""], parameter_enable=1,
                 patching_rect=[30, 300, 24, 24], presentation=1, presentation_rect=[192.0, 100.0, 14.0, 14.0],
                 varname="CrossFeed", activecolor=ACC, bgcolor=C(36, 44, 56), bordercolor=C(74, 88, 108),
                 saved_attribute_attributes={"valueof": {"parameter_enum": ["osc", "cross"], "parameter_initial": [0], "parameter_initial_enable": 1,
                     "parameter_longname": "Cross Feed", "parameter_mmax": 1, "parameter_shortname": "Cross", "parameter_type": 2}}))
    PREVIEW.append(("toggle", 192, 100, 14, 14))
    tp = add(box(id=nid(), maxclass="newobj", text="prepend cmode", numinlets=1, numoutlets=1, outlettype=[""], patching_rect=[70, 300, 100, 22]))
    line(tg, 0, tp, 0); line(tp, 0, gen, 0)
    text(212, 99, 74, 12, "CROSS-FEED", TXT, 8.0, 1)
    text(192, 118, 92, 28, "carrier = 2nd tap of\nthe loop, not the osc", DIM, 7.0)

    bt = add(box(id=nid(), maxclass="textbutton", text="SEED BURST", numinlets=1, numoutlets=3, outlettype=["", "", "int"],
                 patching_rect=[30, 340, 80, 22], presentation=1, presentation_rect=[14.0, 98.0, 92.0, 44.0], mode=0,
                 fontname="Arial", fontsize=10.0, fontface=1, bgcolor=C(46, 28, 20), bgoncolor=WARM, bordercolor=WARM,
                 textcolor=WARM, textoncolor=C(30, 12, 4), usebgoncolor=1, rounded=6.0))
    PREVIEW.append(("pad", 14, 98, 92, 44, "SEED BURST"))
    m1 = add(box(id=nid(), maxclass="message", text="burst 1", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[30, 380, 60, 22]))
    dl = add(box(id=nid(), maxclass="newobj", text="delay 120", numinlets=2, numoutlets=1, outlettype=["bang"], patching_rect=[120, 340, 60, 22]))
    m0 = add(box(id=nid(), maxclass="message", text="burst 0", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[120, 380, 60, 22]))
    line(bt, 0, m1, 0); line(m1, 0, gen, 0); line(bt, 0, dl, 0); line(dl, 0, m0, 0); line(m0, 0, gen, 0)
    text(122, 100, 52, 48, "raise until\nit sustains\n(about 1.2\nto 1.4)", DIM, 7.0, 0, 1)
    boxes.extend(reversed(deco))
    return finish(boxes, lines, float(W), "VINK·LOOP recursive feedback network (ring mod + filter + tape saturation + delay)")

def write_preview(path):
    import math
    rgba = lambda c: f"rgba({round(c[0] * 255)},{round(c[1] * 255)},{round(c[2] * 255)},{c[3]})"
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    defs, body, gi = [], [], 0
    for it in PREVIEW:
        k = it[0]
        if k == "panel":
            _, x, y, w, h, col, bd, bc, rad, grad = it
            fill = rgba(col)
            if grad:
                gi += 1
                defs.append(f'<linearGradient id="g{gi}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{rgba(grad[0])}"/><stop offset="1" stop-color="{rgba(grad[1])}"/></linearGradient>')
                fill = f"url(#g{gi})"
            stroke = f' stroke="{rgba(bc)}" stroke-width="{bd}"' if bd and bc else ""
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rad}" fill="{fill}"{stroke}/>')
        elif k == "text":
            _, x, y, w, h, t, col, size, bold, just = it
            anchor, tx = {0: ("start", x), 1: ("middle", x + w / 2), 2: ("end", x + w)}[just]
            for i, ln in enumerate(t.split("\n")):
                body.append(f'<text x="{tx}" y="{y + size * 0.95 + i * (size + 1.5)}" font-size="{size}" font-family="Arial,Helvetica,sans-serif" font-weight="{"bold" if bold else "normal"}" text-anchor="{anchor}" fill="{rgba(col)}">{esc(ln)}</text>')
        elif k == "dial":
            _, x, y, w, h, short, init, mn, mx, unit = it
            cx, cy, r = x + w / 2, y + h * 0.52, 13
            f = (init - mn) / (mx - mn)
            a0, a1 = math.radians(135), math.radians(405)
            pt = lambda a: (cx + r * math.cos(a), cy + r * math.sin(a))
            ax = a0 + (a1 - a0) * f
            (x0, y0), (x1, y1), (xe, ye) = pt(a0), pt(a1), pt(ax)
            body.append(f'<path d="M{x0:.2f},{y0:.2f} A{r},{r} 0 1 1 {x1:.2f},{y1:.2f}" fill="none" stroke="{rgba(TRACK)}" stroke-width="3"/>')
            if f > 0:
                body.append(f'<path d="M{x0:.2f},{y0:.2f} A{r},{r} 0 {1 if (ax - a0) > math.pi else 0} 1 {xe:.2f},{ye:.2f}" fill="none" stroke="{rgba(ACC)}" stroke-width="3"/>')
            body.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + (r - 2) * math.cos(ax):.2f}" y2="{cy + (r - 2) * math.sin(ax):.2f}" stroke="{rgba(TXT)}" stroke-width="1.5"/>')
            body.append(f'<text x="{cx}" y="{y + 8}" font-size="8" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(TXT)}">{short}</text>')
            val = f"{init:g}" if (float(init).is_integer() or init >= 100) else f"{init:.2f}"
            body.append(f'<text x="{cx}" y="{y + h - 3}" font-size="8" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(TXT)}">{val}</text>')
        elif k == "pad":
            _, x, y, w, h, name = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{rgba(C(46, 28, 20))}" stroke="{rgba(WARM)}"/>')
            body.append(f'<text x="{x + w / 2}" y="{y + h / 2 + 3.5}" font-size="10" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(WARM)}">{name}</text>')
        elif k == "toggle":
            _, x, y, w, h = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{rgba(C(36, 44, 56))}" stroke="{rgba(C(74, 88, 108))}"/>')
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1124" height="338" viewBox="0 0 562 169"><defs>'] + defs + ['</defs><rect width="562" height="169" fill="#08090b"/>'] + body + ['</svg>']
    open(path, "w").write("\n".join(svg))

def amxd_bytes(doc, kind=b"aaaa"):
    body = (json.dumps(doc, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    return (b"ampf" + struct.pack("<I", 4) + kind + b"meta" + struct.pack("<I", 4) + b"\x00\x00\x00\x00" +
            b"ptch" + struct.pack("<I", len(body)) + body)

if __name__ == "__main__":
    code = genexpr()
    bad = sorted({c for c in code if ord(c) > 127})
    assert not bad, f"GenExpr must be ASCII only (gen~ codebox fails to compile otherwise): {bad}"
    open("VINK.genexpr", "w").write(code)
    _id[0] = 0
    doc = build_patcher(code)
    write_preview("preview.svg")
    open("VINK.maxpat", "w").write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    open("VINK.amxd", "wb").write(amxd_bytes(doc))
    _id[0] = 0
    open("VINK_min.amxd", "wb").write(amxd_bytes(build_patcher(code, ui=False, loadbang=True)))
    _id[0] = 0
    open("VINK_thru.amxd", "wb").write(amxd_bytes(build_patcher(code, ui=False, thru=True)))
    json.loads(open("VINK.maxpat").read())
    print("wrote VINK.genexpr, VINK.maxpat, VINK.amxd, VINK_min.amxd, VINK_thru.amxd, preview.svg")
