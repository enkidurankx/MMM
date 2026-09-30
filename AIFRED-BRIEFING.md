# Briefing for Aifred — what enkidu rankX and Claude have built

*Written 30.09.2026 for the agent "Aifred" (OpenClaw). Read this first; `MMM-HANDOVER.md` has the detailed rules.
Repo (public): https://github.com/enkidurankx/MMM — hub: https://enkidurankx.github.io/MMM/*

## 1. The short version
- **Owner:** enkidu rankX. Musician / tinkerer; works with hardware synths and Ableton Live 12 on a Mac (Apple Silicon, M4).
  Precise, iterates in small corrections, notices unverified claims. Talks German; UIs and docs are English.
- **The repo is two things.** (1) A collection of **single-file browser instruments** at the repo root (web apps, published on GitHub Pages from `main`).
  (2) Everything that is **not a web app** lives in `native/` (macOS app, Max for Live devices, C++ DSP) so the two never mix.
- **Status of the newest work:** everything from the 28-30.09.2026 sessions is on the branch `claude/cool-galileo-xmtta5` and is **not merged into `main` yet**
  (so the FM-1 tile is not live on the hub until it is). No pull request has been opened.

## 2. The web collection (repo root)
Rules for every web app: one file, all CSS/JS inline, **no network requests at runtime**, nothing asked before a user gesture, phone-first,
state only in `localStorage` under `mmm.<slug>.*`. Files are named `<slug>-v<major>_<minor>.html`; each app also has a folder `<slug>/index.html`
that redirects to the current version. The hub `index.html` lists them one tile per line (contract in the handover §3).
Table generated from `index.html` on 30.09.2026:

### Audio  (8)

| app | version | what it is | file |
|---|---|---|---|
| rec.4D | v2.6 | 4-track recorder | `rec4D-v2_6.html` |
| rb.88 | v4.27 | Drum machine | `rb88-v4_27.html` |
| maxi.MS | v3.9 | Synth · MS-20 + ladder filter | `maxi-ms-v3_9.html` |
| RS-505 | v1.19 | Paraphonic string synth | `rs505-v1_19.html` |
| Disk.rot | v1.2 | Simulates a failing CD player | `disk-rot-v1_2.html` |
| Sp&Sp |  | Speak & Spell voice synthesis | `speaknspell.html` |
| Chords | v12 | Harmony tool | `vell_chord_builder_v12.html` |
| gmln.4 | v1.3 | Gamelan MIDI generator · slendro/pelog, 4 interlocking lanes, FM bells, MIDI export | `gamelan-v1_3.html` |

### Samplers  (4)

| app | version | what it is | file |
|---|---|---|---|
| GRAN.2 | v2.3 | Granular sampler | `gran2-v2_3.html` |
| V·12 | v3.2 | 12-bit sampler · SP-1200/MPC60 | `vintage12-v3_2.html` |
| micro.sampler | v1.5 | Granular mic sampler | `RSM_v1_5.html` |
| AGE·12 | v1.4 | Sample ager · SP-1200/MPC60/MPC3000 models | `age12-v1_4.html` |

### Visual  (5)

| app | version | what it is | file |
|---|---|---|---|
| FX·Cam | v1.8 | Launcher for live FX cams | `fxcam-v1_8.html` |
| Helios | v1.5 | Photo to bitumen heliography | `heliograph_v1_5.html` |
| PinHole | v2.0 | Photo to simulated long exposure | `solargraph_engine_v2_0.html` |
| C0RUP7ØR | v0.1 | Photo databend | `corup7r-v0_1.html` |
| StageSync | v4.35 | Performance video recorder · graffiti/neon UI, mirror, trim, AV-sync, looks | `stagesync-v4_35.html` |

### VJ Tools  (3)

| app | version | what it is | file |
|---|---|---|---|
| VizSynth | v1.9 | Generative 3D WebGL structure synth · 32 procedural architectures, orbit/mutate/HD render/export | `vizsynth-v1_9.html` |
| CyberTerm | v1.0 | Autonomous CRT terminal simulator · looping hacker-console stream, auto-glitch, HD video export | `cyberterm-v1_0.html` |
| NeuralCore | v1.1 | CRT neural-net visualizer · 3D mesh, attention map, latent cloud, weight tensor · 720p video export | `neuralcore-v1_1.html` |

### Live Cam FX  (10)

