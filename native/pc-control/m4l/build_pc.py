#!/usr/bin/env python3
"""Generates the PC·CONTROL Max for Live MIDI effect (program change / bank select sender).

  python3 build_pc.py  ->  PCCONTROL.amxd   (the device, MIDI effect)
                           triage/*.amxd    (tiny test devices: pass-through, raw-byte send test)
                           PCCONTROL.maxpat (patcher JSON)   preview.svg

Signal flow (all classic Max objects, no JS): dials/toggles -> pak (state) -> bang -> unpack -> bytes -> iter -> midiout.
Sending order is fixed by [t i i i i] (right-to-left): bank MSB, bank LSB, then program (PC, or CC in CC mode).
"""
import json, os, struct, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/../../age12/m4l")
from build_device import finish  # shared outer-patcher template

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

BG1, BG2, EDGE = C(30, 33, 40), C(17, 19, 23), C(46, 51, 61)
GLASS, GLASSEDGE = C(8, 10, 13), C(43, 48, 57)
ACCENT, ACCDARK = C(46, 230, 200), C(10, 40, 36)
TXT, DIM = C(216, 222, 232), C(112, 122, 138)
PAD, PADEDGE = C(37, 41, 50), C(62, 68, 82)
TRACK = C(52, 58, 70)

# profile starting points: channel, send-bank, msb, lsb, cc-mode, cc#  (UNVERIFIED defaults - tune per device)
PROFILES = [("PRO 800", (1, 0, 0, 0, 0, 0)), ("MICROFREAK", (1, 1, 0, 0, 0, 0)), ("FM-1", (1, 0, 0, 0, 0, 0))]

