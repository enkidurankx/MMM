# M/M/M — Handover

How this collection is built, published and kept consistent. Written so a fresh
session can pick up cold and add an app without re-deriving any of it.

**Owner:** enkidu rankX · **Hub:** https://enkidurankx.github.io/MMM/ ·
**Repo:** `enkidurankx/MMM`, branch `main`, GitHub Pages from root.

> **Not everything here is a web app.** Native / Max for Live projects live under [`native/`](native) and are deliberately kept out
> of the hub, the rack lists and the publishing steps below.

---

## 1. What this is

A set of single-file browser instruments, built for a phone, published as a flat
list of `.html` files on GitHub Pages. Three racks:

| rack | what belongs there |
|---|---|
| `audio` | synths, samplers, recorders, sequencers |
| `visual` | still-image tools, generators, launchers |
| `livefx` | **live camera FX** — the only rack with a shared shell contract |

**Non-negotiables for every app:**

- **One file.** All CSS + JS inline. No build step, no bundler, no imports.
- **No network at runtime.** No CDN, no webfont link, no analytics. Two
  exceptions exist and are documented on their tiles: `trk.4` (COCO-SSD) and
  `therm.3` (MediaPipe) download a model on first run.
- **No login, no accounts, no server.** Nothing leaves the device.
- **Phone first.** 390 px wide is the design target; desktop is the bonus.
- **Silent until touched.** No camera, no audio, no permission prompt before an
  explicit user gesture (the `Start camera` / `INIT_PLAY` button).
- **State in `localStorage` under `mmm.<slug>.*`.** Never anything else.

---

## 2. Repository access

Read is public. Writing needs a fine-grained PAT with **Contents: read & write**
on `enkidurankx/MMM`.

**The token is never stored in memory, in the repo, or in a file that gets
committed.** The owner uploads a small text file containing it at the start of a
session; read it into an env var and use it from there:

```bash
export GH_PAT="$(grep -o 'github_pat_[A-Za-z0-9_]*' /path/to/uploaded-token.txt | head -1)"
```

Delete the scratch directory when finished. If the token ends up pasted into a
chat, tell the owner to rotate it.

### Publishing — always the Git Trees API, never a plain file PUT

Every publish is **one atomic commit** containing: the new app file, the updated
`index.html`, and the deletion of the file it replaces. Sequence:

1. `GET /git/ref/heads/main` → base commit sha
2. `GET /git/commits/{sha}` → base tree sha
3. `GET /git/trees/{tree}` → find `index.html` blob → `GET /git/blobs/{sha}`
4. **Edit that freshly fetched `index.html`** — never a cached copy
5. `POST /git/blobs` for each new file
6. `POST /git/trees` with `base_tree` and entries; a deletion is
   `{path, mode:'100644', type:'blob', sha:null}`
7. `POST /git/commits` → `PATCH /git/refs/heads/main`

### Concurrency — this matters

**A second session edits the same repo.** Always re-fetch `index.html` at push
time and change **only the lines you own**. Practical rules learned the hard way:

- Bumping one app → find its line by filename, edit that line, leave the rest.
- Changing something *inside* tile lines (e.g. translating every `desc:`) →
  merge **per line**: keep the HEAD line and substitute only your field, so a
  version bump another session pushed survives. Verify after building the new
  content that all `file:`/`ver:`/`date:` values still match HEAD.
- Adding a tile → `splice` it in after the last line of its group.
- If a filename you expect is missing from HEAD, **abort** rather than guess.

### Verifying a deploy

The sandbox **cannot reach `enkidurankx.github.io`** — the egress allowlist
covers `github.com`, `api.github.com` and `raw.githubusercontent.com` only. A
403 from the Pages domain is *your own proxy*, not an outage. Check the body:
`x-deny-reason: host_not_allowed`. This was misdiagnosed once as a GitHub outage
and cost the owner several pointless troubleshooting steps.

Verify through the API instead:

- `GET /repos/.../contents/<file>?ref=main` → new file present, old one
  `Not Found`
- `GET /repos/.../pages/builds/latest` → poll until `status: built`; confirm
  `commit` matches yours
- `raw.githubusercontent.com` is fine for content but **CDN-cached** — it can
  serve a stale copy for a minute. The Contents API is authoritative.

