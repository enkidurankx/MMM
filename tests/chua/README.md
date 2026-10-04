# chua (web) tests

`chua-v0_1.html` is system 5 of the owner's spec (`konzept_spezifikation_autonomes_feedback_system.md`): **Chua's circuit as an oscillator**. Three coupled differential equations,
integrated per audio sample with RK4, are the whole sound source: no input, no clock, no microphone, no feedback delay.

    dx/dt = alpha * (y - x - f(x))     dy/dt = x - y + z     dz/dt = -beta * y

`f` is the piecewise-linear Chua diode (slopes -8/7 inside |x| < 1, -5/7 outside). Alpha and beta are the faders from the spec; the added controls are ASYMMETRY (offset in front of the diode),
RATE (circuit time per second, i.e. the pitch), the output stage (source X/Y/Z or X and Y as a stereo pair, TONE low-pass, WIDTH, LEVEL) and two very slow LFOs on alpha and beta.
The page shows the phase portrait and a live reading of the Lyapunov exponent (chaotic / periodic / settling) and the pitch. Same shell as `homoeo` and `vink.loop` web (coloured sections,
faders without touch-to-jump, mute, REC with a 24-bit WAV download, discard). Silent until the first click.

**Where it goes beyond the spec:** outside |x| > 4 the diode slope is made positive, like the outer segments of a real Chua diode; without it some parameter settings run away to infinity.
A safety net restarts from rest if the state ever leaves a sane range (it did not in any test). The output removes the mean of each variable (a single scroll sits on one side),
and a soft saturation keeps the loud orbits inside the range.

**What the tests found:** the classic settings (alpha 15.6, beta 28) are chaotic with a Lyapunov exponent of about 0.4 per unit of circuit time and 0.68 oscillations per unit.
They also have a **second stable orbit**, a large regular one (|x| up to about 6), that a state thrown far out stays on. That is why a preset starts from rest, and why the page tells you to press Reset if it sticks.
Chaos at beta 28 is found for alpha from about 14 to 18; below that the orbit is regular, above about 19 a large one.

- `node tests/chua/dsp.test.js` - runs the AudioWorklet code of the page in Node, checks against mathematics: the diode slopes; RK4 order 4 in the smooth zone (and the order lost across the diode kinks, which is
  what a piecewise-linear characteristic does to any Runge-Kutta scheme); the double scroll bounded, symmetric, both scrolls visited, exponent 0.25 ... 0.65; sensitive dependence (1e-9 apart separates at the
  Lyapunov rate); the regime reading in five settings; the second attractor; bounded and finite at 63 extreme settings and three sample rates; the same orbit at 100 and 400 circuit-time per second after the same circuit time;
  2000 per second at 44.1 kHz against a fine reference; pitch readout against an independent zero-crossing count; DC removal; stereo; TONE against the analytic one-pole response; kick and reset without clicks; the safety net;
  LFO swings and drift; all presets; recorder; CPU cost.
- `PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/chua/browser.test.js` - the page in the preinstalled Chromium: layout and colours, faders (mouse and real touch events), the portrait draws
  and changes with the projection, the regime reading follows alpha and the presets, LFO readouts, mute, REC / WAV download / discard, the top bar on 390 ... 320 px, storage under `mmm.chua.*`, no network.

**What this does not prove:** how it sounds, Safari / iOS, the CPU load on a phone (in Node, one second of the default costs about 25 % of one core on this machine, 40 % at the highest rate; a phone may be slower).
At high rates the chaotic spectrum is not band-limited, so the upper part aliases; TONE takes the edge off. Everything ran headless on Linux.
