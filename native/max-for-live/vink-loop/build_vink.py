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
    ("fbk",     "Feedback",    "Fdbk",   0.0,  1.5,    0.9,   1, 0, 1.0),
    ("ringd",   "Ring Depth",  "Ring",   0.0,  1.0,    0.5,   1, 0, 1.0),
    ("cfreq",   "Carrier",     "Carr",   0.5,  2000.0, 55.0,  3, 0, 3.0),
    ("hpf",     "Low Cut",     "LoCut",  20.0, 400.0,  80.0,  3, 0, 3.0),
    ("lpf",     "High Cut",    "HiCut",  1000.0, 16000.0, 8000.0, 3, 0, 3.0),
    ("reso",    "Filter Resonance", "Reso", 0.0, 1.0,   0.2,   1, 0, 1.0),
    ("fdrive",  "Filter Drive", "FDrive", 0.0, 1.0,   0.0,   1, 0, 1.0),
    ("satur",   "Tape Drive",  "Drive",  0.0,  1.0,    0.4,   1, 0, 1.0),
    ("dtime",   "Delay Time",  "Delay",  20.0, 500.0,  180.0, 2, 0, 2.0),
    ("wow",     "Wow Flutter", "Wow",    0.0,  1.0,    0.25,  1, 0, 1.0),
    ("spread",  "Stereo Spread", "Sprd", 0.0,  1.0,    0.3,   1, 0, 1.0),
    ("width",   "Stereo Width", "Width", 0.0,  1.0,    1.0,   1, 0, 1.0),
    ("level",   "Output Level", "Level", 0.0,  1.0,    0.5,   1, 0, 1.0),
    ("wetmix",  "Mix",         "Mix",    0.0,  1.0,    1.0,   1, 0, 1.0),
]
DEFAULTS_MSG = ", ".join(f"{p[0]} {p[5]}" for p in PARAMS) + ", cwave 0, dtype 0, ftype 0, burst 0, clear 0"

