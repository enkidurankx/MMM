# DENKI engine source (GPL-3.0-only)

The complete corresponding source of the engine embedded in `denki-v1_0.html`.

- `dsp/`: the instrument of [FuMi-1](https://github.com/cartesive/fumi-1) 1.1.0 by cartesive (GPL-3.0-only), unchanged
  except `dsp/fumi.c`, where DENKI adds a per-note expression hook (marked `DENKI`): pressure per note swells the
  voice, adds its own vibrato and a little edge; a per-note pitch offset. FuMi-1 builds on FoMni (Charles Vestal) and
  Felucca (Leo Kuroshita, Hügelton Instruments), GPL-3.0-only. `dsp/fm6_core.c` is msfa (© 2012 Google Inc.,
  2016-2025 Pascal Gauthier), Apache-2.0. The plate reverb (`dsp/reverb.c`) is FoMni's (Dattorro).
- `denki_web.c`: the wrapper the page talks to (notes, pressure, bend, parameters).
- `build.sh`: `clang --target=wasm32` (no Emscripten), produces `denki.wasm`.

Licence texts: GPL-3.0 <https://www.gnu.org/licenses/gpl-3.0.html>, Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0>.
