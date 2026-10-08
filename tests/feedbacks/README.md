# feedbacks: one design for vink.loop, homoeo, serge, lattice, knot, lichen, creak and entropy

The four feedback apps (vink.loop, homoeo, serge, lattice, knot, lichen) share one shell (`feedbacks/shell.css`, `shell.js`, `icons.svg.html`). `python3 feedbacks/build.py <page.html> ...` injects it between marker pairs into each page
(each app is still ONE HTML file, no network); every app only sets its own hues in `:root{ --h; --t1 ... --t6 }` and describes its sections and controls in short markup.

- **Header**: title, mute, one action (Burst / Kick), Reset. Nothing else.
- **Recorder dock**: its own panel fixed at the bottom (REC, time, download, discard); two-step "Replace?" / "Delete?" as before.
- **Sections**: a dark surface in one hue each, icon, number, name. The fader fill, selected buttons and values inside wear that hue. Red only for recording, live microphone and reset.
- **Controls**: label and value on one line, one short hint (58 characters at most), the fader below with at least 100 px between faders and 46 px height. Faders never jump to the touch point.
  Amount-type controls have a curve (`curve: 2` = half travel gives a quarter) so the low end has more resolution; frequencies and times are logarithmic. Hold the thumb still for 0.4 s for FINE control (one fifth of the travel);
  double-tap a label to put the control back to its default.
- **LFOs**: 0.002 Hz (8 minutes per turn) up to 1000 Hz, run per sample in the DSP (audio-rate modulation makes sidebands instead of aliasing).

`node tests/feedbacks/consistency.test.js` - the shell in each page is byte-identical to the source, hues differ per app (and avoid red), pages use the shell instead of their own copies, every control has a hint, every section an icon.

`PW=/opt/node22/lib/node_modules/playwright SHOTS=/tmp/shots node tests/feedbacks/browser.test.js <vink|homoeo>` - the same checks for each app in the preinstalled Chromium: header and dock separated, section order / icons / colours,
labels and hints, air between the faders and touch size, curves, LFO range and labels, faders (mouse and real touch events: no jump, relative drag, fine control, double-click reset), mute, header and dock on one row at 390 / 360 / 320 px,
the last section above the dock, REC / WAV download / discard flows, presets, storage, wide screen, no network. App parts: microphone (vink, homoeo), phase portrait and regime reading (chua), event view, cells, scale and trig (krell).

`node tests/feedbacks/clicks.test.js <vink|homoeo>` - **no clicks when parameters change while the sound runs.** A pure sine (vink, homoeo) or the regular orbit "limit cycle" (chua) runs; every parameter is jumped to its other end
(as a preset or a very fast fader move does) and moved in 20 steps over 0.3 s (as a finger does); every switch (carrier wave, filter type, delay type, output source), a reset, a kick and "everything at once" are tried too.
R = the largest second difference of the output right after the change / that of the steady sound before or after (a clean sine gives about 1, a click 5 ... 500); every case must stay at R <= 3.
Before the fix the same test measured R = 65 (vink level), 330 (vink LFO depth), 28 (filter type), 80 (homoeo level), 58 (homoeo Q), 1500 (chua level) and 7900 (chua output source).
What changed in the DSPs: the parameters glide every 8 samples instead of every 128 (about the same speed, in 16 small steps); gains that multiply the signal glide per sample; the switches (carrier wave, filter type, delay type, output source)
are weights that crossfade over about 25 ms with two smoothers in a row; LFO depth glides over 30 ms and a changed LFO shape crossfades over 20 ms; the delay time glide has an acceleration limit (a step in speed is a click);
reset and the chua restart fade out and in with a smoothstep; the burst has a 4 ms attack and 12 ms release; the master and microphone gain use `setTargetAtTime`.

**What this does not prove:** how it looks and feels on a real phone (Safari / iOS in particular: the long-press and touch behaviour were driven with synthetic touch events in Chromium), and how the audio-rate LFOs sound.


**chua was removed on 07.10.2026** (the owner: boring, down in the bass; the twin circuit of v1.1 did not change that). Mentions of chua above describe what the series tests found while it existed.


## Reverb (all eight apps, in the loop, off at the start)

