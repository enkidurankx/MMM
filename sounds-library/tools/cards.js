// MMM Sound Library – Referenz-Renderer (plattformneutral, reines JS, läuft in Node und Browser)
// Cards: JP-KCK-01 Modern Kick (Dive + Glide + Rumble), JP-DRM-02 Ko-tsuzumi, JP-DRM-03 Ō-tsuzumi
(function (root) {
  const SR = 44100, TWO = Math.PI * 2;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const lp1 = fc => ({ a: 1 - Math.exp(-TWO * fc / SR), y: 0 });
  const lp = (s, x) => (s.y += s.a * (x - s.y));
  const hp1 = fc => { const R = SR / (TWO * fc); return { a: R / (R + 1), x: 0, y: 0 }; };
  const hp = (s, x) => { const y = s.a * (s.y + x - s.x); s.x = x; s.y = y; return y; };
  // RBJ band-pass (constant 0 dB peak)
  function bp(fc, q) { const w = TWO * fc / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; return { b0: al / a0, b2: -al / a0, a1: -2 * Math.cos(w) / a0, a2: (1 - al) / a0, x1: 0, x2: 0, y1: 0, y2: 0 }; }
  const bq = (s, x) => { const y = s.b0 * x + s.b2 * s.x2 - s.a1 * s.y1 - s.a2 * s.y2; s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y; return y; };

  // ───────── Card JP-KCK-01 ─────────
  const KICK = {
    id: 'JP-KCK-01', name: 'Modern Kick · Dive + Glide + Rumble',
    tune: 46.25,            // Hz, Grundton = F#1 (MIDI 30)
    diveSt: 28,             // Halbtöne über dem Grundton beim Anschlag
    diveTau: 0.035,         // s, exponentiell
    bodyTau: 0.14,          // s, Amp-Decay des Körpers
    drive: 2.2,             // tanh-Vorverstärkung
    click: { hp: 3000, tau: 0.004, level: 0.35 },
    glideTau: 0.06,         // s, Gleiten vom vorigen Ton (nur wenn prevHz gesetzt)
    rumble: { level: 0.38, tau: 0.25, delay: 0.02, rise: 0.05, drift: 0.04, beatHz: 0.6, noise: 0.25, sat: 3.0, lp: 180, hp: 30 },
    vary: { tuneCent: 6, diveSt: 1.0, clickDb: 2 },
    len: 1.8
  };
  const KICK_TIGHT = { bodyTau: 0.07, drive: 2.6, rumble: Object.assign({}, KICK.rumble, { level: 0 }), len: 0.6 };
  const KICK_SLIDE = { bodyTau: 0.42, diveSt: 14, diveTau: 0.05, drive: 3.0, glideTau: 0.09, rumble: Object.assign({}, KICK.rumble, { level: 0.2 }), len: 2.2 };
  function renderKick(P, o) {
    P = Object.assign({}, KICK, P || {}); o = o || {};
    const r = mulberry(o.seed == null ? 1 : o.seed), N = Math.floor(SR * P.len);
    const v = o.vary ? 1 : 0;
    const tune = P.tune * Math.pow(2, v * (r() * 2 - 1) * P.vary.tuneCent / 1200);
    const dive = P.diveSt + v * (r() * 2 - 1) * P.vary.diveSt;
    const clickG = P.click.level * Math.pow(10, v * (r() * 2 - 1) * P.vary.clickDb / 20);
    const prev = o.prevHz || tune;
    const main = new Float32Array(N), rum = new Float32Array(N), out = new Float32Array(N);
    let ph = 0, ph2 = 0, ph3 = 0;
    const ch = hp1(P.click.hp), nlp = lp1(P.rumble.lp * 0.7), rlp = lp1(P.rumble.lp), rlp2 = lp1(P.rumble.lp), rhp = hp1(P.rumble.hp);
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const base = tune * Math.pow(prev / tune, Math.exp(-t / P.glideTau));          // Glide
      const f = base * Math.pow(2, dive / 12 * Math.exp(-t / P.diveTau));            // Dive
      ph += TWO * f / SR;
      const body = Math.sin(ph) * Math.exp(-t / P.bodyTau);
      const click = hp(ch, r() * 2 - 1) * Math.exp(-t / P.click.tau) * clickG;
      main[i] = Math.tanh(P.drive * (body + click));
      // Rumble: separate Schicht, verzerrt, tiefpassgefiltert, mono, erst nach dem Kick-Anschlag eingeblendet (Sidechain-Effekt)
      const R = P.rumble, fr = tune * (1 - R.drift * (1 - Math.exp(-t / 0.5)));
      ph2 += TWO * fr / SR; ph3 += TWO * (fr + R.beatHz) / SR;
      const src = 0.6 * Math.sin(ph2) + 0.4 * Math.sin(ph3) + R.noise * lp(nlp, r() * 2 - 1) * 4;
      const td = Math.max(0, t - R.delay), env = (1 - Math.exp(-td / R.rise)) * Math.exp(-t / R.tau);
      let x = Math.tanh(R.sat * src * env);
      x = hp(rhp, lp(rlp2, lp(rlp, x)));
      rum[i] = x * R.level;
    }
    for (let i = 0; i < N; i++) out[i] = (o.layers === 'main' ? main[i] : o.layers === 'rumble' ? rum[i] : (main[i] + rum[i]) * 0.78);
    return { main, rumble: rum, mix: out };
  }

  // ───────── Card JP-DRM-02 Ko-tsuzumi ─────────
  // near-harmonische Teiltöne (Ringmembran + belastetes Rückfell), Zustände = Handdruck (Squeeze) + Anschlagshärte
  const KOT = {
    id: 'JP-DRM-02', name: 'Ko-tsuzumi', f0: 290.3,   // Ichikotsu: D4 − 19.6 Cent
    partials: [[1, 1.00, 0.35], [2.02, 0.55, 0.22], [3.03, 0.30, 0.14], [4.04, 0.18, 0.09], [5.05, 0.08, 0.06]], // [Verhältnis, Pegel, T60 s]
    click: { fc: 2300, q: 3, tau: 0.004, level: 0.25 },
    states: { pon: { st: 0, hard: 0.4, bend: 0 }, pu: { st: -5, hard: 0.2, bend: 0 }, ta: { st: 5, hard: 0.7, bend: 0 }, chi: { st: 7, hard: 0.9, bend: 0 } },
    humidity: 0.5,           // 0 = trocken, 1 = feucht (Chōshi-Papier)
    bendTau: 0.09, vary: { cent: 10, ampDb: 2, decay: 0.10, ratio: 0.003 }, len: 0.8
  };
  function renderKot(P, o) {
    P = Object.assign({}, KOT, P || {}); o = o || {};
    const st = P.states[o.state || 'pon'], r = mulberry(o.seed == null ? 2 : o.seed), v = o.vary ? 1 : 0, h = P.humidity;
    const N = Math.floor(SR * P.len), out = new Float32Array(N);
    const f0 = P.f0 * Math.pow(2, (st.st + (o.squeeze || 0)) / 12) * Math.pow(2, v * (r() * 2 - 1) * P.vary.cent / 1200);
    const dMul = 0.6 + 0.8 * h, stretch = 2.0 - 1.6 * h, tilt = 1 - 0.5 * h;
    const bend = (o.bend != null ? o.bend : st.bend) || 0;
    const parts = P.partials.map(([rat, a, dec], k) => ({
      rat: 1 + (rat / (k + 1) - 1) * stretch + v * (r() * 2 - 1) * P.vary.ratio,
      k: k + 1, a: a * Math.pow(10, v * (r() * 2 - 1) * P.vary.ampDb / 20) * Math.pow(tilt, k) * (0.7 + 0.6 * st.hard * (k > 0 ? 1 : 0.5)),
      dec: dec / 6.908 * dMul * (1 + v * (r() * 2 - 1) * P.vary.decay), ph: 0
    }));
    const cb = bp(P.click.fc * (0.8 + 0.5 * st.hard), P.click.q);
    for (let i = 0; i < N; i++) {
      const t = i / SR, fm = Math.pow(2, bend / 12 * (1 - Math.exp(-t / P.bendTau)));
      let s = 0;
      for (const p of parts) { p.ph += TWO * f0 * p.k * p.rat * fm / SR; s += Math.sin(p.ph) * p.a * Math.exp(-t / p.dec); }
      s += bq(cb, r() * 2 - 1) * Math.exp(-t / P.click.tau) * P.click.level * (0.5 + st.hard) * 3;
      out[i] = s * 0.5;
    }
    return out;
  }

  // ───────── Card JP-DRM-03 Ō-tsuzumi ─────────   (Decay-Angaben = T60, Zeit bis −60 dB)
  // ideale kreisförmige Membran: Teiltöne = Nullstellen der Bessel-Funktion, stark bedämpft, trocken
  const OTS = {
    id: 'JP-DRM-03', name: 'Ō-tsuzumi', f0: 290.3 * Math.pow(2, 6 / 12),
    partials: [[1.000, 1.00, 0.075], [1.594, 0.70, 0.055], [2.136, 0.55, 0.050], [2.295, 0.50, 0.045], [2.653, 0.40, 0.040], [2.917, 0.30, 0.035], [3.155, 0.25, 0.030], [3.501, 0.20, 0.025]],
    click: { hp: 4000, tau: 0.003, level: 0.6 }, drive: 1.6,
    states: { chon: { st: 0, hard: 0.7 }, kan: { st: 6, hard: 1.0 } },
    vary: { cent: 8, ampDb: 3, decay: 0.10, noiseHz: 300 }, len: 0.4
  };
  function renderOts(P, o) {
    P = Object.assign({}, OTS, P || {}); o = o || {};
    const st = P.states[o.state || 'chon'], r = mulberry(o.seed == null ? 3 : o.seed), v = o.vary ? 1 : 0;
    const N = Math.floor(SR * P.len), out = new Float32Array(N);
    const f0 = P.f0 * Math.pow(2, st.st / 12) * Math.pow(2, v * (r() * 2 - 1) * P.vary.cent / 1200);
    const parts = P.partials.map(([rat, a, dec]) => ({ rat, a: a * Math.pow(10, v * (r() * 2 - 1) * P.vary.ampDb / 20), dec: dec / 6.908 * (1 + v * (r() * 2 - 1) * P.vary.decay), ph: 0 }));
    const ch = hp1(P.click.hp + v * (r() * 2 - 1) * P.vary.noiseHz);
    for (let i = 0; i < N; i++) {
      const t = i / SR; let s = 0;
      for (const p of parts) { p.ph += TWO * f0 * p.rat / SR; s += Math.sin(p.ph) * p.a * Math.exp(-t / p.dec); }
      s = s * 0.35 * (0.6 + 0.6 * st.hard) + hp(ch, r() * 2 - 1) * Math.exp(-t / P.click.tau) * P.click.level * st.hard;
      out[i] = Math.tanh(P.drive * s) * 0.7;
    }
    return out;
  }

  function wav16(buf) { const n = buf.length, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767 * 0.9))), 44 + i * 2); return b; }
  const api = { SR, KICK, KICK_TIGHT, KICK_SLIDE, KOT, OTS, renderKick, renderKot, renderOts, wav16 };
  if (typeof module !== 'undefined') module.exports = api; else root.MMMCards = api;
})(typeof window !== 'undefined' ? window : globalThis);
