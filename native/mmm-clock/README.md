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
- Start/tempo changes take effect within ~25 ms (the lookahead), aligned to the MIDI tick grid.
