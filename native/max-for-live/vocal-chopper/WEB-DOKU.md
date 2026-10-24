# chop.4 (Web-Version des Vocal Choppers), Übergabe-Doku

Stand: v0.4, 24.10.2026 (v0.4 = nur Oberfläche, auf Wunsch des Owners von der Audio-Session überarbeitet, Engine unverändert). Datei: `chop-v0_4.html` (Hauptverzeichnis), feste Adresse `chop/`, Hub-Gruppe Sample/FX.
Status: nur Node-Test der Engine, **nicht gehört, nicht am Handy getestet**.

## Was es tut
Nimmt Mikro oder Datei-Loop in einen Rolling-Buffer (0,5 bis 8 s). Bei jedem Ereignis spielt es einen Schnipsel
aus der jüngeren Vergangenheit ab: zufällige Länge, Tonhöhe, Richtung, Pegel, Pan. 8 Grains gleichzeitig.
4 Ausgänge (Voices), im Browser zu Stereo gemischt. Ableger der Max-for-Live-Version, gleiche Logik.

## Bedienung
- **Mikrofon an/aus** (ein Knopf), **Datei laden** (Loop), **Alles aus** (Aufnahme, Grains, Quelle, Ton).
- **Fire** = ein Schnipsel sofort. **Hold** = Buffer einfrieren. **Panic** = alle Grains stoppen.
- **Aufnahme**: nimmt den Ausgang auf, WAV 16 Bit Stereo. Nach Stopp erscheint der Speicher-Link.
  Dateiname: `chop4_JJJJ-MM-TT_HH-MM-SS.wav`.
- Leertaste = Fire (Desktop).

## Seiten
- **Simple:** Rate/Tempo, Teilung, Chaos, Size, Prob, Thresh, Dry, Outs (1 bis 4), Trigger (Clock/Onset/Beides),
  Route (Random/Cycle/Nach Pegel/Nach Tonhöhe), Sync.
- **Mangle:** Range, Pitch, Reverse, Repeats, Width, Fade, Pegel-Var, Buffer, Onset-Sens, Onset-Gap.
- **LFO:** 8 Sample-and-Hold-Werte mit Slew und Depth. Toggles wählen, was der LFO bewegt. "Pro Step" = neue Werte je Schnipsel.
- Unten: 4 Ausgänge mit Pegel, Stumm, Aktivitäts-LED.

## Technik
- Eine Datei, kein Netz. Web Audio + AudioWorklet (Code als Text im HTML, per Blob geladen).
- Engine = Port von `MMM_VocalChopper.genexpr` (gleiche Parameter, gleiche Zufallslogik), mit `tanh` am Ausgang.
- Clock sitzt im Worklet (sample-genau). Kein Transport-Sync wie in Live, nur Tempo-Feld.
- Speicher: `localStorage` unter `mmm.chop.*`.
- Stumm, bis der Nutzer Mikro oder Datei startet. Echo-Cancel, Rauschfilter und AGC sind aus.

## Bekannte Grenzen
- Mikro über Lautsprecher gibt Rückkopplung: Kopfhörer nutzen.
- Aufnahme liegt im Speicher, bis du stoppst. Sehr lange Aufnahmen brauchen viel RAM.
- Keine Exportwahl (nur WAV 16 Bit), kein Hub-Tab-Sync, keine MIDI-Steuerung.
- Handy-Safari: Mikro-Zugriff und AudioWorklet noch nicht geprüft.

## Wichtig für die Audio-Session
Die Datei gehört der Native-Session. Änderungen bitte über sie, oder vorher absprechen.
Hub-Zeile in `index.html`: Gruppe `samplers`, Symbol `░`, Icon `loop`.
