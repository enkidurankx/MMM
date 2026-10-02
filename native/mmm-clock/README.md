# MMM Clock

Small native macOS app (Apple Silicon / macOS 13+) that acts as a **rock-solid MIDI clock master with
start/stop**, so Ableton and your hardware follow one steady reference instead of each other.

## Build

```bash
cd mmm-clock
./build-app.sh          # needs Xcode or `xcode-select --install`
open MMMClock.app
```

No Xcode? Push → GitHub Actions ("MMM Clock (macOS build)") builds `MMMClock.zip`; download it from the
run's artifacts, unzip, then `xattr -cr MMMClock.app` (the build is ad-hoc signed, not notarized).

## What it does

**Day / night:** three-way switch at the top (sun / half-moon / moon) and in the menu-bar panel: *Day*, *Night*, or *Auto*, which follows the macOS appearance (so it changes by itself when macOS does). Text, buttons and the LCD use fixed high-contrast colours (`Theme.swift`; computed WCAG ratios: secondary text 7.7:1 day / 9.9:1 night, filled buttons with white text 5.4:1 or better, LCD 6.2 to 8.4:1 day / 14.5:1 night, against assumed window colours #ECECEC / #1E1E1E); captions are 12 pt so they stay readable at the window's 80 % scale. The ratios are computed, not checked by eye on the running app.

**App icon** (Dock, Finder): a clock face whose 24 ticks stand for the 24 PPQN of the MIDI clock, with the five pins of a MIDI DIN connector on its upper half and a red running hand; drawn by `icon/make_icon.py` (Pillow) into `icon/AppIcon.iconset`, turned into `AppIcon.icns` by `build-app.sh` with `iconutil`. **Tempo display:** the BPM is shown as upright seven-segment digits in a plain frame (`LCDDisplay.swift`) with the run/stop symbol inside it; click it to type a value. TAP is the large button next to it. Day/night and the always-on-top pin sit in the title bar (top right).

**Window:** shown at 80 % of the original size with all proportions unchanged (`ContentView.uiScale`), and it always follows its content. *Outputs*, *Audio sync* and *Input monitor* fold open/closed on their own (chevron at the heading; the audio sync switch stays visible) and remember their state. Fold all three and the window shrinks to transport + tempo + one row with the three headings (click one to open it again). There is no separate compact button. All controls carry SF Symbols icons (play, stop, continue, tap, pin, section icons) and tooltips; the transport buttons are shared by the window and the menu-bar panel.

- **Clock master**, 24 PPQN, BPM 20–300 with 0.01 resolution, tap tempo, Start / Continue / Stop
  (Space = toggle), optional Song Position 0 before Start, optional clock while stopped.
- **Drift-free timing**: tick times come from one running host-time accumulator (no per-tick rounding
  or re-sync), generated on a real-time thread and timestamped for CoreMIDI. Hardware ports get events
  ~20 ms early with a future timestamp so the driver schedules them, not the app thread.
- **Per-output latency offset** (−50…+200 ms, double-click the value to reset): delay or advance each
  device individually so slow and fast gear line up.
- **Virtual port "MMM Clock"** for the DAW, plus every connected MIDI destination as a direct output.
- **Input monitor** for any MIDI source: tempo, long-term drift (ppm), jitter (σ/max) and phase against
  our clock. Point it at a device that echoes our clock (or at Ableton's clock out) to *measure* what
  you're fighting.
- Disables App Nap while running.

## Audio sync (pulse out for non-MIDI gear)

A switch in the window (and the menu-bar panel) turns on a **pulse signal on an audio output** of your choice, derived from the
same clock as the MIDI output. Choose a device other than your DAW's interface and the signal never passes through the DAW.

- **Output device**: any CoreAudio output; both channels (the first two outputs) carry the same pulse. A warning shows if you pick
  the system default output.
- **Pulses per quarter**: 1, 2, 3, 4, 6, 8, 12 or 24 (divisors of the 24 PPQN MIDI clock). The first pulse sits on the downbeat of
  each *Start*.
- **Pulse width** 1-30 ms, **level**, **invert polarity**, **latency offset** (same scale as the MIDI outputs, double-click resets).
- **Pulses only while running** (default) or also while stopped (then the MIDI clock must run while stopped, see above).
- The pulse is placed sample-accurately from the host time of each audio buffer (which includes the device's output latency);
  the status line shows *late pulses* if one reached the audio thread too late.
- With audio sync on, the engine looks 60 ms ahead instead of 25 ms, so **Start and tempo changes take up to ~65 ms** to appear
  (MIDI timing itself is unchanged).

**Not known / not checked:** which pulse width, polarity and rate your gear wants (set them per its manual), and whether your audio
interface passes pulses cleanly (many outputs are AC-coupled and round long pulses off). Measure the result, e.g. record the pulse
on an audio track and compare it with the MIDI clock, then trim the offset. **Not built or run by the author of this change:** the
Swift code could only be compiled by the macOS CI build, and nothing has been heard or measured on hardware.

## Ableton setup

1. Live → Settings → Link, Tempo & MIDI: input **MMM Clock** → **Sync: On**.
2. Enable the **EXT** button in Live's control bar so Live follows the clock.
3. Add your hardware in MMM Clock's output list (instead of routing clock out of Live) and set each
   offset. Start/Stop in MMM Clock now starts Live and the devices together.
4. Live has its own per-port "Sync Delay"; leave it at 0 for the MMM input and trim in MMM Clock so
   all offsets live in one place.

## Finding the offsets

Record the audio of a click from Live and from each device on one track, then measure the gap; put the
gap (in ms) into the *earlier* one's offset. Repeat until transients line up.

## Limitations

- Clock master only (no slave/follow mode, no Ableton Link).
- Hardware timestamps are honoured by USB class drivers; some Bluetooth/network MIDI drivers may not
  schedule ahead, so expect more jitter there.
- Start/tempo changes take effect within ~25 ms (the lookahead), aligned to the MIDI tick grid (~65 ms while audio sync is on).
