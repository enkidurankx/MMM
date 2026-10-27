# DENKI engine source (GPL-3.0-only)

The complete corresponding source of the engine embedded in `denki-v1_9.html` (and the earlier versions).

- `dsp/`: the instrument of [FuMi-1](https://github.com/cartesive/fumi-1) 1.1.0 by cartesive (GPL-3.0-only), unchanged
  except `dsp/fumi.c`, where DENKI adds a per-note hook (marked `DENKI`): polyphonic aftertouch plays FuMi-1's own
  ornaments on one note (stage 1 its vibrato, stage 2 押し手 oshide); a per-note pitch offset; a built-in voice load no
  longer overwrites a pending custom patch. The sound is otherwise unchanged. FuMi-1 builds on FoMni (Charles Vestal) and
  Felucca (Leo Kuroshita, Hügelton Instruments), GPL-3.0-only. `dsp/fm6_core.c` is msfa (© 2012 Google Inc.,
  2016-2025 Pascal Gauthier), Apache-2.0. The plate reverb (`dsp/reverb.c`) is FoMni's (Dattorro).
- `denki_web.c`: the wrapper the page talks to (notes, pressure, bend, parameters, custom patches).
- `tools/denki_set2.py`: DENKI's set 2, 21 voices of its own written as operator settings (no factory ROM data);
- `tools/denki_set3.py`: set 3, 21 electronic voices after the same instruments (same helpers).
- `tools/denki_set4.py`: set 4, 21 fully digital, strange voices (fixed-frequency operators, LFO gates, S&H pitch).
  prints the packed 128-byte records the page embeds.
- `build.sh`: `clang --target=wasm32` (no Emscripten), produces `denki.wasm`.

Licence texts: GPL-3.0 <https://www.gnu.org/licenses/gpl-3.0.html>, Apache-2.0 <https://www.apache.org/licenses/LICENSE-2.0>.
