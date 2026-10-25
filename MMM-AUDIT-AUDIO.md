# Audit Audio-Tab (27 Apps), Vorschläge

Stand: 25.10.2026. Nur gelesen und gezählt, nichts geändert. Alle Zahlen aus den Dateien auf `main` (Suche im Quelltext, keine Messung am Gerät).
Umfang: Drums/Synths (5), Experimental Sound (9), Sample/FX (8), Editors (5).

## 1. Gemeinsame Regeln aus `MMM-HANDOVER.md` und was die Apps davon einhalten

| Regel | Erfüllt | Verletzt |
|---|---|---|
| Kein Netz zur Laufzeit | 23 von 27 | **cybersynth** (Tailwind-Skript von `cdn.tailwindcss.com`), **Chords**, **μFREAK**, **Sp&Sp** (Google Fonts) |
| Kontrast ist Pflicht (Text mindestens 5:1, Beschreibung 8:1) | nicht gemessen für alle | chop.4 und Chords sind gemessen, die anderen nicht |
| Schrift klein nur wo nötig | – | Texte unter 10 px: cybersynth 47 Stellen, rb88 24, μFREAK 22, rec.4D 21, RS-505 9, Chords 6, V·12 5, maxi.MS 5 |
| Stumm, bis der Nutzer startet | meist über Start-Knopf | nicht geprüft, ob alle erst nach Berührung einen Ton erzeugen |

## 2. Fünf Oberflächen-Familien (das ist die Uneinheitlichkeit)

1. **Shell-Familie** (gemeinsame `feedbacks/shell.*`): vink, homoeo, serge, lattice, knot, lichen, creak, entropy, chop.4. Dunkel, Abschnitte mit Farbe und Symbol, Kopfleiste mit Mute und Reset, Aufnahmeleiste unten (24 Bit), Fader ohne Sprung. Das ist der beste gemeinsame Nenner.
2. **Drum-Familie** (gleiche Farbwerte `#0a0a0a`/`#131313`): rb88, tko.4, gmln.4. Tag/Nacht nur in rb88.
3. **Editor-Familie** (gleiche Grüntöne `#1a2a1f`/`#2c4433`): PRO-800, FM-1. μFREAK und Volca Drum haben eigene Farben.
4. **Hardware-Nachbauten** (hell, grau, beige): RS-505, maxi.MS, rec.4D, AGE·12. Eigene Optik pro Gerät, bewusst.
5. **Einzelgänger**: cybersynth (Tailwind, Tag/Nacht), Chords (Bebas/DM Mono), GRAN.2, micro.sampler (RSM), Disk.rot, V·12, Sp&Sp.

Folge: Fader, Knöpfe, Aufnahme, Wertanzeige und Menüs verhalten sich in jeder Familie anders.

## 3. Befunde (nach Gewicht)

**Hoch**
- cybersynth lädt Tailwind zur Laufzeit von einem fremden Server: ohne Netz keine Gestaltung, mit Netz ein Aufblitzen. RSM macht es richtig (vorübersetztes Tailwind in `<style id="tw">`).
- 3 Apps laden Google-Schriften (Chords, μFREAK, Sp&Sp). Dazu nennen cybersynth (JetBrains Mono) und RSM (Space Mono) Schriften, die nicht eingebettet sind: es gilt dort die Ersatzschrift.
- 7 Apps speichern nichts (kein `localStorage`): rec.4D, GRAN.2, AGE·12, Sp&Sp, micro.sampler, V·12, μFREAK. Seite neu laden = Einstellungen weg.
- Presets fehlen in GRAN.2, micro.sampler, V·12, Sp&Sp, rec.4D (und kaum in chop.4).

**Mittel**
- Aufnahme-Format uneinheitlich: 24 Bit (Shell-Apps, cybersynth, V·12, rb88 als Option) gegen nur 16 Bit (rec.4D, GRAN.2, Disk.rot, micro.sampler, Sp&Sp). Dateinamen sind je App anders.
- Speicherschlüssel in 7 Schreibweisen: `mmm.<app>.state` (Mehrheit), `maxi.MS:state:v1`, `rs505.userPatches.v1`, `rhythmBuilder.*`, `cybersynth.*`, `vell.*`, `mmm-volcadrum-v1`, `diskrot-theme`.
- Titel, Hub-Name und Version stimmen nicht überein: micro.sampler zeigt im Titel V1.2, im Fuß V1.0, die Datei und der Hub sagen 1.5. Titel wie `GRANULAR DSP // QUAD_EXPANDED_MATRIX // v2.3`, `LPC Voice` (Hub: Sp&Sp), `CYBERSYNTH-10: …` (Hub: cybersynth v0.74).
- Tag/Nacht nur in 4 Apps (rb88, Disk.rot, cybersynth, maxi.MS). Alle Shell-Apps sind nur dunkel.
- Pinch-Zoom ist in 18 von 27 Apps abgeschaltet (für Regler sinnvoll, aber auch Text lässt sich nicht vergrößern).
- Tests gibt es für 13 von 27 Apps (Shell-Familie, cybersynth, FM-1, PRO-800, chop.4). Keine für rb88, tko.4, gmln.4, maxi.MS, RS-505, rec.4D, GRAN.2, AGE·12, Disk.rot, micro.sampler, Sp&Sp, V·12, Volca Drum, μFREAK, Chords.
- Hub: Chords steht unter Editors, ist aber ein Kompositionswerkzeug. maxi.MS und RS-505 stehen unter Drums/Synths (passt zum Namen). `chua` wird in der Shell-Doku erwähnt, es gibt aber keine Datei dazu.

