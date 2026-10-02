# AGE·12 (copy of the device files)

Convenience copy so all stand-alone Max for Live devices are in one place. **The source of truth is [`../../age12/`](../../age12)**
(C++ core, `build_device.py`, `AGE12.genexpr`/`.maxpat`, tests, full README). Do not edit the files here; rebuild in
`native/age12/m4l/` and copy the results over.

| file | what |
|---|---|
| `AGE12.amxd` | the device (audio effect, gen~) |
| `AGE12_min.amxd`, `AGE12_thru.amxd`, `triage/T1..T3` | small test devices for bisecting a silent patch |
| `preview.png` | UI preview |

Status as in `native/age12/m4l/README.md` (running in Live, per the owner's earlier report). Copied 02.10.2026, byte-identical
to the files in `native/age12/m4l/` (checked with `cmp`).
