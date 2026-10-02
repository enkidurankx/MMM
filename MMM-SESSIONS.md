# MMM — Session-Abstimmung

Gemeinsame Regeln und Stand für alle Claude-Sessions, die an diesem Repo arbeiten. **Zuerst lesen, bevor du `main`, `index.html` oder eine Übergabe-Datei anfasst.** Der Owner (enkidu rankX) entscheidet, was auf `main` kommt.

Stand: 02.10.2026, nach `30593da` auf `main`. Die Spalte „Zuletzt gemeldet“ stammt aus der Session-Liste (Selbstauskunft der Sessions, nicht geprüft).

## Wer arbeitet woran

| Session (Titel) | Branch | Thema | Stand (laut Session-Liste, 02.10.2026) |
|---|---|---|---|
| **Master-Session** | `claude/upbeat-ptolemy-mrefn1` (in `MMM` und `MMM-sounds`) | Koordination über beide Repos: Apps und Hub in `MMM`, Sounds in `MMM-sounds`; übernimmt die Lanes der archivierten Sessions auf Anweisung des Owners | **aktiv**, eingetragen am 02.10.2026 auf Zuruf des Owners |
| Zentrale Sound library | `ccr-2fa452eb-qj035b` (veraltet) | Sound Library im Repo `enkidurankx/MMM-sounds`: Karten 00/01/02, Inventar, Presets-Ordnerstruktur, Volca-Drum-Organizer | **archiviert** (laut Owner, 02.10.2026) |
| Gamelan-App japanische Variante | `claude/elegant-maxwell-yise0m` (gemergt) | Gamelan (gmln.4), Sounds 03 | **archiviert**; Doc „04a“ angelegt (Doc 04 selbst unverändert, Docs-Connector fehlte); Sounds-Dateien liegen in `MMM-sounds` |
| My Audio Progs – Clock etc. | `claude/cool-galileo-xmtta5` (gemergt) | native (mmm-clock, age12, pc-control), FM-1-Editor, Pro-800-Editor, tests, `MMM-HANDOVER.md` | **archiviert**; letzter Stand: Pro-800-Editor v2.0 auf `main`, Tests grün (laut Session) |
| MMM | `claude/bitte-pushen-qa8ae4` | gran2: Web-App v2.3 fertig auf `main`; Max-for-Live-Variante (offline) im Bau, Stand v0.5.5, Dateien auf diesem Branch unter `native/gran2-m4l/`; außerdem gmln.4 v1.0 bis v1.3 | **archiviert** (vom Owner am 02.10.2026 nur kurz reaktiviert, um die Max-for-Live-Dateien zu sichern; kommt wieder ins Archiv); offen: Owner-Test der Max-for-Live-Variante v0.5.5 in Live |
| VJ Tools Kategorie | `claude/vj-tools-kategorie-xg05pr` (hinter `main`) | VJ-Tools-Rack | nicht abgestimmt, nicht Teil der aktuellen Arbeit (Owner, 02.10.2026) |
| Enkidu-rankX | `claude/kind-davinci-31302a` | nicht MMM-bezogen (Typografie-Artefakte), eigene Umgebung | nicht abgestimmt, nicht Teil der aktuellen Arbeit (Owner, 02.10.2026) |

**Archivierte Sessions können nicht antworten.** Am 02.10.2026 hat der Owner die übrigen Sessions stillgelegt; „MMM“ war nur kurz reaktiviert, um die Max-for-Live-Dateien zu sichern. Aktiv ist die Master-Session; „VJ Tools“ und „Enkidu-rankX“ gehören nicht zur aktuellen Arbeit. Die Bereiche der archivierten Sessions (Hub-Apps, `native/`, gran2, gmln.4, `MMM-HANDOVER.md`, Sound Library) bearbeitet sie nur auf Anweisung des Owners.

Pausiert, keiner arbeitet daran: Koto und Shamisen (Karte 02). Dateien: Repo `enkidurankx/MMM-sounds`, Ordner `sound_library/_Sound Collection Asia/MMM-Japan/` und `tools/saiten-baustelle/`; im dortigen Inventar mit Status „pausiert“.

## Gemeinsame Dateien — wem gehören sie

| Datei | Verantwortlich | Regel |
|---|---|---|
| `index.html` (Hub) | alle | nur die **eigene Kachelzeile** ändern, vorher frisch holen, Symbol eindeutig (Latin-1 oder Block Elements), keine Umformatierung |
| `MMM-HANDOVER.md` | bisher Session „My Audio Progs“ (archiviert), jetzt: die Session, die der Owner dafür benennt | Änderungen klein halten, Absprache mit dem Owner |
| `MMM-SOUNDS-HANDOVER.md` | Sound-Sessions | **liegt im Repo `enkidurankx/MMM-sounds`**, nicht mehr hier; dort Ergänzungen anhängen, Nummern und Konventionen nicht ändern |
| `sound_library/inventory.csv` | Sound-Sessions | **liegt im Repo `MMM-sounds`**; mit `tools/build_inventory_presets.py` aus `sound_library/` erzeugen, nicht von Hand ändern; Karten 00 bis 03 nicht umnummerieren, neue ab 04 |
| `MMM-SESSIONS.md` | alle | Tabelle und Log pflegen |

