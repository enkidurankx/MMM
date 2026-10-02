#!/usr/bin/env python3
"""Wiring test for midi-drifter.maxpat: a small simulator of the Max objects the patch uses runs the REAL patcher JSON.
It checks the MIDI bytes that reach [midiout] (14-bit pitch bend: status, LSB, MSB), depth/glide/mode/channel/on-off/centre,
the rate->interval mapping, and - by running every scenario with fan-out order forward AND reversed - that the result never
depends on the (undefined) order of several connections from one outlet.
Simplifications: metro is driven by hand (tick()), line is modelled as linear steps of 10 ms, speedlim passes everything.
It proves the wiring is consistent; it does not prove how Max itself behaves."""
import json, math, random, sys

def load():
    return json.load(open("midi-drifter.maxpat"))["patcher"]

class Sim:
    def __init__(self, patcher, reverse_fanout=False, seed=7):
        self.boxes = {b["box"]["id"]: b["box"] for b in patcher["boxes"]}
        self.out = {}
        for l in patcher["lines"]:
            p = l["patchline"]; self.out.setdefault(tuple(p["source"]), []).append(tuple(p["destination"]))
        if reverse_fanout:
            for k in self.out: self.out[k].reverse()
        self.rng = random.Random(seed)
        self.midi, self.readout, self.scope, self.interval, self.running, self.ticks = [], None, None, None, False, 0
        self.lastline = 0.0
        self.st = {}
        for i, b in self.boxes.items():
            t = b.get("text", ""); a = t.split()
            if a[:1] == ["pak"]: self.st[i] = [float(x) for x in a[1:]]
            elif a[:1] == ["pack"]: self.st[i] = [int(x) for x in a[1:]]
            elif a[:1] == ["expr"]: self.st[i] = {}
            elif a[:1] == ["f"]: self.st[i] = {"v": 0.0}
            elif a[:1] == ["i"]: self.st[i] = {"v": int(a[1]) if len(a) > 1 else 0}
            elif a[:1] == ["change"]: self.st[i] = {"v": 0}
            elif a[:1] == ["clip"]: self.st[i] = {"lo": float(a[1]), "hi": float(a[2])}
            elif a[:1] == ["sel"]: self.st[i] = {"k": int(a[1])}
            elif a[:1] == ["zl.stream"]: self.st[i] = {"n": int(a[1]), "l": []}
            elif a[:1] == ["random"]: self.st[i] = {"n": int(a[1])}
            elif a[:1] in (["-"], ["/"], ["+"], [">>"], ["&"]): self.st[i] = {"r": float(a[1]) if "." in a[1] else int(a[1])}
            elif b["maxclass"] in ("live.dial", "live.text"): self.st[i] = {"v": self._init(b)}
        self.by_name = {b.get("varname"): i for i, b in self.boxes.items() if b.get("varname")}
        self.metro = next(i for i, b in self.boxes.items() if b.get("text", "").startswith("metro"))
        self.line_id = next(i for i, b in self.boxes.items() if b.get("text", "").startswith("line"))

    @staticmethod
    def _init(b):
        v = b.get("saved_attribute_attributes", {}).get("valueof")
        return v["parameter_initial"][0] if v else 0

    def send(self, src, outlet, val):
        for dst, inlet in self.out.get((src, outlet), []):
            self.recv(dst, inlet, val)

    def expr(self, i, inlet, v):
        b = self.boxes[i]; s = self.st[i]; s[inlet] = v
        if inlet != 0: return
        e = b["text"][5:]
        for k in range(1, 4):
            val = s.get(k - 1, 0)
            e = e.replace(f"$f{k}", repr(float(val))).replace(f"$i{k}", repr(int(val)))
        self.send(i, 0, eval(e, {"exp": math.exp, "int": int}))

    def recv(self, i, inlet, v):
        b = self.boxes[i]; t = b.get("text", ""); mc = b["maxclass"]; a = t.split(); first = a[0] if a else ""; s = self.st.get(i)
        if mc in ("live.dial", "live.text"): s["v"] = v; self.send(i, 0, v)
        elif first == "midiin": self.send(i, 0, v)
        elif first == "midiout": self.midi.extend(v if isinstance(v, list) else [v])
        elif first == "iter":
            for x in (v if isinstance(v, list) else [v]): self.send(i, 0, x)
        elif first == "metro":
            if inlet == 1: self.interval = v
            elif v == "bang":
                if self.running: self.ticks += 1; self.send(i, 0, "bang")
            else:
                was, self.running = self.running, bool(v)
                if self.running and not was: self.ticks += 1; self.send(i, 0, "bang")
        elif first == "random": self.send(i, 0, self.rng.randrange(s["n"]))
        elif first in ("-", "/", "+", ">>", "&") and mc == "newobj":
            if inlet == 1: s["r"] = v
            else:
                x = {"-": lambda: v - s["r"], "/": lambda: v / s["r"], "+": lambda: v + s["r"],
                     ">>": lambda: int(v) >> s["r"], "&": lambda: int(v) & s["r"]}[first]()
                self.send(i, 0, x)
        elif first == "expr": self.expr(i, inlet, v)
        elif first == "clip": self.send(i, 0, min(s["hi"], max(s["lo"], v)))
        elif first == "t":
            for k, c in reversed(list(enumerate(a[1:]))):
                self.send(i, k, "bang" if c == "b" else (int(v) if c == "i" else float(v)) if v != "bang" else 0)
        elif first == "pak":
            if inlet == 0: s[0] = float(v); self.send(i, 0, list(s))
            else: s[inlet] = float(v)
        elif first == "pack":
            if inlet == 0: s[0] = int(v); self.send(i, 0, list(s))
            else: s[inlet] = int(v)
        elif first == "f":
            if inlet == 1: s["v"] = float(v)
            else:
                if v != "bang": s["v"] = float(v)
                self.send(i, 0, s["v"])
        elif first == "i":
            if inlet == 1: s["v"] = int(v)
            else:
                if v != "bang": s["v"] = int(v)
                self.send(i, 0, s["v"])
        elif first == "change":
            if v != s["v"] or not s.get("seen"): s["v"], s["seen"] = v, True; self.send(i, 0, v)
        elif first == "sel":
            if v == s["k"]: self.send(i, 0, "bang")
            else: self.send(i, 1, v)
        elif first == "line":
            if isinstance(v, list):
                tgt, ramp = float(v[0]), float(v[1])
                steps = max(1, int(round(ramp / 10.0))) if ramp > 0 else 1
                for n in range(1, steps + 1): self.lastline = self.lastline + (tgt - self.lastline) / (steps - n + 1); self.send(i, 0, self.lastline)
            else: self.lastline = float(v); self.send(i, 0, self.lastline)
        elif first == "speedlim": self.send(i, 0, v)
        elif first == "zl.stream":
            s["l"] = (s["l"] + [v])[-s["n"]:]; self.send(i, 0, list(s["l"]))
        elif mc == "message": self.send(i, 0, [float(x) for x in t.split()] if len(a) > 1 else float(t))
        elif mc == "multislider": self.scope = v
        elif mc == "flonum": self.readout = v
        elif mc in ("comment", "panel"): pass
        else: raise RuntimeError(f"unhandled object {t or mc}")

    # ---- user actions
    def load(self):
        for i, b in self.boxes.items():
            if b["maxclass"] in ("live.dial", "live.text") and b.get("saved_attribute_attributes"): self.send(i, 0, self.st[i]["v"])
    def set(self, name, v): self.recv(self.by_name[name], 0, v)
    def press(self, name): self.send(self.by_name[name], 0, "bang")
    def tick(self): self.recv(self.metro, 0, "bang")
    def take(self):
        m, self.midi = self.midi, []; return m
    def msgs(self):
        m = self.take(); assert len(m) % 3 == 0, f"byte stream not in triplets: {m}"
        return [tuple(m[k:k + 3]) for k in range(0, len(m), 3)]

