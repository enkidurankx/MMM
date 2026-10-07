/* feedbacks shell (shared by vink.loop, homoeo and chua; injected by feedbacks/build.py, do not edit the copies).
   FB.build(root)       turns the short markup of a page into the common components (header, sections, controls, LFO blocks, dock)
   FB.bind(cfg)         faders (no touch-to-jump, curves, long-press for fine control, double-tap resets), segmented buttons
   FB.mute / FB.recorder  mute button and the recorder dock. */
const FB = (function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ico = (id, cls) => '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  // ---- value formats ----
  const pct = v => (v * 100).toFixed(0) + ' %';
  // an LFO rate from one cycle in 8 minutes up to the audio range
  function lfoFmt(v) {
    if (v >= 20) return (v < 100 ? v.toFixed(0) : v.toFixed(0)) + ' Hz · audio';
    if (v >= 1) return v.toFixed(v < 10 ? 2 : 1) + ' Hz';
    const T = 1 / v; return (v < 0.1 ? v.toFixed(3) : v.toFixed(2)) + ' Hz · ' + (T < 90 ? T.toFixed(T < 10 ? 1 : 0) + ' s' : (T / 60).toFixed(1) + ' min');
  }
  const lfoRate = def => ({ min: 0.002, max: 1000, def, log: true, f: lfoFmt });
  const lfoDepth = () => ({ min: 0, max: 1, def: 0, curve: 2, f: pct });

  // ---- fader position <-> value. log: even steps in ratio. curve k > 1: more room near the minimum (pos^k). sym: centred, finer around 0 ----
  function mapper(d) {
    if (d.log) return { to: v => Math.log(v / d.min) / Math.log(d.max / d.min), from: p => d.min * Math.pow(d.max / d.min, p) };
    const k = d.curve || 1;
    if (d.sym) return { to: v => { const u = Math.max(-1, Math.min(1, (v - d.mid) / d.half)); return 0.5 + 0.5 * Math.sign(u) * Math.pow(Math.abs(u), 1 / k); },
                        from: p => { const u = 2 * p - 1; return d.mid + d.half * Math.sign(u) * Math.pow(Math.abs(u), k); } };
    return { to: v => Math.pow(Math.max(0, Math.min(1, (v - d.min) / (d.max - d.min))), 1 / k), from: p => d.min + (d.max - d.min) * Math.pow(p, k) };
  }

  // ---- build the common components from short markup ----
  function header(h) {
    const id = h.dataset.action || 'burst', label = h.dataset.actionLabel || 'Burst';
    h.innerHTML = ico(h.dataset.icon || 'loop', 'logo') + '<h1>' + esc(h.dataset.title) + '</h1><span class="sp"></span>'
      + '<button id="mute" aria-pressed="false" aria-label="Mute" title="Mute the output. The sound keeps running and a recording keeps going"><svg class="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path class="w" d="M16.500 9a4 4 0 010 6M19 6.500a8 8 0 010 11"/><path class="x" d="M16 9l5 6M21 9l-5 6"/></svg></button>'
      + '<button id="' + id + '" title="' + esc(h.dataset.actionTitle || '') + '">' + ico('kick') + '<span>' + esc(label) + '</span></button>'
      + '<button id="reset" class="reset" title="' + esc(h.dataset.resetTitle || 'Restart from silence') + '">' + ico('reset') + '<span>Reset</span></button>';
  }
  function dock() {
    const d = document.createElement('div'); d.id = 'dock';
    d.innerHTML = '<div class="in"><span class="rl">Recorder</span>'
      + '<button id="rec" title="Record the output (what you hear) as a 24-bit stereo WAV"><span class="dot"></span><span id="reclabel">Rec</span></button>'
      + '<span id="rectime" class="idle">24-bit WAV</span>'
      + '<a id="dl" class="btn" hidden download="rec.wav" title="Download the last recording">Download</a>'
      + '<button id="discard" hidden title="Discard the recording (tap twice)">' + ico('close') + '</button></div>';
    document.body.appendChild(d);
  }
  function section(s) {
    const h2 = document.createElement('h2'); const fold = s.dataset.fold;
    if (fold) { h2.className = 'fold'; h2.id = fold; h2.setAttribute('role', 'button'); h2.tabIndex = 0; h2.setAttribute('aria-expanded', 'true'); h2.title = 'Fold / unfold'; }
    h2.innerHTML = '<span class="ico">' + ico(s.dataset.icon) + '</span><b class="n">' + esc(s.dataset.n) + '</b><span class="t">' + esc(s.dataset.title) + '</span>'
      + (s.dataset.sub ? '<small>' + esc(s.dataset.sub) + '</small>' : '') + (fold ? '<span class="chev">&#9662;</span>' : '');
    const body = document.createElement('div'); body.className = 'body';
    while (s.firstChild) body.appendChild(s.firstChild);
    s.appendChild(h2); s.appendChild(body);
  }
  function control(c) {
    const p = c.dataset.p, id = c.dataset.id, seg = c.dataset.seg, keep = (!p && !id && !seg) ? Array.from(c.childNodes) : [];   // a control may carry its own element (the device select)
    let inner = '<div class="ctl-top"><label' + (p ? ' title="Double-tap to reset"' : '') + '>' + esc(c.dataset.label) + '</label>' + (seg ? '' : '<output></output>') + '</div>'
      + (c.dataset.hint ? '<div class="hint">' + esc(c.dataset.hint) + '</div>' : '');
    if (seg) inner += '<div class="seg" data-p="' + seg + '"></div>';
    else if (!keep.length) inner += '<div class="sl"><input type="range"' + (p ? ' data-p="' + p + '"' : ' id="' + id + '" min="0" max="1" step="0.001"') + '></div>';
    c.className = 'ctl'; c.innerHTML = inner; keep.forEach(n => c.appendChild(n));
    if (keep.length) { const o = c.querySelector('output'); if (o) o.remove(); }
    ['p', 'id', 'seg', 'label', 'hint'].forEach(a => c.removeAttribute('data-' + a));
  }
  function lfo(b) {
    const n = b.dataset.n, what = b.dataset.target, dh = b.dataset.hint || '';
    b.className = 'lfo';
    b.innerHTML = '<h3>' + ico('lfo') + 'LFO ' + n + ' → ' + esc(what) + '<small id="l' + n + 'now">&nbsp;</small></h3>'
      + '<div class="ctl" data-seg="l' + n + 'shape" data-label="SHAPE" data-hint="Sine and triangle are smooth, drift wanders at random."></div>'
      + '<div class="ctl" data-p="l' + n + 'rate" data-label="RATE" data-hint="From one turn in 8 minutes up to audio rate (1 kHz)."></div>'
      + '<div class="ctl" data-p="l' + n + 'depth" data-label="DEPTH" data-hint="' + esc(dh) + '"></div>'
      + '<div class="lfopos" title="LFO ' + n + ' position"><i id="l' + n + 'pos"></i></div>';
    $$('.ctl[data-p],.ctl[data-seg]', b).forEach(control);
  }
  function build(root) {
    root = root || document;
    $$('header[data-title]', root).forEach(header);
    $$('section[data-title]', root).forEach(section);
    $$('.lfo[data-n]', root).forEach(lfo);
    $$('.ctl[data-label]', root).forEach(control);
    if (!$('#dock')) dock();
    const intro = $('#intro .logo'); if (intro) intro.outerHTML = ico(document.body.dataset.icon || 'loop', 'logo');
  }

  // ---- faders ----
  // A press on the track does nothing; only the thumb (with a finger-sized margin) can be grabbed, and it then moves RELATIVE to the finger.
  // Holding the thumb still for a moment switches to FINE control (one fifth of the travel); double-tapping the label puts the control back to its default.
  const THUMB = 26, GRAB = 30, HOLD_MS = 380, FINE = 0.2;
  // The native input takes no pointer events at all (CSS: pointer-events none), so the browser's own jump to the touch point can never happen, on any browser:
  // a wrapper (.sl) receives the touches and does the work. The input stays for the keyboard, for screen readers and as the carrier of the value.
  function noJump(el) {
    let drag = null; const ctl = el.closest('.ctl'), host = el.closest('.sl') || el;
    const stop = e => e.preventDefault();
    host.addEventListener('mousedown', stop); host.addEventListener('touchstart', stop, { passive: false }); host.addEventListener('click', stop);
    host.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = el.getBoundingClientRect(), pos = (+el.value - +el.min) / (+el.max - +el.min);
      const cx = r.left + THUMB / 2 + pos * (r.width - THUMB);
      if (Math.abs(e.clientX - cx) > GRAB) return;                    // not on the thumb: ignore, nothing moves
      drag = { id: e.pointerId, x0: e.clientX, pos0: pos, span: Math.max(1, r.width - THUMB), min: +el.min, max: +el.max, fine: false, moved: false, timer: 0 };
      drag.timer = setTimeout(() => { if (drag && !drag.moved) { drag.fine = true; ctl && ctl.classList.add('fine'); try { navigator.vibrate && navigator.vibrate(12); } catch (x) {} } }, HOLD_MS);
      try { host.setPointerCapture(e.pointerId); } catch (x) {}
    });
    host.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.abs(e.clientX - drag.x0) > 6) { drag.moved = true; clearTimeout(drag.timer); }
      const cur = Math.min(1, Math.max(0, drag.pos0 + (e.clientX - drag.x0) / drag.span * (drag.fine ? FINE : 1)));
      el.value = drag.min + cur * (drag.max - drag.min);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const end = e => { if (drag && e.pointerId === drag.id) { clearTimeout(drag.timer); drag = null; ctl && ctl.classList.remove('fine'); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => host.addEventListener(ev, end));
  }
  const fill = el => el.style.setProperty('--v', (100 * (el.value - el.min) / (el.max - el.min)) + '%');

  // bind every fader and segmented control of the page to the state. cfg: { P, STEPPED, st, send, save }. Returns { sync }.
  function bind(cfg) {
    const { P, STEPPED, st, send, save } = cfg;
    for (const k in P) { const d = P[k]; if (d.sym) { d.mid = (d.min + d.max) / 2; d.half = (d.max - d.min) / 2; } d.m = mapper(d); }
    $$('input[data-p]').forEach(el => {
      const k = el.dataset.p, d = P[k], out = el.closest('.ctl').querySelector('output');
      el.min = 0; el.max = 1; el.step = 0.0005;
      const show = () => { out.textContent = d.f(st.params[k]); fill(el); };
      el.value = d.m.to(st.params[k]); show();
      el.addEventListener('input', () => { st.params[k] = d.m.from(+el.value); show(); send(); save(); });
      el._sync = () => { el.value = d.m.to(st.params[k]); show(); };
      const lab = el.closest('.ctl').querySelector('label'); let last = 0;
      const reset = () => { st.params[k] = d.def; el._sync(); send(); save(); };
      lab.addEventListener('dblclick', reset);
      lab.addEventListener('pointerup', e => { if (e.pointerType === 'touch') { const t = Date.now(); if (t - last < 320) reset(); last = t; } });
      noJump(el);
    });
    $$('.seg[data-p]').forEach(el => {
      const k = el.dataset.p, def = STEPPED[k];
      def.items.forEach((name, i) => {
        const b = document.createElement('button'); b.textContent = name;
        b.addEventListener('click', () => { st.params[k] = i; mark(); send(); save(); });
        el.appendChild(b);
      });
      const mark = () => $$('button', el).forEach((b, i) => b.classList.toggle('on', i === Math.round(st.params[k])));
      el._sync = mark; mark();
    });
    return { sync() { $$('input[data-p]').forEach(el => el._sync()); $$('.seg[data-p]').forEach(el => el._sync()); } };
  }
  // plain faders without a parameter (master, mic gain): same no-jump behaviour
  function plain(el) { noJump(el); }

  // ---- mute: silences what you hear, after the master fader and after the recorder tap ----
  function mute(cfg) {
    const btn = $('#mute'); let muted = false;
    btn.addEventListener('click', () => {
      muted = !muted;
      btn.classList.toggle('on', muted); btn.setAttribute('aria-pressed', String(muted)); btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      const g = cfg.gain(), c = cfg.ctx(); if (g) g.gain.setTargetAtTime(muted ? 0 : 1, c.currentTime, 0.012);
    });
    return { get muted() { return muted; } };
  }

  // ---- recorder dock: lossless 24-bit stereo WAV of the output at the sample rate of the audio device ----
  // The tap sits after the master fader (what you hear, before mute). Chunks are packed to 24 bit as they arrive: 6 bytes per frame (about 17 MB per minute at 48 kHz).
  function encodeChunk24(l, r) {
    const n = l.length, out = new Uint8Array(n * 6);
    for (let i = 0, o = 0; i < n; i++) {
      for (const x of [l[i], r[i]]) {
        let v = Math.round(Math.max(-1, Math.min(1, x)) * 8388607); if (v < 0) v += 16777216;
        out[o++] = v & 255; out[o++] = (v >> 8) & 255; out[o++] = (v >> 16) & 255;
      }
    }
    return out;
  }
  function wavHeader(frames, sr) {
    const dv = new DataView(new ArrayBuffer(44)), bytes = frames * 6, w = (o, t) => { for (let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + bytes, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 6, true); dv.setUint16(32, 6, true); dv.setUint16(34, 24, true); w(36, 'data'); dv.setUint32(40, bytes, true);
    return dv.buffer;
  }
  function recorder(cfg) {
    const MAX_BYTES = 1024 * 1024 * 1024;
    const recBtn = $('#rec'), lab = $('#reclabel'), tm = $('#rectime'), dlBtn = $('#dl'), discardBtn = $('#discard');
    let rec = null, take = null, armed = null, armTimer = null;   // take = the finished recording { url, downloaded }; armed = a pending two-step question ('discard' | 'replace')
    const fmtTime = sec => { sec = Math.floor(sec); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
    const fmtMB = b => (b / 1048576 < 10 ? (b / 1048576).toFixed(1) : (b / 1048576).toFixed(0)) + ' MB';
    const fmtShort = sec => { sec = Math.floor(sec); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
    const arm = kind => { armed = kind; clearTimeout(armTimer); armTimer = setTimeout(disarm, 3000); sync(); };
    const disarm = () => { armed = null; clearTimeout(armTimer); sync(); };
    function sync() {
      dlBtn.hidden = !take;
      discardBtn.hidden = !(take || (rec && !rec.stopping));
      discardBtn.classList.toggle('hot', armed === 'discard');
      discardBtn.innerHTML = armed === 'discard' ? 'Delete?' : ico('close');
      if (!rec) {
        recBtn.classList.remove('on'); recBtn.classList.toggle('arm', armed === 'replace');
        lab.textContent = armed === 'replace' ? 'Replace?' : 'Rec';
        tm.className = take ? 'idle ready' : 'idle'; tm.textContent = take ? 'Take ready' : '24-bit WAV';
      }
    }
    function discardTake() { if (take) { URL.revokeObjectURL(take.url); take = null; } sync(); }
    async function start() {
      try { await cfg.start(); } catch (err) { return; }
      discardTake();
      const ctx = cfg.ctx(), node = new AudioWorkletNode(ctx, cfg.worklet, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
      const mute = ctx.createGain(); mute.gain.value = 0;                  // the recorder needs an output to be pulled by the graph; it stays silent
      cfg.tap().connect(node); node.connect(mute); mute.connect(ctx.destination);
      rec = { node, mute, chunks: [], frames: 0, sr: ctx.sampleRate, t0: Date.now(), stopping: false };
      node.port.onmessage = e => {
        if (e.data.type === 'chunk') { rec.chunks.push(encodeChunk24(e.data.l, e.data.r)); rec.frames += e.data.l.length; if (rec.frames * 6 >= MAX_BYTES && !rec.stopping) stop(); }
        else if (e.data.type === 'done') finish();
      };
      recBtn.classList.add('on'); lab.textContent = 'Stop'; tm.className = ''; tick(); sync();
    }
    function tick() { if (!rec || rec.stopping) return; tm.textContent = fmtTime(rec.frames / rec.sr); setTimeout(tick, 250); }
    function stop() { if (!rec || rec.stopping) return; rec.stopping = true; rec.node.port.postMessage({ type: 'stop' }); }
    function finish() {
      const r = rec; rec = null;
      try { cfg.tap().disconnect(r.node); } catch (e) {} try { r.node.disconnect(); r.mute.disconnect(); } catch (e) {}
      if (r.cancel || !r.frames) { r.chunks.length = 0; sync(); return; }
      const blob = new Blob([wavHeader(r.frames, r.sr), ...r.chunks], { type: 'audio/wav' });
      take = { url: URL.createObjectURL(blob), downloaded: false };
      const d = new Date(), pad = x => String(x).padStart(2, '0');
      dlBtn.href = take.url;
      dlBtn.download = cfg.slug + '_' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds()) + '_' + Math.round(r.sr / 1000) + 'k_24bit.wav';
      dlBtn.textContent = '↓ ' + fmtShort(r.frames / r.sr) + ' · ' + fmtMB(r.frames * 6 + 44).replace(' MB', 'M');
      dlBtn.title = 'Download the recording: 24-bit stereo WAV, ' + fmtTime(r.frames / r.sr) + ', ' + fmtMB(r.frames * 6 + 44) + ', ' + Math.round(r.sr / 1000) + ' kHz';
      r.chunks.length = 0;
      sync();
    }
    dlBtn.addEventListener('click', () => { if (take) take.downloaded = true; });
    // REC: a take that was not downloaded yet is not overwritten by accident (first press asks "Replace?")
    recBtn.addEventListener('click', () => {
      if (rec) { stop(); return; }
      if (take && !take.downloaded && armed !== 'replace') { arm('replace'); return; }
      disarm(); start();
    });
    // X: cancels a running recording or deletes the finished one; two taps, so a session is not lost by a slip
    discardBtn.addEventListener('click', () => {
      if (armed !== 'discard') { arm('discard'); return; }
      disarm();
      if (rec) { if (!rec.stopping) { rec.cancel = true; stop(); } }
      else discardTake();
    });
    sync();
    return { get take() { return take; }, get recording() { return !!rec; } };
  }

  // ---- fold: a section whose header folds it (the input section) ----
  function fold(h2, sec, st, save) {
    const apply = () => { sec.classList.toggle('closed', st.micFold); h2.setAttribute('aria-expanded', String(!st.micFold)); };
    const toggle = () => { st.micFold = !st.micFold; apply(); save(); };
    h2.addEventListener('click', toggle);
    h2.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    apply();
  }


  // ---- plate reverb: a convolution reverb with a synthetic plate impulse response, off at every start (not stored) ----
  // IRS maps a name to a generator (ctx, seconds, damping) -> stereo AudioBuffer. To add a room, another plate or a loaded file, put a generator here and make `ir` name it.
  // A plate is dense from the first millisecond (no early reflections), bright, and its highs die first; DAMPING makes them die sooner. The convolver normalises the power.
  function plateIR(ctx, T, damp) {
    const sr = ctx.sampleRate, len = Math.max(2048, Math.floor(sr * Math.min(6, T * 1.2))), buf = ctx.createBuffer(2, len, sr);
    const a1 = 1 - Math.exp(-6.2832 * 400 / sr), a2 = 1 - Math.exp(-6.2832 * 3500 / sr), ah = 1 - Math.exp(-6.2832 * 90 / sr), pre = Math.floor(0.003 * sr), atk = 1 / (0.0015 * sr);
    const r1 = Math.pow(10, -3 / (T * sr)), r2 = Math.pow(10, -3 / (T * (0.8 - 0.4 * damp) * sr)), r3 = Math.pow(10, -3 / (T * (0.55 - 0.45 * damp) * sr));   // lows, mids, highs
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c); let s = (0x9E3779B9 ^ Math.imul(c + 1, 0x85EBCA6B)) | 0, l1 = 0, l2 = 0, hp = 0, g1 = 1, g2 = 1, g3 = 1;
      for (let i = 0; i < len; i++) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const w = (s >>> 0) / 2147483648 - 1;
        l1 += a1 * (w - l1); l2 += a2 * (w - l2);
        let y = 4 * l1 * g1 + 1.5 * (l2 - l1) * g2 + 0.7 * (w - l2) * g3; g1 *= r1; g2 *= r2; g3 *= r3;
        hp += ah * (y - hp); y -= hp;
        d[i] = i < pre ? 0 : y * (1 - Math.exp(-(i - pre) * atk));
      }
    }
    return buf;
  }
  const IRS = { plate: plateIR };
  function reverb() {
    const el = { mix: $('#rvmix'), time: $('#rvtime'), damp: $('#rvdamp') };
    const st = { mix: 0, time: 2.2, damp: 0.5, ir: 'plate' };
    const map = { mix: { to: v => Math.sqrt(v), from: p => p * p }, time: { to: v => Math.log(v / 0.4) / Math.log(10), from: p => 0.4 * Math.pow(10, p) }, damp: { to: v => v, from: p => p } };
    const fmt = { mix: v => v < 0.003 ? 'off' : (v * 100).toFixed(0) + ' %', time: v => v.toFixed(v < 10 ? 1 : 0) + ' s', damp: v => (v * 100).toFixed(0) + ' %' };
    let c = null, from = null, to = null, dry = null, wet = null, conv = null, on = false, timer = 0, offTimer = 0;
    function build() {   // a new convolver every time: the buffer of a running one is not swapped
      const old = conv; conv = c.createConvolver(); conv.normalize = true; conv.buffer = IRS[st.ir](c, st.time, st.damp); conv.connect(wet); from.connect(conv);
      if (old) { try { from.disconnect(old); old.disconnect(); } catch (e) {} }
    }
    function gains() { if (!c) return; const t = c.currentTime; dry.gain.setTargetAtTime(1 - 0.3 * st.mix, t, 0.03); wet.gain.setTargetAtTime(on ? 0.9 * st.mix : 0, t, 0.03); }
    function apply() {
      if (!c) return;
      clearTimeout(offTimer);
      if (st.mix > 0.003 && !on) { build(); on = true; gains(); }
      else if (st.mix <= 0.003 && on) { on = false; gains(); offTimer = setTimeout(() => { if (!on && conv) { try { from.disconnect(conv); conv.disconnect(); } catch (e) {} conv = null; } }, 500); }
      else gains();
    }
    function rebuild() {   // TAIL or DAMPING moved: fade the tail out, swap the convolver, fade in (debounced)
      if (!c || !on) return; clearTimeout(timer);
      timer = setTimeout(() => { wet.gain.setTargetAtTime(0, c.currentTime, 0.012); setTimeout(() => { if (on) { build(); gains(); } }, 90); }, 200);
    }
    for (const k of ['mix', 'time', 'damp']) {
      const e = el[k]; if (!e) continue; plain(e); e.min = 0; e.max = 1; e.step = 0.001; e.value = map[k].to(st[k]);
      const out = e.closest('.ctl').querySelector('output'), show = () => { out.textContent = fmt[k](st[k]); fill(e); };
      show();
      e.addEventListener('input', () => { st[k] = map[k].from(+e.value); show(); if (k === 'mix') apply(); else rebuild(); });
    }
    const api = {
      attach(ctx, source, dest) {   // replaces `source.connect(dest)`
        c = ctx; from = source; to = dest; dry = c.createGain(); wet = c.createGain(); wet.gain.value = 0; from.connect(dry); dry.connect(to); wet.connect(to); apply(); return api;
      },
      get st() { return st; }, get to() { return to; }, get on() { return on; }, get conv() { return conv; }, get wet() { return wet; }, get dry() { return dry; }, IRS
    };
    window.__rv = api; return api;
  }

  return { reverb, plateIR, $, $$, ico, pct, lfoFmt, lfoRate, lfoDepth, mapper, build, bind, plain, fill, mute, recorder, fold, encodeChunk24, wavHeader };
})();
