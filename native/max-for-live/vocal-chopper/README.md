# MMM Vocal Chopper — chaotic live vocal chopping with 4 outs (Max for Live)

**Status: built and logic-tested offline, never opened in Live.** `test_chopper.js` runs the engine on synthetic speech
(routing, onset, fire, panic, hold, LFO, extreme settings: no NaN, no out-of-range buffer access); `test_patch.py` checks the
patcher wiring. Whether Live/Max accepts the generated file is the one thing only you can verify — see *If something doesn't work*.

Two Audio Effect devices (Live 12 + Max for Live):

| file | what |
|---|---|
| `MMM_VocalChopper.amxd` | the chopper: rolling buffer → grain pool → **4 stereo voices** |
| `MMM_ChopOut.amxd` | tiny receiver: outputs one voice of the chopper (voice 1–4) + optional dry |

## Why two devices (the rack workflow)
A Max for Live audio effect has one stereo output. The chopper plays voice 1 itself and publishes all four voices with
`send~` (`mmmv1L … mmmv4R`); each *Chop Out* picks one up. So:

1. Put the vocal on a track, add an **Audio Effect Rack**, make **4 chains**.
2. Chain 1: **MMM Vocal Chopper** (its own output = voice 1) + your effects for voice 1.
3. Chains 2–4: **MMM Chop Out**, Voice set to **2 / 3 / 4**, + your effects for each voice.
4. Every chain receives the same vocal; the chopper decides which slice goes to which out. Save the rack as a preset.

Chop Out ignores its chain input except for its **Dry** knob (0 = only the chopped voice). Chopper and Chop Out must be in the
same Live set; use one chopper per set (the send names are global). Voices on other chains may arrive one audio block
(≈1–3 ms) late depending on Live's processing order — irrelevant for chopping.

## How it chops
The device records the live input into a rolling buffer (0.5–8 s, **Hold** freezes it). On every **event** it fires one
slice: a random place in the recent past (never ahead of the write head), random length/pitch/direction/level/pan, sent to one
of the outs. Events come from:
- **Clock** — **Sync off:** free rate in Hz (works with Live stopped). **Sync on:** tempo-synced division (**Div**), locked to
  Live's transport — only ticks while Live is playing.
- **Onset** — each word/syllable onset above **Thresh** (Gap = minimum time between onsets, Sens = how sharp the attack must be).
- **Both**, plus the **Fire** button (always) — map it to a pad. **Panic** kills all slices and repeats.

**Chaos** is the master randomness: it scales the length spread, pitch scatter, reverse chance and level variation. The
advanced values are the *maximum* amounts at Chaos 100 %.

## Pages (simple → complex)
- **Simple:** Rate / Div, Chaos, Size, Prob, Thresh, Dry, **Outs** (1–4 in use), **Route** (Random · Cycle · By level: loud
  syllables to higher outs · By pitch: lower-pitched slices to lower outs).
- **Mangle:** Range (how far back it may grab), Pitch scatter (semitones), Reverse chance, Repeats (stutter, same slice
  back-to-back), Width (random pan), Fade, Level variation, Buffer seconds, Onset Sens / Gap.
- **LFO:** sample & hold LFO with **8 independent random values**, smoothed by **Slew**, **Depth**, rate in Hz — or **Per step**
  (new values on every chop step). **LFO ON** is the master switch; the toggles pick which of Size, Pitch, Reverse, Prob, Range,
  Width, Repeat, Chaos it animates (the knob stays the centre). Pages only hide controls; everything keeps working.

Every control is a Live parameter: MIDI-map them, automate them, or put them in Rack macros. Page, Trigger, Hold, Fire, Panic,
Sync are all mappable too.

## Install
Copy both `.amxd` to `~/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/` (or drag onto a track).

## If something doesn't work
The `.amxd` was generated without Max to test it on (same container format as the AGE·12 device, which runs in Live).
1. Device won't load → open `MMM_VocalChopper.maxpat` in Max, *Save as* `.amxd` from a new Max Audio Effect, or paste
   `MMM_VocalChopper.genexpr` into a gen~ codebox (`in 1/2` → codebox → `out 1…8`).
2. Silent / "error" in the Max Console (Window → Max Console) → double-click `gen~`; the console names the line. I used only
   constructs that the AGE·12 device already proves (Param/History/Data/peek/poke/floor/min/max/pow/exp/log/cos/sin/noise,
   plain `if` blocks, no loops, no ternary — the 8-grain pool is unrolled by the script).
3. Voices 2–4 silent → both devices in the same set? Chop Out voice matches? Outs ≥ 2? Route/Trigger fire something (try Fire)?
4. Sync on but nothing happens → Live transport must be playing; use Sync off for a free clock.
5. Pages don't switch → they use `thispatcher`/`script sendbox … hidden`; the controls still work if they stay visible.

## Files
`build_chopper.py` (edit here) → `MMM_VocalChopper.genexpr/.maxpat/.amxd`, `MMM_ChopOut.maxpat/.amxd` ·
`test_chopper.js` (`node test_chopper.js`) · `test_patch.py` (`python3 test_patch.py`).
