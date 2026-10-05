# krell (web) tests

`krell-v0_1.html` is system 4 of the owner's spec (`konzept_spezifikation_autonomes_feedback_system.md`): **Buchla's Krell patch**, a generative event system. Three cells; each is a function generator (rise, fall) that cycles by itself.
At the end of a cycle a sample-and-hold draws what the next one needs: a note from a scale (root, scale, range, how far it wanders), its rise and fall time (spread), its FM timbre and its place in the stereo field.
Chance decides whether a cell plays at all or rests; a finished cell may wake its neighbour (coupling). **The brake** is the spec's self-regulation: how loud and busy the sound is (notes plus echo, measured before the level fader) lengthens the fall of the next notes,
so dense passages slow themselves down. The echo (ping-pong, feedback, darker with every repeat) adds to the activity. The notes are shown in an event view (pitch up, 16 seconds to the left).
Same shell as vink.loop, homoeo and chua (see `tests/feedbacks/README.md`); amber base colour. Silent until the first click; no input, no microphone.

**What the tests found while building:** the activity reading first sat at its maximum almost all the time (normalised too low); with the level re-scaled a typical busy sound reads about 1, a sparse one about 0.15.
With the same seed, BRAKE 100 % makes the notes about three times as long as 0 % and plays about a third of the notes in a minute (115 -> 38 in the first measurement).

- `node tests/krell/dsp.test.js` (about 5 minutes) - runs the AudioWorklet code of the page in Node: notes only from the scale and the range for all five scales (root D, two octaves around C4, at least 80 % of the scale tones used);
  WANDER (neighbour steps against jumps); times as set (rise + fall = every note, at RATE 2 half as long) and SPREAD; CHANCE 0 silent, 50 % about half as many notes; COUPLING wakes neighbours; CELLS 1 / 2 / 3 and joining while it runs;
  TRIG; the brake (notes 1.6 x longer and fewer, activity between 0 and 2, independent of the level fader); no click at any note start or end; 4 extreme settings and 44.1 / 96 kHz bounded; the echo (repeats at 200 ms left and 300 ms right,
  quieter each time, none at mix 0); reset without a click; the same seed plays the same piece; LFO phase per sample, LFO 1 stretches the times by 2^1.5, LFO shape crossfade; recorder; all presets; CPU cost.
- `PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js krell` - the shared browser test of the series plus the krell parts: notes are announced, counted and drawn in the event view,
  the activity bar moves, CELLS 1 keeps it to cell 0, SCALE WHOLE gives whole-tone notes only, TRIG plays a note at CHANCE 0, reset.
- `node tests/feedbacks/clicks.test.js krell` - no clicks when a parameter changes while the sound runs (see `tests/feedbacks/README.md`).

**What this does not prove:** how it sounds (whether the FM voices, the brake and the echo make music), Safari / iOS, the CPU load on a phone. The brake and the chance are statistics: single runs can differ a lot, the tests use fixed seeds and long runs.
