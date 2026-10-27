/* Foundry (MMM-Zusatz): Dauerdrehung der Orbit-Kamera.
 * Wird vom Bündel-Skript nach ui.js eingebaut. Braucht BG._ui (siehe foundry-bundle.py).
 * Dreht nach der Uhr (Grad pro Sekunde), nicht nach der Bildrate. Während der Drehung wird im
 * Entwurfsmodus gezeichnet (ohne Bloom), beim Anhalten kommt das volle Bild zurück.
 * Die Drehung stoppt bei Berührung der Vorschau und beim Verlassen der Detailansicht. */
(function (global) {
  'use strict';
  const BG = global.BG, doc = global.document;
  if (!BG || !doc) return;

  let on = false, last = 0, raf = 0, speed = 12;   // Grad pro Sekunde
  let chip = null, speedInput = null;

  function ui() { return BG._ui; }
  function inDetail() { const u = ui(); return !!(u && u.state.view === 'detail' && doc.querySelector('.preview')); }

  /* Orbit-Regler mitführen, damit er den echten Wert zeigt */
  function syncSlider(rot) {
    const rows = doc.querySelectorAll('.control');
    for (let i = 0; i < rows.length; i++) {
      const lab = rows[i].querySelector('.control-label');
      if (lab && lab.textContent === 'Orbit') {
        const inp = rows[i].querySelector('input.range'), val = rows[i].querySelector('.control-value');
        if (inp) inp.value = String(Math.round(rot));
        if (val) val.textContent = String(Math.round(rot));
      }
    }
  }

  function frame(t) {
    if (!on) return;
    if (!inDetail()) { stop(false); return; }
    const u = ui(), dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    const rot = ((u.eff(u.state.style).rot + speed * dt) % 360 + 360) % 360;
    u.state.params.rot = rot;
    BG._draft = true;
    u.mount();
    syncSlider(rot);
    raf = global.requestAnimationFrame(frame);
  }

  function start() {
    if (on || !inDetail()) return;
    on = true; last = global.performance.now();
    if (chip) { chip.textContent = '■ Stop'; chip.classList.add('chip-on'); }
    raf = global.requestAnimationFrame(frame);
  }

  function stop(redraw) {
    if (!on) return;
    on = false; global.cancelAnimationFrame(raf);
    BG._draft = false;
    if (chip) { chip.textContent = '↻ Spin'; chip.classList.remove('chip-on'); }
    if (redraw !== false && inDetail()) ui().rerender();   // volles Bild mit Bloom, URL-Stand einmal schreiben
  }

  /* Knopf und Tempo-Regler in die Zeile mit Seed und Link setzen (bei jeder neuen Detailansicht) */
  function mountUi() {
    const row = doc.querySelector('.seed-row');
    if (!row || row.querySelector('.spin-chip')) return;
    on = false;
    chip = doc.createElement('button');
    chip.className = 'chip spin-chip'; chip.textContent = '↻ Spin';
    chip.title = 'Kamera dreht sich dauerhaft (Geschwindigkeit rechts)';
    chip.addEventListener('click', function () { on ? stop() : start(); });
    speedInput = doc.createElement('input');
    speedInput.type = 'range'; speedInput.min = '3'; speedInput.max = '60'; speedInput.step = '1';
    speedInput.value = String(speed); speedInput.className = 'spin-speed';
    speedInput.title = 'Drehgeschwindigkeit (Grad pro Sekunde)';
    speedInput.addEventListener('input', function () { speed = parseFloat(speedInput.value); });
    row.appendChild(chip); row.appendChild(speedInput);
  }

  const style = doc.createElement('style');
  style.textContent = '.chip-on{background:#1d2a33;border-color:#9ad1ff;color:#9ad1ff}' +
    '.spin-speed{width:84px;accent-color:#9ad1ff}';
  doc.head.appendChild(style);

  /* Berührung der Vorschau beendet die Drehung (sonst kämpfen Finger und Drehung um den Wert) */
  ['touchstart', 'mousedown'].forEach(function (ev) {
    doc.addEventListener(ev, function (e) {
      if (on && e.target && e.target.closest && e.target.closest('.preview-hit')) stop();
    }, true);
  });

  const main = doc.getElementById('main');
  if (main) new MutationObserver(function () {
    if (on && !inDetail()) stop(false);
    mountUi();
  }).observe(main, { childList: true, subtree: true });
  mountUi();
})(typeof window !== 'undefined' ? window : globalThis);
