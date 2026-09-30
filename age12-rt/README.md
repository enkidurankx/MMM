# AGE·12 real-time core (prototype)

Streaming version of the AGE·12 chain (pitch up → S&H → quantise → pitch down → DAC filter → analog stage),
for use as a live insert effect. No whole-buffer processing: both vari-speed resamplers run lazily on a
fractional clock, so latency is a fixed few samples (`ceil(rMax)+2`, 6 samples for up to +24 st).

- `age12_core.h` – header-only C++17 core (portable to JUCE / VST3 / AU; the same logic ports to gen~ GenExpr).
- `age12_cli.cpp` – tiny file-in/file-out wrapper used by the test.
- `nulltest.js` – runs the *original* JS chain extracted from `../age12-v1_4.html` and compares sample by sample.

```bash
g++ -O2 -std=c++17 -o age12_cli age12_cli.cpp
node nulltest.js ./age12_cli
```

Not tested: pitch changes while audio is running (supported by the phase accumulators, but only constant pitch is in the null test).
