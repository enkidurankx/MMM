#!/usr/bin/env python3
"""Wiring test for PCCONTROL.maxpat: a tiny simulator of the few Max objects the patch uses
(pak, unpack, t, expr, spigot, iter, i, ==, prepend, message, live.dial/toggle, textbutton) runs the REAL patcher JSON.
It checks the MIDI bytes that reach [midiout] and - by running every scenario with fan-out order forward AND reversed -
that the result never depends on the (undefined) order of multiple connections from one outlet.
It cannot prove the objects behave in Max the way this simulator assumes; it proves the wiring is consistent."""
import json, re, sys

def load():
    return json.load(open("PCCONTROL.maxpat"))["patcher"]

class Sim:
    def __init__(self, patcher, reverse_fanout=False):
        self.boxes = {b["box"]["id"]: b["box"] for b in patcher["boxes"]}
        self.out = {}                      # (id, outlet) -> [(dst, inlet)]
        for l in patcher["lines"]:
            p = l["patchline"]; self.out.setdefault(tuple(p["source"]), []).append(tuple(p["destination"]))
        if reverse_fanout:
            for k in self.out: self.out[k].reverse()
        self.state, self.midi, self.display = {}, [], None
        for i, b in self.boxes.items():
            t = b.get("text", "")
            if t.startswith("pak "): self.state[i] = [int(x) for x in t.split()[1:]]
            elif t.startswith("spigot"): self.state[i] = {"open": int(t.split()[1]) if len(t.split()) > 1 else 0}
            elif t.startswith("== "): self.state[i] = {"cmp": int(t.split()[1])}
            elif t == "i": self.state[i] = {"v": 0}
            elif b["maxclass"] in ("live.dial", "live.toggle"): self.state[i] = {"v": b["saved_attribute_attributes"]["valueof"]["parameter_initial"][0]}
        self.by_name = {b.get("varname"): i for i, b in self.boxes.items() if b.get("varname")}
        self.by_text = {b.get("text"): i for i, b in self.boxes.items() if b["maxclass"] == "textbutton"}

    def send(self, src, outlet, val):
        for dst, inlet in self.out.get((src, outlet), []):
            self.recv(dst, inlet, val)

    def recv(self, i, inlet, v):
        b = self.boxes[i]; t = b.get("text", ""); mc = b["maxclass"]; st = self.state.get(i)
        first = t.split()[0] if t else ""
        if mc in ("live.dial", "live.toggle"):
            st["v"] = int(v); self.send(i, 0, st["v"])
        elif first == "midiin": self.send(i, 0, v)
        elif first == "midiout": self.midi.extend(v if isinstance(v, list) else [v])
        elif first == "iter":
            for x in (v if isinstance(v, list) else [v]): self.send(i, 0, x)
        elif first == "pak":
            if inlet == 0:
                if isinstance(v, int): st[0] = v
                self.send(i, 0, list(st))
            else: st[inlet] = v
        elif first == "unpack":
            for k in reversed(range(len(v))): self.send(i, k, v[k])
        elif first == "t":
            for k, a in reversed(list(enumerate(t.split()[1:]))):
                self.send(i, k, "bang" if a == "b" else (v[0] if isinstance(v, list) else v))
        elif first == "expr":
            n = int(v if not isinstance(v, list) else v[0])
            self.send(i, 0, int(eval(t[5:].replace("$i1", str(n)).replace("%", " % "))))
        elif first == "spigot":
            if inlet == 1: st["open"] = int(v)
            elif st["open"]: self.send(i, 0, v)
        elif first == "==":
            if inlet == 1: st["cmp"] = v
            else: self.send(i, 0, int(v == st["cmp"]))
        elif t == "i":
            if inlet == 1: st["v"] = v
            else:
                if isinstance(v, int): st["v"] = v
                self.send(i, 0, st["v"])
        elif first == "prepend": self.send(i, 0, ["set", v])
        elif first == "delay": self.send(i, 0, "bang")
        elif mc == "message": self.send(i, 0, [int(x) for x in t.split()])
        elif mc == "comment": self.display = v
        elif first == "live.thisdevice": pass
        else: raise RuntimeError(f"unhandled object {t or mc}")

    # ---- user actions
    def load(self):
        for i, b in self.boxes.items():
            if b["maxclass"] in ("live.dial", "live.toggle"): self.send(i, 0, self.state[i]["v"])
        self.send(next(i for i, b in self.boxes.items() if b.get("text") == "live.thisdevice"), 0, "bang")
    def set(self, name, v): self.recv(self.by_name[name], 0, v)
    def press(self, label): self.send(self.by_text[label], 0, "bang")
    def take(self):
        m, self.midi = self.midi, []; return m

def scenario(rev):
    s = Sim(load(), rev); fails = []
    def check(name, got, want):
        if got != want: fails.append(f"{name}: got {got}, want {want}")
    s.load(); check("load sends nothing", s.take(), [])
    s.set("Channel", 3); s.set("BankMSB", 1); s.set("BankLSB", 2); s.set("Program", 9)
    check("no send while auto is off", s.take(), [])
    check("display shows program+1", s.display, ["set", 10])
    s.set("SendBank", 1); s.press("SEND")
    check("SEND: bank MSB, bank LSB, PC (ch 3)", s.take(), [178, 0, 1, 178, 32, 2, 194, 9])
    s.set("SendBank", 0); s.press("SEND")
    check("bank off: PC only", s.take(), [194, 9])
    s.set("SendBank", 1); s.set("CCMode", 1); s.set("CCNumber", 7); s.press("SEND")
    check("CC mode: program goes out as CC 7", s.take(), [178, 0, 1, 178, 32, 2, 178, 7, 9])
    s.set("CCMode", 0); s.set("SendBank", 0); s.set("AutoSend", 1); s.take()
    s.set("Program", 10)
    check("auto send on program change", s.take(), [194, 10])
    s.set("Channel", 16); s.take(); s.press("SEND")
    check("channel 16 -> status 207", s.take(), [207, 10])
    s.set("Program", 127); s.take(); s.press(">")
    check("next wraps 127 -> 0 and auto-sends", s.take(), [207, 0])
    s.press("<")
    check("prev wraps 0 -> 127", s.take(), [207, 127])
    s.set("AutoSend", 0); s.set("SendOnLoad", 1); s.send(next(i for i, b in s.boxes.items() if b.get("text") == "live.thisdevice"), 0, "bang")
    check("send on load", s.take(), [207, 127])
    s.set("SendOnLoad", 0)
    s.press("MICROFREAK")
    chk = (s.state[s.by_name["Channel"]]["v"], s.state[s.by_name["SendBank"]]["v"], s.state[s.by_name["CCMode"]]["v"])
    check("MICROFREAK profile sets channel/bank/cc-mode", chk, (1, 1, 0))
    check("profile selection sends nothing with auto off", s.take(), [])
    return fails

bad = []
for rev in (False, True):
    f = scenario(rev)
    print(f"fan-out {'reversed' if rev else 'forward '}: {'OK' if not f else 'FAIL'}")
    bad += f
for f in bad: print("  ", f)
sys.exit(1 if bad else 0)
