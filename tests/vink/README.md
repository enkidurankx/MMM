# vink.loop (web) tests

`vink-v1_4.html` is the browser version of the Max for Live device `native/max-for-live/vink-loop` (recursive feedback network after Jaap Vink),
**without the device's FX slot**, with a push-to-talk microphone input and two LFOs (one turn in 8 minutes up to 1 kHz) (LFO 1 -> delay time, LFO 2 -> carrier frequency).

- `node tests/vink/dsp.test.js` - runs the AudioWorklet code of the page in Node. Part 1 compares it sample by sample with the device's
  GenExpr (`VINK.genexpr`, transpiled to JS like in `native/max-for-live/vink-loop/test_vink.js`) for all four filters, four of the carriers, three
  delay types, drive and link settings (max difference < 1e-6); noisy parts (S&H, smooth random, noise carrier, BBD hiss, wow) are compared by level.
  Part 2/3: LFOs (swing, drift, through the audio path: a delay impulse and the ring-modulator sidebands at the LFO peak), sustain, left/right balance, reset (silence within 3 ms, stays empty, burst restarts it), worst case bounded, parameter switching while
  running, 44.1 / 48 / 96 kHz, and the CPU cost per 128-sample block in Node.
- `PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js vink` - the shared browser test of the feedback series (see `tests/feedbacks/README.md`) plus the microphone parts with a fake device: hold, release, latch, key M (gate closed means nothing reaches the loop), raw capture, folding the Input section.

**What this does not prove:** how it sounds, how it behaves with a real microphone and speakers/headphones, Safari/iOS (AudioWorklet needs iOS 14.5+),
or the real CPU load on a phone. Everything here ran headless on Linux.

WEATHER (v1.0 after the preset review): three settings (ring depth, wow, high-pass) drift slowly and each at its own speed, so the loop does not settle (a loop that sits near threshold dies if the filter or the carrier is drifted: those are left alone). The DSP tests run with WEATHER 0 unless a test asks for it. Presets were rebalanced to the same level (within 3 dB) and 'Ping-pong sines' no longer fades out (loop gain 1.3).
