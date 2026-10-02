# MMM — Session-Abstimmung

Gemeinsame Regeln und Stand für alle Claude-Sessions, die an diesem Repo arbeiten. **Zuerst lesen, bevor du `main`, `index.html` oder eine Übergabe-Datei anfasst.** Der Owner (enkidu rankX) entscheidet, was auf `main` kommt.

Stand: 02.10.2026, nach `99c7288` auf `main`. Die Spalte „Zuletzt gemeldet“ stammt aus der Session-Liste (Selbstauskunft der Sessions, nicht geprüft).

## Wer arbeitet woran

| Session (Titel) | Branch | Thema | Zuletzt gemeldet |
|---|---|---|---|
| Zentrale Sound library | `ccr-2fa452eb-qj035b` | Sound Library, Karten 00/01, Inventar, Volca-Drum-Organizer, Abgleich | aktiv; Branch = `main` |
| Gamelan-App japanische Variante | `claude/elegant-maxwell-yise0m` | Gamelan (gmln.4), Sounds 03 | fragt: Doc 04 in Drive auf gmln.4 v2.0 bringen? |
| My Audio Progs – Clock etc. | `claude/cool-galileo-xmtta5` | native (mmm-clock, age12, pc-control), FM-1-Editor, tests, `MMM-HANDOVER.md` | wartet auf Owner: welche Teile (PC·CONTROL, tests, native/README, Handover) nach `main`? |
| MMM | `claude/bitte-pushen-qa8ae4` | gran2 (v0.5.5) | wartet auf Owner-Test in Live |
| VJ Tools Kategorie | `claude/vj-tools-kategorie-xg05pr` | VJ-Tools-Rack | „UI cleanup v1.1 published“ (Stand 23.09., Branch laut Zählung hinter `main`) |

Pausiert, keiner arbeitet daran: Koto und Shamisen (`sounds-library/saiten-baustelle/`).

## Gemeinsame Dateien — wem gehören sie

| Datei | Verantwortlich | Regel |
|---|---|---|
| `index.html` (Hub) | alle | nur die **eigene Kachelzeile** ändern, vorher frisch holen, Symbol eindeutig (Latin-1 oder Block Elements), keine Umformatierung |
| `MMM-HANDOVER.md` | Session „My Audio Progs“ | andere nur nach Absprache, Änderungen klein halten |
| `MMM-SOUNDS-HANDOVER.md` | Sound-Sessions | Ergänzungen anhängen, Nummern und Konventionen nicht ändern |
| `sounds-library/inventory.csv` | Sound-Sessions | über Skripte in `sounds-library/tools/` erweitern; Karten 00/01/03 nicht umnummerieren; neue Karte 04 aufwärts, vorher unten eintragen |
| `MMM-SESSIONS.md` | alle | Tabelle und Log pflegen |

## Regeln

1. **Nach `main` nur auf ausdrückliche Anweisung des Owners.** Kein PR ohne Auftrag.
2. **Vor jeder Arbeit** `git fetch` und `main` in den eigenen Branch holen. Vor jedem Merge nach `main` wieder: ist `main` weitergezogen, erst mergen, dann pushen.
3. **Eigene Lane einhalten.** Fremde Dateien nur ändern, wenn der Owner es sagt oder die Absprache hier steht. Betrifft deine Arbeit eine fremde Lane, trag eine Notiz im Abschnitt „Offene Absprachen“ ein statt zu ändern.
4. **Nach jedem Merge auf `main`** eine Zeile im Log unten ergänzen (Datum, Session, Commit, was).
5. **Nichts als geprüft ausgeben**, was nicht in Live, am Gerät oder im Browser getestet wurde. Status „berechnet“ bleibt, bis der Owner es gehört hat.
6. **Binärdateien** (`.adv`, `.syx`, `.zip`) nicht über Drive-MCP schreiben (Kopierfehler); per Download-Karte an den Owner. Texte und kleine JSONs gehen.
7. **Eigene Vorlagen des Owners** (`Operator.adv`, `Collision.adv`, `Tension.adv`, `Tension_Multichain.adg` …) liegen nicht im Repo. Wer sie braucht, fragt den Owner.

## Offene Absprachen

- **Cool-galileo ↔ main:** Der Branch hat `native/pc-control`, `tests/`, `native/README.md`, neuere `MMM-HANDOVER.md` (inkl. aktualisierter Volca-Zeile, Commit `4b4c095`). Der Owner entscheidet, welche Teile nach `main` gehen.
- **Doc 04 (Gamelan, Drive):** noch auf altem Stand, Aktualisierung auf gmln.4 v2.0 offen (Gamelan-Session).
- **gran2 v0.5.5:** Owner-Test in Live offen (Session „MMM“).
- **Symbole im Hub:** aktuell alle eindeutig. Wer ein neues vergibt, prüft vorher mit `grep -o 'sym: "[^"]*"' index.html | sort | uniq -d`.

## Log (neueste oben)

- 02.10.2026 · My Audio Progs · `c9f1f51` · `native/age12/` (C++-Kern, Max-for-Live-Gerät, Skripte) nach `main`; bewusst nicht im Hub verlinkt.
- 02.10.2026 · My Audio Progs · `426a50a` · `native/mmm-clock/` (macOS-MIDI-Clock, Pin „Always on top“, Compact-Modus) und Workflow `mmm-clock.yml` nach `main`; bewusst nicht im Hub verlinkt.
- 30.09.2026 · My Audio Progs · `8d5e557` bis `4edef28` · FM-1-Editor v1.4 bis v1.17 einzeln veröffentlicht (je neue Datei, Kachel `fm1-editor` und Weiterleitung); aktuell v1.17.
- 02.10.2026 · Sound-Session · `99c7288` · Übergabe aktualisiert, Session-Abstimmung angelegt.
- 02.10.2026 · Sound-Session · `bccc525` · Abgleich: Sounds 03, Inventar, Handover, Hub-Symbole, rb88-Altversionen gelöscht, Saiten-Baustelle als Ordner.
