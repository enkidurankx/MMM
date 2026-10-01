# MMM Sound Library — Handover (Stand 01.10.2026)

Für eine neue Session mit anderem Fokus (z. B. Indonesien/Gamelan), die konsistent mit der bisherigen Arbeit weiterbauen soll. Zuerst lesen: Abschnitte 1, 2 und 8. Alles hier ist aus der bisherigen Arbeit abgeleitet; was **ungeprüft** ist, steht ausdrücklich so da.

## 1. Ziel und Arbeitsweise mit dem Owner (enkidu rankX)

- **Ziel:** Zentrale, **generative** (keine Samples) Sound Library. Sounds sind plattformneutrale Konzepte („Sound Cards“) und werden auf mehreren Plattformen realisiert: Ableton (Operator, Collision, Tension, Drum Synth), Arturia MicroFreak (FW5), M-VAVE FM-1 (DX7-artige 6-Op-FM), Korg Volca Drum und die MMM-Browser-Apps (tko.4, rb.88, gmln.4, Editoren).
- **Priorität:** Drums und Percussion; Inspiration aus alten Instrumenten (Japan: Tsuzumi, Kagura-Suzu, Shakubyōshi, Taiko ohne Klischee, Saiteninstrumente; Gamelan) und moderner Drum-Machine-Szene (Hip Hop, IDM, Club, Elektron). Der Owner mag den „straighten“ japanischen Sound. Die Sounds sollen **nicht flach wie Samples** wirken: Variation pro Anschlag, tonale Komplexität, Spieltechniken.
- **Sprache:** Antworten auf Deutsch, knapp, ohne Aufzählungs-Orgien. Fachbegriffe englisch ok.
- **Fokus halten:** Der Owner hat zuletzt ausdrücklich gebeten, sich zu fokussieren und bei offenen Themen **erst Ideen zu sammeln, bevor gebaut wird**. Nicht „forsch“ mehrere Gerätefamilien auf einmal bauen; erst Richtung bestätigen lassen.
- **Ehrlichkeit:** Alles, was nicht in Live / am Gerät gehört oder getestet wurde, klar als ungeprüft kennzeichnen. Messungen am Referenz-Renderer sind **keine** Hörprüfung. Nie behaupten, etwas klinge gut.
- **Recherche zuerst, dann Modell:** Der Owner hat früher bemängelt, dass erste Entwürfe oberflächlich waren („du musst verstehen, wie die Instrumente funktionieren“). Zuerst die Akustik/Struktur klären (Anregung, Resonator, Spieltechnik), dann umsetzen.

## 2. Gemeinsames Stimmenmodell (für alle Cards)

Exciter → Resonator → Bend (Spannung/Pitch-Hüllkurve) → Drive/Nichtlinearität → **Variation pro Anschlag** (Cent, dB, Decay, Rauschen). Modale Synthese als gemeinsame Sprache; Teiltonlisten (Verhältnis, Pegel, T60) lassen sich auf Operator, FM-1, Collision und Browser abbilden. Plattformabhängig ergänzt: Waveguide (Saiten), Beating/Mode-Paare (Glocken, Gamelan), Luftfeuchte als Klangmakro (Felle).

## 3. Bestehende Sound Cards

**Card 01 (Drums/Percussion):** Referenz `sounds-library/tools/cards.js`, Renderer `renderKick/renderKot/renderOts`.
- **KICK modern:** Tune 46,25 Hz, Pitch-Dive 28 Halbtöne τ 35 ms, Body τ 0,14 s, Drive 2,2, Klick (HP 3 kHz, τ 4 ms), Glide τ 60 ms, **Rumble** (Level 0,38, τ 0,25 s, Delay 20 ms, Rise 50 ms, Drift, Beat 0,6 Hz, Sättigung, LP 180 Hz). Varianten Tight/Slide.
- **KOT (Ko-tsuzumi):** f0 290,3 Hz (Ichikotsu), Teiltöne ~ 1 / 2,02 / 3,03 / 4,04 / 5,05 (nahe harmonisch, weil ringförmige Membran + Chōshigami-Belastung), Zustände pon / pu (−5 st) / ta (+5) / chi (+7), Feuchte-Makro, Bend (Squeeze).
- **OTS (Ō-tsuzumi):** f0 = 290,3 × 2^(6/12); ideale Kreismembran, **Bessel-Verhältnisse** 1 : 1,594 : 2,136 : 2,295 : 2,653 …, T60 120…40 ms, trockenes hartes Leder; Zustände chon / kan.
- Realisiert für: Operator (Live Set + `.adv`), Collision (Membrane/String), FM-1, MicroFreak, Volca Drum (MIDI), Web-Hörprobe.

