# AGE·12 for Max for Live (prototype)

Real-time insert effect version of the AGE·12 sample ager: pitch up → sample&hold → quantise → pitch down →
DAC filter → analog stage. SP-1200 / MPC60 / MPC3000 presets. Stereo, **6 samples latency** (the dry signal is
delayed to match, so Mix stays phase-aligned).

## Install
1. Copy `AGE12.amxd` to `~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/`
   (or drag it onto an audio track).
2. Ableton Live 12 with Max for Live (Suite or add-on).

## Controls
Pitch (semitones up before the crush) · Rate · Bits · Pre (pre-filter) · DAC (cutoff) · Res · Drive · Noise ·
Asym · Mix · Companded (MPC-style quantiser). The three buttons load a hardware model like in the web app
(they leave Pitch and Pre alone, as the app does).

## If there is no sound at all (triage, in this order)
0. Background: the code now clamps every parameter, so a gen~ whose defaults don't arrive (all zeros) can no longer produce
   NaN (= silence). `AGE12_min.amxd` also pushes the defaults itself via `loadbang`. The preset buttons set *all* dials
   (Pitch 12, Pre 0, Mix 100 %), so they double as a reset if the dials start at their minimum.
   If `AGE12_min.amxd` is still silent, run the ladder in `triage/` — the first silent one is the culprit:
   `T1_codebox` (codebox wiring) → `T2_declarations` (Param/History/Data/peek/poke) → `T3_param_default` (must be half level).
1. `AGE12_thru.amxd`: gen~ with plain in→out wires, **no code**. Must sound unchanged. If it is silent, the problem is the
   device plumbing (plugin~/gen~/plugout~), not the DSP.
2. `AGE12_min.amxd`: same gen~ but with the AGE·12 code and no controls. Silent here but fine in (1) → the codebox doesn't compile;
   open the editor, double-click `gen~` and read **Window → Max Console**.
3. `AGE12.amxd`: the full device.

## If you hear no effect
1. **Mix** dial: is it at 0? (0 = dry only.) Turn it to 100 %. Then set **Bits** to 4 and **Rate** to 4000, which must sound destroyed.
2. Load `AGE12_min.amxd` instead: no controls at all, gen~ defaults only (SP-1200, +12 st, Mix 100 %).
   - Effect audible there but not in `AGE12.amxd` → the dials/messages are the problem, not the DSP.
   - No effect in either → gen~ isn't running the code: open the device's editor, double-click `gen~`, and look at **Window → Max Console**.

## If the device doesn't open or shows errors
`AGE12.amxd` was generated without Max to test it on, so the file format is the risky part. Fallback:
1. Create a new *Max Audio Effect*, open it in the Max editor.
2. Add `plugin~` → `gen~` (2 in / 2 out) → `plugout~`.
3. Double-click `gen~`, add a `codebox`, paste the contents of `AGE12.genexpr`, connect `in 1/2` → codebox → `out 1/2`.
4. Add a `live.dial` per parameter into `prepend <param name>` → `gen~` (names are the `Param` names at the top of the code).

Whatever Max prints in **Window → Max Console** is exactly what's needed to fix it.

## Files
- `build_device.py` – generates everything below (edit here, not in the outputs).
- `AGE12.genexpr` – the DSP (port of `../age12-rt/age12_core.h`).
- `AGE12.maxpat`, `AGE12.amxd` – the patcher and the device.
- `test_genexpr.js` – transpiles the GenExpr to JS and null-tests it against the original web-app DSP
  (`node test_genexpr.js`): ≤ -100 dB error, mix=0 returns the delayed dry signal, pitch sweep stays finite.

## Checking it against the web app
Load one sample into the web app (SP-1200, +12 st, Noise 0) and export the WAV; put the same sample on a track
with the device (same settings, Noise 0, project sample rate = file rate), invert one and sum: it should
null apart from the 6-sample latency.
