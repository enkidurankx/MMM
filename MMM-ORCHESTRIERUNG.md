# 🧭 Orchestrierung MMM (Übergabe an die lokale Session)

Stand: 31.10.2026, `main` = `d6a9366`. Für eine Session auf übergeordneter Ebene: Überblick, Regeln, Dateien, offene Punkte.

## 🛑 Zuerst lesen (in dieser Reihenfolge)
1. `CLAUDE.md` (Antwortstil und feste Regeln, gilt für jede Session)
2. `MMM-HANDOVER.md` (wie die Sammlung gebaut und veröffentlicht wird)
3. `MMM-SESSIONS.md` (Log, neueste oben; dazu die Tabellen der Apps)
4. Je Arbeitsbereich: `MMM-UEBERGABE-cybersynth.md`, `native/README.md`, `tests/cybersynth-audit/README.md`

## 👤 Owner und Stil
- Owner schreibt **Deutsch**. Antwortstil steht verbindlich in `CLAUDE.md` (Stand 18.10.2026): Ergebnis, Was jetzt, Frage; kurze Sätze; nur ✅ ⚠️ ❌ als Symbole.
- Tippfehler nicht korrigieren und nicht erwähnen.
- Details, Beweise, lange Analysen in eine Datei (`MMM-SESSIONS.md`), im Chat nur ein Satz.
- Persönliche Hinweise gehören **nie** in dieses öffentliche Repo.

## 🧩 Was MMM ist
- Sammlung von **Einzeldatei-Apps** (HTML, Web Audio, alles inline, kein Build, kein Netz zur Laufzeit), gebaut für das Handy.
- Veröffentlichung: GitHub Pages, Hub `https://enkidurankx.github.io/MMM/`, Repo `enkidurankx/MMM` (öffentlich), Branch `main`.
- Zusätzlich Repo `enkidurankx/mmm-sounds` (Klangmaterial; in dieser Session nicht bearbeitet).
- Hub-Tabs: `audio` · `visual` · `utility` (Mental/Tools). Hub-Datei `index.html`, `ICON_OF` nicht ändern.

## 🔀 Die drei Cloud-Sessions
| Session | Bereich | Branch | Dateien |
|---|---|---|---|
| **Audio** (Haupt) | Tab `audio`: Drums/Synths, Experimental Sound (cybersynth, vink, homoeo, serge, lattice, knot, lichen, creak, entropy), Sample/FX, Editors | `claude/affectionate-davinci-1febxv` | `cybersynth-v*.html` u. a. |
| **Tools** | Tab `utility`: Mental (FOCUS, mind[S\|H]cape), Tools (desk.8) | eigener Branch (`ccr-…`) | `focus-v*.html`, `mindscape-*`, `desk8-*` |
| **Native** | alles unter `native/`: Max for Live, mmm-clock, Offline-Apps, Vocal Chopper | eigener Branch, startet auf `main` | `native/**` |
- Tab `visual` gehört keiner Session fest: vor der Arbeit beim Owner klären.
- Jede Session ändert nur **ihre** Dateien. Gemeinsam genutzt, nur minimal ändern: `index.html`, `MMM-SESSIONS.md`.
- `.gitattributes`: `MMM-SESSIONS.md merge=union` (beide Seiten behalten).
- Der Branch `claude/max4live-vocal-chopper-yowsvf` gehört der Native-Session: nicht ändern, nicht mergen, nicht löschen.

## 📏 Feste Regeln (alle Sessions)
- 👉 Auf `main` nur nach ausdrücklichem **"Push"** des Owners: `git fetch origin main`, mergen, `git push origin HEAD:main`, Arbeits-Branch mitpushen. Kein Pull Request ohne Auftrag.
- 🔧 Jede App-Änderung: **Version hochzählen** (`git mv` der Datei, Hub-Kachel `ver:` und `ziel:` in `index.html`, Weiterleitung `<app>/index.html`) und **Eintrag in `MMM-SESSIONS.md`** (neueste oben, unter "Log").
- ⚠️ Nie behaupten, etwas sei gehört oder am Gerät getestet. Messungen sind Chromium-Messungen ("nicht gehört").
- Live-Seite erst prüfen, wenn der Owner "Ja" sagt.
- Commit-Zeilen am Ende: `Co-Authored-By` und `Claude-Session` (je Session eigener Link).
- Destruktive Git-Aktionen (Branch löschen) macht der Owner selbst (auf GitHub) oder gibt eine Berechtigung.

