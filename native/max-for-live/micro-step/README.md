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
