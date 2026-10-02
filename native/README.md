# native/ — everything that is not a web app

The repo root is the **web collection** (single-file browser instruments, published on GitHub Pages, see `MMM-HANDOVER.md`).
Projects that need a compiler, Ableton or macOS live here instead, so the two never mix. Nothing in `native/` is linked from
the hub `index.html`.

| folder | what | needs | status |
|---|---|---|---|
| [`mmm-clock/`](mmm-clock) | macOS MIDI clock master with start/stop, per-output latency offsets, menu bar, global hotkey, input drift/jitter monitor (Swift/CoreMIDI) | macOS 13+, Xcode CLT — or download the artifact of the *MMM Clock (macOS build)* GitHub Action | built and used on a Mac |
| [`age12/core/`](age12/core) | real-time C++ port of the AGE·12 sample-ager chain + null test against the web app's DSP | `g++`, `node` | tested (≤ -100 dB vs. the web app) |
| [`age12/m4l/`](age12/m4l) | AGE·12 as a Max for Live audio effect (gen~), worn-hardware UI, triage devices | Ableton Live 12 + Max for Live | running in Live |
| [`gran2-m4l/`](gran2-m4l) | GRAN.2 granular sampler as an offline Max for Live device (v0.5.5) plus listener and generator script | Ableton Live 12 + Max for Live | built, **untested in Live** |
| [`pc-control/m4l/`](pc-control/m4l) | Program change / bank select sender as a Max for Live MIDI effect (Pro 800, MicroFreak, FM-1 starting profiles) | Ableton Live 12 + Max for Live | first build, untested in Max |

Each folder has its own README with build and usage notes. Generated files (`.amxd`, `.maxpat`, previews) are committed so a
download link always works; the `build_*.py` scripts regenerate them.
