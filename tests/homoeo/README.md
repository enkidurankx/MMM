# homoeo (web) tests

`homoeo-v1_0.html` is the browser version of the "autonomous generative feedback system" spec (`konzept_spezifikation_autonomes_feedback_system.md`, from the owner):
nonlinearity (tanh + sine fold) -> three parallel band-pass filters -> one delay per band -> intermodulation -> self-regulating gain -> back into the loop.
Nothing drives it except a noise floor, the burst button or the microphone (push to talk). Same shell as `vink.loop` (coloured sections, faders without touch-to-jump,
REC with a 24-bit WAV download, discard, two LFOs (one turn in 8 minutes up to 1 kHz)).

**Where it differs from the spec, and why (measured, see `dsp.test.js`):** in ONE shared loop the strongest band captures the saturation and the others fade
(22 ... 39 dB apart at the defaults). So each band has its own return path and its own gain control, and a COUPLING control sets how much of the shared
(intermodulated) signal each band hears: 100 % = the spec's single loop, 0 % = three independent loops, default 50 % (bands within a few dB of each other).

- `node tests/homoeo/dsp.test.js` - runs the AudioWorklet code of the page in Node. The parts are checked against their own theory: the band-pass against the analytic
  response (gain 1 at the centre, within 0.6 dB from half to double the centre frequency, Q 1.5 / 6 / 20), the delays by impulse response (47 / 79 / 131 ms x shift),
  the loop by behaviour: it starts from the noise floor, a burst or nothing at all stays silent; it sustains for a minute; band balance in every preset; the spec's
  single loop shows the winner-takes-all; regulation depth follows the damping; loop gain below / above 1 (Feedback x Drive x Fold); reset; width; worst cases;
  moving every control while it runs; delay jumps do not click; LFO swings, drift and the echo of an impulse under the LFO; recorder; 44.1 / 96 kHz; CPU cost.
- `PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js homoeo` - the shared browser test of the feedback series (see `tests/feedbacks/README.md`) plus the microphone parts with a fake device: hold, release, latch, key M, folding the Input section.

**What this does not prove:** how it sounds, how it behaves with a real microphone, Safari / iOS, the CPU load on a phone. The product (intermodulation) adding audible sum and
difference tones is true by construction but was not verified by a measurement; only that it changes the network and keeps it stable. Everything ran headless on Linux.

WEATHER (after the preset review): filter base, loop gain, quality, drive and intermodulation drift slowly, each at its own speed. Before it the presets had a level and tone variation of under 2 % over a minute; now 4 ... 12 % and 5 ... 10 % tone colour. The DSP tests run with WEATHER 0 unless a test asks for it. Presets rebalanced to the same level.
