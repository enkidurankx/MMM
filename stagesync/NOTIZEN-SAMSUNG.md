# StageSync — läuft auf manchen Smartphones nicht (z. B. Samsung)

Stand 03.10.2026 · Master-Session · betrifft `stagesync-v4_35.html`

**Status: offen.** Nur Code gelesen, nichts geändert, auf keinem Gerät getestet.
Alles unten sind Verdachtsstellen, keine bestätigte Ursache.
Zeilennummern beziehen sich auf `stagesync-v4_35.html` (main `02d0702`).

## Symptom (vom Owner)

StageSync läuft auf einigen Smartphones nicht, z. B. auf Samsung-Geräten.
Noch unbekannt: an welcher Stelle (Laden, Kamera, Aufnahme, Stop, Export), in
welchem Browser (Samsung Internet oder Chrome) und auf welchem Modell.

## Verdachtsstellen, nach Wahrscheinlichkeit

1. **Hängender Encoder wird nicht erkannt.** Am wahrscheinlichsten.
   - Wo: Aufnahme mit festem Raster (CFR) über `VideoEncoder`; `pickCfrConfig`
     ~5278, `onFrame` ~5399, `finishCfrRecording` ~5459.
   - Was passiert: Der Hardware-H.264-Encoder (`prefer-hardware`) meldet bei
     `isConfigSupported` „unterstützt“, liefert aber keine Frames und meldet auch
     keinen Fehler.
     - Ab `encodeQueueSize > 12` wird jeder Frame als „busy“ verworfen (5433).
     - Der Ersatzweg über den MediaRecorder greift nur, wenn ein Fehler gemeldet
       wird (`r.error`, 5403). Ein stummer Hänger löst ihn nicht aus.
     - `await r.encoder.flush()` (5466) hat kein Zeitlimit. Nach „Stop“ bleibt
       die App stehen.
   - Prüfen: die Diagnosezeile nach einer Aufnahme ansehen. Ist `busy` hoch und
     sind `frames` nahe 0, oder kommt nach Stop gar nichts mehr, bestätigt das
     den Verdacht.
   - Möglicher Fix: ein Wächter mit „kein Output nach N Frames“ oder „Queue
     wächst nur“, der auf den MediaRecorder umschaltet, und ein Timeout um
     `flush()`.

2. **Speicherbedarf.**
   - Wo: 5328 und 5348–5353, dazu der Export.
   - Was passiert:
     - Jede Aufnahme liegt doppelt im Speicher: einmal im `Mp4Muxer`
       `ArrayBufferTarget` und einmal als Kopie der Chunks (`r.parts`, `r.blobs`)
       für den Export.
     - Der Export baut die Datei noch einmal komplett im Speicher (`fastStart:
       'in-memory'`).
     - Lange Songs mit 720p ergeben einige hundert MB. Samsung Internet beendet
       solche Tabs schnell, die Seite lädt dann neu.
   - Prüfen: ob ein kurzer Song mit 360p geht und ein langer mit 720p nicht.
   - Möglicher Fix: nur eine Kopie halten (z. B. den Muxer erst beim Export
     füttern) oder den Muxer mit `StreamTarget` betreiben.

3. **Uhr der Kamera-Zeitstempel.**
   - Wo: 5418–5429 und 5386.
   - Was passiert: Der Code nimmt `meta.captureTime` aus
     `requestVideoFrameCallback` und rechnet direkt gegen `performance.now()`.
     Liegt `captureTime` auf einem Gerät auf einer anderen Zeitbasis, werden
     `capLag` und `audioStartOffsetMs` riesig. Der Ton liegt dann völlig
     daneben, ohne dass eine Fehlermeldung kommt.
   - Prüfen: `pipeMs` und `start` in der Diagnose. Plausibel sind etwa
     0–300 ms; Sekunden oder negative Werte sprechen für eine falsche Zeitbasis.
   - Möglicher Fix: Plausibilitätsprüfung (`0 < now - captureTime < ~500 ms`),
     sonst `now` verwenden.

4. **Song startet nach dem Countdown nicht.**
   - Wo: 5394 und 5593.
   - Was passiert: `audioPreviewElement.play()` läuft nach dem Countdown, also
     nicht direkt aus einem Tipp. Blockiert der Browser das (Autoplay-Einstellung
     in Samsung Internet), wird die Ablehnung verschluckt.
     - Die Aufnahme läuft ohne Song.
     - `catchAudioStart` ruft sich über `requestAnimationFrame` endlos weiter auf.
   - Möglicher Fix: die Ablehnung abfangen, eine Meldung zeigen, und den Song
     schon beim Tipp auf Aufnahme stumm „entsperren“.

5. **Kleinere Punkte.**
   - `decodeAudioData` (4764) hat keine Fehlerbehandlung. Ein nicht lesbarer
     Song führt zu keiner Meldung, es passiert einfach nichts.
   - Kamerawahl per `deviceId` (4911): Es wird nicht geprüft, ob wirklich die
     gewünschte Seite kam. Samsung hat mehrere Rückkameras (Weitwinkel, Tele),
     und vor der Berechtigung sind die Labels leer.
   - Export (≈6895): AAC über `AudioEncoder` gibt es auf Android nicht überall.
     Der Opus-Ersatz ist vorhanden. Nur prüfen, falls der Export scheitert.

## Was der Owner liefern kann

- Gerät, Browser und Version, und die Stelle, an der es hakt.
- Die **Diagnosezeile** oben links in der Kameraansicht: Tippen kopiert ein
  JSON mit UA, Encoder-Fähigkeiten, Kameraversuch und letzter Aufnahme
  (`frames`, `dup`, `late`, `busy`, `encMs`, `cap`, `pipeMs`, `start`). Damit
  lassen sich die Punkte 1–3 bestätigen oder ausschließen.
- Wenn möglich: Remote-Debugging über `chrome://inspect` am Rechner, um die
  Konsolenmeldungen `[StageSync] …` zu sehen.

## Bisherige Samsung-Fixes (zum Einordnen)

- **v4.34:** Das Video-Element bleibt im DOM, weil `drawImage` sonst schwarz
  zeichnet.
- **v4.35:** Kamerawahl neu, weil `facingMode` abgelehnt wurde und die App still
  in die simulierte Kamera fiel. Dazu 250 ms Pause vor dem Neustart der Kamera
  (`NotReadableError`).