**Niedrig**
- Panic gibt es nur in tko.4, gmln.4, RS-505, maxi.MS, V·12. Alle anderen haben Stop oder Mute.
- Keine Offline-Nutzung (kein Service Worker). Nur FOCUS hat ein Manifest.
- Beim Aufnehmen gibt es keine einheitliche Mikro-Wahl (nur Shell-Apps haben ein Geräte-Menü).

## 4. Vorschläge, nach Aufwand

**A. Klein (eine Sitzung, hoher Nutzen)**
1. **Prüfskript für alle Apps** (`tests/smoke`): Seite laden, keine Konsolenfehler, keine Anfragen nach außen, kein Audio vor der ersten Berührung, kleinste Schrift, Kontrast der Texte, kein seitliches Scrollen bei 320 px, Titel und Version gegen Hub und Dateiname. Läuft per Befehl, später auch als GitHub-Aktion.
2. **Netz-Abhängigkeiten entfernen**: cybersynth auf eingebettetes Tailwind wie RSM (mein Messwerkzeug erzeugt das schon), Google-Schriften in Chords, μFREAK, Sp&Sp durch eingebettete Schrift oder Systemschrift ersetzen.
3. **Titel und Version vereinheitlichen**: `<title>` = Hub-Name + Version, im Fuß ein kleines `v1.5 · MMM`; micro.sampler korrigieren.
4. **Kleine Schrift anheben** (cybersynth, rb88, μFREAK, rec.4D) nach der Regel: Beschriftung mindestens 12 px, Meta mindestens 5:1.

**B. Mittel (eine Sitzung je Punkt)**
5. **Gemeinsamer Kern `core/`**, eingesetzt wie die Shell mit `build.py` (Einzeldatei bleibt): Startschirm und "stumm bis berührt", Aufnahmeleiste (24 Bit, ein Dateinamen-Schema), große Wertanzeige über dem Finger, Speicher-Hilfe mit einheitlichem Schlüssel `mmm.<app>.<was>.v<n>`, Einstellungen als Datei sichern und laden, Tag/Nacht/Auto. Erst die Aufnahmeleiste und den Speicher (größter Gewinn), dann die Wertanzeige.
6. **Speicher und Presets für die 7 Apps ohne Gedächtnis**, mit dem Kern aus 5.
7. **Eine Theme-Einstellung im Hub** (Tag, Nacht, Auto), die alle Apps lesen. Die Hardware-Nachbauten bleiben bei ihrem Look.
8. **Hub-Ordnung**: Chords in eine Gruppe "Compose" (zusammen mit späteren Werkzeugen wie Generatoren), Reihenfolge je Gruppe nach Nutzung statt nach Entstehung.

**C. Größer (Arbeitsablauf zwischen den Apps)**
9. **Gemeinsame Sample-Ablage** (IndexedDB, alle Apps liegen auf demselben Ursprung): rec.4D, chop.4, AGE·12, GRAN.2, micro.sampler, V·12 bekommen "In Ablage" und "Aus Ablage". Aufnehmen in einer App, Zerschneiden in der anderen, ohne Datei hin und her zu schieben.
10. **MMM-Bus** über `BroadcastChannel`: Takt und Noten zwischen den Apps (rb88 gibt den Takt, tko.4 und gmln.4 folgen, Chords spielt maxi.MS oder RS-505). Web-MIDI haben schon 11 Apps, ein Bus ersetzt dort das Kabel im Browser.
11. **Eine "Session"**: Hub speichert, welche Apps offen sind und deren Einstellungen (Zustand aus 5), damit man ein Setup in einem Schritt wieder lädt.

## 5. Meine Reihenfolge

1 (Prüfskript), 2 (Netz entfernen), 3 (Titel und Version), 5 (Kern: Aufnahme und Speicher), 6, 9, 7, 8, 4, 10, 11.

## 6. Offene Fragen an den Owner

- Soll `chua` wieder in den Hub? (Doku nennt es, Datei fehlt.)
- Welche Hardware-Nachbauten sollen ihren eigenen Look behalten? (Vorschlag: RS-505, maxi.MS, rec.4D, AGE·12.)
- Aufnahme-Dateiname: `vell_2026-10-23_15-02.mid` (kurz) oder `chop-4_2026-10-24_15-02-03_48k_24bit.wav` (lang, Shell)? Ein Schema für alle wäre besser.
