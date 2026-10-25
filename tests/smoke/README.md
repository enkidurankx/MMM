# MMM smoke test

Lädt jede App des Hubs in Chromium (390 px breit, dann 320 px) und prüft, was alle Apps gemeinsam haben. Es ändert nichts.

```
PW=/opt/node22/lib/node_modules/playwright node tests/smoke/smoke.js
```

Optionen: `--tab audio|visual|utility|all` (Standard `audio`), `--apps rb88,vink` (nur diese), `--json datei.json`, `--strict` (auch Warnungen sind ein Fehler).
`MMM_TAILWIND=/pfad/tailwind.js` liefert diese Datei anstelle des Tailwind-CDN (die Anfrage wird trotzdem gezählt), damit cybersynth beim Prüfen gestaltet ist.

## Was geprüft wird

Harte Fehler (Exit-Code 1):
- Seite lädt nicht oder wirft einen Skriptfehler
- Anfrage nach außen (Schrift, CDN, alles mit `http`)
- Ton-Kontext läuft schon vor der ersten Berührung
- Seitliches Scrollen bei 320 px
- Datei oder Weiterleitung (`<app>/index.html`) fehlt oder zeigt auf eine andere Datei als der Hub

Warnungen:
- Konsolenfehler
- Text unter 12 px (und wie viele unter 10 px)
- Kontrast unter 5:1 (Näherung: Texte auf Farbverlauf oder Bild werden nur zum Teil gerechnet)
- Version im Titel oder Text weicht vom Hub ab
- Pinch-Zoom abgeschaltet, kein Titel

## Stand 25.10.2026 (Audio-Tab, 27 Apps)

7 harte Fehler, 74 Warnungen.

| App | Harter Fehler |
|---|---|
| cybersynth | Tailwind vom CDN |
| Sp&Sp (speaknspell) | Google-Schrift, seitliches Scrollen bei 320 px (77 px) |
| μFREAK (microfreak-editor) | Google-Schrift |
| Chords (vell-chord-builder) | Google-Schrift |
| FM-1 (fm1-editor) | seitliches Scrollen bei 320 px (25 px) |
| Volca Drum (volcadrum-editor) | seitliches Scrollen bei 320 px (124 px) |

Außerdem: rec.4D zeigt im Text Version 2.2, der Hub 2.6.
