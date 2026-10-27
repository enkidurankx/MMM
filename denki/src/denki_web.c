/* SPDX-License-Identifier: GPL-3.0-only */
/* DENKI (MMM): the FuMi-1 instrument (dsp/fumi.c, cartesive/fumi-1 1.1.0, GPL-3.0-only, with a per-note expression
 * hook added: aftertouch plays its ornaments per note) compiled alone to WebAssembly for a page that plays it from a chromatic keyboard with polyphonic
 * aftertouch. No firmware, no screen: notes, pressure, per-note pitch, parameters and the 21 voices. */
#include <stdint.h>
#include <stddef.h>
void *memset(void *d, int c, size_t n) { unsigned char *p = d; while (n--) *p++ = (unsigned char)c; return d; }
void *memcpy(void *d, const void *s, size_t n) { unsigned char *p = d; const unsigned char *q = s; while (n--) *p++ = *q++; return d; }
void *memmove(void *d, const void *s, size_t n) { unsigned char *p = d; const unsigned char *q = s; if (p < q) while (n--) *p++ = *q++; else { p += n; q += n; while (n--) *--p = *--q; } return d; }
int memcmp(const void *a, const void *b, size_t n) { const unsigned char *p = a, *q = b; for (; n; n--, p++, q++) if (*p != *q) return *p - *q; return 0; }
#define FM_HOST 1
#include "dsp/fumi.c"
void fm_midi_out(uint32_t st, uint32_t d1, uint32_t d2) { (void)st; (void)d1; (void)d2; }
#define EX __attribute__((used, visibility("default")))
static int32_t ib[2 * 1024];
static float out_l[1024], out_r[1024];
static uint32_t gain_q12 = 2800;
EX float *dk_out_l(void) { return out_l; }
EX float *dk_out_r(void) { return out_r; }
EX void dk_init(void) { int i; fm_init(); for (i = 0; i < P_NPARAMS; i++) fm_set(i, fm_param_info(i)->def); }
EX void dk_render(uint32_t n)
{
    uint32_t k;
    if (n > 1024u) n = 1024u;
    n &= ~31u;
    fm_render(ib, n, gain_q12);
    for (k = 0; k < n; k++) { out_l[k] = (float)ib[2 * k] / 8388608.0f; out_r[k] = (float)ib[2 * k + 1] / 8388608.0f; }
}
EX void dk_gain(uint32_t g) { gain_q12 = g > 4096u ? 4096u : g; }
EX void dk_note(int n, int on, float cents, int vel)
{
    if (n < 0 || n > 127) return;
    if (on) { xp_press[n] = 0.0f; xp_bend[n] = 0.0f; }
    fm_note_vel(FM_NOTE_ID + n, on, cents, vel);
}
EX void dk_press(int n, float p) { if (n >= 0 && n < 128) xp_press[n] = p < 0.0f ? 0.0f : p > 1.0f ? 1.0f : p; }
EX void dk_bend(int n, float c) { if (n >= 0 && n < 128) xp_bend[n] = c; }
EX void dk_xp(float thr, int mode2) { xp_thr = thr < 0.2f ? 0.2f : thr > 1.0f ? 1.0f : thr; xp_mode2 = mode2; }
EX void dk_set(int p, int v) { if (p >= 0 && p < P_NPARAMS) fm_set(p, v); }
EX int dk_get_def(int p) { return fm_param_info(p)->def; }
EX int dk_lo(int p) { return fm_param_info(p)->lo; }
EX int dk_hi(int p) { return fm_param_info(p)->hi; }
EX const char *dk_pname(int p) { return fm_param_info(p)->name; }
EX int dk_npatch(void) { return fm_patch_count(); }
EX const char *dk_patch_name(int i) { return fm_patch_name(i); }
EX const char *dk_patch_ja(int i) { return fm_patch_ja(i); }
EX int dk_patch_family(int i) { return fm_patch_family(i); }
EX void dk_orn(int o, int on) { fm_ornament(o, on); }
EX void dk_panic(void) { fm_panic(); }
EX float dk_peak(void) { return fm_peak; }
EX int dk_nvoices(void) { return fm_nvoices; }
EX int dk_nparams(void) { return P_NPARAMS; }
/* 和 mode: the cents each FM-1 key plays now (16 white, the lower row: mi fa la ti do x3 + mi; 11 black, the upper
 * row), through 本数, the scale, the tuning (equal / the measured Suiko 純正律) and the octave; and a parameter's text */
EX float dk_key_cents(int k) { return k >= 0 && k < FM_NKEY ? fm_key_cents(k) : 0.0f; }
static char ptext[16];
EX const char *dk_ptext(int p, int v) { if (p < 0 || p >= P_NPARAMS) return ""; fm_param_text(p, v, ptext); return ptext; }
