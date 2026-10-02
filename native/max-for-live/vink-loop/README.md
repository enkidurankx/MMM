# VINK·LOOP — recursive feedback network (Max for Live audio effect)

![preview](preview.png)

*Mock-up of the UI from the same layout data; Max draws the real thing, so details differ slightly.*

A closed loop in which ring modulator, filters, tape saturation and a delay feed each other, so the sound keeps modulating
itself. Put it on an audio track (or an empty one: it makes sound by itself once the loop holds).

**Status: built, DSP tested in a JS transpile, NOT tested in Max or Live. Nobody has heard it yet.**

**Basis:** the structure follows `jaap_vink_recursive_sound_technique.md`, a description the owner supplied. It was **not**
checked against the video or against Jaap Vink's own work, so "after Vink" means "after that description".

## Structure
```
 seed in / noise burst / noise floor --> MIXER --> RING MOD --> HP + LP --> TAPE SATURATION --> DELAY --+--> out
                       ^                              ^ carrier: sine OR cross-feed (2nd delay tap)    |
                       +----------------------------- x FEEDBACK <------------------------------------+
```
Per channel; stereo = two independent loops, **SPREAD** detunes the right one (delay ×1.07, carrier ×1.013 at 100 %).
The delay is read before it is written (min 20 ms), so there is no one-sample feedback.

## Controls
| control | what | range / default |
|---|---|---|
| **SEED** | how much of the track audio goes into the loop | 0–1 / 0.5 |
| **NOISE** | noise floor in the loop (self-start; 0.25 ≈ −54 dB) | 0–1 / 0.25 |
| **SEED BURST** | button: ~120 ms noise burst into the loop | – |
| **RESET** | button: silences the loop at once and zeroes the delay memory and the filters (holds for 750 ms, longer than the longest delay read). The dry signal keeps passing. With NOISE above 0 and FDBK above the sustain point (see FDBK) the loop grows back from the noise floor; set NOISE to 0 for a clean restart (then it stays exactly empty until you use SEED BURST or feed audio) | – |
| **FDBK** | loop gain. **At the default resonance the loop holds from about 0.8** (reso 0: ~0.9; reso 0.5: ~0.7; reso 1: even 0.5 holds; measured, see below) | 0–1.5 / 0.9 |
| **RING** | ring-modulator depth (0 = bypass, 1 = pure multiplication; power-normalised) | 0–1 / 0.5 |
| **CARR** | carrier oscillator, Hz | 0.5–2000 / 55 |
| **WAVE** (menu) | carrier waveform: SINE, TRIANGLE, SAW, SQUARE, **SAMPLE & HOLD** (new random value at each carrier cycle, i.e. stepped random at the CARR rate), SMOOTH RANDOM (glides between random values), NOISE, **CROSS-FEED** (a second tap of the delay line; RING is capped at 0.85 there) | SINE |
| **LOCUT / HICUT** | 2-pole high-pass / low-pass inside the loop (state-variable filters) | 80 Hz / 8 kHz |
| **RESO** | resonance of both loop filters: low-pass Q 0.7 … 10.7, high-pass 0.7 … 4.7 (RESO², so the low end is fine). More resonance rings at the cutoff and lowers the FDBK needed to hold | 0–1 / 0.2 |
| **DRIVE** | tape saturation `tanh(drive·x)/drive`, drive 1…6 | 0.4 |
| **DELAY TYPE** (menu) | **TAPE** (wow/flutter on the delay time, as before), **DIGITAL** (clean, no wobble), **BBD** (two more low-pass poles at 3.5 kHz in the loop = dark repeats, a little hiss, half the wobble), **PING-PONG** (clean; L and R loops feed each other, so a left-only input appears on the right too) | TAPE |
| **DELAY** | loop delay, ms | 20–500 / 180 |
| **WOW** | wow/flutter/drift on the delay time (±2 % at 100 %); full for TAPE, half for BBD, none for DIGITAL and PING-PONG | 0.25 |
| **SPRD** | stereo spread (see above) | 0.3 |
| **LEVEL / MIX** | output level (peak ≤ level) and dry/wet | 0.5 / 100 % |

Everything is a Live parameter (automatable, saved with the set).

## What was measured (`node test_vink.js`, a 1:1 JS transpile of the GenExpr; not Max)
- Delay: an impulse reappears at the set time (180.0 ms). Mix 0 returns the dry signal exactly.
- **Ring mod works as described:** a 1 kHz seed through a 100 Hz carrier gives 900 and 1100 Hz and no 1000 Hz; with feedback,
  second-generation sidebands (800/1200 Hz) appear.
