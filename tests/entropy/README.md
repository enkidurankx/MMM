# entropy v0.1: tests

`entropy-v0_1.html` destroys a signal in a circle. The signal goes through a wave folder (the sine of the signal, pushed off centre by a bias that wanders and that an analog oscillator moves), an amplitude modulation, a limiter, and then through a **real audio codec**:
frames go over a MessagePort to a Worker that runs WebCodecs Opus (encode, lost packets, flipped bits, decode); the decoded frames come back, are written into a ring buffer at the time of the frame and are read `DELAY` seconds behind the present.
What comes back (or, with ERROR, what the codec got wrong) feeds the folder again. A regulator keeps the loop between silence and runaway. `CODEC SOFT` is a crude stand-in (lowpass, sample-and-hold, fewer bits) for browsers without WebCodecs or without Opus,
and it is what the DSP test runs in Node.

- `node tests/entropy/dsp.test.js` (about 4 minutes) - the AudioWorklet code in Node (`harness.js` holds the stub, a fake codec on a MessagePort and the helpers): sound from the start, deterministic, bounded and free of NaN with every parameter at both ends and all at once;
  the regulator (a spark starts a loop with no source, REGULATE keeps its level steady within 10 dB, REGULATE 0 lets it die, a silent loop is thrown a spark by itself); the ring and the fake codec (frames out and back, a burst comes out exactly DELAY later, the 312 samples of Opus delay show as a shift of the content,
  a lost frame is a hole of silence, a codec that answers too late leaves holes and breaks nothing, ERROR is exactly zero for an exact codec and not for one that adds an error, switching CODEC / FRAME while it runs, `nocodec` and `unsupported` fall back to the stand-in);
  the stand-in follows the bitrate; ROAM and LFO 1 move the bitrate; with wander, analog, drift, weather and ROAM the spectrum moves from second to second (mean change per band 4.0 dB against 0.46 dB with nothing moving) and the loop still sounds after 40 s; every preset sounds and stays under the limiter; reset; CPU.
- `PW=/opt/node22/lib/node_modules/playwright node tests/entropy/codec.test.js` (about 4 minutes) - the **real Opus loop in Chromium**, served over http (WebCodecs wants a secure context, `localhost` counts): the page asks for 48 kHz and gets it; the worker is ready; on a clean channel 100 % of the frames come back and the decoder is never torn;
  the way back (frame complete to decoded frame at the worklet) is about 4 ms median, 8 ms at most with 20 ms frames; LOSS 20 % loses 19 % of the frames **and the latency does not creep** (see below); BIT FLIPS 2 % tear the decoder 12 times in 6 s and the loop goes on (0.4 %: rarely, 1 tear in 5 s); the bitrate wanders from 6 to 66 kbit/s without a tear (the encoder is reconfigured about every 150 ms);
  all five frame lengths; through the real codec 6 kbit/s leaves 0.003 % of the energy above 6 kHz, 96 kbit/s 34 %; every preset sounds with its level within 8 dB of the others; SOFT and OPUS switch back and forth.
- `node tests/feedbacks/browser.test.js entropy`, `clicks.test.js entropy`, `consistency.test.js` - the shared checks of the series (the browser test runs the Opus loop too: Chromium accepts the blob worker on a `file:` page; the test prints which codec ran).

## What the tests found

- **The Opus decoder numbers its output frames itself.** After a dropped packet every later frame comes out one frame (20 ms) late in its time stamp (measured: -280 ms after 14 drops), so the loop crept later and later until it read only holes and went silent at the default LOSS 2 %.
  The worker now keeps the time stamps of the chunks it passes on and hands them out in order; the latency stays at 2 ... 8 ms under 20 % loss. The Opus delay (312 samples, 120 with 2.5 / 5 ms low-delay frames) is constant and known; ERROR uses it.
- **A pure loop through the codec ages into a dark rumble**, and with a folder alone the loop settled at 150 ... 650 Hz (centroid) with the regulator at its maximum. FOCUS (two high-pass poles in the way back, default 45 Hz) lifts it: at 20 Hz the Generations preset sits at 0.6 ... 1.4 kHz, at 160 Hz at 3 ... 4.5 kHz with the spectral flatness rising from 0.14 to 0.67 (noise-like).
  The presets were set with flatness below about 0.35 and a centroid between 0.3 and 3 kHz, and with their levels within 8 dB.
- The analog oscillator reaches the folder through the bias even when no source runs; a loop with SEED 0 and no sparks is therefore not silent unless WANDER, TO BIAS and AM are 0 (the tests that want silence set them to 0).
- The click test of the series needs the first value of each `alt` pair to differ from the base value (for entropy it is the changed value). In `creak` and `lichen` the pairs start with the base value, so for those parameters the jump and the fader steps do not change anything and the test proves nothing there.
- Parameters that multiply the signal (seed, fold, AM, shape, to-bias, tone, and the reset) glide per sample; before that `seed` made R = 6, `fold` 11, `am` 11, `shape` 3.3, `tone` 4.4 and `reset` 534 (the loop restarted with a hard edge after the wipe; now the reads fade in over 10 ms).

## What this does not prove

- **How it sounds.** Nothing was heard. Spectral centroid and flatness are measured in headless Chromium and say nothing about whether the result is a world worth listening to or a hissing, rumbling or stuttering loop; the presets are set by measurement, not by ear.
- **Phones.** Whether iOS / Safari and the Android browsers have WebCodecs audio and Opus (it needs https and a recent browser; on GitHub Pages it is https), what the loop latency is there, and whether the CPU holds (CPU in Node: about 12 % of one core for the soft path, the codec runs in its own worker). Without WebCodecs the page says so in the status line and runs the stand-in.
- The loop is an echo-like feedback with 40 ... 150 ms between a sample and its return, not a sample-tight loop; a frame that is late is a hole.
- Safari's `AudioContext({ sampleRate: 48000 })` handling and the blob worker under a strict content policy are untested.