Note: several build triggers in quick succession make *all* of them fail
instantly with `duration: 0`. Wait ~90 s and push once.

---

## 3. The hub — `index.html`

Self-contained, fonts embedded as base64 woff2 (Orbitron for display, Chakra
Petch for body) so the hub has **no third-party request** either.

### Tile data — the contract other sessions depend on

```js
const TOOLS = [
  { file: "roto5-v1_5.html",  name: "roto.5",  ver: "v1.5", date: "24.08.2026",
    desc: "Camera · stylistic rotoscope · Sobel edges in 5 modes",
    sym: "⬡", group: "livefx" },
];
const GROUPS = [ {id:"audio",label:"Audio"}, {id:"visual",label:"Visual"},
                 {id:"livefx",label:"Live Cam FX"} ];
```

**One tile per line.** This is deliberate — both sessions edit these lines with
line-based regex. Do not reflow, re-indent or prettify this block.

- `file` — `<slug>-v<major>_<minor>.html`. Filename changes on every release;
  that is the cache-busting mechanism.
- `sym` — one glyph, must be unique. **Stay in Latin-1 or Block Elements**
  (`▒ ▚ ▥`). Exotic ranges render as tofu on Android (see §6).
- `date` — `DD.MM.YYYY`.
- Ordering inside a rack is **manual and intentional** (the owner set the audio
  order); append new tools at the end of their group.

### Hub design

- Indigo plate sampled from a reference image: `--void #130f1f`,
  `--panel #1e1832`; a screen-blended blue glare at 8.5 % over everything.
- Per-rack accents that carry information: amber = audio, mint = visual,
  coral = livefx. Each rack tints its own fields ~9 % toward its accent.
- Per-tool colour from a golden-angle step `hsl((n*137.508)%360 38% 56%)` on the
  bottom edge + the 45° chamfer, so each field is individually identifiable.
- Dense grid: **2 columns even on a phone**, 3 from 560 px, 4 from 860, 5 from
  1100. Density is a hard requirement — the owner rejected a one-column list.
- The last row of each rack is padded with grey placeholder fields so it never
  ends ragged. Column count is read from the *computed* grid at runtime, never
  re-derived from the media queries.
- Open/closed state of each rack persists in `localStorage` under
  `mmm.hub.groups`, applied synchronously after render (no flash).

**Contrast is a hard requirement, not a preference.** Compute ratios before
pushing. Current floor: body ≥12:1, descriptions ≥8:1, smallest meta ≥5:1. A
meta line once shipped at 1.98:1 and had to be fixed.

---

## 4. The live-FX shell — the contract for camera apps

All 10 camera apps share this. Copy the nearest existing app as the skeleton
(`roto5` is the cleanest reference) and change only the marked parts.

### Markup skeleton

```html
<div id="stage">
  <canvas id="view"></canvas>
  <video id="cam-v" playsinline muted></video>
  <div id="hud">…nameplate, fps readout, rec dot…</div>
  <div id="start"><h1>name</h1><p>one line</p><button id="go">Start camera</button></div>
  <div id="tbar">                      <!-- transport, overlaid on the image -->
    <button id="flip" class="ctl" disabled><svg…></button>
    <button id="cam"  class="ctl" disabled><svg…></button>
    <button id="full" class="ctl" disabled><svg…></button>
    <button id="rec"  class="ctl" disabled>Record</button>
  </div>
</div>
<div id="fsbar" hidden>…</div>          <!-- hidden stub, keeps old listeners alive -->
<div id="bar">
  <div class="dialzone">
    <div class="sidecol left"  id="ldials"></div>   <!-- frame rate, blend % -->
    <div class="dialgrid"      id="dials"></div>    <!-- app-specific dials  -->
    <div class="sidecol right" id="gdials"></div>   <!-- brightness, contrast -->
  </div>
  <div class="chiprow" id="chips"></div>            <!-- cycle chips          -->
</div>
```

**Fixed IDs — never rename:** `stage view cam-v hud start go tbar bar
ldials dials gdials chips flip cam full rec fsbar`.

### Panel layout law

```
┌──────────────┬───────────────────────────┬──────────────┐
│  frame rate  │   app-specific dials      │  brightness  │
│  blend %     │   (3-col grid, 4 ≥460px)  │  contrast    │
├──────────────┴───────────────────────────┴──────────────┤
│  cycle chips (2-col grid)                               │
└─────────────────────────────────────────────────────────┘
      transport lives over the image, not here
```