| app | version | what it is | file |
|---|---|---|---|
| chrom.3 | v2.11 | Camera · R→G→B frames | `chrom3-v2_11.html` |
| LCD.nx | v2.9 | Camera · LVDS glitch | `lvds1-v2_9.html` |
| bu.FFer | v1.10 | Camera · frame-buffer glitch | `buf1-v1_10.html` |
| roto.5 | v1.7 | Camera · rotoscope edges | `roto5-v1_7.html` |
| crt.4 | v1.8 | Camera · CRT glitch | `crt4-v1_8.html` |
| trk.4 | v1.26 | Camera · AI object tracker | `trk4-v1_26.html` |
| therm.3 | v1.8 | Camera · thermal heatmap | `therm3-v1_8.html` |
| flow.x | v1.7 | Camera · optical-flow trails | `flow-x-v1_7.html` |
| hud.x | v1.8 | Camera · tactical HUD | `hudx-v1_8.html` |
| imu.x | v1.5 | Camera · motion feedback warp | `imux-v1_5.html` |

### Offline FX  (9)

| app | version | what it is | file |
|---|---|---|---|
| roto.5V | v0.1 | Video · rotoscope edges (offline) | `roto5v-v0_1.html` |
| chrom.3V | v0.1 | Video · R→G→B frames (offline) | `chrom3v-v0_1.html` |
| LCD.nxV | v0.1 | Video · LVDS glitch (offline) | `lvds1v-v0_1.html` |
| crt.4V | v0.1 | Video · CRT glitch (offline) | `crt4v-v0_1.html` |
| bu.FFerV | v0.1 | Video · frame-buffer glitch (offline) | `buf1v-v0_1.html` |
| flow.xV | v0.1 | Video · optical-flow trails (offline) | `flowxv-v0_1.html` |
| trk.4V | v0.1 | Video · AI object tracker (offline) | `trk4v-v0_1.html` |
| therm.3V | v0.1 | Video · thermal heatmap (offline) | `therm3v-v0_1.html` |
| hud.xV | v0.1 | Video · tactical HUD (offline) | `hudxv-v0_1.html` |

### Editors  (3)

| app | version | what it is | file |
|---|---|---|---|
| PRO-800 | v1.8 | Behringer Pro-800 WebMIDI patch editor · OSC/LFO/VCF/VCA/mod · randomize | `pro800-editor-v1_8.html` |
| μFREAK | v4.2 | Arturia MicroFreak FW5 WebMIDI patch editor · all OSC types, filter, env, arp · JSON export | `microfreak-editor-v4_2.html` |
| FM-1 | v1.3 | M-VAVE FM-1 (DX7-style 6-op FM) WebMIDI voice editor · 32 algorithms · SysEx bank send/save/load · CC probe | `fm1-editor-v1_3.html` |

### Utility  (2)

| app | version | what it is | file |
|---|---|---|---|
| mind[S|H]cape | v1.7 | Binaural entrainment | `mindscape-v1_7.html` |
| FOCUS | v4.1 | ADHS task matrix · 4-quadrant Eisenhower · What Now · One Thing · Rescue Mode · manual priority drag | `focus-v4_1.html` |

The newest entry is **FM-1** (`fm1-editor-v1_3.html`), see §4.

## 3. `native/` — not web
| folder | what | state |
|---|---|---|
| `native/mmm-clock/` | **MMM Clock**: macOS MIDI clock master (Swift/CoreMIDI). Drift-free ticks on a real-time thread, per-output latency offsets, virtual port "MMM Clock", Start/Continue/Stop, tap tempo, menu-bar transport, global hotkey Ctrl+Opt+Space, input monitor (tempo/drift/jitter). Built to fix latency and drift between Ableton and external gear. | built by GitHub Actions on a macOS runner; in use on the owner's Mac; Ableton follows it (Sync on the input + EXT button) |
| `native/age12/core/` | **AGE·12 real-time core** (C++): streaming version of the web app's sample-ager chain (pitch up, S&H, quantise, pitch down, DAC filter, analog stage), latency 6 samples, null-tested against the web app's own DSP | tested, worst case -103 dB |
| `native/age12/m4l/` | **AGE·12 as a Max for Live audio effect** (gen~). SP-1200/MPC60/MPC3000 presets, brown putty chassis + blue LCD look. Plus triage devices. | running in Live |
| `native/pc-control/m4l/` | **PC·CONTROL**: Max for Live MIDI effect sending Bank Select + Program Change (or Program-as-CC) with modern dark UI; profile pads for Pro 800 / MicroFreak / FM-1 are *starting points only* | first build, **not yet tested in Max** (wiring verified in a simulator) |

Each folder has its own README. Generated device files (`.amxd`, `.maxpat`) are committed so a download link always works; `build_*.py` regenerates them.

