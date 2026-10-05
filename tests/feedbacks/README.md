# feedbacks: one design for vink.loop, homoeo and chua

The three feedback apps share one shell (`feedbacks/shell.css`, `shell.js`, `icons.svg.html`). `python3 feedbacks/build.py <page.html> ...` injects it between marker pairs into each page
(each app is still ONE HTML file, no network); every app only sets its own hues in `:root{ --h; --t1 ... --t6 }` and describes its sections and controls in short markup.

- **Header**: title, mute, one action (Burst / Kick), Reset. Nothing else.
- **Recorder dock**: its own panel fixed at the bottom (REC, time, download, discard); two-step "Replace?" / "Delete?" as before.
- **Sections**: a dark surface in one hue each, icon, number, name. The fader fill, selected buttons and values inside wear that hue. Red only for recording, live microphone and reset.
- **Controls**: label and value on one line, one short hint (58 characters at most), the fader below with at least 100 px between faders and 46 px height. Faders never jump to the touch point.
  Amount-type controls have a curve (`curve: 2` = half travel gives a quarter) so the low end has more resolution; frequencies and times are logarithmic. Hold the thumb still for 0.4 s for FINE control (one fifth of the travel);
  double-tap a label to put the control back to its default.
- **LFOs**: 0.002 Hz (8 minutes per turn) up to 1000 Hz, run per sample in the DSP (audio-rate modulation makes sidebands instead of aliasing).

`node tests/feedbacks/consistency.test.js` - the shell in each page is byte-identical to the source, hues differ per app (and avoid red), pages use the shell instead of their own copies, every control has a hint, every section an icon.

`PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js <vink|homoeo|chua>` - the same checks for each app in the preinstalled Chromium: header and dock separated, section order / icons / colours,
labels and hints, air between the faders and touch size, curves, LFO range and labels, faders (mouse and real touch events: no jump, relative drag, fine control, double-click reset), mute, header and dock on one row at 390 / 360 / 320 px,
the last section above the dock, REC / WAV download / discard flows, presets, storage, wide screen, no network. App parts: microphone (vink, homoeo), phase portrait and regime reading (chua).

**What this does not prove:** how it looks and feels on a real phone (Safari / iOS in particular: the long-press and touch behaviour were driven with synthetic touch events in Chromium), and how the audio-rate LFOs sound.
