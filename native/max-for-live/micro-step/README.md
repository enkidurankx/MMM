# micro.step v3

Max for Live MIDI effect: **per-16th-step microtuning via pitch bend** (device description in the file).
16 step sliders (−100 … +100, cents-style scale), a STEP readout, RANGE (pitch-bend range of the
instrument), SPREAD, RAND and ZERO. Judging from the patcher (not run): it reads the Live transport position, picks the slider for the current 16th and sends that step's pitch-bend value.

| file | what |
|---|---|
| `micro.step_v3.amxd` | the device, as received from the owner |
| `micro.step_v3_paste-into-max.txt` | the same patcher as JSON, to paste into a new Max patcher |

**Status:** v3, delivered by the owner on 02.10.2026. **Not tested in Live by the master session.** No source script exists in
the repo; the `.amxd` is the source. Checked by file only: the `.amxd` parses as a Max patcher (97 objects, 125 patch lines)
and matches the paste-text object for object (same ids, classes and texts).

## v3.1 (requested by the owner, 03.10.2026)

`micro.step_v3.1.amxd` = the owner's v3 plus:

- **MODE** switch (top right): **TRIG** = a MIDI note-on advances to the next step (v3 behaviour); **RUN** = the step advances
  by itself every 16th with Live's tempo and transport (`metro 16n @quantize 16n` -> the same `transport` lookup as the note
  path). RUN is the default; incoming notes still pass through in both modes. In RUN nothing ticks while Live's transport is stopped.
- Slider area now has a dark-grey panel (0.20) against the near-black app background (0.105); the beat-group panels are slightly lighter on it.

Built by `build_microstep_v31.py` from the unchanged original (`micro.step_v3.amxd` stays as received); `test_microstep_v31.py`
checks wiring and the 16th-step arithmetic by simulation. **Not tested in Live**; the metro/`transport` timing, the `@quantize`
attribute and the colours are unverified until enkidu tries it. Known, left as is: the STEPS numbox has no outgoing connection in v3
(sequence length is fixed at 16).
