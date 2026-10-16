# Messwerkzeug für cybersynth

Playwright-Skripte (Chromium) für die Prüfungen. Alles ist **Messung, nicht gehört**.

## Einrichten
- Tailwind lokal holen: `curl -sSL https://cdn.tailwindcss.com/3.4.17 -o /tmp/tw.js` (oder `TW_JS=pfad`)
- Playwright liegt in `/opt/node22/lib/node_modules/playwright` (Pfad oben in den Skripten)
- Ausgaben (Bilder, `*.jsonl`) in ein Verzeichnis außerhalb des Repos legen (`OUT=...`)

## Skripte
- `run_topo.js <datei> <out.jsonl> <topologien,..> <sekunden>`: Lauf je Topologie (Pegel, Spitzen, Spektrum, tot, Eingriffe)
- `run_storm.js <datei> <out.jsonl> <topologie> <anzahl> <sekunden> <startseed>`: Zufallseinstellungen
- `storm_show.py <out.jsonl>`: Auswertung mit Flags (WHISTLE, SUBTONE, LOUD, LIM, DC, DEAD)
- `run_fx.js <datei> <out.jsonl> <topologie>`: 31 Effekt-Kombinationen
- `run_ui.js <datei>`: Oberfläche (9 Breiten, Überlauf, Regler, 60 fps)
- `run_theme.js`: Tag/Nacht, Textkontrast, Bilder
- `run_perf2.js`, `run_abl.js`: Audio-Last (Offline-Render) und Abschalt-Versuche
- `run_off.js`: echtes Ausschalten und Wiederstarten (alle Topologien, Effekte bleiben)
- `run_reset.js`: "Alles neutral" und die untere Leiste
- `run_click.js`: Klicks beim Ein- und Ausschalten von Effekten
- `run_lfo.js`, `run_eng.js`, `run_main.js`, `run_lf.js`: LFO/Pan, Topologien umschalten, Haupt-Thread-Zeit, Schutz
- `lib.js`: wird in die Seite eingefügt (Aufnahme und Analyse)

Hinweis: die Skripte suchen die App unter `/home/user/MMM/`. Standard ist `cybersynth-v0_69.html`, andere Datei mit `FILE=...` oder als erstes Argument (je nach Skript). Die Datei darf während eines Laufs nicht umbenannt werden.