**Card 02 (Saiten):** Referenz `strings.js` (Digital-Waveguide, Node + Browser).
- **Koto:** Hirajōshi in D = D3 G3 A3 B♭3 D4 E♭4 G4 A4 B♭4 D5 E♭5 G5 A5 (Quelle koto.sapp.org); Tsume nahe am Steg (Position ≈ 0,05 → Kammfilter, nasal); T60 ≈ 3,2 s; Gesten tsume, **oshide** (Druck hinter dem Steg, Ton steigt nur aufwärts, bis ~1,5 Töne), oshi-hanashi, yuri (Vibrato nur aufwärts), awase.
- **Shamisen:** Stimmungen honchōshi 1-4-1 (0,5,12), niagari 1-5-1 (0,7,12), sangari 1-4-♭7 (0,5,10); Bachi trifft Saite **und** Fell (Fell-Moden 190/340 Hz: **Annahme**), **Sawari** = erste Saite liegt auf dem sawari-yama-Steg, schnarrt, Obertöne „blühen“; Gesten uchi, sukui, hajiki, suri.
- Referenzton 145,15 Hz (= 290,3/2).

**Offene Karten-Ideen:** Kendang, Gong ageng, Bonshō (Glocken-Beating), Biwa, Shakuhachi/Flöten, Tension-Koto/Shamisen mit Spieltechniken, Hip-Hop/IDM-Drum-Familien.

## 4. Plattform-Fakten (verifiziert aus echten Dateien oder Quellen)

