# Rhythm Builder — User Manual

**Version 2.9** · a self-contained browser drum machine and groove sketchpad.

Rhythm Builder is a single HTML file. There is nothing to install, no account, no
internet connection required, and no external libraries — every sound is synthesised
live in the browser. Open the file in any modern browser (Chrome, Safari, Firefox,
Edge) on desktop or mobile and it runs.

---

## Contents

1. [Getting started](#1-getting-started)
2. [Day and night](#2-day-and-night)
3. [The sequencer grid](#3-the-sequencer-grid)
4. [Rotating the grid for phones](#4-rotating-the-grid-for-phones)
5. [Step tools: flam, nudge, chance](#5-step-tools-flam-nudge-chance)
6. [Row tools: solo, rotate, copy, clear, length](#6-row-tools-solo-rotate-copy-clear-length)
7. [Undo and keyboard](#7-undo-and-keyboard)
8. [Transport, tempo and feel](#8-transport-tempo-and-feel)
9. [Banks, chaining and fills](#9-banks-chaining-and-fills)
10. [Sounds: the five kits](#10-sounds-the-five-kits)
11. [Per-instrument controls](#11-per-instrument-controls)
12. [Choke groups](#12-choke-groups)
13. [Analog circuit emulation](#13-analog-circuit-emulation)
14. [FX: warmth, ghost, delay, reverb](#14-fx-warmth-ghost-delay-reverb)
15. [MIDI out](#15-midi-out)
16. [Patterns and blending](#16-patterns-and-blending)
17. [Saving your work](#17-saving-your-work)
18. [Exporting audio and MIDI](#18-exporting-audio-and-midi)
19. [Tips and workflow](#19-tips-and-workflow)
20. [Troubleshooting](#20-troubleshooting)
21. [Quick reference](#21-quick-reference)

---

## 1. Getting started

Open the file and press **▶ Play**. A pattern loads by default; you'll hear it loop.

The layout, top to bottom:

- **Patterns** — load a preset groove, or blend two together
- **Save & recall** — your saved sound sets and songs *(collapsed)*
- **FX** — warmth, ghost level, delay, reverb *(collapsed)*
- **Pattern chaining** — the A/B variations *(collapsed)*
- **Transport** — play, fill, tempo, swing, humanize
- **Sequencer** — the grid where you program beats, with the tap-mode tools
- **Choke groups** *(collapsed)*
- **Instruments** — per-voice kit, level, tune, decay and pan
- **MIDI out** — drive external hardware *(collapsed)*
- **Guide & key** — a quick in-app reference *(collapsed)*

Each section has a coloured header bar, and each keeps its own colour whether the
panel is open or closed — amber for Patterns, green for Save, violet for FX, blue for
Chaining, red for the Sequencer, rose for Instruments, cyan for MIDI, olive for Choke.
Collapsed panels shrink to a single coloured strip, so the stack at the top of the
page reads as a row of labelled handles. Click any header to open or close it.

> **First sound:** browsers only allow audio to start after you interact with the
> page. The first tap on **Play** (or any control) starts the audio engine. This is
> normal and only happens once per session.

---

## 2. Day and night

The **☀ Day / ☾ Night** button sits at the top left.

A fresh install opens in **day mode** — a warm paper-white theme designed to stay
readable on a phone in daylight. Night mode is the dark studio look. The two are not
simple inversions of each other: the section colour language is preserved in both, so
Patterns is amber either way, just as a light tint with dark ink instead of a dark
tint with bright ink.

Your choice is remembered per browser, and the phone's address bar colour follows the
theme so the chrome around the page matches.

---

## 3. The sequencer grid

The grid is the heart of the app. Each **row** is an instrument; each **column** is a
step. Tap a cell to cycle it through four states:

| State | Looks like | Sounds like |
|---|---|---|
| **off** | empty cell | silence |
| **on** | filled in the voice's colour | a normal hit |
| **accent** | filled, with a white dot | a harder hit |
| **ghost** | filled, dimmed | a soft stroke |

Accents and ghosts are **not just volume changes**. Each is rendered as its own
timbre: an accent has a harder, brighter, denser transient, and a ghost is genuinely
darker and shorter — the way a real drum changes tone with how hard it is struck.
Tap a fourth time to return to off.

### The master gate row

The blue row above the instruments controls **which steps exist at all**. Tapping a
step there switches it off for every instrument at once, and the pattern simply skips
it. This is how odd meters work: switch off the last step and you have a 15-step bar;
switch off the last five and you have 11.

The eight-step markers and quarter-note dividers stay in place so you can keep your
bearings even in an odd bar.

---

## 4. Rotating the grid for phones

The **⟳ Rotate** button in the Sequencer header flips the grid ninety degrees:
instruments run across the top, time flows **downward**. On a portrait phone this
turns the long axis of the screen into the useful one, so a whole bar fits on screen
with no horizontal scrolling and the cells become comfortable to tap.

Everything works exactly the same in either orientation. The details rotate with it:
nudge wedges point **down** for late and **up** for forward, and the divider ticks
become horizontal splits. Voice names shrink to two-letter codes with their colour
dot. Your orientation choice is remembered.

---

## 5. Step tools: flam, nudge, chance

Three round buttons sit directly above the grid: **÷**, **«»** and **%**. Tapping one
*arms* it — while a tool is armed, tapping grid cells applies that tool instead of the
normal on/accent/ghost cycle. The whole grid frame takes on the tool's colour so you
can always see which mode you're in. Tap the button again (or press **Esc**) to disarm.

### ÷ Flam

Splits one step into several evenly spaced hits. Tapping a cell cycles through:

- **2 → 3 → 4** — even hits, all the same weight
- **2↗ → 3↗ → 4↗** — **ascending**: the hits swell from soft to loud, building *into*
  the beat
- **2↘ → 3↘ → 4↘** — **descending**: loud to soft, the classic ruff or drag falling
  *off* the beat
- then off

A small corner wedge on the cell shows the shape — pointing up for ascending, down for
descending. Flat flams have no wedge.

### «» Nudge

Pushes a hit off the grid without moving it to another step. Tap a cell for a soft
nudge, again for a strong one, again to return it to the grid. Tapping the **«»**
button a second time flips the direction between **late** (dragging behind) and
**forward** (pushing ahead); the button shows which way it's pointing.

This is where feel lives. A snare nudged slightly late gives a laid-back groove; hats
nudged forward push the track along.

### % Chance

Makes a hit probabilistic. Tap a cell to cycle **100% → 66% → 33% → off**. The
percentage is printed small on the cell. Each pass through the bar rolls the dice
again, so a pattern with a few 33% hits never repeats itself exactly.

---

## 6. Row tools: solo, rotate, copy, clear, length

**Hold** (or right-click) an instrument's name to open the row bar above the grid.
A plain tap on the name still mutes, as always.

- **Solo** — silences every other voice. Soloed names get an amber ring and the rest
  dim. Solo is honoured by exports as well as playback, exactly like mute.
- **‹ ›** — rotates the row one step earlier or later, carrying its dividers, nudges
  and chances with it. The classic move for clave, bell and cross-rhythm patterns.
  A row rotates within its own length (see below).
- **Copy** — tap Copy, then tap another instrument's name to paste this row onto it.
  The button lights while armed; tap it again or press **Esc** to cancel.
- **Clear** — empties just this row.
- **Len − / +** — sets the row's own length. See below.

### Row length and polymeter

At **16** a row follows the bar like everything else. Set it shorter and that voice
cycles on its **own clock**, drifting against the others and realigning every few
bars. A bell in 12 over a kick in 16 is the classic case. Cells beyond the row's
length are dimmed and never play.

Row lengths are per-bank, so A and B can differ, and they are carried into both MIDI
and WAV exports exactly as you hear them.

> Note the difference: **Len** changes one voice's cycle. The blue **master gate row**
> changes the bar length for everybody.

---

## 7. Undo and keyboard

**↩ Undo** in the Sequencer header takes back the last grid edit, ten steps deep. It
covers step taps, master-gate toggles, all the row tools, row lengths, pattern loads,
blends and Clear All. If the edit happened in the other bank, undo switches back to it
first. Tempo is deliberately never undone.

| Key | Action |
|---|---|
| **Space** | Play / stop |
| **Ctrl/Cmd + Z** | Undo |
| **Esc** | Disarm the current tap tool, cancel a row copy, close the row bar |

---

## 8. Transport, tempo and feel

**▶ Play** starts and pauses; **■ Stop** returns to the beginning. **◷ Click** adds a
metronome on the quarter notes with an accent on beat one.

When the transport panel scrolls out of view, a slim **mini-transport** appears fixed
at the bottom of the screen with Play, Stop, Fill, the tempo and the bank you're
editing — so the controls are always in reach on a long mobile page. Tapping the BPM
there jumps back to the full transport.

The knobs, left to right:

- **BPM** — 60 to 200. You can also type a number into the field, or use **Tap** to
  set the tempo by tapping along.
- **Vol** — master output level.
- **Swing** — delays every second sixteenth. Around 55–62% is a natural shuffle;
  higher gets progressively more lopsided.
- **Human** — adds a small random timing and velocity drift to every hit, re-rolled
  each pass. It is scaled per voice: the kick stays tight while hats breathe most, so
  the loop stops sounding quantised without falling apart. Baked into exports.

> **All knobs:** drag up and down to change the value, and **double-tap** (or
> double-click) to reset to the default. On touch the drag runs at a slightly reduced
> sensitivity, because fingers are coarser than a mouse.

---

## 9. Banks, chaining and fills

There are two pattern banks, **A** and **B**. The buttons in the Pattern chaining
panel choose which one you're editing; **Copy A→B** duplicates one into the other as a
starting point for a variation.

Chaining decides what plays:

- **Off** — only the bank you're editing
- **A → B** — two bars, alternating
- **A A B B** — four bars, the common "three bars and a variation" shape

**◆ Fill** is a momentary control, on both the transport and the mini-transport. Press
it while playing and bank B plays for exactly one bar at the next bar boundary, then
the chain takes over again. It arms blue, lights solid for the bar it plays, and needs
no mode to remember.

---

## 10. Sounds: the five kits

Every instrument has its own kit selector — you can mix kits freely across the nine
voices, for instance a Modern kick under CR-78 hats.

**Tapping a sound in the kit bar plays that voice immediately**, so you can hear what
you're choosing. Tapping the sound that's already selected plays it again, which is how
you A/B two kits against each other. Previews work even on a muted voice and never
interrupt a running pattern.

| Kit | Character |
|---|---|
| **Modern** | Contemporary dry drums — truncated envelopes with dead air between hits, exaggerated downward pitch transients, and hats high-passed steeply so the mid-range stays clear. The default. |
| **808** | The classic bridged-T analogue voices: long tuned kick, noise-and-sine snare, six-oscillator metallic hats. |
| **DR-55** | The Boss DR-55's four voices only (kick, snare, rim, closed hat). Raw, aliased, primitive on purpose. |
| **CR-78** | The Roland CR-78's brittle, thin, slightly cheap character. |
| **FM** | Syncussion-inspired FM voices, including feedback-FM noise for the snare wires. |

The Modern kit is built around three principles: envelopes that gate hard, a
psychoacoustic "click" from a fast pitch dive so the kick survives phone speakers, and
surgical spectral isolation so the kit leaves room for synths and vocals.

---

## 11. Per-instrument controls

Each voice strip in **Instruments** has a kit bar and four small knobs:

- **Lvl** — level, 0 to 150.
- **Tune** — pitch. The centre is the stock tuning.
- **Dec** — decay length. On the Modern kit this is how you loosen or tighten the dry
  envelopes.
- **Pan** — position in the stereo field, shown as L100 … C … R100. Double-tap to
  recentre. The panning is equal-power, so a centred kit sounds exactly as it did
  before you touched it. The master WAV export prints the stereo image; the individual
  stems stay mono.

Tapping an instrument's **name** mutes it; holding it opens the row tools (§6).

---

## 12. Choke groups

Choke groups let one voice cut another off, the way a closed hat stops an open one on
a real kit. Assign voices to group **A** or **B** with the chips in the Choke groups
panel; within a group, any new hit silences whatever else in that group is still
ringing.

The obvious pairing is the two hi-hats. Toms and congas in one group also gives a
convincing single-drummer feel.

---

## 13. Analog circuit emulation

The **Analog** toggle adds the small imperfections of real hardware: component drift,
so no two hits are quite identical, and a faint VCA bleed floor under everything.

It is a subtle effect, and it costs a little more memory because each voice keeps a
small pool of slightly different renders. Leave it off if you want the sound perfectly
consistent.

> Even with Analog off, consecutive hits of the same voice are never bit-identical.
> Noise voices draw fresh noise and metallic voices catch their oscillators at random
> phases, exactly as real circuits do — which is what keeps repeated hits from
> comb-filtering against each other through the delay or when nudged.

---

## 14. FX: warmth, ghost, delay, reverb

The FX panel is a **monitoring** section. Warmth, delay and reverb colour what you
hear but are **never printed into the exported files** — the exported stems stay clean
so you can treat them properly in your DAW. The exact settings are written into the
info document that ships with every export, so you can recreate the monitored sound.

- **Warmth** — analogue-style saturation on the master bus.
- **Ghost** — how loud ghost notes are relative to normal hits, from a whisper to
  nearly full level.
- **Delay** — a **send**, not a mix: the dry signal is never turned down, the knob only
  adds repeats. In **FREE** mode the time runs from 30 ms to about 750 ms; in **SYNC**
  it locks to 1/16, 1/12, 1/8, 1/6 or 1/3 of the bar and follows the tempo. Repeats
  **duck** under each fresh hit and swell back in the gaps, so the delay adds depth
  without smearing the groove. Short settings automatically use less feedback so they
  stay a clean slapback rather than turning into a resonant comb.
- **Reverb** — Closet, Small, Room, Large or Hall, with its own dry/wet. The room has
  a proper pre-delay and darkens as it decays, so it sits behind the kit rather than
  smearing through it.

---

## 15. MIDI out

Open **MIDI out**, choose a device and a channel (10 by default), then switch on:

- **Notes** — every hit is sent to your hardware with the full feel intact: swing,
  nudge, humanize, flams, velocity layers and odd-meter gating, using the same note
  numbers as the MIDI export.
- **Clock** — 24 ppqn clock plus Start and Stop, so hardware follows the tempo. An
  all-notes-off is sent when you stop.

Settings are remembered per browser and reconnect on reload. Muted and solo-silenced
voices are not sent. The panel tells you if your browser has no WebMIDI support
(Chrome and Edge do; Safari does not).

---

## 16. Patterns and blending

The **Patterns** panel holds a library of grooves across many genres and traditions.
Pick one from the list to load it.

**Blend** takes two patterns and generates a hybrid: choose a source in each slot and
press **Generate Mix**. The result keeps the skeleton of both and is a good way out of
a blank page. **Sparse** thins whatever is currently in the grid, which is often the
fastest route from a busy preset to something with air in it.

Loading a pattern or generating a blend is undoable.

---

## 17. Saving your work

Everything here lives in your browser's local storage, on your device.

- **Auto-resume** — your workspace is saved continuously and restored when you return.
  You do not need to do anything.
- **Sound sets** — the kit, level, tune, decay and pan of all nine voices, saved under
  a name. Patterns are not included.
- **Songs** — the full picture: both banks, tempo, swing, humanize, FX settings, chain
  mode and the sounds.
- **↓ Collection** — downloads everything you've saved as one `.json` file.
- **⤓ Save to file** — writes the collection straight to a file you choose once; every
  further tap overwrites the same file. Only appears in browsers that support it.
- **↑ Import** — reads a collection back in.
- **↺ Reset** — a fresh workspace. It asks for confirmation once. Your saved sound
  sets and songs, your theme and your MIDI settings all survive.

---

## 18. Exporting audio and MIDI

Choose a length — 1, 2, 4, 8 or 16 bars — and export. Chained patterns are written out
in full, so a four-bar A A B B export contains the real arrangement.

**MIDI** downloads a small zip containing the `.mid` file and an info document. The
MIDI carries timing, velocity, accents and ghosts, flams with their velocity shapes,
nudges, humanize, probabilistic hits (rolled once and baked) and odd-meter gating, on
channel 10 at 96 PPQ.

**WAV** downloads a zip containing a **stereo master** with the pan image printed, one
**mono stem per voice**, and the same info document. Everything is loop-aligned, and
tails that run past the loop point are wrapped back to the start so the files loop
seamlessly.

### The info document

Because the FX are monitor-only, every export package includes an `info.txt` listing:

- what is **baked in** — tempo, bars, chain, meter, swing, humanize, ghost level,
  velocity layers, flams, nudges, chances, row lengths, and pan for the WAV master
- what is **monitor-only** — the exact warmth, delay and reverb settings, so you can
  recreate the sound you were monitoring
- a per-voice table of kit, level, tune, decay, pan, row length, choke group and
  mute/solo state, plus the MIDI note map for MIDI exports

Muted and solo-silenced voices are omitted from all exported files.

---

## 19. Tips and workflow

- **Start from feel, not notes.** Load a preset close to the territory you want, then
  spend your time on swing, nudge and humanize rather than adding more hits.
- **Odd meters are one tap.** Switch off the last step in the blue row and a
  four-on-the-floor pattern becomes a 15-step loop that keeps turning over.
- **Use ghosts generously.** They are proper soft strokes, not quiet hits, so a hat
  line alternating normal and ghost immediately sounds played rather than programmed.
- **Descending flams** on a snare make a tight modern drag; **ascending** flams on hats
  build into a downbeat.
- **Polymeter cheaply.** Set the maracas or rim to a length of 12 or 14 and leave
  everything else at 16 — the pattern will take several bars to come back around.
- **A/B by ear.** Tap between two kits on the same voice to compare them directly; the
  preview fires every time.
- **Chance for life.** A couple of hats at 66% and a rim at 33% keeps a loop moving
  over a long stretch.
- **Add the room last.** Build dry, then bring in delay and reverb — and remember they
  are for your ears only, so the stems stay clean for the mix.

---

## 20. Troubleshooting

**No sound at all.** Browsers require a gesture before audio can start — press Play.
Check the master **Vol** knob, and check that you haven't left a voice soloed. If the
status line under the Patterns panel shows a **⚠** message, that names the exact
problem; send it on and it can be fixed.

**One instrument is missing.** Check whether it's muted, whether another voice is
soloed, whether its row length is shorter than you thought, or whether a choke group
is cutting it off. A **⚠** in the status line would name a faulty voice — the rest of
the machine keeps playing if one voice fails.

**The screen sleeps while playing.** It shouldn't — the app holds a wake lock during
playback. If your device overrides that, tap the screen occasionally.

**Audio stutters on an older phone.** Turn off Analog, and turn the reverb down or off
— the convolution reverb is by far the heaviest thing in the app.

**My work disappeared.** Local storage is per-browser and per-device, and private
browsing windows discard it when closed. Use **↓ Collection** or **⤓ Save to file** for
anything you want to keep.

**A saved song sounds different.** Songs store the FX settings; sound sets don't. If
you loaded a sound set on top, the FX are whatever they were.

---

## 21. Quick reference

### Tapping

| Where | Tap | Hold / second tap |
|---|---|---|
| Grid cell | off → on → accent → ghost | — |
| Grid cell, tool armed | applies that tool's cycle | — |
| Master gate row | switch the step off for everyone | — |
| Instrument name | mute | **hold** for the row tools |
| Kit bar | select **and** preview that sound | re-tap to preview again |
| Any knob | — | **double-tap** to reset |

### Defaults

| | |
|---|---|
| Theme | Day |
| Kit | Modern |
| Tempo | 120 BPM |
| Swing / Humanize | 0% |
| Ghost level | 100% |
| Row length | 16 |
| Pan | Centre |
| MIDI channel | 10 |

---

*Rhythm Builder v2.9 — one file, no dependencies, no network. Everything you hear is
synthesised in the browser as you play.*
