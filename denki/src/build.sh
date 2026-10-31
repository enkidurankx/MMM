#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# DENKI's engine: FuMi-1's dsp/fumi.c (cartesive/fumi-1 1.1.0, with the per-note expression hook marked DENKI)
# and denki_web.c, compiled with clang to a standalone wasm (no imports). The page embeds it as base64.
set -e
cd "$(dirname "$0")"
clang --target=wasm32 -O2 -ffp-contract=off -std=gnu99 -nostdlib -fno-builtin-memset -Wno-everything -DFM_HOST -I. -Idsp \
  -Wl,--no-entry -Wl,--export-dynamic -Wl,--initial-memory=8388608 -Wl,-z,stack-size=262144 -o denki.wasm denki_web.c
echo "denki.wasm: $(wc -c < denki.wasm) B"
