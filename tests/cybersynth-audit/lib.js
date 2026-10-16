// injected into the page: window.AUD
window.AUD = (() => {
  const fft = (re, im) => { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = i + k + len / 2; const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } };
  let chunks = [], sp = null, mute = null;
  const start = () => { chunks = []; sp = audioCtx.createScriptProcessor(4096, 1, 1); mute = audioCtx.createGain(); mute.gain.value = 0; sp.onaudioprocess = e => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); }; masterAnalyser.connect(sp); sp.connect(mute); mute.connect(audioCtx.destination); };
  const stop = () => { try { masterAnalyser.disconnect(sp); sp.disconnect(); mute.disconnect(); } catch (e) {} const n = chunks.reduce((a, c) => a + c.length, 0), out = new Float32Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } chunks = []; return out; };
  const analyze = (buf, sr, skipSec) => {
    const s0 = Math.floor(skipSec * sr), n = buf.length - s0, r = {};
    let nan = 0, pk = 0, c98 = 0, sq = 0, dc = 0;
    for (let i = s0; i < buf.length; i++) { const x = buf[i]; if (!isFinite(x)) { nan++; continue; } const a = Math.abs(x); if (a > pk) pk = a; if (a > 0.98) c98++; sq += x * x; dc += x; }
    r.nan = nan; r.peak = +pk.toFixed(3); r.clipPct = +(100 * c98 / n).toFixed(3); r.rms = +Math.sqrt(sq / n).toFixed(3); r.dc = +(dc / n).toFixed(4);
    const W = Math.floor(0.25 * sr), rw = []; for (let i = s0; i + W <= buf.length; i += W) { let s = 0; for (let k = i; k < i + W; k++) s += buf[k] * buf[k]; rw.push(Math.sqrt(s / W)); }
    r.dead = +(100 * rw.filter(v => v < 0.003).length / rw.length).toFixed(1); r.quiet = +(100 * rw.filter(v => v < 0.02).length / rw.length).toFixed(1);
    const m = rw.reduce((a, b) => a + b, 0) / rw.length; r.rmsWinSd = +Math.sqrt(rw.reduce((a, b) => a + (b - m) * (b - m), 0) / rw.length).toFixed(3); r.rmsWinMin = +Math.min(...rw).toFixed(3); r.rmsWinMax = +Math.max(...rw).toFixed(3);
    // Welch spectrum
    const N = 32768, hop = 16384, P = new Float64Array(N / 2); let cnt = 0;
    for (let i = s0; i + N <= buf.length; i += hop) { const re = new Float64Array(N), im = new Float64Array(N); for (let k = 0; k < N; k++) re[k] = buf[i + k] * (0.5 - 0.5 * Math.cos(2 * Math.PI * k / (N - 1))); fft(re, im); for (let k = 0; k < N / 2; k++) P[k] += re[k] * re[k] + im[k] * im[k]; cnt++; }
    if (cnt) { const bin = sr / N, band = (a, b) => { let s = 0; for (let k = Math.max(1, Math.floor(a / bin)); k < Math.min(N / 2, Math.floor(b / bin)); k++) s += P[k]; return s; };
      const tot = band(0.5, sr / 2) + 1e-30, db = x => +(10 * Math.log10(x / tot + 1e-30)).toFixed(1);
      r.bands = { sub20: db(band(0.5, 20)), b20_100: db(band(20, 100)), b100_500: db(band(100, 500)), b500_2k: db(band(500, 2000)), b2k_8k: db(band(2000, 8000)), b8k_: db(band(8000, sr / 2)) };
      let cs = 0, ct = 0, pi = 0, pm = 0; for (let k = 2; k < N / 2; k++) { const f = k * bin; cs += f * P[k]; ct += P[k]; if (f > 20 && P[k] > pm) { pm = P[k]; pi = k; } }
      r.centroid = Math.round(cs / ct); r.peakHz = Math.round(pi * bin * 10) / 10;
      const sorted = Array.from(P.slice(Math.floor(20 / bin))).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)] + 1e-30; r.peakProm = Math.round(10 * Math.log10(pm / med));
      // number of clearly separate spectral lines (peaks 25 dB above the median, 3 bins apart)
      let lines = 0, last = -9; for (let k = Math.floor(20 / bin) + 2; k < Math.floor(8000 / bin); k++) if (P[k] > P[k - 1] && P[k] >= P[k + 1] && 10 * Math.log10(P[k] / med) > 25 && k - last > 3) { lines++; last = k; } r.lines = lines;
    }
    return r;
  };
  const sampleState = () => ({ lim: +(masterLimiter ? masterLimiter.reduction : 0).toFixed(1), att: +(channels.reduce((a, c) => a + c.attenuationFactor, 0) / 4).toFixed(2), cv: Array.from(E.cv).map(v => +v.toFixed(2)), mx: JSON.stringify(matrixValues) });
  return { start, stop, analyze, sampleState };
})();