## 🌿 Branches (Stand)
- `main`: Wahrheit. Zuletzt cybersynth v0.82, FOCUS v5.31, rb.88 v4.30, Chords v19, chop.4 v0.6, Foundry v1.1, Volca Drum v0.2, Sp&Sp (Sprecher-Liste für Android), DENKI v2.0 (neu, 27.10.), rm.chain v0.6 (neu, 28.10., Experimental), StageSync v4.59 (Beta, 30.10., Tab `visual`, gebaut von der Audio-Session im Auftrag des Owners). Seit 27.10.: Lizenz GPL-3.0-or-later (`LICENSE`, `README.md`, Link in der Hub-Fußzeile).
- Master-Session (Orchestrierung): `claude/upbeat-ptolemy-mrefn1`, aktiv, auf Stand `main`.
- Aktiv: `claude/affectionate-davinci-1febxv` (Audio), Tools-Branch `ccr-563cc016-9zeia6` (FOCUS), Native-Branch `ccr-da11a50e-klhns5` (chop.4). Stand 31.10.2026: Audio ganz in `main` (DENKI-`.ascl`-Dateien kurz auf `main`, dann zurückgenommen: nur als Download, nicht im Repo), Native 4 voraus (Max-for-Live-Gerät MMM Ring Mod unter `native/max-for-live/ring-mod/`; chop.4-Kachel entfernt und wieder zurück), Tools ganz in `main`.
- Alt, nicht gelöscht (Owner entscheidet, ohne Rechte nicht löschbar): ganz in `main`: `claude/elegant-maxwell-yise0m`, `claude/vj-tools-kategorie-xg05pr`, `ccr-2fa452eb-qj035b`. Noch Commits voraus (vor dem Löschen ansehen): `claude/bitte-pushen-qa8ae4` (1), `claude/cool-galileo-xmtta5` (2), `claude/max4live-vocal-chopper-yowsvf` (2, gehört der Native-Session).
- Prüfen vor dem Löschen: `git log origin/main..origin/<branch>` (leer = alles schon in `main`).

## 📂 Dateien (Überblick)
- Apps: `<name>-v<major>_<minor>.html` im Stamm, plus Ordner `<name>/index.html` als Weiterleitung auf die aktuelle Version.
- `index.html`: Hub (Kacheln mit `ver:`, `ziel:`, Tabs).
- `feedbacks/`: gemeinsame Shell für vink, homoeo, chua.
- `native/`: getrennt von Hub und Veröffentlichung (siehe `native/README.md`).
- `tests/cybersynth-audit/`: Messwerkzeug (Playwright/Chromium, Tailwind lokal holen, siehe README).
- `tests/smoke/`: Prüfskript für alle Apps aus dem Hub (liest nur, Chromium, siehe README).
- Berichte: `MMM-AUDIT-AUDIO.md` (Vorschläge Audio-Apps), `MMM-ANALYSE-VHRWERK.md` (Ideen aus den Vhrwerk Soft Tools).

## 🎛️ Stand cybersynth (Audio-Session)
- Aktuell **v0.82** (auf `main`). Seit v0.74: fünfter Kanal (5x5, v0.76), dezenter Analog-Charakter und Kanaltypen (v0.77, v0.79), VU in dB und schneller (v0.78, v0.82), Fix für gespeicherte Vier-Kanal-Zustände (v0.80), Minimum-Presets und festes Spektrum (v0.81). Davor: Seit v0.59: Tag/Nacht-Theme, LFO-Routing und Position pro Kanal, Layouts, Knot/Lattice als Topologien, Gesamtprüfung (Wächter, Pegelmessung), Leistungsgate im Leerlauf, echtes Audio-Aus, "Alles neutral", sanfte Presets (v0.71), tiefere Basisfrequenzen und Regler-Fix (v0.72), rekursive zweite Faltung "Tiefe" (v0.73).
- Details und Messwerte: `MMM-SESSIONS.md` (Einträge v0.50 bis v0.82) und `MMM-UEBERGABE-cybersynth.md` (Signalweg, Wächter, Gates; Stand dort v0.69).
- Offene Ideen: Topologien lichen/creak, entropy als Bus-Effekt, Lattice mit halber Rate (Handy), UI für bessere Lesbarkeit (Farbe nur bei aktiven Reglern, größere 9-px-Schrift, Wert beim Drehen groß, Ruhe-Modus, Kontrast normal/hoch), Spar-Variante für "Tiefe".
- Nie gehört: Klang von Knot, Lattice, kreisenden Positionen, Tiefe, Tag/Nacht am Handy, fünfter Kanal, Kanaltypen.

## ❓ Offen auf Orchestrierungs-Ebene
- Alte Branches aufräumen (Owner).
- Tab `visual`: Zuständigkeit klären; Samsung-Notizen und StageSync-Thema gehören dorthin. Seit 29.10.2026 arbeitet die Audio-Session im Auftrag des Owners an StageSync (v4.36 bis v4.59; Ideen für später im Log von `MMM-SESSIONS.md`).
- Versionsnummern: bei zwei Sessions in derselben App vorher absprechen (zweite Session z. B. ab v0.80).
- Live-Seite nach jedem Push nur auf "Ja" prüfen.
- chop.4 (`chop-v0_*.html`) liegt im Tab `audio` (Samplers), gehört aber der Native-Session. v0.4 bis v0.6 hat die Audio-Session im Auftrag des Owners gebaut. Wer künftig daran arbeitet, klärt der Owner.

## 🧪 Wenn die lokale Session eingreift
- Erst `git fetch --all` und `git log --oneline -10 origin/main`, dann `MMM-SESSIONS.md` oben lesen.
- Sessions nicht in ihre Dateien hinein ändern; Absprachen über `MMM-SESSIONS.md` oder über `send_message` an die Session-ID.
- Konflikte in `index.html` und `MMM-SESSIONS.md`: beide Seiten behalten.