## 4. The FM-1 editor (web) — newest
`fm1-editor-v1_3.html`: a DX7-compatible **voice editor for the M-VAVE FM-1** (6 operators, 32 algorithms with diagrams, draggable envelopes, LFO, pitch EG, scaling),
bank view A-D x 32, `.syx` import/export, "Send bank" over Web MIDI (the FM-1 imports standard DX7 32-voice banks and asks for the target bank A-D),
audition keyboard, undo/redo, randomize/mutate, and an experimental **CC probe** to discover the FM-1's undocumented CC map.
Tests: `tests/fm1-editor/` (17 core tests incl. all 32 algorithms vs the DX7 chart, 20 browser checks with a mock MIDI device, hub test).
**Unverified on hardware:** that the FM-1 accepts the bank, single-voice SysEx, live parameter SysEx, its CC numbers. Warn before sending a bank: it overwrites the chosen bank on the FM-1.

## 5. The synth park (owner's gear)
| synth | notes | verified | not verified |
|---|---|---|---|
| Behringer Pro 800 | 8-voice analogue poly | 4 banks x 100 programs = 400; CC incl. a *Program Select* CC (0-100) | Program Change / Bank Select behaviour, exact CC number |
| Arturia MicroFreak | hybrid digital/analogue | 512 presets with firmware V5; PC 0-127 within a bank of 128 | how the bank is selected by MIDI |
| M-VAVE FM-1 | pocket 6-op DX7-style FM, 32 algorithms | 128 presets = banks A-D x 32; global Note Channel + Effect Channel; imports DX7 32-voice SysEx banks; CC on the Effect Channel | CC numbers, Program Change, single-voice / parameter SysEx, voice dump out |
| Zoom CDR 80 | owner-reported | — | not researched yet |
| Korg NTS-3 | owner-reported | — | not researched yet |
| Korg volca drum | owner-reported | — | not researched yet |

Editors exist for the first three (`pro800-editor`, `microfreak-editor`, `fm1-editor`). **Never present an unverified cell as fact in a UI** — offer a way to test it.

## 6. Lessons learned (save yourself the trouble)
- **The cloud sandbox cannot run Swift, Max/Live or hardware.** Swift is compiled on a GitHub macOS runner (workflow `.github/workflows/mmm-clock.yml`); Max devices are generated as text/JSON
  and can only be confirmed by the owner in Live. Say plainly what is untested.
- **Max for Live:** in Max the **first box in the patcher JSON is drawn on top** (put decor panels last, content first); a gen~ codebox must not rely on `Param` defaults arriving
  (clamp every parameter, send defaults via `loadbang`); the `text` object does not embed its content in the device; use `midiout` with raw bytes instead of `pgmout`
  (1-based vs 0-based is unclear); a DSP-free "thru" device and small test devices (`triage/`) are the fastest way to find which layer breaks.
- **Swift/SwiftUI:** assigning to an `@Published` property inside its own `didSet` re-fires it (infinite recursion, crashed at launch once) — guard against it.
- **Web MIDI** needs Chrome/Edge (Safari has none) and a user gesture; SysEx needs the `sysex:true` permission.
- **Workflow that works:** read the existing code first; build a pure core with tests (here: Node + the preinstalled Chromium via Playwright); drive the real page with a mock device;
  measure (contrast, overflow, bytes) instead of eyeballing; report mistakes plainly.
- **Design:** every editor has its own palette (Pro 800 graphite/blue-grey, MicroFreak petrol, FM-1 aubergine with amber carriers and lilac modulators);
  the owner liked the 90s-hardware look for AGE·12 but without "dirt" overlays, and asked for a modern dark look for PC·CONTROL.

## 7. Open items / ideas
1. **Merge `claude/cool-galileo-xmtta5` into `main`** so the FM-1 tile and the reorganised repo go live (owner decides; publishing steps are in the handover §2).
2. Owner to test on hardware: FM-1 bank import + CC probe; PC·CONTROL in Live (then v1.1: loadable device profiles from a text file, patch names, per-clip recall, rig snapshots).
3. **FM-1 Max for Live device** — waits for the CC map (export it from the editor's CC probe, then generate the device from it).
4. Research and, if useful, editors / profiles for Zoom CDR 80, Korg NTS-3, Korg volca drum.
5. AGE·12 as VST3/AU (the tested C++ core is ready); the MMM Clock could grow a slave mode.

## 8. How to work with this repo
Read is public; writing needs a fine-grained token that is **never** stored in the repo (handover §2). Do not edit the tile lines of `index.html` beyond the ones you own.
Branch work goes to the designated branch; open a pull request only when the owner asks.