def channel(c, inp, out, right, oth):
    sp = "(1 + 0.07 * spr)" if right else "1"
    cs = "(1 + 0.013 * spr)" if right else "1"
    return f"""
// ================= channel {c} =================
// wow / flutter / random drift on the delay time
phA{c} = phA{c} + 0.45 / samplerate; phA{c} = phA{c} - floor(phA{c});
phB{c} = phB{c} + 5.3 / samplerate;  phB{c} = phB{c} - floor(phB{c});
nz{c} = nz{c} + 0.0005 * (noise() - nz{c});
wm{c} = wowe * (0.02 * sin(6.283185307179586 * phA{c}) + 0.006 * sin(6.283185307179586 * phB{c}) + 0.09 * nz{c});
td{c} = tau * {sp} * (1 + wm{c});
td{c} = max(64, min({DSZ} - 8, td{c}));
// two taps of the delay line (read before this sample is written); RESET (keep = 0) silences them at once
rp{c} = w{c} - td{c};
if (rp{c} < 0) {{ rp{c} = rp{c} + {DSZ}; }}
i0{c} = floor(rp{c}); fr{c} = rp{c} - i0{c};
x{c} = (peek(db{c}, mod(i0{c}, {DSZ})) * (1 - fr{c}) + peek(db{c}, mod(i0{c} + 1, {DSZ})) * fr{c}) * keep;
rq{c} = w{c} - td{c} * 0.618;
if (rq{c} < 0) {{ rq{c} = rq{c} + {DSZ}; }}
j0{c} = floor(rq{c}); fq{c} = rq{c} - j0{c};
x2{c} = (peek(db{c}, mod(j0{c}, {DSZ})) * (1 - fq{c}) + peek(db{c}, mod(j0{c} + 1, {DSZ})) * fq{c}) * keep;
// carrier: one phase, all waveforms computed, selected by the weights k0..k7 (no if-blocks: GenExpr scoping)
po{c} = cph{c};
cph{c} = cph{c} + cf * {cs} / samplerate; cph{c} = cph{c} - floor(cph{c});
wr{c} = cph{c} < po{c};                                  // 1 on the sample where the phase wraps
sh{c} = sh{c} + wr{c} * (noise() - sh{c});               // sample & hold: new random value at each wrap
sa{c} = sa{c} + wr{c} * (sb{c} - sa{c});                 // smooth random: glide from the old to the new value
sb{c} = sb{c} + wr{c} * (noise() - sb{c});
cS{c} = sin(6.283185307179586 * cph{c});
cT{c} = 1 - 4 * abs(cph{c} - 0.5);
cW{c} = 2 * cph{c} - 1;
cQ{c} = 1 - 2 * (cph{c} > 0.5);
cM{c} = sa{c} + (sb{c} - sa{c}) * cph{c} * cph{c} * (3 - 2 * cph{c});
cX{c} = 0.15 + 0.85 * tanh(3 * drv * x2{c});            // cross-feed; 0.15 = leak of an unbalanced ring modulator, lets the loop start
car{c} = k0 * cS{c} + k1 * cT{c} + k2 * cW{c} + k3 * cQ{c} + k4 * sh{c} + k5 * cM{c} + k6 * noise() + k7 * cX{c};
// delay type PING-PONG: each loop is fed by a mix of its own delay output and the other channel's (pp = 0 -> independent loops)
xo{c} = x{c} * (1 - pp) + {oth} * pp;
// mixer / hub: seed + noise floor + burst + feedback
hub{c} = ({inp} * sl + fbk2 * xo{c} + nf * noise() + bg * 0.3 * noise() + 0.00000000000000000001 * noise()) * keep;   // 1e-20: keeps the filter states away from denormals
// ring modulator (blend: 0 = bypass, 1 = pure multiplication), power-normalised so that FEEDBACK 1.0 stays the unity point
rmo{c} = hub{c} * (1 - rde + rde * car{c}) * rnorm;
// filter drive: saturates the signal going into the filters (0 = bypass, exact); small-signal gain rises with the drive
rmf{c} = rmo{c} * (1 - fdr) + fdr * tanh(fdg * rmo{c}) / ftn;
// ---------------- filter models: all four run in parallel on the same signal and the selected one is used, so switching never clicks.
// High-pass first (input: ring modulator output), then low-pass (input: the selected high-pass). All states are cleared by RESET.
// 0 CLEAN, high-pass: TPT state-variable filter, 12 dB/oct
hv{c} = (rmf{c} - (kH + gH) * hq1{c} - hq2{c}) * hdn;
hb{c} = gH * hv{c} + hq1{c};
hq1{c} = (gH * hv{c} + hb{c}) * keep;
hl{c} = gH * hb{c} + hq2{c};
hq2{c} = (gH * hb{c} + hl{c}) * keep;
// 1 LADDER, high-pass: four one-pole stages, zero-delay feedback (resonance at the cutoff, level loss like a Moog), tanh at the input
xh{c} = tanh(rmf{c});
h4{c} = (qH4 * xh{c} - (qH4 * hs1{c} + qH3 * hs2{c} + qH2 * hs3{c} + qH * hs4{c})) / (1 + kLadH * qH4);
uh{c} = xh{c} - kLadH * h4{c};
hv1{c} = (uh{c} - hs1{c}) * GH; hy1{c} = hv1{c} + hs1{c}; hs1{c} = (hy1{c} + hv1{c}) * keep; hz1{c} = uh{c} - hy1{c};
hv2{c} = (hz1{c} - hs2{c}) * GH; hy2{c} = hv2{c} + hs2{c}; hs2{c} = (hy2{c} + hv2{c}) * keep; hz2{c} = hz1{c} - hy2{c};
hv3{c} = (hz2{c} - hs3{c}) * GH; hy3{c} = hv3{c} + hs3{c}; hs3{c} = (hy3{c} + hv3{c}) * keep; hz3{c} = hz2{c} - hy3{c};
hv4{c} = (hz3{c} - hs4{c}) * GH; hy4{c} = hv4{c} + hs4{c}; hs4{c} = (hy4{c} + hv4{c}) * keep; hz4{c} = hz3{c} - hy4{c};
// 2 MS-20, high-pass: 12 dB with a clipped input and a resonance that is damped by its own level (screams, then squashes)
xm{c} = tanh(1.5 * rmf{c}) / 1.5;
kmH{c} = kMsH + 0.6 * abs(hmb{c});
hdm{c} = 1 / (1 + gH * (gH + kmH{c}));
hvm{c} = (xm{c} - (kmH{c} + gH) * hm1{c} - hm2{c}) * hdm{c};
hbm{c} = gH * hvm{c} + hm1{c};
hm1{c} = (gH * hvm{c} + hbm{c}) * keep;
hlm{c} = gH * hbm{c} + hm2{c};
hm2{c} = (gH * hbm{c} + hlm{c}) * keep;
hmb{c} = hbm{c} * keep;
// 3 SOFT, high-pass: one pole, 6 dB/oct
hsv{c} = (rmf{c} - hso{c}) * GH; hsy{c} = hsv{c} + hso{c}; hso{c} = (hsy{c} + hsv{c}) * keep; hsz{c} = rmf{c} - hsy{c};
hsel{c} = f0 * hv{c} + f1 * hz4{c} * cmpH + f2 * hvm{c} + f3 * hsz{c};
// 0 CLEAN, low-pass
lv{c} = (hsel{c} - (kL + gL) * lq1{c} - lq2{c}) * ldn;
lb{c} = gL * lv{c} + lq1{c};
lq1{c} = (gL * lv{c} + lb{c}) * keep;
ll{c} = gL * lb{c} + lq2{c};
lq2{c} = (gL * lb{c} + ll{c}) * keep;
// 1 LADDER, low-pass: four one-pole stages with zero-delay feedback k*y4
xl{c} = tanh(hsel{c});
y4{c} = (GL4 * xl{c} + (GL3 * qL * ls1{c} + GL2 * qL * ls2{c} + GL * qL * ls3{c} + qL * ls4{c})) / (1 + kLadL * GL4);
ul{c} = xl{c} - kLadL * y4{c};
lv1{c} = (ul{c} - ls1{c}) * GL; ly1{c} = lv1{c} + ls1{c}; ls1{c} = (ly1{c} + lv1{c}) * keep;
lv2{c} = (ly1{c} - ls2{c}) * GL; ly2{c} = lv2{c} + ls2{c}; ls2{c} = (ly2{c} + lv2{c}) * keep;
lv3{c} = (ly2{c} - ls3{c}) * GL; ly3{c} = lv3{c} + ls3{c}; ls3{c} = (ly3{c} + lv3{c}) * keep;
lv4{c} = (ly3{c} - ls4{c}) * GL; ly4{c} = lv4{c} + ls4{c}; ls4{c} = (ly4{c} + lv4{c}) * keep;
// 2 MS-20, low-pass
xn{c} = tanh(1.5 * hsel{c}) / 1.5;
kmL{c} = kMsL + 0.6 * abs(lmb{c});
ldm{c} = 1 / (1 + gL * (gL + kmL{c}));
lvm{c} = (xn{c} - (kmL{c} + gL) * lm1{c} - lm2{c}) * ldm{c};
lbm{c} = gL * lvm{c} + lm1{c};
lm1{c} = (gL * lvm{c} + lbm{c}) * keep;
llm{c} = gL * lbm{c} + lm2{c};
lm2{c} = (gL * lbm{c} + llm{c}) * keep;
lmb{c} = lbm{c} * keep;
// 3 SOFT, low-pass
lsv{c} = (hsel{c} - lso{c}) * GL; lsy{c} = lsv{c} + lso{c}; lso{c} = (lsy{c} + lsv{c}) * keep;
lsel{c} = f0 * ll{c} + f1 * ly4{c} * cmpL + f2 * llm{c} + f3 * lsy{c};
// tape saturation: soft limiter with unity small-signal gain, peak 1/drive
sv{c} = tanh(drv * lsel{c}) / drv;
// delay type BBD: two more low-pass poles (dark repeats) and a little hiss, written into the loop
bb1{c} = (bb1{c} + bba * (sv{c} - bb1{c})) * keep;
bb2{c} = (bb2{c} + bba * (bb1{c} - bb2{c})) * keep;
sw{c} = sv{c} * (1 - kB) + (bb2{c} + 0.0003 * noise()) * kB;
sw{c} = sw{c} * (abs(sw{c}) > 0.000000000001);   // flush below 1e-12: nothing infinitesimal can grow back by itself (RESET stays empty)
poke(db{c}, sw{c} * keep, w{c});
w{c} = mod(w{c} + 1, {DSZ});
xp{c} = x{c};
// output tap = delay output; x <= 1/drive, so wet <= level
yo{c} = {inp} * (1 - wmx) + x{c} * drv * lvl * wmx;
"""

