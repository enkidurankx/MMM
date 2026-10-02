// MMM Sound Cards 02 — Japanese plucked strings (koto, shamisen). Platform-neutral reference renderer (Node + browser).
// Digital waveguide: delay line + loop filter (one-pole damping) + excitation (pulse, pluck-position comb, noise) + bend + sawari nonlinearity.
(function (root) {
  const SR = 44100, TWO = Math.PI * 2;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ROOT = 290.3 / 2;                       // Ichikotsu "D" at the library's 290.3 Hz → 145.15 Hz (D3)
  const st = s => Math.pow(2, s / 12);
  const ss = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

  // ── core ──
  function waveguide(o) {
    const N = Math.floor(SR * o.len), out = new Float32Array(N), f0 = o.f0;
    const a = o.damp, dlp = a / (1 - a), th = TWO * f0 / SR;
    const H = (1 - a) / Math.sqrt(1 - 2 * a * Math.cos(th) + a * a);
    const g = Math.pow(10, -3 / (o.t60 * f0)) / H;
    const buf = new Float32Array(Math.ceil(SR / f0 * 2.6) + 8), M = buf.length;
    let w = 0, lp = 0, bp = 0;
    const e = o.exc, el = e.length, sw = o.sawari || 0, c = o.sawC || 0.1;
    for (let n = 0; n < N; n++) {
      const t = n / SR, b = o.bend ? o.bend(t) : 0;
      const D = SR / (f0 * st(b)) - dlp;
      let r = w - D; while (r < 0) r += M;
      const i0 = Math.floor(r), fr = r - i0, x = buf[i0 % M] * (1 - fr) + buf[(i0 + 1) % M] * fr;
      lp = (1 - a) * x + a * lp;
      let y = g * lp;
      if (sw > 0 && y < -c) y = -c + (y + c) * (1 - 0.85 * sw);          // one-sided contact with the ridge (sawari-yama)
      buf[w % M] = y + (n < el ? e[n] : 0);
      out[n] = buf[w % M];
      w = (w + 1) % M;
    }
    return out;
  }
  // excitation: raised-cosine pulse (contact width) → pluck-position comb → + HP noise (nail / bachi scrape)
  function excitation(P, r, f0, beta, widthMs, noise, noiseTau) {
    const Nl = SR / f0, W = Math.max(2, Math.round(widthMs * SR / 1000)), L = Math.round(Nl * beta) + W + Math.floor(SR * 0.02);
    const p = new Float32Array(L + 8), pos = Math.max(1, Math.round(Nl * beta));
    for (let i = 0; i < W; i++) p[i] = 0.5 - 0.5 * Math.cos(TWO * (i + 0.5) / W);
    const e = new Float32Array(L);
    for (let i = 0; i < L; i++) e[i] = p[i] - (i >= pos ? p[i - pos] : 0);
    let z = 0;
    for (let i = 0; i < Math.min(L, Math.floor(SR * noiseTau * 6)); i++) { const nn = r() * 2 - 1; const h = nn - z; z = nn * 0.5 + z * 0.5; e[i] += h * noise * Math.exp(-i / SR / noiseTau); }
    return e;
  }
  function biquadBP(f, q) { const w = TWO * f / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; return { b0: al / a0, b2: -al / a0, a1: -2 * Math.cos(w) / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 }; }
  const bq = (f, x) => { const y = f.b0 * x + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2; f.x2 = f.x1; f.x1 = x; f.y2 = f.y1; f.y1 = y; return y; };
  function body(buf, modes, mix) { // wooden-box resonances (design assumption, not measured)
    const fs = modes.map(([f, q]) => biquadBP(f, q)), o = new Float32Array(buf.length);
    for (let i = 0; i < buf.length; i++) { let s = 0; for (const f of fs) s += bq(f, buf[i]); o[i] = buf[i] + mix * s * 4; }
    return o;
  }
  const peak = (b, v) => { let m = 1e-9; for (const x of b) m = Math.max(m, Math.abs(x)); const k = v / m; for (let i = 0; i < b.length; i++) b[i] *= k; return b; };

  // ── KOTO ──  tsume plectrum, silk/tetron string over a bridge (ji). Hirajoshi in D: D3 G3 A3 Bb3 D4 Eb4 G4 A4 Bb4 D5 Eb5 G5 A5
  const KOTO_STRINGS = [0, 5, 7, 8, 12, 13, 17, 19, 20, 24, 25, 29, 31];
  const KOTO = {
    f0: ROOT, t60: 3.2, damp: 0.38, beta: 0.05, width: 0.7, noise: 0.35, noiseTau: 0.0025, bodyMix: 0.10,
    bodyModes: [[210, 6], [430, 7], [880, 8]], len: 3.4, level: 0.8,
    vary: { cent: 3, ampDb: 2, beta: 0.12, t60: 0.08 },
    // gesture: bend in semitones over time (oshide = press behind the bridge, tension up; only upward from the open pitch)
    gestures: {
      tsume: { bend: null },
      oshi:  { st: 2, delay: 0.10, rise: 0.16 },          // oshide: press after the pluck
      hanashi: { st: 2, fall: 0.35, delay: 0.02 },        // oshi-hanashi: pressed before, released after the pluck
      yuri:  { depth: 0.45, rate: 5.2, delay: 0.25, fade: 0.3 },   // finger vibrato (raises only)
      awase: { bend: null, second: 7 }                    // two strings together (here: fifth)
    }
  };
  function koto(P, o) {
    P = Object.assign({}, KOTO, P || {}); o = o || {};
    const g = o.gesture || 'tsume', G = Object.assign({}, KOTO.gestures[g], (P.gestures || {})[g]), r = mulberry(o.seed == null ? 11 : o.seed), v = o.vary ? 1 : 0;
    const jit = k => v * (r() * 2 - 1) * k;
    const semi = o.note == null ? 0 : o.note;
    const f0 = P.f0 * st(semi) * st(jit(P.vary.cent) / 100);
    const beta = P.beta * (1 + jit(P.vary.beta)), t60 = P.t60 * (1 + jit(P.vary.t60)) * Math.pow(0.5, Math.max(0, semi - 12) / 24);
    let bend = null;
    if (g === 'oshi') bend = t => G.st * ss((t - G.delay) / G.rise);
    else if (g === 'hanashi') bend = t => G.st * (1 - ss((t - G.delay) / G.fall));
    else if (g === 'yuri') bend = t => G.depth * ss((t - G.delay) / G.fade) * (0.5 - 0.5 * Math.cos(TWO * G.rate * (t - G.delay)));
    const exc = excitation(P, r, f0, beta, P.width * (o.soft ? 1.8 : 1), P.noise * (o.soft ? 0.4 : 1), P.noiseTau);
    for (let i = 0; i < exc.length; i++) exc[i] *= Math.pow(10, jit(P.vary.ampDb) / 20);
    let y = waveguide({ f0, len: P.len, t60, damp: P.damp, exc, bend });
    if (g === 'awase') { const y2 = waveguide({ f0: f0 * st(G.second), len: P.len, t60, damp: P.damp, exc: excitation(P, r, f0 * st(G.second), beta, P.width, P.noise, P.noiseTau) }); for (let i = 0; i < y.length; i++) y[i] = 0.7 * (y[i] + y2[i]); }
    y = body(y, P.bodyModes, P.bodyMix);
    return peak(y, P.level);
  }

  // ── SHAMISEN ──  bachi strikes string AND skin; ichi no ito rests on the sawari ridge (buzz). Tunings: honchōshi 1-4-1 (0,5,12), niagari 1-5-1 (0,7,12), sangari 1-4-♭7 (0,5,10)
  const SHAMI_TUNINGS = { honchoshi: [0, 5, 12], niagari: [0, 7, 12], sangari: [0, 5, 10] };
  const SHAMI = {
    f0: ROOT, t60: [1.8, 1.3, 0.9], damp: 0.45, beta: 0.13, width: 1.6, noise: 0.5, noiseTau: 0.004,
    sawari: [0.85, 0.15, 0.1], sawC: 0.015,
    skin: { f: [190, 340], t60: 0.09, level: 0.9, slapHz: 2200, slapQ: 0.9, slapTau: 0.006, slap: 0.6 },
    len: 1.8, level: 0.8, tuning: 'honchoshi', string: 0,
    vary: { cent: 4, ampDb: 2.5, beta: 0.10, skin: 0.12 },
    gestures: { uchi: { skin: 1, width: 1, noise: 1 }, sukui: { skin: 0, width: 0.6, noise: 0.5 }, hajiki: { skin: 0, width: 2.2, noise: 0.1, t60: 0.7 }, suri: { skin: 0.6, slide: 3, slideT: 0.12 } }
  };
  function shamisen(P, o) {
    P = Object.assign({}, SHAMI, P || {}); o = o || {};
    const g = o.gesture || 'uchi', G = Object.assign({}, SHAMI.gestures[g]), r = mulberry(o.seed == null ? 5 : o.seed), v = o.vary ? 1 : 0, jit = k => v * (r() * 2 - 1) * k;
    const si = o.string == null ? P.string : o.string, tun = SHAMI_TUNINGS[o.tuning || P.tuning];
    const f0 = P.f0 * st(tun[si] + (o.note || 0) + jit(P.vary.cent) / 100);
    const beta = P.beta * (1 + jit(P.vary.beta));
    const exc = excitation(P, r, f0, beta, P.width * G.width, P.noise * G.noise, P.noiseTau);
    for (let i = 0; i < exc.length; i++) exc[i] *= Math.pow(10, jit(P.vary.ampDb) / 20);
    const bend = G.slide ? (t => -G.slide * (1 - ss(t / G.slideT))) : null;
    const sawAmt = (o.sawari == null ? P.sawari[si] : o.sawari);
    let y = waveguide({ f0, len: P.len, t60: P.t60[si] * (G.t60 || 1), damp: P.damp, exc, bend, sawari: sawAmt * 0.4, sawC: P.sawC * 3 });
    if (sawAmt > 0) { // buzz stage: asymmetric soft contact, DC-blocked, scaled to the contact knee → harmonics bloom while the string is loud, fade into a coloured copy when it is not
      let hpz = 0, hpy = 0; const c = P.sawC;
      for (let n = 0; n < y.length; n++) { const q = Math.tanh(y[n] / c * 1.5 + 0.4) - Math.tanh(0.4); const h = q - hpz + 0.995 * hpy; hpz = q; hpy = h; y[n] += sawAmt * 0.3 * c * h; }
    }
    // bachi on the skin: thump (two damped modes) + slap noise band
    if (G.skin > 0) {
      const S = P.skin, N = y.length, th = new Float32Array(N), f1 = biquadBP(S.slapHz * (1 + jit(0.1)), S.slapQ);
      const dec = S.t60 * (1 + jit(P.vary.skin)) / 6.908;
      for (let n = 0; n < Math.min(N, Math.floor(SR * 0.4)); n++) {
        const t = n / SR; let s = 0;
        S.f.forEach((f, k) => s += Math.sin(TWO * f * t) * Math.exp(-t / dec) * (k ? 0.5 : 1));
        s = s * S.level * 0.6 + bq(f1, r() * 2 - 1) * Math.exp(-t / S.slapTau) * S.slap * 2;
        th[n] = s * G.skin;
      }
      for (let n = 0; n < N; n++) y[n] += th[n];
    }
    peak(y, 1);
    for (let i = 0; i < y.length; i++) y[i] = Math.tanh(1.3 * y[i]) * P.level / Math.tanh(1.3);
    return y;
  }

  // ── phrase helper: [{t, kind:'koto'|'shamisen', ...opts}] → mix
  function phrase(events, tail) {
    let end = 0; const bufs = events.map(ev => { const b = (ev.kind === 'shamisen' ? shamisen : koto)(ev.P, ev); end = Math.max(end, ev.t + b.length / SR); return b; });
    const out = new Float32Array(Math.floor((end + (tail || 0)) * SR) + 1);
    events.forEach((ev, k) => { const o0 = Math.floor(ev.t * SR), b = bufs[k], gn = ev.gain == null ? 1 : ev.gain; for (let i = 0; i < b.length && o0 + i < out.length; i++) out[o0 + i] += b[i] * gn; });
    return peak(out, 0.8);
  }
  function wav16(buf) { const n = buf.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2); return b; }
  const api = { SR, ROOT, KOTO, KOTO_STRINGS, SHAMI, SHAMI_TUNINGS, koto, shamisen, phrase, wav16 };
  if (typeof module !== 'undefined') module.exports = api; else root.MMMStrings = api;
})(typeof window !== 'undefined' ? window : globalThis);
