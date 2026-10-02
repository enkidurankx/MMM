#!/usr/bin/env python3
"""Generates MIDI DRIFTER, a Max for Live MIDI effect (slow random pitch-bend drift, 14 bit).

  python3 build_drifter.py  ->  midi-drifter.amxd, midi-drifter.maxpat, preview.svg, triage/*.amxd

Successor of the owner's "Midi Drifter 0.9" (original/): same idea (random target -> glide -> pitch bend), rebuilt with
rate/depth/glide/mode/channel controls, 14-bit bend as raw bytes, a drift scope and a bend read-out.

Signal flow (classic Max objects only, no JS):
  metro -> random -> [mix: random or walk] -> clip -> pak(target, ramp) -> line -> depth -> change -> bytes -> iter -> midiout
Bend bytes: status 223+channel, LSB (& 127), MSB (>> 7); centre = 8192 (LSB 0, MSB 64).
"""
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../../age12/m4l")
from build_device import finish  # shared outer-patcher template (same as pc-control)

_id = [0]
def nid():
    _id[0] += 1
    return f"obj-{_id[0]}"

def amxd_bytes(doc, kind=b"mmmm"):
    body = (json.dumps(doc, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    return (b"ampf" + struct.pack("<I", 4) + kind + b"meta" + struct.pack("<I", 4) + b"\x00\x00\x00\x00" +
            b"ptch" + struct.pack("<I", len(body)) + body)

def C(r, g, b, a=1.0):
    return [round(r / 255, 4), round(g / 255, 4), round(b / 255, 4), a]

BG1, BG2, EDGE = C(34, 31, 38), C(19, 17, 22), C(58, 52, 64)
GLASS, GLASSEDGE = C(9, 8, 12), C(52, 47, 60)
ACCENT, ACCDARK = C(255, 176, 58), C(48, 30, 4)
TXT, DIM = C(226, 220, 232), C(138, 130, 150)
PAD, PADEDGE = C(44, 40, 52), C(74, 68, 88)
TRACK = C(62, 57, 74)

# defaults. DEPTH is squared: 15 -> 2.25 % of the full bend range (the original 0.9 had a fixed ~10 %, too strong); RATE 24 = ~1.3 s per target (original: 1.28 s); GLIDE 100 = ramp over the whole interval
DEF = dict(rate=24, depth=15, glide=100, channel=1, on=1, mode=0)
SCOPE_N = 100

def build(variant="full"):
    """variant: full | thru (midiin->midiout only) | send (thru + a box that sends raw pitch bend +50 % on ch 1)."""
    _id[0] = 0
    boxes, lines, deco, preview = [], [], [], []
    def add(b):
        boxes.append(b); return b["box"]["id"]
    def conn(src, so, dst, di):
        lines.append({"patchline": {"destination": [dst, di], "source": [src, so]}})
    pos = [30, 30]
    def obj(text, nin, nout, otypes=None, **kw):
        pos[1] += 26
        if pos[1] > 560: pos[0] += 170; pos[1] = 56
        return add({"box": dict(id=nid(), maxclass="newobj", text=text, numinlets=nin, numoutlets=nout,
                                outlettype=otypes or [""] * nout, patching_rect=[float(pos[0]), float(pos[1]), 120.0, 22.0], **kw)})

    # -------- MIDI path: everything passes through, the drift bytes join it
    midiin = obj("midiin", 1, 1, ["int"])
    midiout = obj("midiout", 1, 0)
    conn(midiin, 0, midiout, 0)
    iter_ = obj("iter", 1, 1, ["int"])
    conn(iter_, 0, midiout, 0)

    if variant == "thru":
        return finish(boxes, lines, 180.0, "MIDI DRIFTER pass-through test")
    if variant == "send":
        m = add({"box": dict(id=nid(), maxclass="message", text="224 0 96", numinlets=2, numoutlets=1, outlettype=[""],
                             patching_rect=[30.0, 200.0, 80.0, 22.0], presentation=1, presentation_rect=[10.0, 30.0, 90.0, 22.0])})
        conn(m, 0, iter_, 0)
        boxes.append({"box": dict(id=nid(), maxclass="comment", text="click the box: pitch bend +50 %\non ch 1 (raw bytes 224 0 96)", presentation=1,
                                   presentation_rect=[10.0, 60.0, 220.0, 40.0], patching_rect=[30.0, 240.0, 220.0, 40.0])})
        return finish(boxes, lines, 240.0, "MIDI DRIFTER raw pitch bend send test")

    # -------- UI helpers (decoration panels are emitted last: Max stacks the FIRST box on top)
    def panel(x, y, w, h, color, border=0, bcolor=None, rounded=0.0, grad=None):
        at = dict(id=nid(), maxclass="panel", background=1, ignoreclick=1, bgcolor=color, border=border, rounded=rounded, mode=0,
                  numinlets=1, numoutlets=0, patching_rect=[800.0 + x, 20.0 + y, float(w), float(h)], presentation=1,
                  presentation_rect=[float(x), float(y), float(w), float(h)])
        if bcolor: at["bordercolor"] = bcolor
        if grad:
            at.update(mode=1, grad1=grad[0], grad2=grad[1], proportion=0.5,
                      bgfillcolor={"angle": 270.0, "autogradient": 0, "color": color, "color1": grad[0], "color2": grad[1], "proportion": 0.5, "type": "gradient"})
        deco.append({"box": at}); preview.append(("panel", x, y, w, h, color, border, bcolor, rounded, grad))
    def label(x, y, w, h, s, color, size=9.0, bold=0, just=0, font="Arial"):
        b = {"box": dict(id=nid(), maxclass="comment", text=s, textcolor=color, fontname=font, fontsize=size, fontface=bold,
                         textjustification=just, presentation=1, presentation_rect=[float(x), float(y), float(w), float(h)],
                         patching_rect=[800.0 + x, 20.0 + y, float(w), float(h)])}
        preview.append(("text", x, y, w, h, s, color, size, bold, just, font))
        return add(b)
    def param(longname, short, typ, init, lo=0, hi=1, unit=0, enum=None):
        v = {"parameter_longname": longname, "parameter_shortname": short, "parameter_type": typ,
             "parameter_initial_enable": 1, "parameter_initial": [init]}
        if enum: v.update(parameter_enum=enum, parameter_mmax=len(enum) - 1)
        else: v.update(parameter_mmin=float(lo), parameter_mmax=float(hi), parameter_unitstyle=unit)
        return {"parameter_enable": 1, "saved_attribute_attributes": {"valueof": v}}
    def dial(name, short, x, y, lo, hi, init, unit, w=50.0, h=58.0):
        d = add({"box": dict(id=nid(), maxclass="live.dial", numinlets=1, numoutlets=2, outlettype=["", "float"],
                             patching_rect=[float(pos[0]), float(pos[1]), 44.0, 48.0], presentation=1,
                             presentation_rect=[float(x), float(y), w, h], varname=name.replace(" ", ""),
                             fontname="Arial", fontsize=9.0, fontface=1, dialcolor=TRACK, activedialcolor=ACCENT,
                             needlecolor=TXT, activeneedlecolor=TXT, textcolor=TXT, **param(name, short, 1, init, lo, hi, unit))})
        preview.append(("dial", x, y, w, h, short, init, lo, hi, unit))
        return d
    def textbtn(name, short, x, y, w, h, off, on, init, toggle=True, accent=False):
        extra = param(name, short, 2, init, enum=["off", "on"]) if toggle else {"parameter_enable": 0}
        b = add({"box": dict(id=nid(), maxclass="live.text", text=off, texton=on, numinlets=1, numoutlets=2, outlettype=["", ""],
                             patching_rect=[float(pos[0]), float(pos[1]), 60.0, 22.0], presentation=1,
                             presentation_rect=[float(x), float(y), float(w), float(h)], varname=name.replace(" ", ""),
                             mode=1 if toggle else 0, fontname="Arial", fontsize=10.0, fontface=1,
                             bgcolor=PAD, bgoncolor=ACCENT if accent else C(96, 88, 120), activebgcolor=PAD,
                             activebgoncolor=ACCENT if accent else C(96, 88, 120), textcolor=TXT, textoncolor=ACCDARK if accent else C(255, 255, 255),
                             activetextcolor=TXT, activetextoncolor=ACCDARK if accent else C(255, 255, 255),
                             bordercolor=ACCENT if accent else PADEDGE, focusbordercolor=ACCENT, **extra)})
        preview.append(("pad", x, y, w, h, off, on, init, accent))
        return b

    # -------- chassis + display glass (left) + controls (right)
    panel(0, 0, 480, 169, BG2, 1, EDGE, 8.0, grad=(BG1, BG2))
    panel(8, 8, 228, 153, GLASS, 1, GLASSEDGE, 6.0)
    panel(8, 110, 228, 2, ACCENT)
    label(16, 12, 110, 12, "MIDI DRIFTER", ACCENT, 9.0, 1)
    label(112, 12, 116, 12, "PITCH BEND · 14 BIT", DIM, 7.0, 0, 2)
    scope = add({"box": dict(id=nid(), maxclass="multislider", numinlets=1, numoutlets=2, outlettype=["", ""], parameter_enable=0,
                             size=SCOPE_N, setminmax=[-1.0, 1.0], signed=1, setstyle=1, ignoreclick=1,
                             bgcolor=GLASS, slidercolor=ACCENT, bordercolor=GLASSEDGE, thickness=1,
                             patching_rect=[800.0 + 14, 20.0 + 28, 216.0, 76.0], presentation=1, presentation_rect=[14.0, 28.0, 216.0, 76.0])})
    preview.append(("scope", 14, 28, 216, 76))
    label(16, 116, 60, 11, "BEND", DIM, 7.5, 1)
    readout = add({"box": dict(id=nid(), maxclass="flonum", numinlets=1, numoutlets=2, outlettype=["", "bang"], parameter_enable=0,
                               numdecimalplaces=1, triangle=0, ignoreclick=1, fontname="Menlo", fontsize=20.0,
                               textcolor=ACCENT, bgcolor=GLASS, bordercolor=GLASS,
                               patching_rect=[800.0 + 14, 20.0 + 126, 96.0, 30.0], presentation=1, presentation_rect=[14.0, 126.0, 96.0, 30.0])})
    preview.append(("readout", 14, 126, 96, 30))
    label(112, 134, 120, 22, "% of the full bend range\n(= your synth's PB range)", DIM, 7.0, 0)

    d_rate = dial("Rate", "Rate", 246, 10, 0, 100, DEF["rate"], 0)
    d_depth = dial("Depth", "Depth", 300, 10, 0, 100, DEF["depth"], 0)
    d_glide = dial("Glide", "Glide", 354, 10, 0, 100, DEF["glide"], 5)
    d_ch = dial("Channel", "Ch", 408, 10, 1, 16, DEF["channel"], 0)
    t_mode = textbtn("Mode", "Mode", 248, 78, 100, 24, "RANDOM", "WALK", DEF["mode"])
    b_ctr = textbtn("Center", "Center", 356, 78, 112, 24, "CENTER", "CENTER", 0, toggle=False)
    t_on = textbtn("Drift", "Drift", 248, 116, 220, 38, "DRIFT OFF", "DRIFT ON", DEF["on"], accent=True)
    label(248, 103, 220, 10, "RANDOM = any target · WALK = small steps from the last one", DIM, 6.5, 0)

    # -------- logic
    # tick: metro -> random target in [-1,1] -> mix (random / walk) -> clip -> (target, ramp) -> line
    metro = obj("metro 1000", 2, 1, ["bang"])
    rnd, sub, div = obj("random 2001", 2, 1, ["int"]), obj("- 1000", 2, 1, ["int"]), obj("/ 1000.", 2, 1, ["float"])
    mix = obj("expr $f1*(1.-0.65*$i2)+$i2*$f3", 3, 1, ["float"])      # inlet 0 random, 1 mode, 2 current target
    clip = obj("clip -1. 1.", 3, 1, ["float"])
    tcur = obj("t f f", 1, 2, ["float", "float"])
    pak = obj("pak 0. 0.", 2, 1)                                        # target (hot), ramp ms
    line_ = obj("line 0. 10", 3, 2, ["float", "bang"])                          # grain 10 ms (the original used 1 ms: ~1000 messages/s)
    conn(metro, 0, rnd, 0); conn(rnd, 0, sub, 0); conn(sub, 0, div, 0); conn(div, 0, mix, 0)
    conn(mix, 0, clip, 0); conn(clip, 0, tcur, 0)
    conn(tcur, 1, mix, 2)                                               # store current target (cold inlet)
    conn(tcur, 0, pak, 0); conn(pak, 0, line_, 0)
    conn(t_mode, 0, mix, 1)

    # rate -> interval (4000 ms at 0 ... 40 ms at 100, exponential); interval also drives the ramp time
    rexp = obj("expr 4000.*exp(-4.60517*$f1/100.)", 1, 1, ["float"])
    trate = obj("t f f f", 1, 3, ["float"] * 3)
    fint = obj("f", 2, 1, ["float"])                                    # holds the interval for glide changes
    ramp = obj("expr $f1*$f2/100.", 2, 1, ["float"])                    # interval * glide %
    conn(d_rate, 0, rexp, 0); conn(rexp, 0, trate, 0)
    conn(trate, 2, metro, 1); conn(trate, 1, fint, 1); conn(trate, 0, ramp, 0)
    conn(ramp, 0, pak, 1)
    tgl = obj("t b f", 1, 2, ["bang", "float"])
    conn(d_glide, 0, tgl, 0); conn(tgl, 1, ramp, 1); conn(tgl, 0, fint, 0); conn(fint, 0, ramp, 0)

    # on/off: metro start/stop; switching off glides back to centre
    sel0 = obj("sel 0", 2, 2, ["bang", ""])
    conn(t_on, 0, metro, 0); conn(t_on, 0, sel0, 0)
    tctr = obj("t b b", 1, 2, ["bang", "bang"])
    m_cur = add({"box": dict(id=nid(), maxclass="message", text="0.", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[float(pos[0]) + 130, 60.0, 40.0, 22.0])})
    m_go = add({"box": dict(id=nid(), maxclass="message", text="0. 150", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[float(pos[0]) + 130, 90.0, 60.0, 22.0])})
    conn(sel0, 0, tctr, 0); conn(b_ctr, 0, tctr, 0)
    conn(tctr, 1, m_cur, 0); conn(m_cur, 0, mix, 2)                     # forget the walk position ...
    conn(tctr, 0, m_go, 0); conn(m_go, 0, line_, 0)                     # ... and glide to centre in 150 ms

    # output stage: line -> depth -> 14 bit bend -> change -> bytes
    tline = obj("t f f f", 1, 3, ["float"] * 3)
    flast = obj("f", 2, 1, ["float"])
    dexp = obj("expr int(8192.+$f1*$f2*$f2*0.8191)", 2, 1, ["int"])    # $f1 -1..1, $f2 depth 0..100, squared taper -> 1 ... 16383
    dclip = obj("clip 0 16383", 3, 1, ["int"])
    chg = obj("change", 1, 3, ["int", "int", "int"])
    conn(line_, 0, tline, 0)
    conn(tline, 1, flast, 1); conn(tline, 0, dexp, 0)
    tdep = obj("t b f", 1, 2, ["bang", "float"])
    conn(d_depth, 0, tdep, 0); conn(tdep, 1, dexp, 1); conn(tdep, 0, flast, 0); conn(flast, 0, dexp, 0)
    conn(dexp, 0, dclip, 0); conn(dclip, 0, chg, 0)
    tb = obj("t i b i i", 1, 4, ["int", "bang", "int", "int"])         # right-to-left: MSB, LSB, bang -> status (sends), read-out
    msb, lsb = obj(">> 7", 2, 1, ["int"]), obj("& 127", 2, 1, ["int"])
    st = obj("i 224", 2, 1, ["int"]); chs = obj("+ 223", 2, 1, ["int"])
    pk = obj("pack 224 0 0", 3, 1)
    conn(chg, 0, tb, 0)
    conn(tb, 3, msb, 0); conn(msb, 0, pk, 2)
    conn(tb, 2, lsb, 0); conn(lsb, 0, pk, 1)
    conn(tb, 1, st, 0); conn(st, 0, pk, 0)
    conn(d_ch, 0, chs, 0); conn(chs, 0, st, 1)
    conn(pk, 0, iter_, 0)
    pct = obj("expr ($i1-8192)/81.91", 1, 1, ["float"])
    conn(tb, 0, pct, 0); conn(pct, 0, readout, 0)

    # scope: ~20 updates/s of the normalised drift, newest at the right
    sl = obj("speedlim 50", 2, 1)
    zl = obj(f"zl.stream {SCOPE_N}", 2, 2, ["", ""])
    conn(tline, 2, sl, 0); conn(sl, 0, zl, 0); conn(zl, 0, scope, 0)

    boxes.extend(reversed(deco))
    doc = finish(boxes, lines, 480.0, "MIDI DRIFTER random pitch-bend drift, 14 bit")
    doc["_preview"] = preview
    return doc

def write_preview(preview, path):
    import math
    rgba = lambda c: f"rgba({round(c[0] * 255)},{round(c[1] * 255)},{round(c[2] * 255)},{c[3]})"
    defs, body, gi = [], [], 0
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for it in preview:
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
            _, x, y, w, h, t, col, size, bold, just, font = it
            anchor, tx = {0: ("start", x), 1: ("middle", x + w / 2), 2: ("end", x + w)}[just]
            for i, ln in enumerate(t.split("\n")):
                body.append(f'<text x="{tx}" y="{y + size * 0.95 + i * (size + 1.5)}" font-size="{size}" font-family="{font},Helvetica,sans-serif" font-weight="{"bold" if bold else "normal"}" text-anchor="{anchor}" fill="{rgba(col)}">{esc(ln)}</text>')
        elif k == "dial":
            _, x, y, w, h, short, init, mn, mx, unit = it
            cx, cy, r = x + w / 2, y + h * 0.52, min(w, h) * 0.30
            f = (init - mn) / (mx - mn)
            a0, a1 = math.radians(135), math.radians(405)
            pt = lambda a: (cx + r * math.cos(a), cy + r * math.sin(a))
            ax = a0 + (a1 - a0) * f
            (x0, y0), (x1, y1), (xe, ye) = pt(a0), pt(a1), pt(ax)
            body.append(f'<path d="M{x0:.2f},{y0:.2f} A{r},{r} 0 1 1 {x1:.2f},{y1:.2f}" fill="none" stroke="{rgba(TRACK)}" stroke-width="3"/>')
            if f > 0:
                body.append(f'<path d="M{x0:.2f},{y0:.2f} A{r},{r} 0 {1 if (ax - a0) > math.pi else 0} 1 {xe:.2f},{ye:.2f}" fill="none" stroke="{rgba(ACCENT)}" stroke-width="3"/>')
            body.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + (r - 2) * math.cos(ax):.2f}" y2="{cy + (r - 2) * math.sin(ax):.2f}" stroke="{rgba(TXT)}" stroke-width="1.5"/>')
            body.append(f'<text x="{cx}" y="{y + 8}" font-size="8" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(TXT)}">{short}</text>')
            body.append(f'<text x="{cx}" y="{y + h - 2}" font-size="8" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(TXT)}">{init}{" %" if unit == 5 else ""}</text>')
        elif k == "pad":
            _, x, y, w, h, off, on, init, acc = it
            text = on if init else off
            fill = (ACCENT if acc else C(96, 88, 120)) if init else PAD
            tc = (ACCDARK if acc else C(255, 255, 255)) if init else TXT
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{rgba(fill)}" stroke="{rgba(ACCENT if acc else PADEDGE)}"/>')
            body.append(f'<text x="{x + w / 2}" y="{y + h / 2 + 3.5}" font-size="10" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(tc)}">{esc(text)}</text>')
        elif k == "scope":
            _, x, y, w, h = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{rgba(GLASS)}" stroke="{rgba(GLASSEDGE)}"/>')
            n, cy = SCOPE_N, y + h / 2
            for i in range(n):                              # illustrative drift curve, not measured data
                v = 0.55 * math.sin(i / 9.0) + 0.3 * math.sin(i / 3.7 + 1.0)
                bx = x + i * w / n
                body.append(f'<rect x="{bx:.2f}" y="{min(cy, cy - v * h / 2 * 0.9):.2f}" width="{w / n - 0.3:.2f}" height="{abs(v) * h / 2 * 0.9:.2f}" fill="{rgba(ACCENT)}" opacity="0.9"/>')
            body.append(f'<line x1="{x}" y1="{cy}" x2="{x + w}" y2="{cy}" stroke="{rgba(DIM)}" stroke-width="0.5"/>')
        elif k == "readout":
            _, x, y, w, h = it
            body.append(f'<text x="{x + 2}" y="{y + 22}" font-size="20" font-family="Menlo,monospace" fill="{rgba(ACCENT)}">+3.2</text>')
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="960" height="338" viewBox="0 0 480 169"><defs>'] + defs + ['</defs><rect width="480" height="169" fill="#0b0c0e"/>'] + body + ['</svg>']
    open(path, "w").write("\n".join(svg))

if __name__ == "__main__":
    doc = build()
    preview = doc.pop("_preview")
    write_preview(preview, "preview.svg")
    open("midi-drifter.maxpat", "w").write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    open("midi-drifter.amxd", "wb").write(amxd_bytes(doc))
    open("triage/Drifter_thru.amxd", "wb").write(amxd_bytes(build(variant="thru")))
    open("triage/Drifter_send_test.amxd", "wb").write(amxd_bytes(build(variant="send")))
    print("wrote midi-drifter.amxd, midi-drifter.maxpat, triage/Drifter_thru.amxd, triage/Drifter_send_test.amxd, preview.svg")