def build(full=True, variant="full"):
    """variant: full | thru (midiin->midiout only) | send (thru + a button that sends PC 6 on ch 1 as raw bytes)."""
    _id[0] = 0
    boxes, lines, deco, preview = [], [], [], []
    def add(b):
        boxes.append(b); return b["box"]["id"]
    def conn(src, so, dst, di):
        lines.append({"patchline": {"destination": [dst, di], "source": [src, so]}})
    pos = [30, 30]
    def obj(text, nin, nout, otypes=None, **kw):
        pos[1] += 26
        if pos[1] > 560: pos[0] += 160; pos[1] = 56
        return add({"box": dict(id=nid(), maxclass="newobj", text=text, numinlets=nin, numoutlets=nout,
                                outlettype=otypes or [""] * nout, patching_rect=[float(pos[0]), float(pos[1]), 120.0, 22.0], **kw)})

    # -------- MIDI path: pass everything through, sender output joins it
    midiin = obj("midiin", 1, 1, ["int"])
    midiout = obj("midiout", 1, 0)
    conn(midiin, 0, midiout, 0)
    iter_ = obj("iter", 1, 1, ["int"])
    conn(iter_, 0, midiout, 0)

    if variant == "thru":
        return finish(boxes + [], lines, 180.0, "PC·CONTROL pass-through test")
    if variant == "send":
        m = add({"box": dict(id=nid(), maxclass="message", text="192 5", numinlets=2, numoutlets=1, outlettype=[""],
                             patching_rect=[30.0, 200.0, 60.0, 22.0], presentation=1, presentation_rect=[10.0, 30.0, 80.0, 22.0])})
        conn(m, 0, iter_, 0)
        boxes.append({"box": dict(id=nid(), maxclass="comment", text="click the box: sends PC 6 on ch 1\n(raw bytes 192 5)", presentation=1,
                                   presentation_rect=[10.0, 60.0, 200.0, 40.0], patching_rect=[30.0, 240.0, 200.0, 40.0])})
        return finish(boxes, lines, 220.0, "PC·CONTROL raw byte send test")

    # -------- helpers for the UI (panels are emitted top-first: Max stacks the FIRST box on top)
    def panel(x, y, w, h, color, border=0, bcolor=None, rounded=0.0, grad=None):
        at = dict(id=nid(), maxclass="panel", background=1, ignoreclick=1, bgcolor=color, border=border, rounded=rounded, mode=0,
                  numinlets=1, numoutlets=0, patching_rect=[800.0 + x, 20.0 + y, float(w), float(h)], presentation=1,
                  presentation_rect=[float(x), float(y), float(w), float(h)])
        if bcolor: at["bordercolor"] = bcolor
        if grad:
            at.update(mode=1, grad1=grad[0], grad2=grad[1], proportion=0.5,
                      bgfillcolor={"angle": 270.0, "autogradient": 0, "color": color, "color1": grad[0], "color2": grad[1], "proportion": 0.5, "type": "gradient"})
        deco.append({"box": at}); preview.append(("panel", x, y, w, h, color, border, bcolor, rounded, grad))
    def label(x, y, w, h, s, color, size=9.0, bold=0, just=0, font="Arial", name=None):
        b = {"box": dict(id=nid(), maxclass="comment", text=s, textcolor=color, fontname=font, fontsize=size, fontface=bold,
                         textjustification=just, presentation=1, presentation_rect=[float(x), float(y), float(w), float(h)],
                         patching_rect=[800.0 + x, 20.0 + y, float(w), float(h)])}
        preview.append(("text", x, y, w, h, s, color, size, bold, just, font))
        return add(b)

    # -------- chassis + display glass
    panel(0, 0, 480, 169, BG2, 1, EDGE, 8.0, grad=(BG1, BG2))
    panel(8, 8, 176, 90, GLASS, 1, GLASSEDGE, 6.0)
    panel(8, 94, 176, 2, ACCENT)                    # accent line under the glass
    label(16, 12, 120, 12, "PROGRAM", DIM, 8.0, 1)
    label(122, 12, 54, 12, "PC-CONTROL", DIM, 7.0, 0, 2)
    big = label(14, 24, 164, 56, "1", ACCENT, 44.0, 1, 1, "Menlo")
    label(16, 80, 160, 12, "preset number  (PC value = n - 1)", DIM, 7.0, 0, 1)

    # -------- live.* controls
    def dial(name, short, x, y, mn, mx, init, w=44.0, h=48.0):
        d = add({"box": dict(id=nid(), maxclass="live.dial", numinlets=1, numoutlets=2, outlettype=["", "float"], parameter_enable=1,
                             patching_rect=[float(pos[0]), float(pos[1]), 44.0, 48.0], presentation=1,
                             presentation_rect=[float(x), float(y), w, h], varname=name.replace(" ", ""),
                             fontname="Arial", fontsize=9.0, fontface=1, dialcolor=TRACK, activedialcolor=ACCENT,
                             needlecolor=TXT, activeneedlecolor=TXT, textcolor=TXT,
                             saved_attribute_attributes={"valueof": {"parameter_initial": [init], "parameter_initial_enable": 1,
                                 "parameter_longname": name, "parameter_mmax": float(mx), "parameter_mmin": float(mn),
                                 "parameter_shortname": short, "parameter_type": 1, "parameter_unitstyle": 0}})})
        preview.append(("dial", x, y, w, h, short, init, mn, mx))
        return d
    def toggle(name, short, x, y, caption):
        t = add({"box": dict(id=nid(), maxclass="live.toggle", numinlets=1, numoutlets=1, outlettype=[""], parameter_enable=1,
                             patching_rect=[float(pos[0]), float(pos[1]), 14.0, 14.0], presentation=1,
                             presentation_rect=[float(x), float(y), 14.0, 14.0], varname=name.replace(" ", ""),
                             activecolor=ACCENT, bgcolor=C(40, 45, 55), bordercolor=PADEDGE,
                             saved_attribute_attributes={"valueof": {"parameter_enum": ["off", "on"], "parameter_initial": [0],
                                 "parameter_initial_enable": 1, "parameter_longname": name, "parameter_mmax": 1,
                                 "parameter_shortname": short, "parameter_type": 2}})})
        label(x + 20, y - 1, 60, 14, caption, DIM, 8.0, 1)
        preview.append(("toggle", x, y, 14, 14))
        return t
    def pad(text, x, y, w, h, accent=False):
        p = add({"box": dict(id=nid(), maxclass="textbutton", text=text, numinlets=1, numoutlets=3, outlettype=["", "", "int"],
                             patching_rect=[float(pos[0]), float(pos[1]), 60.0, 22.0], presentation=1,
                             presentation_rect=[float(x), float(y), float(w), float(h)], mode=0, fontname="Arial", fontsize=9.0, fontface=1,
                             bgcolor=ACCENT if accent else PAD, bgoncolor=C(120, 255, 235) if accent else C(70, 77, 94),
                             bordercolor=ACCENT if accent else PADEDGE, textcolor=ACCDARK if accent else TXT,
                             textoncolor=C(0, 0, 0) if accent else C(255, 255, 255), usebgoncolor=1, rounded=6.0)})
        preview.append(("pad", x, y, w, h, text, accent))
        return p

    d_ch = dial("Channel", "CH", 196, 8, 1, 16, 1)
    d_msb = dial("Bank MSB", "MSB", 250, 8, 0, 127, 0)
    d_lsb = dial("Bank LSB", "LSB", 304, 8, 0, 127, 0)
    d_ccn = dial("CC Number", "CC#", 358, 8, 0, 127, 0)
    t_auto = toggle("Auto Send", "Auto", 414, 12, "AUTO")
    t_bank = toggle("Send Bank", "Bank", 414, 34, "BANK")
    t_cc = toggle("CC Mode", "CCmode", 414, 56, "CC MODE")
    t_load = toggle("Send On Load", "OnLoad", 414, 78, "ON LOAD")
    d_prg = dial("Program", "PRG", 8, 104, 0, 127, 0, 58.0, 56.0)
    b_prev = pad("<", 76, 112, 38, 38)
    b_next = pad(">", 118, 112, 38, 38)
    b_send = pad("SEND", 164, 112, 70, 38, accent=True)
    label(244, 100, 226, 12, "DEVICE PROFILES  (starting points, adjust to taste)", DIM, 7.0, 1)
    profile_pads = [pad(nm, 244 + 76 * i, 114, 72, 36) for i, (nm, _v) in enumerate(PROFILES)]

    # -------- logic
    pak = obj("pak 0 1 0 0 0 0", 6, 1)          # inlet 0 is a dummy (bang = output); 1 ch, 2 msb, 3 lsb, 4 cc#, 5 program
    unp = obj("unpack 0 0 0 0 0 0", 1, 6, ["int"] * 6)
    conn(pak, 0, unp, 0)
    t4 = obj("t i i i i", 1, 4, ["int"] * 4)
    conn(unp, 1, t4, 0)                          # channel goes last (right-to-left emission), it triggers the four status bytes
    pakA, pakB = obj("pak 0 0 0", 3, 1), obj("pak 0 32 0", 3, 1)
    pakD, pakC = obj("pak 0 0 0", 3, 1), obj("pak 0 0", 2, 1)
    exA, exB, exD = (obj("expr 175+$i1", 1, 1) for _ in range(3))
    exC = obj("expr 191+$i1", 1, 1)
    conn(unp, 2, pakA, 2)                        # msb value
    conn(unp, 3, pakB, 2)                        # lsb value
    conn(unp, 4, pakD, 1)                        # cc number
    conn(unp, 5, pakD, 2); conn(unp, 5, pakC, 1)  # program value
    for out, ex, pk in [(3, exA, pakA), (2, exB, pakB), (1, exD, pakD), (0, exC, pakC)]:   # t4: rightmost fires first -> A, B, D, C
        conn(t4, out, ex, 0); conn(ex, 0, pk, 0)
    spBank, spPC, spCC = obj("spigot", 2, 1), obj("spigot 1", 2, 1), obj("spigot", 2, 1)
    conn(pakA, 0, spBank, 0); conn(pakB, 0, spBank, 0)
    conn(pakC, 0, spPC, 0); conn(pakD, 0, spCC, 0)
    for sp in (spBank, spPC, spCC):
        conn(sp, 0, iter_, 0)
    notcc = obj("== 0", 2, 1)
    conn(t_bank, 0, spBank, 1)
    conn(t_cc, 0, spCC, 1); conn(t_cc, 0, notcc, 0); conn(notcc, 0, spPC, 1)

    spAuto = obj("spigot", 2, 1)
    conn(t_auto, 0, spAuto, 1); conn(spAuto, 0, pak, 0)
    conn(b_send, 0, pak, 0)
    lt = obj("live.thisdevice", 1, 3, ["bang", "int", "int"]); dl = obj("delay 300", 2, 1, ["bang"]); spLoad = obj("spigot", 2, 1)
    conn(lt, 0, dl, 0); conn(dl, 0, spLoad, 0); conn(t_load, 0, spLoad, 1); conn(spLoad, 0, pak, 0)

    for dd, inlet in [(d_ch, 1), (d_msb, 2), (d_lsb, 3), (d_ccn, 4)]:     # dial -> cold pak inlet, then auto-send bang
        tb = obj("t b i", 1, 2, ["bang", "int"])
        conn(dd, 0, tb, 0); conn(tb, 1, pak, inlet); conn(tb, 0, spAuto, 0)
    tp = obj("t b i i i", 1, 4, ["bang", "int", "int", "int"])            # program: store, display, pak, then bang
    disp = obj("expr $i1+1", 1, 1); pre = obj("prepend set", 1, 1)
    conn(d_prg, 0, tp, 0)
    conn(tp, 2, disp, 0); conn(disp, 0, pre, 0); conn(pre, 0, big, 0)
    conn(tp, 1, pak, 5); conn(tp, 0, spAuto, 0)
    for pd, expr in [(b_prev, "expr ($i1+127)%128"), (b_next, "expr ($i1+1)%128")]:   # each button owns its [i] (shared store would fire both)
        st = obj("i", 2, 1, ["int"]); ex = obj(expr, 1, 1)
        conn(tp, 3, st, 1)
        conn(pd, 0, st, 0); conn(st, 0, ex, 0); conn(ex, 0, d_prg, 0)
    # profiles: pad -> message (ch bank msb lsb cc ccn) -> unpack -> controls
    pu = obj("unpack 0 0 0 0 0 0", 1, 6, ["int"] * 6)
    for outlet, target in enumerate([d_ch, t_bank, d_msb, d_lsb, t_cc, d_ccn]):
        conn(pu, outlet, target, 0)
    for (nm, vals), pp in zip(PROFILES, profile_pads):
        m = add({"box": dict(id=nid(), maxclass="message", text=" ".join(map(str, vals)), numinlets=2, numoutlets=1, outlettype=[""],
                             patching_rect=[float(pos[0]) + 130, float(pos[1]), 100.0, 22.0])})
        pos[1] += 26
        conn(pp, 0, m, 0); conn(m, 0, pu, 0)

    boxes.extend(reversed(deco))
    doc = finish(boxes, lines, 480.0, "PC·CONTROL program change / bank select sender")
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
            _, x, y, w, h, short, init, mn, mx = it
            cx, cy, r = x + w / 2, y + h * 0.55, min(w, h) * 0.30
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
            body.append(f'<text x="{cx}" y="{y + h - 2}" font-size="8" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(TXT)}">{init}</text>')
        elif k == "pad":
            _, x, y, w, h, text, acc = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{rgba(ACCENT if acc else PAD)}" stroke="{rgba(ACCENT if acc else PADEDGE)}"/>')
            body.append(f'<text x="{x + w / 2}" y="{y + h / 2 + 3}" font-size="9" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(ACCDARK if acc else TXT)}">{esc(text)}</text>')
        elif k == "toggle":
            _, x, y, w, h = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{rgba(C(40, 45, 55))}" stroke="{rgba(PADEDGE)}"/>')
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="960" height="338" viewBox="0 0 480 169"><defs>'] + defs + ['</defs><rect width="480" height="169" fill="#0b0c0e"/>'] + body + ['</svg>']
    open(path, "w").write("\n".join(svg))

if __name__ == "__main__":
    doc = build()
    preview = doc.pop("_preview")
    write_preview(preview, "preview.svg")
    open("PCCONTROL.maxpat", "w").write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    open("PCCONTROL.amxd", "wb").write(amxd_bytes(doc))
    open("triage/PC_thru.amxd", "wb").write(amxd_bytes(build(variant="thru")))
    open("triage/PC_send_test.amxd", "wb").write(amxd_bytes(build(variant="send")))
    print("wrote PCCONTROL.amxd, PCCONTROL.maxpat, triage/PC_thru.amxd, triage/PC_send_test.amxd, preview.svg")