def genexpr():
    head = f"""// VINK-LOOP: recursive feedback network (ring modulator + filters + tape saturation + delay in a closed loop), stereo.
// Generated by build_vink.py - edit there, not here.
Param seedlvl(0.5, min=0, max=1);          // how much of the track audio seeds the loop
Param nfloor(0.25, min=0, max=1);          // noise floor injected into the loop (self-start)
Param fbk(0.9, min=0, max=1.5);            // loop gain; the loop holds from about 0.8 at the default resonance (higher resonance: lower; measured, see test)
Param ringd(0.5, min=0, max=1);            // ring modulator depth
Param cfreq(55, min=0.5, max=2000);        // carrier oscillator Hz
Param cwave(0, min=0, max=7);              // carrier: 0 sine, 1 triangle, 2 saw, 3 square, 4 sample-and-hold, 5 smooth random, 6 noise, 7 cross-feed (2nd delay tap)
Param hpf(80, min=20, max=400);
Param lpf(8000, min=1000, max=16000);
Param fdrive(0, min=0, max=1);             // drive into the filters (0 = off)
Param ftype(0, min=0, max=3);              // filter character: 0 clean 12 dB, 1 ladder 24 dB, 2 MS-20 style 12 dB, 3 soft 6 dB
Param reso(0.2, min=0, max=1);              // resonance of both loop filters (low-pass full, high-pass about half)
Param satur(0.4, min=0, max=1);
Param dtype(0, min=0, max=3);              // delay type: 0 tape (wow/flutter), 1 digital (clean), 2 BBD (dark + hiss), 3 ping-pong (L and R feed each other)
Param dtime(180, min=20, max=500);         // ms
Param wow(0.25, min=0, max=1);
Param spread(0.3, min=0, max=1);
Param width(1, min=0, max=1);              // stereo width of the result: 0 mono, 1 as is (mid/side)
Param level(0.5, min=0, max=1);
Param wetmix(1, min=0, max=1);
Param burst(0, min=0, max=1);              // 1 = inject a noise burst (button holds it ~120 ms)
Param clear(0, min=0, max=1);              // 1 = RESET: silence the loop and zero delay + filter memory (button holds it ~750 ms)

"""
    state = ""
    for c in "LR":
        state += (f"History phA{c}(0); History phB{c}(0); History nz{c}(0); History cph{c}(0); History w{c}(0);\n"
                  ""
                  f"History sh{c}(0); History sa{c}(0); History sb{c}(0);\n"
                  f"History hq1{c}(0); History hq2{c}(0); History lq1{c}(0); History lq2{c}(0); History bb1{c}(0); History bb2{c}(0); History xp{c}(0);\n"
                  f"History hs1{c}(0); History hs2{c}(0); History hs3{c}(0); History hs4{c}(0); History hm1{c}(0); History hm2{c}(0); History hmb{c}(0); History hso{c}(0);\n"
                  f"History ls1{c}(0); History ls2{c}(0); History ls3{c}(0); History ls4{c}(0); History lm1{c}(0); History lm2{c}(0); History lmb{c}(0); History lso{c}(0);\n"
                  f"Data db{c}({DSZ});\n")
    derived = """
// ---- parameters, clamped so that unset/zero values can never produce inf or NaN ----
sl = max(0, min(1, seedlvl));
nzp = max(0, min(1, nfloor));
nf = nzp * nzp * 0.05;
fbk2 = max(0, min(1.5, fbk));
rd = max(0, min(1, ringd));
cf = max(0.5, min(2000, cfreq));
wv = max(0, min(7, floor(cwave + 0.5)));
k0 = wv < 0.5;
k1 = (wv > 0.5) * (wv < 1.5);
k2 = (wv > 1.5) * (wv < 2.5);
k3 = (wv > 2.5) * (wv < 3.5);
k4 = (wv > 3.5) * (wv < 4.5);
k5 = (wv > 4.5) * (wv < 5.5);
k6 = (wv > 5.5) * (wv < 6.5);
k7 = wv > 6.5;
// mean square of each carrier (for the power normalisation of the ring modulator)
cpow = 0.5 * k0 + 0.3333 * k1 + 0.3333 * k2 + 1 * k3 + 0.3333 * k4 + 0.2 * k5 + 0.3333 * k6 + 0.5 * k7;
rde = rd * (1 - k7) + min(rd, 0.85) * k7;   // cross-feed: pure product with its own delayed tap would die, so RING is capped there
rnorm = 1 / sqrt((1 - rde) * (1 - rde) + cpow * rde * rde);
fcH = max(20, min(400, hpf));
fcL = min(max(1000, min(16000, lpf)), 0.45 * samplerate);
rs = max(0, min(1, reso));
kL = 1 / (0.707 + rs * rs * 10);               // damping = 1/Q: Q 0.707 (no resonance) ... 10.7
kH = 1 / (0.707 + rs * rs * 4);
gH = tan(3.141592653589793 * fcH / samplerate);
gL = tan(3.141592653589793 * fcL / samplerate);
hdn = 1 / (1 + gH * (gH + kH));
ldn = 1 / (1 + gL * (gL + kL));
qH = 1 / (1 + gH); GH = gH * qH; qH2 = qH * qH; qH3 = qH2 * qH; qH4 = qH3 * qH;
qL = 1 / (1 + gL); GL = gL * qL; GL2 = GL * GL; GL3 = GL2 * GL; GL4 = GL3 * GL;
kLadL = 3.8 * rs;                                // ladder resonance feedback (self-oscillation would be 4)
kLadH = 3.0 * rs;
cmpL = 1 + 0.75 * kLadL;                         // a real ladder loses level as the resonance rises; 75 % of that is made up so the loop can still hold
cmpH = 1 + 0.75 * kLadH;
kMsL = 1 / (0.707 + rs * rs * 20);               // MS-20 style: Q up to ~21 (low-pass), ~9 (high-pass), damped by its own level
kMsH = 1 / (0.707 + rs * rs * 8);
fdr = max(0, min(1, fdrive));
fdg = 1 + 4 * fdr;
ftn = tanh(fdg);
wdt = max(0, min(1, width));
fv = max(0, min(3, floor(ftype + 0.5)));
f0 = fv < 0.5;
f1 = (fv > 0.5) * (fv < 1.5);
f2 = (fv > 1.5) * (fv < 2.5);
f3 = fv > 2.5;
bba = 1 - exp(-6.283185307179586 * 3500 / samplerate);
dv = max(0, min(3, floor(dtype + 0.5)));
kT = dv < 0.5;
kD = (dv > 0.5) * (dv < 1.5);
kB = (dv > 1.5) * (dv < 2.5);
pp = dv > 2.5;
wowe = max(0, min(1, wow)) * (kT + 0.5 * kB);   // wow/flutter: tape full, BBD half, digital and ping-pong none
drv = 1 + 5 * max(0, min(1, satur));
tau = max(20, min(500, dtime)) * 0.001 * samplerate;
spr = max(0, min(1, spread));
lvl = max(0, min(1, level));
wmx = max(0, min(1, wetmix));
bg = max(0, min(1, burst));
keep = 1 - max(0, min(1, clear));
"""
    return head + state + derived + channel("L", "in1", "out1", False, "xpR") + channel("R", "in2", "out2", True, "xL") + """
// stereo width of the whole result (wet + dry): mid/side, 0 = mono, 1 = unchanged
mdd = (yoL + yoR) * 0.5;
sdd = (yoL - yoR) * 0.5;
out1 = mdd + sdd * wdt;
out2 = mdd - sdd * wdt;
"""