Every app has four more faders at the top of its Output section: **REVERB** (mix, "off" until you move it), **TAIL** (0.4 ... 4 s, default 2.2 s), **DAMPING** (how soon the highs of the tail die) and **IN LOOP** (how much of the reverb goes back into the system, default 60 %). The reverb is a **convolution reverb with a synthetic plate impulse response**, built in `feedbacks/shell.js` (`FB.reverb()`,
`FB.plateIR`), so it is the same code in each page; a page calls `const RV = FB.reverb();` after `FB.build()` and `RV.attach(c, n, ma, n)` where it used to connect the sound to the master fader (the last argument is the node that takes the reverb back into the loop). The output stage sits before the master fader, the recorder and the mute, so a recording contains it. It is not stored (a page is dry again at every start) and does not touch the presets.
**In the loop:** the sound of the app goes to the convolver; its output goes to the master (REVERB) and, scaled by 0.5 x REVERB x IN LOOP, through a delay of one render quantum (Web Audio demands one in a cycle) **back into the worklet, which now has one input** and lets it act where each system takes energy from outside:
vink and homoeo: the same input as the microphone. entropy: added to the signal before the folder (so the folder, the codec and the regulator act on it). creak: a force on the modes of the plate, weighted by the two pickups (the room is a loudspeaker facing the plate; gain 75). lichen: where the tail is loudest in pitch (zero crossings of the return) a spore is set in the field, at most every 40 ms.
knot: added to the phase of every oscillator. lattice: added to the input of the cells, the left of the room to the cells on the left, the right to those on the right. serge: added to the input of the wave multiplier of every voice that sounds (an instrument with no key held has nothing to hear it).
The gains were set by listening to numbers: at REVERB 30 % every app stays within a few dB of its dry level, at 100 % IN LOOP 100 % creak is about 5 x louder in rms (it is a true feedback loop with the plate; the limiter holds it) and vink about 12 x (its dry level is tiny).
The plate: dense from the first millisecond (no early reflections), 3 ms of predelay, bright, three bands whose tails decay at different speeds (the highs die first, more so with DAMPING), left and right from different noise (correlation below 0.05), the power normalised by the convolver. With REVERB at 0 there is no convolver in the graph (no CPU) and nothing flows back.
Dry falls to 1 - 0.3 x mix, wet is 0.9 x mix. A change of TAIL or DAMPING fades the tail out, builds a new convolver and fades in (200 ms after you stop moving the fader).

**To add another room (or a plate you like better):** `FB.reverb()` takes its impulse responses from `IRS` in `shell.js` (a name and a generator `(ctx, seconds, damping) -> stereo AudioBuffer`); the state has an `ir` field naming the one in use. A recorded impulse response from a WAV file is a generator that returns the decoded buffer. There is no selector in the page yet (one plate only).

`node tests/feedbacks/loopinput.test.js` (Node, a minute) - for each of the eight worklets: with nothing connected it runs; with a return (decaying noise bursts at -12 dB) it stays finite and below 0.97 and the sound differs from the one without it by more than 2 % rms (vink 612 %, homoeo 164 %, serge 150 %, lattice 132 %, knot 9 %, lichen 146 %, creak 145 %, entropy 50 %).
`PW=/opt/node22/lib/node_modules/playwright node tests/feedbacks/reverb.test.js [app ...]` - the impulse responses (RT60 within 30 % of the set time at 0.8 / 2.2 / 4 s, stereo, channels uncorrelated, silent for the first 100 samples, DAMPING darkens the tail, the highs die first) and in each app: four faders in the Output section, off at the start (no convolver, wet 0, dry 1), REVERB up builds a stereo convolver with the right wet and dry levels, IN LOOP opens and closes the way back, REVERB 100 % keeps the peak before the master below 1, TAIL builds a new convolver, REVERB 0 removes it again, no errors.
**Not proven:** how it sounds (nothing was heard), whether the loop coupling is musical and not just stable (the amounts were set by measuring level, not by ear), the CPU on a phone (a 2.2 s stereo convolver; the longest tail is 4.8 s), and whether the wet level is right next to every app's dry level. knot reacts least (9 %).
