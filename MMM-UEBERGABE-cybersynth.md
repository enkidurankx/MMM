# 📋 Übergabe cybersynth (für eine parallele Session)

Stand: **v0.69** auf `main` (`a4fda74`). Datei: `cybersynth-v0_69.html`. Hub-Kachel und Weiterleitung `cybersynth/index.html` zeigen darauf.

## 🛑 Zuerst lesen
- `CLAUDE.md` im Repo-Stamm: **Antwortstil** (kurz, Stichpunkte, Icons, ein nächster Schritt) und feste Regeln.
- Der Owner schreibt Deutsch. Antworten auf Deutsch.
- ⚠️ Nie behaupten, etwas sei **gehört** oder am Handy getestet worden. Alles sind Chromium-Messungen.
- 👉 Auf `main` nur nach ausdrücklichem **"Push"**: `git fetch origin main`, mergen, `git push origin HEAD:main`, Arbeits-Branch mitpushen. Kein Pull Request ohne Auftrag.
- 🔧 Jede App-Änderung: **Version hochzählen** (Dateiname mit `git mv`, `index.html` Hub-Kachel `ver:` und `ziel:`, `cybersynth/index.html`) und **Eintrag in `MMM-SESSIONS.md`** (neueste oben, Abschnitt "Log").
- Hub-Datei `index.html`: `ICON_OF` nicht ändern.

## ⚠️ Parallel arbeiten ohne Streit
- Die andere Session arbeitet am besten an **einer anderen Datei oder App**.
- Beide Sessions zählen sonst dieselbe Versionsnummer hoch. Das gibt Merge-Konflikte (Dateiname, Hub, Log).
- Wenn doch beide an cybersynth arbeiten: **Versionsnummern absprechen** (z. B. die zweite Session nimmt v0.80 aufwärts) und vor jedem Push `origin/main` mergen. Das Log in `MMM-SESSIONS.md` beim Merge **beide** Einträge behalten.
- Eigene Branch-Namen verwenden. Der Branch der Haupt-Session ist `claude/affectionate-davinci-1febxv`.

## 🎛️ Was cybersynth ist
- Eine einzige HTML-Datei (Web Audio), 12 Rückkopplungs-Topologien, 4 Kanäle, 4×4-Matrix, Homöostase, 2 LFOs, FX.
- Tag/Nacht/Auto-Darstellung. Zustand in `localStorage` (`cybersynth.state.v1`, Slots `cybersynth.slots.v1`, Darstellung `cybersynth.theme`).

### Signalweg je Kanal
Eingang → Filter → (Sinus-Ringmod) → Drive (Wavefolder, 4× Oversampling) → Delay mit Rückkopplung (HP/LP, tanh) → Bandbegrenzung (HP 60 Hz und LP 6,5 kHz, je 4. Ordnung) → Filterblock (Mix) → EQ (Hälfte im Loop) → Kompressor → Polarität →
- **Loop-Zweig:** Limiter → `send` → Matrix → Kanaleingänge
- **Ausgangs-Zweig:** EQ (zweite Hälfte) → Output Level → Limiter → Pan → Bus

Bus: Tape Echo → Trocken und Plattenhall (Rückweg in die Kanäle) → Master → Wächter → Limiter → Ceiling → Tiefpass → Analyser.

### Topologien (`ENGINES`)
Tudor, Vink, Kayn, Serge, Krell, Chua, Rungler, Ciat, Ashby, PLL, **Knot**, **Lattice**.
- Jede hat Matrix, 4 Kanal-Grundwerte, 2 Spezial-Parameter, `trim` (Lautstärke-Ausgleich) und eine Mechanik in `engineStep` / `engineParams`.
- Chua, Knot und Lattice laufen als **AudioWorklet** (`CHUA_WORKLET`, `KNOT_WORKLET`, `LATTICE_WORKLET` als Strings in der Datei), Ausgang in die Kanaleingänge.

### Wächter (Schutz)
- **Kantenschutz** je Kanal: Spektrum-Anteil unter 100 Hz (Schwelle 0,55) oder über 6,2 kHz (0,7) für 0,4 s → Send 0,7 s aus, dann Funke und halber Pegel.
- **Ausgangsschutz** am Master: gleiche Bänder, 1,2 s → Master −12 dB für 2,5 s (Anzeige "SCHUTZ").
- Zähler zum Prüfen: `lowEndKills`, `guardDucks`.

### Leerlaufwege (`makeGate`)
EQ, Kompressor, Filterblock, Sinus-Ringmod, 2×2-Ringmod und Echo sind am **Ausgang** mit einem Gate verbunden, nur wenn das Feature an ist. ⚠️ Nicht am Eingang trennen: ein Biquad blieb dabei auf null hängen.

## 🧪 Messwerkzeug
- `tests/cybersynth-audit/` mit `README.md` (Einrichten: Tailwind holen, Playwright-Pfad).
- Richtwerte (v0.69, Chromium):
  - Alle zwölf Topologien: Ausgangs-rms 0,22 bis 0,31, Spitzen höchstens 0,9, keine NaN.
  - Audio-Last im Leerlauf etwa 0,10 der Echtzeit (Offline-Render, Desktop).
  - Haupt-Thread etwa 0,7 ms pro Frame.
  - Effekt-Läufe: "Matrix aus" und "LFO auf Spezial-Parameter bei 100 %" bleiben still (bekannt).

## 📝 Offen / Ideen
- 🎨 **Oberfläche (ADHS):** Farbe nur bei aktiven Reglern, 9-px-Schrift größer, Wert beim Drehen groß einblenden, Ruhe-Modus (Visualisierung aus), Kontrast normal/hoch.
- 🎛️ **Weitere Topologien aus den Apps:** `lichen` (wachsende Teiltöne) und `creak` (gestrichene Platte), danach `entropy` als Bus-Effekt.
- 📱 **Handy-Leistung:** Lattice kostet +0,09 Last, Option "Zellen mit halber Rate" (wie in der App lattice) möglich. Das 4× Oversampling bleibt der einzige echte Qualitätsregler.
- 🔊 **Bekannt:** sehr tiefe Extremeinstellungen (Tudor Seed 14, Seed 102) bleiben bassreich (Spitze bei etwa 55 Hz); der Master-Schutz dämpft dann ein- bis zweimal.
- ❓ **Nie gehört:** Klang von Knot, Lattice, kreisenden Positionen (LFO Pos), Tag/Nacht am Handy.

## 🗂️ Wo steht was
- `MMM-SESSIONS.md`: vollständiges Protokoll aller Änderungen (neueste oben). Die Einträge v0.50 bis v0.69 beschreiben jede Entscheidung mit Messwerten.
- `MMM-HANDOVER.md`: wie die ganze Sammlung gebaut und veröffentlicht wird.
- `feedbacks/`: gemeinsame Shell der Apps vink, homoeo, chua (nicht cybersynth).
