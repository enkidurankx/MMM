# chua (web) tests

`chua-v1_0.html` is system 5 of the owner's spec (`konzept_spezifikation_autonomes_feedback_system.md`): **Chua's circuit as an oscillator**. Three coupled differential equations,
integrated per audio sample with RK4, are the whole sound source: no input, no clock, no microphone, no feedback delay.

    dx/dt = alpha * (y - x - f(x))     dy/dt = x - y + z     dz/dt = -beta * y

`f` is the piecewise-linear Chua diode (slopes -8/7 inside |x| < 1, -5/7 outside). Alpha and beta are the faders from the spec; the added controls are ASYMMETRY (offset in front of the diode),
RATE (circuit time per second, i.e. the pitch), the output stage (source X/Y/Z or X and Y as a stereo pair, TONE low-pass, WIDTH, LEVEL) and two LFOs (one turn in 8 minutes up to 1 kHz) on alpha and beta.
The page shows the phase portrait and a live reading of the Lyapunov exponent (chaotic / periodic / settling) and the pitch. Same shell as `homoeo` and `vink.loop` web (coloured sections,
faders without touch-to-jump, mute, REC with a 24-bit WAV download, discard). Silent until the first click.

**Where it goes beyond the spec:** the safe window and the rescue (below); outside |x| > 4 the diode slope is made positive, like the outer segments of a real Chua diode; without it some parameter settings run away to infinity.
A safety net restarts from rest if the state ever leaves a sane range (it did not in any test). The output removes the mean of each variable (a single scroll sits on one side),
and a soft saturation keeps the loud orbits inside the range.

**What the tests found (v0.1 tipped over easily and got stuck, v0.2 fixes it):** the classic settings (alpha 15.6, beta 28) are chaotic (Lyapunov exponent about 0.4, 0.68 oscillations per unit of circuit time),
but they have a **second stable orbit**, a large regular one (|x| up to about 6), and its basin is huge: from random states about 60 % end on it. v0.1 let the controls cross into the region where the small
chaotic attractor is lost (alpha above 18.85, beta below 22.5, asymmetry beyond about 0.04) and the state then stayed on the large, harsh orbit even after the controls came back. Also, x and z carry most
of their energy (87 % of x) in the slow flipping between the two scrolls, which on X/Y sounds like heavy irregular thumps.
v0.2: (1) the controls are held to a safe window: alpha 12.5 ... 18, beta 24 ... 38 and lifted along the line beta >= 24 + 4 * (alpha - 16) when alpha is high, asymmetry +-0.03; a glide walk over the
old full range with the rescue switched off never leaves the small attractor; (2) the kick is a third of what it was (0 of 240 kicks tipped it); (3) a rescue: if |x| stays above 3.1 for 6 tau or the state comes to rest
(speed below 0.05 for 15 tau) the circuit fades out, restarts from rest and fades in, at most once per 6 s (the page counts these restarts); presets also restart from rest; (4) LOW END (default 25 %) turns down the slow
flipping below 0.2 cycles per tau with a second-order high-pass and its complement, the oscillation itself stays within 3 dB.

- `node tests/chua/dsp.test.js` - runs the AudioWorklet code of the page in Node, checks against mathematics: the diode slopes; RK4 order 4 in the smooth zone (and the order lost across the diode kinks, which is
  what a piecewise-linear characteristic does to any Runge-Kutta scheme); the double scroll bounded, symmetric, both scrolls visited, exponent 0.25 ... 0.65; the safe window (held values, the lift line, glide walk over the old range, jump walk with the rescue on, 240 kicks, rescue of a thrown and of a resting state, rescue limit); LOW END against the slow band; sensitive dependence (1e-9 apart separates at the
  Lyapunov rate); the regime reading in five settings; the second attractor; bounded and finite at 63 extreme settings and three sample rates; the same orbit at 100 and 400 circuit-time per second after the same circuit time;
  2000 per second at 44.1 kHz against a fine reference; pitch readout against an independent zero-crossing count; DC removal; stereo; TONE against the analytic one-pole response; kick and reset without clicks; the safety net;
  LFO swings and drift; all presets; recorder; CPU cost.
- `PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js chua` - the shared browser test of the feedback series (see `tests/feedbacks/README.md`) plus the chua parts: the portrait draws and changes with the view, the regime reading follows alpha and the presets, kick and reset.

**What this does not prove:** how it sounds, Safari / iOS, the CPU load on a phone (in Node, one second of the default costs about 25 % of one core on this machine, 40 % at the highest rate; a phone may be slower).
At high rates the chaotic spectrum is not band-limited, so the upper part aliases; TONE takes the edge off. Everything ran headless on Linux.