## Regeln

1. **Nach `main` nur auf ausdrückliche Anweisung des Owners.** Kein PR ohne Auftrag.
2. **Vor jeder Arbeit** `git fetch` und `main` in den eigenen Branch holen. Vor jedem Merge nach `main` wieder: ist `main` weitergezogen, erst mergen, dann pushen.
3. **Eigene Lane einhalten.** Fremde Dateien nur ändern, wenn der Owner es sagt oder die Absprache hier steht. Betrifft deine Arbeit eine fremde Lane, trag eine Notiz im Abschnitt „Offene Absprachen“ ein statt zu ändern.
4. **Nach jedem Merge auf `main`** eine Zeile im Log unten ergänzen (Datum, Session, Commit, was).
5. **Nichts als geprüft ausgeben**, was nicht in Live, am Gerät oder im Browser getestet wurde. Status „berechnet“ bleibt, bis der Owner es gehört hat.
6. **Binärdateien** (`.adv`, `.syx`, `.zip`) nicht über Drive-MCP schreiben (Kopierfehler); per Download-Karte an den Owner. Texte und kleine JSONs gehen.
7. **Eigene Vorlagen des Owners:** `Operator.adv`, `Collision.adv`, `Tension.adv` liegen in `MMM-sounds/templates/`, nicht hier. `Tension_Multichain.adg`, `Played_12.als` u. a. muss der Owner bei Bedarf hochladen.
8. **Sounds gehören ins Repo `enkidurankx/MMM-sounds`**, nichts Sound-Bezogenes (Presets, Skripte, Übergabe, Inventar) in dieses Repo. Hub-Kacheln und Apps (z. B. Volca-Drum-Organizer, gmln.4, tko.4) bleiben hier. Die Sichtbarkeit von `MMM-sounds` ist ungeklärt (ließ sich ohne Anmeldung klonen); der Owner prüft sie. Bis dahin dort nichts ablegen, was nicht öffentlich sein darf.

## Offene Absprachen

- **Cool-galileo ↔ main:** Erledigt am 02.10.2026 auf Anweisung des Owners: Branch komplett nach `main` gemergt (native/pc-control, tests/, native/README.md, neuere `MMM-HANDOVER.md`).
- **Doc 04 (Gamelan, Drive):** Erledigt als Zusatz-Doc „04a“ (Doc 04 unverändert).
- **Sichtbarkeit `MMM-sounds`:** offen, der Owner prüft in GitHub (*Settings → General → Danger Zone*). Ist es öffentlich, liegen auch die Ableton-Vorlagen offen.
- **gran2 Max for Live (v0.5.5):** Die Web-App gran2 v2.3 ist fertig (`gran2-v2_3.html` auf `main`). Die Max-for-Live-Variante läuft offline und ist noch im Bau; Owner-Test von v0.5.5 in Live offen, Code und Gerät liegen auf dem Branch `claude/bitte-pushen-qa8ae4` unter `native/gran2-m4l/` (Commit `c3fac4d`, `.amxd`, Generator `build_gran2_v055.py`, Zip, README „v0.5.5, in Live nicht getestet“); **nicht auf `main`**. Der Branch ist weit hinter `main`, deshalb nicht als Ganzes mergen, sondern nur den Ordner übernehmen. Ein Tester-Ergebnis nimmt die Master-Session auf.
- **Symbole im Hub:** aktuell alle eindeutig. Wer ein neues vergibt, prüft vorher mit `grep -o 'sym: "[^"]*"' index.html | sort | uniq -d`.

## Log (neueste oben)