Four anchors never move, in any app: **rate/blend bottom-left, brightness/
contrast bottom-right.** That is the whole point — muscle memory across the
suite. Both side columns are `74px` with mirrored `border-left`/`border-right`.

### `CONTROLS` — declare, don't hand-write

```js
const CONTROLS = [
  { key:'fps',      label:'frame rate', min:5,  max:60,  sens:0.2 },
  { key:'blend',    label:'blend %',    min:0,  max:200, sens:0.8 },
  { key:'style',    label:'style',      min:0, max:4, sens:0.03,
    type:'switch', hud:'styleread', fmt:v=>FX.STYLES[v] },   // → cycle chip
  { key:'edge',     label:'edge',       min:1,  max:50,  sens:0.2 },
  { key:'bright',   label:'brightness', min:50, max:300, sens:1.0 },
  { key:'contrast', label:'contrast',   min:50, max:200, sens:0.6 },
];
const S = { fps:55, blend:0, bright:100, contrast:100, /* app keys */ };
```

The builder routes automatically:

```js
const RIGHT=['bright','contrast'], LEFT=['fps','blend'];
```

`type:'switch'` → cycle chip in `#chips`. Everything else → a knob, in the left
column, right column or centre grid depending on its key. **Every app must
declare all four of `fps`, `blend`, `bright`, `contrast`** — they are the shared
vocabulary.

### The three control types — there are only three

| control | size | behaviour |
|---|---|---|
| knob `.dial` | 56 px | vertical pointer drag + wheel; writes `S[key]` |
| cycle chip `.cyc` | **26 px** | tap = next value; long-press 420 ms = popover |
| icon/action `.ctl` | **34 px** | in the transport overlay only |

Do not invent a fourth. Two apps (`chrom.3`, `bu.FFer`) predate `CONTROLS` and
keep hand-written markup; their original switch buttons live in a hidden
`.legacy` block and a cycle chip *clicks them* — so their handlers run untouched.
Use that same trick for any legacy control you don't want to rewire.

### Transport overlay

`#tbar` sits **inside `#stage`**, absolutely positioned at the bottom with a
gradient. It fades after 3.8 s idle (`.idle`) and returns on a tap of the image.

Two reasons it is inside the stage: it costs the panel no height, and fullscreen
is applied to the **root** via `body.imgfull`, so one bar serves both modes.
There used to be a second `#fsbar`; it is now a hidden stub retained purely so
the existing `fsFlip/fsCam/fsExit/fsRec/fsBar/fsTime` listeners still bind.

**Recording uses `canvas.captureStream()`**, so the overlay never appears in a
clip. Verify this before adding anything else on top of the image.

### Skin

Only `:root` changes between apps:

```css
:root{ --bg:#0a0c0e; --panel:#12161a; --line:#252b31; --ink:#dfe6ea;
       --dim:#5e6b73; --accent:#28d7e6; --mono:…; --sans:…; }
```

`--accent` is the app's identity and must match its entry in FX·Cam's `ACCENT`
map. **`--btn`/`--btn2` do not exist** — a chip once shipped referencing them and
rendered with no fill. Use translucent white (`rgba(255,255,255,.055)`,
`.11` active) so fills work with every palette.

Current accents: `chrom3 #c8351a · lvds1 #ffb700 · buf1 #3fe0d8 · roto5 #28d7e6
· crt4 #33ff66 · trk4 #ffb000 · therm3 #ff6a00 · flow-x #a06bff · hudx #ff0033
· imux #ff2d95`.

### Render loop

Camera → `bctx` (offscreen buffer) → `#view`. WebGL apps render to an offscreen
GL canvas and `bctx.drawImage` it in — **never `readPixels`**, it stalls the GPU.
Compile shaders once; on resize reallocate textures only.

---

## 5. FX·Cam — the launcher

Holds the camera apps in an iframe and switches between them.

- `SLUGS` lists the slugs in tab order; `ACCENT` maps slug → colour.
- It resolves the actual filename **by slug from the live `index.html` at
  runtime**, so version bumps and renames survive automatically. Verified.