def bend(m): return (m[2] << 7) | m[1]

def scenario(rev):
    s = Sim(load(), rev); fails = []; log = []
    def check(name, ok, info=""):
        if not ok: fails.append(f"{name}: {info}")
    s.load()
    first = s.msgs()
    log.append(("load", first))
    check("load: on at start -> first tick sent", len(first) >= 1, first)
    check("status byte ch1 = 224, data bytes 7 bit", all(m[0] == 224 and 0 <= m[1] < 128 and 0 <= m[2] < 128 for m in first), first)
    check("default depth 15 (2.25 %): within +-185 of 8192", all(abs(bend(m) - 8192) <= 185 for m in first), [bend(m) for m in first])
    check("metro started at load", s.running and s.ticks == 1)
    # rate mapping
    s.set("Rate", 0); check("rate 0 -> 4000 ms", abs(s.interval - 4000) < 1e-6, s.interval)
    s.set("Rate", 100); check("rate 100 -> 40 ms", abs(s.interval - 40) < 0.01, s.interval)
    s.set("Rate", 24); check("rate 24 ~ 1.3 s", 1200 < s.interval < 1450, s.interval)
    # depth 0 -> always centre
    s.take(); s.set("Depth", 0)
    for _ in range(6): s.tick()
    ms = s.msgs(); check("depth 0: only centre (224 0 64)", all(m == (224, 0, 64) for m in ms), ms)
    log.append(("depth0", ms))
    # depth 100, glide 0: one jump per tick, wide range, within limits
    s.take(); s.set("Depth", 100); s.set("Glide", 0); s.take()
    seen = []
    for _ in range(60): s.tick(); seen += [bend(m) for m in s.msgs()]
    check("glide 0: one message per tick (or fewer on equal)", len(seen) <= 60 and len(seen) >= 55, len(seen))
    check("depth 100: spans the range, never outside 1..16383", min(seen) < 3000 and max(seen) > 13000 and min(seen) >= 1 and max(seen) <= 16383, (min(seen), max(seen)))
    log.append(("random", seen[:10]))
    s.set("Depth", 50); s.set("Glide", 0); s.take(); mx = 0
    for _ in range(80): s.tick(); mx = max([mx] + [abs(bend(m) - 8192) for m in s.msgs()])
    check("depth 50 (squared) stays within 25 % of full range", 1000 < mx <= 2049, mx)
    s.set("Depth", 100); s.take()
    # glide 100: ramp -> many monotonic steps towards the target, last = target
    s.set("Glide", 100); s.take(); s.set("Rate", 24)
    s.tick(); ms = [bend(m) for m in s.msgs()]
    check("glide 100: many steps per tick", len(ms) > 20, len(ms))
    d = [b - a for a, b in zip(ms, ms[1:])]
    check("glide 100: monotonic ramp", all(x >= 0 for x in d) or all(x <= 0 for x in d), ms[:8])
    log.append(("glide", ms[:5], ms[-1]))
    # walk mode: successive targets differ by at most 0.35 (+ clip)
    s.set("Glide", 0); s.set("Mode", 1); s.take(); s.press("Center"); s.take()
    prev, ok, wmax = 0.0, True, 0.0
    for _ in range(80):
        s.tick(); m = s.msgs()
        if m:
            v = (bend(m[-1]) - 8192) / 8191.0
            if abs(v - prev) > 0.35 + 1e-3: ok = False
            wmax = max(wmax, abs(v)); prev = v
    check("walk: step <= 0.35 per tick", ok); check("walk: wanders (|max| > 0.3 over 80 ticks)", wmax > 0.3, wmax)
    s.set("Mode", 0)
    # channel
    s.set("Channel", 16); s.take(); s.tick(); ms = s.msgs()
    check("channel 16 -> status 239", ms and all(m[0] == 239 for m in ms), ms)
    s.set("Channel", 1)
    # centre button: glides to 8192 and forgets the walk position
    s.take(); s.set("Glide", 0); s.tick(); s.take(); s.press("Center"); ms = s.msgs()
    check("CENTER -> 224 0 64", ms and ms[-1] == (224, 0, 64), ms)
    # off: metro stops, returns to centre; on: starts again
    s.set("Glide", 0); s.tick(); s.take()
    s.set("Drift", 0); ms = s.msgs()
    check("off: returns to centre", ms and ms[-1] == (224, 0, 64), ms)
    t0 = s.ticks; s.tick(); check("off: metro stopped", s.ticks == t0 and not s.msgs())
    s.set("Drift", 1); check("on: metro running again", s.running and s.msgs())
    # read-out + scope
    check("read-out is a float in +-100", isinstance(s.readout, float) and -100 <= s.readout <= 100, s.readout)
    check("scope list <= 100 values in -1..1", isinstance(s.scope, list) and 0 < len(s.scope) <= 100 and all(-1.0 <= x <= 1.0 for x in s.scope), len(s.scope or []))
    return fails, log

res = {}
bad = []
for rev in (False, True):
    f, log = scenario(rev); res[rev] = log
    print(f"fan-out {'reversed' if rev else 'forward '}: {'OK' if not f else 'FAIL'}")
    bad += f
if res[False] != res[True]:
    bad.append("results differ between fan-out orders (patch depends on connection order)")
else:
    print("forward == reversed: identical byte streams")
for f in bad: print("  ", f)
sys.exit(1 if bad else 0)