def scope_problems(src):
    """GenExpr (like the AGE12 code notes): a variable first assigned inside an if-block exists only in that block.
    Returns the names that are used outside the block they were first set in."""
    import re
    body = re.sub(r"//.*", "", src)
    decl = set(re.findall(r"(?:Param|History|Data)\s+(\w+)", src))
    skip = {"if", "else", "min", "max", "floor", "sin", "tanh", "exp", "sqrt", "peek", "poke", "mod", "noise", "samplerate", "in1", "in2", "out1", "out2"}
    stack, nxt, first, bad = [0], 1, {}, set()
    for m in re.finditer(r"\{|\}|[A-Za-z_]\w*", body):
        t = m.group(0)
        if t == "{": stack.append(nxt); nxt += 1
        elif t == "}": stack.pop()
        elif t in skip or t in decl: continue
        elif t not in first: first[t] = list(stack)
        elif first[t][-1] not in stack: bad.add(t)
    return sorted(bad)

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
        add(box(id=nid(), maxclass="comment", text=(label or ("VINK pass-through test:\nshould sound unchanged" if thru else "VINK DSP test (no controls):\ndry/wet 50 %, a noise burst at load,\nthen the loop should drone")),
                presentation=1, presentation_rect=[8.0, 6.0, 220.0, 34.0], patching_rect=[150, 340, 220, 34], fontsize=12.0))
        if loadbang:
            lb = add(box(id=nid(), maxclass="newobj", text="loadbang", numinlets=1, numoutlets=1, outlettype=["bang"], patching_rect=[150, 380, 60, 22]))
            lm = add(box(id=nid(), maxclass="message", text=DEFAULTS_MSG.replace("wetmix 1.0", "wetmix 0.5"), numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[150, 410, 600, 22]))
            line(lb, 0, lm, 0); line(lm, 0, gen, 0)
            b1 = add(box(id=nid(), maxclass="message", text="burst 1", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[150, 450, 60, 22]))
            dl = add(box(id=nid(), maxclass="newobj", text="delay 120", numinlets=2, numoutlets=1, outlettype=["bang"], patching_rect=[230, 450, 60, 22]))
            b0 = add(box(id=nid(), maxclass="message", text="burst 0", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[310, 450, 60, 22]))
            dl0 = add(box(id=nid(), maxclass="newobj", text="delay 400", numinlets=2, numoutlets=1, outlettype=["bang"], patching_rect=[150, 480, 60, 22]))
            line(lb, 0, dl0, 0); line(dl0, 0, b1, 0); line(b1, 0, gen, 0); line(b1, 0, dl, 0); line(dl, 0, b0, 0); line(b0, 0, gen, 0)
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

    W = 662
    panel(0, 0, W, 169, BG2, 1, EDGE, 8.0, grad=(BG1, BG2))
    groups = [(8, 102, 142, "SEED"), (118, 58, 142, "MIXER"), (184, 102, 142, "RING MOD"), (294, 202, 74, "FILTER"), (504, 150, 74, "TAPE / DELAY"),
              (294, 106, 64, "TYPES"), (408, 246, 64, "OUT")]
    for x, w, h, name in groups:
        y0 = 84 if name in ("TYPES", "OUT") else 6
        panel(x, y0, w, h, GRP, 1, GRPEDGE, 5.0)
        text(x + 6, y0 + 2, w - 12, 11, name, ACC, 8.0, 1)
    for gx in (110, 176, 286, 494):                                # flow arrows between the blocks
        text(gx, 62, 12, 14, ">", WARM, 12.0, 1, 1)
    panel(8, 151, W - 16, 12, GRP, 1, GRPEDGE, 4.0)
    text(8, 152, W - 16, 10, "<<<<<<   RECURSIVE RETURN:  delay out  x feedback  >>  mixer   <<<<<<", WARM, 7.0, 1, 1)

    dial_ids = {}
    pos = {"seedlvl": (14, 22), "nfloor": (62, 22), "fbk": (123, 22), "ringd": (190, 22), "cfreq": (238, 22),
           "hpf": (300, 22), "lpf": (348, 22), "reso": (396, 22), "fdrive": (444, 22), "satur": (510, 22), "dtime": (558, 22), "wow": (606, 22),
           "spread": (438, 88), "width": (492, 88), "level": (546, 88), "wetmix": (600, 88)}
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

    WAVES = ["SINE", "TRIANGLE", "SAW", "SQUARE", "SAMPLE & HOLD", "SMOOTH RANDOM", "NOISE", "CROSS-FEED"]
    mn_ = add(box(id=nid(), maxclass="live.menu", numinlets=1, numoutlets=3, outlettype=["", "", "float"], parameter_enable=1,
                  patching_rect=[30, 300, 100, 20], presentation=1, presentation_rect=[190.0, 100.0, 92.0, 18.0],
                  varname="CarrierWave", fontname="Arial", fontsize=9.0, fontface=1, textcolor=TXT, bgcolor=C(36, 44, 56),
                  bordercolor=C(74, 88, 108), activebgcolor=C(36, 44, 56), activetextcolor=ACC, hltcolor=C(60, 80, 98),
                  saved_attribute_attributes={"valueof": {"parameter_enum": WAVES, "parameter_initial": [0], "parameter_initial_enable": 1,
                      "parameter_longname": "Carrier Wave", "parameter_mmax": len(WAVES) - 1, "parameter_shortname": "Wave", "parameter_type": 2}}))
    PREVIEW.append(("menu", 190, 100, 92, 18, "SINE"))
    tp = add(box(id=nid(), maxclass="newobj", text="prepend cwave", numinlets=1, numoutlets=1, outlettype=[""], patching_rect=[150, 300, 100, 22]))
    line(mn_, 0, tp, 0); line(tp, 0, gen, 0)
    text(190, 120, 94, 28, "carrier wave: S&H = stepped\nrandom at the CARR rate;\nCROSS-FEED = loop tap", DIM, 6.5)

    def menu(varname, longname, short, items, x, y, w, h, ypatch):
        m = add(box(id=nid(), maxclass="live.menu", numinlets=1, numoutlets=3, outlettype=["", "", "float"], parameter_enable=1,
                    patching_rect=[30, ypatch, 100, 20], presentation=1, presentation_rect=[float(x), float(y), float(w), float(h)],
                    varname=varname, fontname="Arial", fontsize=8.5, fontface=1, textcolor=TXT, bgcolor=C(36, 44, 56),
                    bordercolor=C(74, 88, 108), activebgcolor=C(36, 44, 56), activetextcolor=ACC, hltcolor=C(60, 80, 98),
                    saved_attribute_attributes={"valueof": {"parameter_enum": items, "parameter_initial": [0], "parameter_initial_enable": 1,
                        "parameter_longname": longname, "parameter_mmax": len(items) - 1, "parameter_shortname": short, "parameter_type": 2}}))
        PREVIEW.append(("menu", x, y, w, h, items[0]))
        return m
    FTYPES = ["CLEAN 12", "LADDER 24", "MS-20", "SOFT 6"]
    DTYPES = ["TAPE", "DIGITAL", "BBD", "PING-PONG"]
    text(300, 96, 60, 8, "FILTER", DIM, 6.5, 1)
    fm = menu("FilterType", "Filter Type", "Filter", FTYPES, 300, 104, 94, 14, 500)
    fp = add(box(id=nid(), maxclass="newobj", text="prepend ftype", numinlets=1, numoutlets=1, outlettype=[""], patching_rect=[150, 500, 100, 22]))
    line(fm, 0, fp, 0); line(fp, 0, gen, 0)
    text(300, 120, 60, 8, "DELAY", DIM, 6.5, 1)
    dm = menu("DelayType", "Delay Type", "DType", DTYPES, 300, 128, 94, 14, 530)
    dtp = add(box(id=nid(), maxclass="newobj", text="prepend dtype", numinlets=1, numoutlets=1, outlettype=[""], patching_rect=[150, 530, 100, 22]))
    line(dm, 0, dtp, 0); line(dtp, 0, gen, 0)

    def pad(txt, x, y, w, h, bg, edge, tcol, on, rect_id):
        return add(box(id=nid(), maxclass="textbutton", text=txt, numinlets=1, numoutlets=3, outlettype=["", "", "int"],
                       patching_rect=[30, 340 + rect_id, 80, 22], presentation=1, presentation_rect=[float(x), float(y), float(w), float(h)], mode=0,
                       fontname="Arial", fontsize=10.0, fontface=1, bgcolor=bg, bgoncolor=on, bordercolor=edge,
                       textcolor=tcol, textoncolor=C(12, 12, 14), usebgoncolor=1, rounded=6.0))
    bt = pad("SEED BURST", 14, 96, 92, 22, C(46, 28, 20), WARM, WARM, WARM, 0)
    PREVIEW.append(("pad", 14, 96, 92, 22, "SEED BURST", "warm"))
    m1 = add(box(id=nid(), maxclass="message", text="burst 1", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[30, 380, 60, 22]))
    dl = add(box(id=nid(), maxclass="newobj", text="delay 120", numinlets=2, numoutlets=1, outlettype=["bang"], patching_rect=[120, 340, 60, 22]))
    m0 = add(box(id=nid(), maxclass="message", text="burst 0", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[120, 380, 60, 22]))
    line(bt, 0, m1, 0); line(m1, 0, gen, 0); line(bt, 0, dl, 0); line(dl, 0, m0, 0); line(m0, 0, gen, 0)
    # RESET: hold clear=1 for 750 ms (longer than the longest delay read, ~0.55 s) so the whole loop memory is overwritten with zeros
    rt = pad("RESET", 14, 122, 92, 22, C(20, 34, 44), ACC, ACC, ACC, 40)
    PREVIEW.append(("pad", 14, 122, 92, 22, "RESET", "cool"))
    c1 = add(box(id=nid(), maxclass="message", text="clear 1", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[30, 420, 60, 22]))
    dr = add(box(id=nid(), maxclass="newobj", text="delay 750", numinlets=2, numoutlets=1, outlettype=["bang"], patching_rect=[120, 420, 60, 22]))
    c0 = add(box(id=nid(), maxclass="message", text="clear 0", numinlets=2, numoutlets=1, outlettype=[""], patching_rect=[120, 460, 60, 22]))
    line(rt, 0, c1, 0); line(c1, 0, gen, 0); line(rt, 0, dr, 0); line(dr, 0, c0, 0); line(c0, 0, gen, 0)
    text(122, 100, 52, 48, "raise until\nit sustains\n(about 0.8\nto 1.0)", DIM, 7.0, 0, 1)
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
            _, x, y, w, h, name, kind = it
            bg, ed = (C(46, 28, 20), WARM) if kind == "warm" else (C(20, 34, 44), ACC)
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{rgba(bg)}" stroke="{rgba(ed)}"/>')
            body.append(f'<text x="{x + w / 2}" y="{y + h / 2 + 3.5}" font-size="10" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle" fill="{rgba(ed)}">{name}</text>')
        elif k == "menu":
            _, x, y, w, h, name = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{rgba(C(36, 44, 56))}" stroke="{rgba(C(74, 88, 108))}"/>')
            body.append(f'<text x="{x + 6}" y="{y + h / 2 + 3.2}" font-size="9" font-weight="bold" font-family="Arial,sans-serif" fill="{rgba(TXT)}">{name}</text>')
            body.append(f'<path d="M{x + w - 12},{y + 7} l4,5 l4,-5 z" fill="{rgba(ACC)}"/>')
        elif k == "toggle":
            _, x, y, w, h = it
            body.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="{rgba(C(36, 44, 56))}" stroke="{rgba(C(74, 88, 108))}"/>')
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1324" height="338" viewBox="0 0 662 169"><defs>'] + defs + ['</defs><rect width="662" height="169" fill="#08090b"/>'] + body + ['</svg>']
    open(path, "w").write("\n".join(svg))

def amxd_bytes(doc, kind=b"aaaa"):
    body = (json.dumps(doc, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    return (b"ampf" + struct.pack("<I", 4) + kind + b"meta" + struct.pack("<I", 4) + b"\x00\x00\x00\x00" +
            b"ptch" + struct.pack("<I", len(body)) + body)

if __name__ == "__main__":
    code = genexpr()
    bad = sorted({c for c in code if ord(c) > 127})
    assert not bad, f"GenExpr must be ASCII only (gen~ codebox fails to compile otherwise): {bad}"
    sp = scope_problems(code)
    assert not sp, f"variables first set inside an if-block but used outside (gen~ would not compile): {sp}"
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