- It also has a hardcoded offline fallback list of filenames that goes stale.
  Refresh it when convenient; it is not load-bearing.
- **A new live-FX app must be added to `SLUGS` + `ACCENT` and FX·Cam bumped in
  the same push**, or it won't appear. Non-camera apps must *not* be registered.

---

## 6. Mobile traps that have actually bitten us

- **Unicode icons render as tofu.** `⏻` (U+23FB) is missing from the default
  Android font and shipped as an empty box. All transport icons are now inline
  SVG. Keep it that way; only use glyphs from Latin-1 or Block Elements.
- **`MediaRecorder` mime types are not universal.** Hard-coding `audio/webm`
  throws on iOS Safari. Walk a candidate list with `isTypeSupported`, wrap the
  constructor in try/catch with a parameterless fallback, and derive the file
  extension from the *negotiated* type.
- **A popover inside a small chip gets clipped** by `overflow:hidden` and by
  stacking contexts. Attach popovers to `document.body` with `position:fixed`,
  place them from `getBoundingClientRect`, clamp into the viewport, and register
  the outside-click listener on the *next tick* or the opening press closes it.
- **`clip-path` cuts the border too.** The 45° chamfer on the hub tiles needs its
  diagonal edge drawn back in explicitly, or the corner looks torn.
- **Screen rotation is double-counted easily.** When the page rotates, the canvas
  rotates with it — do not also add `screen.orientation.angle`.

---

## 7. Working method — what "done" means here

The owner is precise, iterates in small corrections, and will notice an
unverified claim. Hold to this:

1. **Read the actual code before changing it.** Every survey has found at least
   one app that is not like the others.
2. **Measure instead of eyeballing.** Render headless with a fake camera
   (`--use-fake-device-for-media-stream`) and assert real numbers: element
   heights, column positions, contrast ratios, page height. Several regressions
   were caught only this way.
3. **Drive the feature, don't just boot the page.** Loading an app proves it
   parses. Load an image, sweep the controls, hit export, fingerprint the output
   and confirm reset returns to baseline.
4. **Syntax-check every inline script and worker blob** with `node --check`
   before pushing.
5. **State what you did *not* verify.** Headless is not a phone; say so.
6. **Report your own mistakes plainly.** Silent no-ops are the dangerous ones —
   e.g. a transform that "succeeded" on an app whose code shape differed
   slightly, leaving a column empty. Add an assertion once you find one.
7. **Ask before large multi-app changes**, then execute in one atomic commit.

---

## 8. Adding a new app — checklist

1. Decide the rack. Camera → `livefx` and the shell contract applies. Otherwise
   `audio`/`visual` and only §1 applies.
2. Read the code. Confirm: single file, no external requests, no permission
   before a gesture, `localStorage` namespaced.
3. For live FX: copy `roto5` as the skeleton; change nameplate, `:root`,
   `CONTROLS`, `S`, and the render function. Nothing else.
4. Name it `<slug>-v<major>_<minor>.html`. Pick a free `sym`.
5. Run it headless: no page/console errors, no external requests, controls
   respond.
6. Push app + tile (+ FX·Cam registration for live FX) in **one** commit against
   freshly fetched HEAD.
7. Verify via API: file present, old removed, build `built`, tile correct.
8. Clean the scratch directory.

---

## 9. The owner's synths

