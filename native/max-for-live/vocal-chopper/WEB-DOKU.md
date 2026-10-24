# chop.4 (Web-Version des Vocal Choppers), Übergabe-Doku

Stand: v0.5, 24.10.2026. Datei: `chop-v0_5.html` (Hauptverzeichnis), feste Adresse `chop/`, Hub-Gruppe Sample/FX.
v0.4 und v0.5 hat auf Wunsch des Owners die Audio-Session gebaut (Oberfläche, Hold-to-Record, Bild des Samples). Die Native-Session bitte informieren.
Status: Node-Test der Engine (`tests/chop/engine.test.js`) und Browser-Test mit simuliertem Mikrofon. **Nicht gehört, nicht am Handy getestet.**

## Was es tut
Du hältst den großen Knopf und machst ein Geräusch: das ist das Sample (bis 8 s). Es wird in kleine Stücke geschnitten
(zufällige Länge, Tonhöhe, Richtung, Pegel, Pan), 8 Stücke gleichzeitig, 4 Ausgänge, zu Stereo gemischt. Ableger der
Max-for-Live-Version, gleiche Zufallslogik. Ein Bild zeigt das Sample (Wellenform), den genutzten Bereich (Range), wo die Stücke herkommen
(Balken in der Farbe ihres Ausgangs) und die Schreibposition.

## Bedienung
- **Hold to record** (Taste R, auch Latch): nimmt solange auf, wie du hältst (höchstens 8 s). Das Mikrofon ist nur dann im Klang, sonst stumm.
- **Source**: SAMPLE (die Aufnahme bleibt und wird zerschnitten) oder LIVE (rollendes Fenster, schreibt nur bei offenem Mikrofon, friert beim Schließen ein; Freeze hält es zusätzlich an).
- **Load file**: eine Datei als Sample (die ersten 8 s). Ersetzt das alte Einspielen als Schleife.
- **Panic** (oben): alle Stücke stoppen. **Reset**: Sample leeren. **Mute** (oben): Ton aus, Aufnahme läuft weiter.
- **Rec** (unten, Dock): nimmt den Ausgang auf, WAV 24 Bit Stereo, Name `chop-4_JJJJ-MM-TT_HH-MM-SS_48k_24bit.wav`. Das ist die gemeinsame Aufnahmeleiste der Feedback-Apps.
- Fader: Griff greifen (nicht auf die Spur tippen), kurz halten = fein, Label doppelt tippen = Standardwert, beim Bewegen steht der Wert groß über dem Finger.

## Abschnitte
1 Sample (Bild, Aufnahme, Source, Range, Live-Fenster, Gerät), 2 Rhythm (Clock FREE/TEMPO, Rate, Tempo, Division, Trigger, Probability),
3 Pieces (Size, Chaos, Pitch, Reverse, Repeats, Fade, Level-Variation), 4 Output (Outs, Route, Width, Dry, vier Ausgänge mit Pegel und An/Aus, Master),
5 LFO (8 Sample-and-Hold-Werte, Slew, Depth, Ziele), 6 Onset (Threshold, Sensitivity, Gap; zugeklappt).

## Technik
- Eine Datei, kein Netz. Oberfläche aus der gemeinsamen Shell der Feedback-Apps (`feedbacks/shell.css`, `shell.js`, `icons.svg.html`), eingesetzt mit `python3 feedbacks/build.py chop-v0_5.html`.
- Web Audio + AudioWorklet (Code als Text im HTML, `<script id="dsp">`, per Blob geladen). Zwei Prozessoren: `chop` (Engine) und `chop-rec` (Aufnahme).
- Engine = Port von `MMM_VocalChopper.genexpr` mit `tanh` am Ausgang. Neu in v0.5: Aufnahme linear ab 0 (Sample-Modus), Laden einer Datei, Bild-Daten (256 Spitzenwerte, laufende Stücke) als Nachrichten.
- Clock im Worklet (sample-genau). Kein Transport-Sync wie in Live, nur Tempo-Feld.
- Speicher: `localStorage` unter `mmm.chop.v2` (Einstellungen, Ausgänge, LFO-Ziele). Das Sample selbst wird nicht gespeichert.
- Stumm, bis der Nutzer startet. Echo-Cancel, Rauschfilter und AGC sind aus.

## Bekannte Grenzen
- Mikro über Lautsprecher gibt Rückkopplung: Kopfhörer nutzen.
- Trigger ONSET reagiert auf den Eingang, also nur im Live-Fenster oder während der Aufnahme.
- Das Sample geht beim Neuladen verloren (nicht gespeichert).
- Keine MIDI-Steuerung, kein Hub-Tab-Sync.
- Handy-Safari: Mikro-Zugriff und AudioWorklet noch nicht geprüft.

## Wichtig für die Audio-Session
Die Datei gehört der Native-Session. Änderungen bitte über sie, oder vorher absprechen.
Hub-Zeile in `index.html`: Gruppe `samplers`, Symbol `░`, Icon `loop`.
