# MMM Ring Mod (Max for Live audio effect)

**Status: built and logic-tested offline, never opened in Live, not heard.** `node test_ringmod.js` runs the DSP
(sidebands at carrier ± input, AM keeps the input tone, all waves and modes finite at extreme settings, filters, wet/dry).
`python3 test_patch.py` checks the patcher. Only Live/Max can confirm that the file loads: see *If something doesn't work*.

Install: copy `MMM_RingMod.amxd` to `~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/`.

## Controls
- **Wave:** Sine · Tri · Square · Saw (square and saw use PolyBLEP against aliasing).
- **Mode:** *Ideal* (plain multiplication) · *Diode* (diode-bridge character: dead zone, more edge and odd sidebands at higher levels).
- **Freq** (0.1 Hz to 8 kHz, log feel) and **Fine** (±100 cent). Low Freq = tremolo, mid = metallic, high = bell/robot.
- **Shape:** pulse width of the square. **Fold:** smooth wavefolder on the carrier (more sidebands).
- **Ring>AM:** 0 = ring (carrier and input vanish, only sidebands), 1 = amplitude mod (input stays, carrier is unipolar).
- **In FM:** the input signal bends the carrier pitch (up to ±2 octaves), for chaotic, self-modulated sounds.
- **LFO Hz / LFO Oct:** sine LFO on the carrier pitch, depth in octaves.
- **Spread:** phase offset of the right carrier: wide stereo.
- **Drive:** soft saturation of the input before modulation. **HP / LP:** one-pole filters after the modulator.
- **Wet** and **Out dB**.

All controls are Live parameters: automate or MIDI-map them. The carrier is internal (no sidechain input yet).

## Tips
- Voice to dalek: Sine, Freq ≈ 30 to 60 Hz, Ring. Metal: Freq 300 to 800 Hz, Square, Fold up.
- Ring>AM around 0.3 keeps some of the original sound. Wet at 0.5 mixes dry and wet.
- Aliasing: the product of input and a high carrier can alias; use LP at 10 to 12 kHz or run Live at 96 kHz.

## If something doesn't work
1. Device won't load: open `MMM_RingMod.maxpat` in Max, *Save as* `.amxd` from a new Max Audio Effect, or paste
   `MMM_RingMod.genexpr` into a gen~ codebox (`in 1/2` → codebox → `out 1/2`).
2. Silent or "error" in the Max Console: double-click `gen~`; the console names the line. Same constructs as the
   AGE·12 and Vocal Chopper devices (Param / History / floor / min / max / pow / exp / sin / abs, plain `if`, no loops).
3. Diode level too low or high: it is normalised by ear-free maths only (small-signal level close to Ideal); trim with Out dB.

## Files
`build_ringmod.py` (edit here) → `MMM_RingMod.genexpr/.maxpat/.amxd` · `test_ringmod.js` · `test_patch.py`