These hardware synths belong to the owner (the list grows); editors and devices for them live in this repo. What is **verified** (from the
manufacturer's documents, checked 30.09.2026) and what is still a guess:

| synth | what it is | verified | not verified |
|---|---|---|---|
| **Behringer Pro 800** | 8-voice analogue poly | 4 banks x 100 programs = 400; responds to CC incl. a *Program Select* CC (0-100) | Program Change / Bank Select behaviour, exact CC number for program select |
| **Arturia MicroFreak** | hybrid digital/analogue | 512 presets with firmware V5; Program Change 0-127 within a bank of 128 (presets 1-128 = bank 1, 129-256 = bank 2, ...) | how the bank is selected by MIDI (Bank Select?) |
| **M-VAVE FM-1** | pocket 6-operator DX7-style FM synth, 32 algorithms | 128 presets = banks A-D x 32 voices; Note Channel (default All) and Effect Channel (default 2); **CC 0-23 on the Effect Channel** = 6 effects x 4 (official MIDI chart); Program Change 0-127; imports DX7 32-voice SysEx banks and asks which bank A-D to replace; single-parameter SysEx `F0 43 10 gg pp vv F7` (address gg*128+pp, 0-154) from firmware v14 on — see section 10 | whether single-voice dumps are stored or only played, flash wear of repeated voice writes, Bluetooth timing for 155 back-to-back writes |
| **Zoom CDR 80** | owner-reported, part of the synth park | — | everything (not researched yet) |
| **Korg NTS-3** | owner-reported, part of the synth park | — | everything (not researched yet) |
| **Korg volca drum** | 6 parts (MIDI channel per part), 2 layers each; CC map from midi.guide: Pan 10, Select 14/15, Level 17/18, EG Attack 20/21, EG Release 23/24, Pitch 26/27, Mod Amount 29/30, Mod Rate 46/47, Bit 49, Fold 50, Drive 51, Dry 52, Send 103, Waveguide Model 116, Decay 117, Body 118, Tune 119; organizer app `volcadrum-editor` (web, rack *Editors*) | not checked against Korg's own MIDI chart; value-to-option mapping (waveform *Select*, waveguide model) is undocumented; whether the unit transmits knob moves as CC |

Sources: Arturia support (MicroFreak preset/bank table), Behringer Pro 800 quick start guide, M-VAVE FM-1 detailed user manual, midi.guide (volca drum CC list, community source).
Rule: never present an unverified row as fact in a UI; offer a way to test it (PC·CONTROL has starting profiles the owner tunes on the hardware).

Apps/devices for them: `pro800-editor`, `microfreak-editor`, `fm1-editor`, `volcadrum-editor` (web, rack *Editors*);
`native/pc-control/m4l` (program change sender with starting profiles for all three).

### Tests for web apps
Non-trivial web apps keep their tests in `tests/<app>/` (Node + the preinstalled Chromium via Playwright; no dependencies are added to the
app itself). `tests/fm1-editor/` runs: `node core.test.js` (SysEx encode/decode, algorithm table), `node browser.test.js` (drives the real page with a
mock Web MIDI output), `node hub.test.js` (tile + redirect). Set `PW=/opt/node22/lib/node_modules/playwright SHOTS=<dir>`.

## 10. State of the non-hub work and what was learned (02.10.2026)

**Branch vs main.** Since 02.10.2026 `main` contains everything: all web apps, `fm1-editor` (v1.17), `native/mmm-clock`, `native/age12`, `native/pc-control`,
`native/README.md`, `tests/` and this handover (the branch `claude/cool-galileo-xmtta5` was merged into `main`). The native projects are deliberately **not** linked from the hub index —
they are separate projects. The owner says "push vX" = publish that FM-1 version to `main` (new file, delete the old one, update the tile line and the redirect in
`fm1-editor/index.html`, verify the Pages URL answers 200 — the first requests after a push are often 404).

**FM-1 editor (`fm1-editor-vN_M.html`, single file, no network).**
- Layout: slim MIDI header (+ *MIDI log* popup), BANK panel (tabs, 32 slots, Send bank / Save .syx / Load .syx / backup JSON), VOICE toolbar (name, Init/Copy/Paste,
  Randomize with Tame/Normal/Wild and FX tick, Mutate, Undo/Redo), collapsible PERFORMANCE (graphical master ADSR + 10 knobs) and EFFECTS (CC 0-23),
  then algorithm, operators, LFO, envelope, level scaling, pitch EG, audition keys. Panels are colour-coded per group; contrast is tested per group.
- **LIVE (top bar, on at start)** edits the FM-1 *edit buffer*: a whole voice goes out as 155 single-parameter writes (`F0 43 10 gg pp vv F7`, device byte fixed 0x10),
  knob moves as single writes throttled to 35 ms, newest value wins. Nothing is stored; the FM-1 shows an unsaved dot, a preset change discards it, SAVE on the unit keeps it.
- PERFORMANCE CCs go on the *note* channel (FM-1+VA firmware): 74 brightness, 71 feedback, 73/75/70/72 attack/decay/sustain/release, 76/77/78 LFO speed/pitch/delay, 58 algorithm,
  85-88 KNOB1-4, 116/117 preset prev/next. Effects: CC 0-23 on the FX channel (default 2; never send CC 1 there — it is Filter Type).
- Randomizer lives in the pure CORE block (`randomVoice(rng,level)`, `randomizeOps`, `randomFx`) and is tested for playability over thousands of seeds.

**What cost most time (so the next session skips it).**
1. Stock M-VAVE firmware: a *single-voice SysEx dump* writes the selected preset's stored copy at once; single-parameter writes made the unit jump to another preset on the
   owner's (old) firmware. The owner then flashed the alternative **FM-1+VA** firmware (baudgirl.com), where parameter writes behave. Always ask which firmware is on the unit.
2. Bluetooth MIDI: short SysEx arrives; a 4104-byte bank also arrives (the unit shows "Save 32 voices to"). Port state flaps — log "listening" once, open the output explicitly.
3. Do not stream whole voices as dumps on every edit (that overwrites a preset). Use parameter writes.
4. Prior art that settled the protocol: Benny Sparra's FM1 DX7 patch importer / research notes (github.com/benny-sparra/fm1-dx7-patch-importer, docs/fm1-research.md),
   the FM-1+VA manual (baudgirl.com/work/FM-1+VA/manual, section MIDI), and the official M-VAVE "FM-1 MIDI" document. Never send OTA/firmware/vendor commands.
5. UI feedback pattern from the owner: dark themes read as "ultra dark" — keep surfaces mid-tone, give every panel group its own tint, keep the page narrow (about 1040 px),
   put frequently used tools on top and rarely used ones into collapsible panels, and never hide the controls of one task in two places.

**Pro-800 editor (`pro800-editor-v2_0.html`, branch only until the owner says "push").** Same design system as the FM-1 editor: slim MIDI header + log popup, PATCH panel (name, notes,
Init/Undo/Redo, Randomize with Tame/Normal/Wild, Send all, Save/Load JSON — old v1.x files still load), colour-coded panels, graphical VCF and VCA envelopes (CC 21/20/19/18 and 25/24/23/22).
CC-only (requests Web MIDI *without* SysEx); LIVE (on at start) sends each change at once, 8 ms apart, newest value per control wins; connecting sends nothing. The Google-Fonts import of v1.8 is gone (no network).
Randomiser and CC tables are in the CORE block and tested (`tests/pro800-editor/`). Underlined labels = not in the manual's CC table (glide mode, spread, kbd ref, bend range).

**Native projects.**
- `native/mmm-clock` — SwiftUI MIDI clock master (macOS 14+), per-output latency offset, input drift/jitter monitor, menu-bar transport, global start/stop ⌃⌥Space,
  Space = start/stop, *Always on top* pin (also over full-screen apps), *Compact* mode (transport + tempo only). Swift cannot be compiled in the cloud container: CI builds it
  (`.github/workflows/mmm-clock.yml`, macOS runner, artifact `MMMClock-macOS`). Download without a GitHub login via nightly.link/<owner>/MMM/actions/runs/<run id>/MMMClock-macOS.zip.
  Pitfalls found: a `@Published` property that assigns to itself in `didSet` recurses forever; `$m.monitor.selected` needs a manual `Binding`.
- `native/age12` — real-time sample-ager: C++ core (`age12_core.h`, null-tested against the web DSP) and the Max for Live device (`AGE12.amxd`, gen~/GenExpr, built by `build_device.py`).
  Max stacks boxes first = top; clamp every gen~ param; ASCII only in GenExpr; keep the triage devices (T1-T3) for bisecting a silent patch.
- `native/pc-control` — M4L Program Change / Bank Select sender (branch only). Next planned: loadable profiles, patch names, per-clip recall, rig snapshots.

**Open items.** FM-1 Max for Live device (use the CC map above, not the old probe); research Zoom CDR 80 and Korg NTS-3 if the owner wants editors for them; check the volca drum CC list against Korg's own MIDI chart;
VST3/AU of AGE·12 once the M4L version is settled.

---

*Last updated 02.10.2026 (section 10 added; sections 1-8 describe the web suite as of 24.08.2026). Suite state then: 22 tools — 8 audio, 4 visual, 10 live FX.
All 10 camera apps verified on the shared panel: side columns 74 px, buttons
34 px, chips 26 px, no stray segmented buttons, no page errors.*