- 02.10.2026 · Master-Session (im Auftrag des Owners) · `main` `07a421b` und `72da4fc` (Fast-Forward, ohne PR) · `07a421b`: Sessions-Tabelle (gran2 getrennt in Web-App und Max-for-Live, „MMM“ wieder archiviert, VJ Tools und Enkidu-rankX nicht Teil der aktuellen Arbeit). `72da4fc`: Hub, Tab „Utility“ → „Div“, Gruppe „Utility“ → „Mental“ (nur zwei Textzeilen in `index.html`, Kennung `utility` unverändert); im Headless-Browser geprüft, nicht auf dem Handy, Live-Seite nicht geprüft. Dazu: `MMM-HANDOVER.md` auf den Hub-Stand und `native/pc-control` („on `main`“) berichtigt.
- 02.10.2026 · Master-Session (im Auftrag des Owners) · Branch `claude/bitte-pushen-qa8ae4`, Commit `c3fac4d` (von der Session „MMM“, nicht auf `main`) · gran2-Max-for-Live v0.5.5 gesichert: `native/gran2-m4l/` mit `.amxd`, Generator, Zip, README. Inhalt der Binärdateien von mir nicht gegen die Originale verglichen (sha256 nicht geprüft). „MMM“ wird laut Owner wieder archiviert.
- 02.10.2026 · Master-Session (im Auftrag des Owners) · Branch `claude/upbeat-ptolemy-mrefn1` (nicht auf `main`) · Tabelle berichtigt: „MMM“ wieder aktiv; „VJ Tools“ und „Enkidu-rankX“ nach Angabe des Owners nicht Teil der aktuellen Arbeit, ohne Statusaussage. Session „MMM“ per Nachricht beauftragt, die gran2-Max-for-Live-Dateien nach `native/gran2-m4l/` auf ihrem Branch zu legen; Ergebnis noch nicht gelesen.
- 02.10.2026 · Master-Session (im Auftrag des Owners) · `main` `ed167ca` (Fast-Forward, ohne PR) und `MMM-sounds` `d34fd40` (PR #1 gemergt) · Master-Session eingetragen, übrige Sessions laut Owner archiviert; Pfade auf die neue Struktur von `MMM-sounds` angepasst (`sound_library/`, `tools/`, `docs/`). Ältere Log-Einträge nennen bewusst die damaligen Pfade `presets/` und `sounds-library/`.
- 02.10.2026 · Sound-Session (im Auftrag des Owners) · Sessions-Tabelle aktualisiert: Gamelan, My Audio Progs und MMM sind archiviert, Lanes ohne Eigentümer, VJ Tools und Enkidu-rankX nicht abgestimmt.
- 02.10.2026 · Sound-Session (im Auftrag des Owners) · `MMM-sounds` `1cce4cd`, `429c16f` · Ordner `_Sound Collection Asia` und `_Sound Collection Drums` des Owners nach `presets/` importiert, altes `presets/03-gamelan` ersetzt; Inventar mit Pfaden und Handover dort nachgezogen. Hier: `MMM-SESSIONS.md` angepasst (Tabellen, Regel 8, offene Absprachen).
- 02.10.2026 · My Audio Progs · Pro-800-Editor v2.0 (neuer Stil, grafische VCF/VCA-Hüllkurven, Randomize-Stufen, Undo, LIVE, kein Web-Font) nach `main`; Kachel PRO-800, Weiterleitung und `tests/pro800-editor/` angepasst, v1.8 entfernt.
- 02.10.2026 · Gamelan-Session · (dieser Commit) · Auf Anweisung des Owners: `sounds-library/` und `MMM-SOUNDS-HANDOVER.md` aus dem öffentlichen `main` entfernt. Sie liegen jetzt im privaten Repo `enkidurankx/MMM-sounds` (1:1-Kopie, vorher verglichen). Verweise auf `sounds-library/` in den Tabellen oben gelten dort. Die Historie davor bleibt öffentlich.
- 02.10.2026 · Gamelan-Session · Branch `claude/elegant-maxwell-yise0m` (nicht auf `main`) · Drive: neues Doc „04a Gamelan: Nachtrag zu gmln.4 v2.0“ (Doc 04 unverändert, Docs-Connector fehlte, daher als Zusatz-Doc angelegt).
- 02.10.2026 · Sound-Session (im Auftrag des Owners) · Merge `claude/cool-galileo-xmtta5` → `main` · `native/pc-control`, `native/README.md`, `tests/fm1-editor`, neuere `MMM-HANDOVER.md`; Abschnitt „Branch vs main“ der Handover angepasst.
- 02.10.2026 · My Audio Progs · `c9f1f51` · `native/age12/` (C++-Kern, Max-for-Live-Gerät, Skripte) nach `main`; bewusst nicht im Hub verlinkt.
- 02.10.2026 · My Audio Progs · `426a50a` · `native/mmm-clock/` (macOS-MIDI-Clock, Pin „Always on top“, Compact-Modus) und Workflow `mmm-clock.yml` nach `main`; bewusst nicht im Hub verlinkt.
- 30.09.2026 · My Audio Progs · `8d5e557` bis `4edef28` · FM-1-Editor v1.4 bis v1.17 einzeln veröffentlicht (je neue Datei, Kachel `fm1-editor` und Weiterleitung); aktuell v1.17.
- 02.10.2026 · Sound-Session · `99c7288` · Übergabe aktualisiert, Session-Abstimmung angelegt.
- 02.10.2026 · Sound-Session · `bccc525` · Abgleich: Sounds 03, Inventar, Handover, Hub-Symbole, rb88-Altversionen gelöscht, Saiten-Baustelle als Ordner.