- **Gain behaviour** (ring 0.5, 55 Hz sine carrier, 80 Hz–8 kHz filters): at the default RESO 0.2, FDBK 0.5 decays (> 40 dB in 6 s), 0.65 still decays,
  **0.9 holds** and at 1.4 the level settles (−4.3 dB rms) and stays ≤ level. Without resonance (RESO 0) the sustain point is ~0.9, with RESO 0.5 ~0.7,
  with RESO 1 even FDBK 0.5 holds. The ring modulator spreads energy into sidebands that run into the filter stop bands, so the net gain is lower than
  FDBK; resonance gives some of it back. So the *metastable* point is not fixed at 1.0: raise FDBK until it just holds.
- **Resonance:** a noise burst through a 2 kHz low-pass rings at 2 kHz: its level relative to 900 Hz rises from −2 dB (RESO 0) to +29 dB (RESO 1).
- **Delay types:** DIGITAL ignores WOW (identical output), TAPE does not (differs by up to 0.9 of full scale with a 1 kHz sine); BBD cuts a 6 kHz sine to 0.27× of DIGITAL and
  adds hiss (−77 dB; digital and tape are silent); PING-PONG moves a left-only input to the right channel (0.38 peak) while the other types keep R silent;
  all four stay finite and ≤ 0 dBFS in the worst case (RESO 1, FDBK 1.5).
- **Safety:** worst case (FDBK 1.5, ring 1, drive 1, loud noise input, wow 1, both carrier modes): finite, peak ≤ 0 dBFS. The tape stage
  limits the loop to 1/drive and the output tap is scaled to ≤ LEVEL.
- Carrier waveforms (one pass, ring 1, 100 Hz carrier, 1 kHz seed): sine gives only 900/1100 Hz, triangle and square only odd harmonics (700/1300 weaker), saw all of them; sample & hold steps (jumps on ~0.3 % of samples at 200 Hz), smooth random has no jumps, noise jumps on most samples. All eight waves stay finite and <= 0 dBFS in the worst case.
- RESET (tape and ping-pong): output silent within 2 ms, the readable part of the delay line (last 0.6 s) is exactly zero, nothing comes back with the noise floor at 0 (values below 1e-12 are flushed to zero in the loop, so the 1e-20 denormal guard cannot grow back), and a seed burst restarts the loop.
- Cross-feed needs some signal to start (the ring modulator leaks 15 % of the input like an unbalanced one) and holds from FDBK ≈ 1.0 at the default RESO (not re-measured since RESO was added).
- Left and right loops are independent; parameters that were never set (all zero) give no NaN.

## Files
- `build_vink.py` – generates everything (edit there, not in the outputs).
- `VINK.genexpr` – the DSP (paste into any gen~ codebox). `VINK.maxpat`, `VINK.amxd` – the device (same gen~ + `prepend <param>` structure as AGE·12).
- `test_vink.js` – the checks above, plus two lints for gen~ pitfalls found the hard way: ASCII only, and no variable first set inside an `if` block but used outside (the first build failed on exactly that: `car`). Cannot catch other GenExpr syntax errors (only Max can). `build_vink.py` runs the same two lints and refuses to build if they fail.
- `VINK_thru.amxd` – gen~ without code, in → out: must sound unchanged (device plumbing).
  `VINK_min.amxd` – the code without controls (defaults pushed by `loadbang`, dry/wet 50 %, a noise burst 0.4 s after load, FDBK 0.9): the dry half is audible at once, the wet half should start to drone.

## Untested — please check in Live
1. The device loads and looks like the mock-up; the dials move the sound.
2. SEED BURST on an empty track starts a drone at the default FDBK 0.9; lowering FDBK to about 0.6 makes it die away, raising it to 1.5 stays bounded. Raising RESO makes it hold at lower FDBK and ring at the HICUT frequency.
3. The WAVE menu works and looks right (it is a `live.menu`; if the dropdown looks wrong tell me), SAMPLE & HOLD sounds stepped, CROSS-FEED differs from the oscillator carriers; WOW makes the delay wander. RESET empties the loop. DELAY TYPE: TAPE wobbles, DIGITAL does not, BBD is darker and hissy, PING-PONG moves left-channel material to the right.
4. Level: default output should never be louder than −6 dBFS; check anyway with a quiet monitor first.

## If something doesn't work
Same ladder as AGE·12: 1. `VINK_thru.amxd` (silent → plumbing). 2. `VINK_min.amxd` (silent → the codebox does not compile: double-click `gen~`,
read **Window → Max Console**; the GenExpr is generated, so send me the message). 3. `VINK.amxd`.