**Ableton-Dateiformate (Live 12.x):**
- `.als` = gzip-XML. `.adv` (Device-Preset) = gzip-XML mit `<Ableton MajorVersion="5" MinorVersion="12.0_12402" SchemaChangeCount="5" Creator="Ableton Live 12.4.6" Revision="0de5c8fa9a692293676cb7700a15afb2046ee1f7">` und dem Gerät direkt darunter: `Operator`, `Collision`, `StringStudio` (= Tension), `MxDeviceInstrument` (Drum Synth). Alle `AutomationTarget/ModulationTarget/Pointee Id="0"`, `LastPresetRef` mit leerer FileRef + DeviceId, `SourceContext` leer.
- **Beste Methode:** Leere Presets des Owners als **Vorlage** nehmen (Collision, Tension, DS Snare/HH/Clap), Werte per Regex in `<Manual Value>` ersetzen, mit gzip neu packen. Nie ein Gerät von Grund auf schreiben.
- **Operator:** `Operator.0–3` (Hüllkurve mit linearen Pegeln, Tune Coarse 0–48 / Fine 0–1000, Volume 0,000316–1, Feedback 0–100, PitchEnvOn, VelScale), Globals (Algorithm 0–10, NumVoices, Portamento, Volume, Tone), PitchEnv (Level in Halbtönen −48…48), Filter. **Annahme:** Algorithm-Index 10 = vier parallele Carrier; Fine = Tausendstel Verhältnis.
- **Collision:** Mallet, Noise, Resonator1/2 (Type 0–6, Decay 0–1, Damp −1…1, Inharmonics −1…1, StartTranspose −1…1, HitX, RandomToHitX …). **Annahme** Typ-Reihenfolge 0 Beam, 1 Marimba, 2 String, 3 Membrane, 4 Plate, 5 Pipe, 6 Tube.
- **Tension:** Parameter **normiert 0–1** (`ExcitatorType` 0–3 = **angenommen** Bow, Hammer, Hammer bouncing, Plectrum; `GeoExcitatorPosition`, `ExcitatorStiffness`, `StringDecay`, `StringDamping`, `StringDecayRatio`, `StringInharmonicity`, `PickupPosition`, `Termination*`, `Body*` mit `BodyType` 0–3 unbekannt, `Vibrato*`, `PitchBendRange` 0–12). Ableton schreibt: Tension reagiere nur begrenzt auf MPE; Pitch-Bend evtl. nur nach unten verlässlich; Slide ungenau ([MPE in Live FAQ](https://help.ableton.com/hc/en-us/articles/360019144999-MPE-in-Live-FAQ)). **Vor Aufbauten mit Aufwärts-Bends in Live testen.**
- **Drum Synth (DS):** Parameter in `ParameterList/Timeable/Manual`. DS Snare: Color, Decay, Filter Type, Tone, Tune, Volume. DS HH: Attack, Decay, Filter Slope, Noise Color, Pitch, Tone, Volume. DS Clap: Decay, Sloppy, Spread (int), Tail, Tone (int), Tune, Volume. **Werte → Hz/ms unbekannt**, nur Startwerte. Die vom Owner geschickte „Cymbal“-Vorlage war ein DS HH.
- **Live 12 Pro-Note-Expression:** Pitch/Slide/Pressure pro Note lassen sich in jedem Clip zeichnen, auch ohne MPE-Controller ([Handbuch](https://www.ableton.com/en/live-manual/12/editing-mpe/)). M4L-Generator [AutoSlide](https://zoftloud.gumroad.com/l/autoslide) erzeugt Rampen.

**M-VAVE FM-1 (DX7-Format):** VCED 163 Byte (Einzelvoice), 4104 Byte (32er Bank). Ratio = Coarse × (1 + Fine/100); Fixed-Frequenz = 10^(fc&3) × (1 + ff × 8,772/99). Algorithmus-Index 4 = drei Zweier-Stapel 2→1, 4→3, 6→5 (Feedback OP6); Index 31 = sechs Carrier (additiv). Pitch-EG-Pegel nichtlinear (**Skala geschätzt**), Raten geschätzt. Editor-Kern: `fm1-editor-v1_17.html` zwischen `/*CORE-START*/` und `/*CORE-END*/` (die Skripte laden ihn per `new Function`).

**MicroFreak (FW5):** Editor-JSON = Objekt P, Matrix-Beträge haben **keinen CC** (am Gerät von Hand setzen). Osc-Indizes im Editor: basic 0, super 1, … `karplus` 4 (Wave = Bow, Timbre = Position, Shape = Decay), fm 7, `modal` 11 (Inharm/Timbre/Decay), `bass` 13 (Saturate/Fold/Noise). Matrix-Quellen 0 CycEnv, 1 Env, 2 LFO, 3 Press, 4 Key/Arp; Ziele 0 Pitch, 1 Wave, 2 Timbre, 3 Cutoff.

**Volca Drum:** 6 Parts (MIDI-Kanal 1–6), je 2 Layer. CC (midi.guide): Pan 10, Select 14/15, Level 17/18, EG Attack 20/21, EG Release 23/24, Pitch 26/27, Mod Amount 29/30, Mod Rate 46/47, Bit 49, Fold 50, Drive 51, Dry 52, Send 103, Waveguide-Modell 116, WG Decay 117, Body 118, Tune 119. **Wert → Option (Wellenform, WG-Modell) ist undokumentiert**; die App nutzt fünf gleich große Zonen als Annahme.

## 5. Ordner und Dateien

**Repo `enkidurankx/MMM`** (Hub: https://enkidurankx.github.io/MMM/): Dev-Branch dieser Session `ccr-2fa452eb-qj035b`; **nach `main` wird nur auf ausdrückliche Anweisung gemerged**, kein PR ohne Auftrag. Neu: `volcadrum-editor-v0_2.html` (+ `volcadrum-editor/index.html`, Hub-Kachel im Editors-Bereich; auf `main` ist v0.1), `MMM-SOUNDS-HANDOVER.md`, `sounds-library/tools/` (Renderer und Generator-Skripte, s. u.). Vorhandene Apps: `tko`/`taiko-v2_5.html`, `rb88-v4_27.html`, `gamelan-v1_3.html`, `fm1-editor-v1_17.html`, `microfreak-editor-v4_2.html` usw.

**Google Drive** (Owner enkidu.rankx@gmail.com), MMM = `1p_aR5c8gOHezB-wx2dd9GIHbinWKm-xF`, darin `Sounds` = `19QyZbDJe_yC3kWOcGXQxWYWZvg4wBQRh`:
- `Dokumente` (`11ncZaS0NZslBowAgZHrJIwFEGTRMGMf4`): 01 Recherche & Systematik, 02 Tiefenanalyse (Tsuzumi), 03 Entwicklung/Richtung, 04 **Gamelan**, 05 Sound Cards, 06 Saiteninstrumente (Koto & Shamisen).
- `Patches` (`1aii9PaGgk6J-XS-IqOHq9dukJuk3PQbo`): Unterordner FM-1, MicroFreak, Volca Drum, Ableton (Rezepte-Doc, READMEs, zwei `.adv`), Web (MMM). Die Sounds-02-Patches und die ZIPs liegen **nicht** in Drive.

**ZIPs** (nur beim Owner als Download): `MMM-Sounds-01.zip` (Card 01, 23 `.adv`, Live Set, FM-1/MicroFreak/Volca, Skripte), `MMM-Sounds-02.zip` (Card 02: Tension ×7, MicroFreak ×5, FM-1 ×6 + Bank, Volca-MIDI, Hörprobe, WAV-Referenz, Skripte).

**Werkzeuge** (`sounds-library/tools/`, Pfade im Skript-Kopf sind auf die Original-Sandbox ausgelegt und müssen angepasst werden): `cards.js` (Card 01), `strings.js` (Card 02), `verify.js`/`verify2.js` (Spektraltests), `fm1.js`/`fm1s.js` (FM-1-Voices), `mf_volca.js`/`mf_volca2.js` (MicroFreak + Volca MIDI), `build_als.py`/`build_adv.py`/`build_tension.py` (Ableton). `build_als.py` braucht das Live Set des Owners (`Played_12.als`), `build_adv.py`/`build_tension.py` die leeren `.adv` des Owners; **diese Vorlagen liegen nicht im Repo** – der Owner muss sie neu hochladen.

## 6. Technischer Workflow der bisherigen Session

1. **Recherche** (WebSearch/WebFetch) → Drive-Doc (Google Doc aus HTML via `create_file` mit `contentMimeType text/html`).
2. **Referenz-Renderer** (JS, Node + Browser, `wav16`) bauen; mit `verify*.js` spektral prüfen (Tonhöhe, Teiltonverhältnisse, Decay, Kammfilter). Messwerte berichten, nicht „klingt gut“.
3. **Plattform-Patches** aus dem Renderer ableiten (Operator: Teiltonliste; FM-1: Coarse/Fine/Fixed; Tension/Collision/DS: normierte Startwerte; Volca: CC-Setup als MIDI).
4. **Hörprobe-Seite** (eine HTML-Datei, Renderer inline) im Headless-Chromium auf JS-Fehler testen (Playwright, Chromium unter `/opt/pw-browsers`, nicht neu installieren).
5. **Auslieferung:** Binärdateien (`.adv`, `.als`, `.syx`, `.zip`) per `SendUserFile`. **Nicht** per Drive-MCP: Binärdaten laufen dort als Text/Base64 durch die Ausgabe des Modells; bei ähnlichen Strings schleichen sich Kopierfehler ein (zwei `.adv`-Uploads waren korrupt; Prüfung nur über gzip-CRC). Reine Textdateien (Docs, JSON, READMEs) und kleine `.syx` sind zuverlässig.
6. **Apps ins Repo** nach `MMM-HANDOVER.md`: Dateiname `name-vX_Y.html`, Ordner `name/index.html` als feste Adresse (leitet auf die aktuelle Version), Kachel in `index.html` (`TOOLS`-Array; nur die eigene Zeile ändern, vorher frisch fetchen, weil eine zweite Session dieselbe Datei editiert). Die Sandbox erreicht `github.io` nicht; Prüfung über die Contents-API.
7. **Git:** Entwickeln auf dem zugewiesenen Branch, Commits mit den vom System vorgegebenen Trailern, keine PRs ohne Auftrag. Merge nach `main` nur auf Zuruf („merge das auf main“).

## 7. Gamelan / Indonesien — Startpunkt

- Bereits vorhanden: Drive-Doc **04 Gamelan** und die App `gamelan-v1_3.html` (gmln.4). Zuerst beides lesen, bevor neu recherchiert wird.
- Erkenntnisse aus den Docs: Gong ageng ≈ 44,5 Hz, ~12 Teiltöne, langsame (und ~20 Hz) Modulation, Intermodulationsverzerrung; Tempelglocken-Beating = Mode-Paare 2–12 Hz (sekundäre Quelle). **Widerspruch** in den Quellen zu „Saron 430/860/1290/1720 Hz“ → nicht verwendet, nochmal prüfen.
- Passende Kartenideen: Gong ageng (Beating + langer Ausklang), Kendang (Fell, Gesten dhah/tak/dhung), Bonang/Saron/Gender (Metallophon-Modi, Paarstimmung **ombak**), Slendro/Pelog-Skalen (nicht gleichstufig; Verstimmung als Parameter pro Gamelan-Set).
- Auf die Plattformen übertragen wie Card 01: Operator/FM-1 (Teiltonlisten, Beating über leicht verstimmte Paare), Collision (Plate/Beam/Membrane), MicroFreak (Modal), Volca Drum, Browser. Gleiches Stimmenmodell und gleiche Variation pro Anschlag nutzen.

## 8. Konventionen für Konsistenz

- **Namen:** „MMM <Instrument> <Zustand>“, Ableton-Dateien `MMM_<KURZ>_<Variante>.adv`; FM-1-Namen ≤ 10 Zeichen.
- **Referenzton:** Ichikotsu = 290,3 Hz (D4), tiefere Oktave 145,15 Hz. Neue Karten gleiches Tuning-Anker verwenden.
- **Jede neue Card liefert:** Doc (Konzept + Messwerte + offene Annahmen), Referenz-Renderer, Hörprobe, Patches je Gerät, README mit „Ungeprüft“-Liste, ZIP, Eintrag hier im Handover.
- **Variation:** `vary`-Block (Cent, ampDb, Decay, Rauschen) in jeder Card, per Seed reproduzierbar.
- **Gerätelimits beachten:** Operator Volume ≥ 0,000316; MicroFreak-Matrix nur manuell; Volca-Wertzonen ungeprüft; FM-1 Raten geschätzt.

## 9. Offene Punkte

- Alle Ableton-, FM-1- und Volca-Patches in Live bzw. am Gerät hören und Werte nachziehen (bisher nur berechnet).
- Tension: Verhalten von Aufwärts-Bends und Slide testen (siehe Abschnitt 4).
- Spieltechniken in Live: Idee-Sammlung liegt im Chat-Verlauf (Pro-Note-Expression zeichnen, M4L-Generatoren, Browser-Geste-Pad per Web MIDI, MIDI-Clip-Bibliothek, Rack-Makros); noch nichts gebaut, Owner entscheidet.
- Sounds-02-Patches und ZIPs in Drive ablegen (manuell durch den Owner).
- Volca-Drum-App v0.2 nach `main` mergen, falls gewünscht.
