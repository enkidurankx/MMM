# enkidu rankX — tools

Browser-Instrumente als Single-File-HTML. Gehostet über GitHub Pages.

## Einmaliges Setup (~3 Minuten, alles im Browser)

1. Auf github.com → **New repository** → Repo: `MMM`, Public, **Create**
2. **Add file → Upload files** → `index.html`, `README.md` und deine Tool-HTML-Dateien reinziehen → **Commit changes**
3. Repo-**Settings → Pages** → unter "Branch": `main` + `/ (root)` wählen → **Save**
4. Nach ~1 Minute ist alles live unter:
   `https://enkidurankx.github.io/MMM/`

## Neues Tool veröffentlichen

1. HTML-Datei ins Repo hochladen (Add file → Upload files)
2. In `index.html` eine Zeile im `TOOLS`-Array ergänzen:
   ```js
   { file: "mein-tool.html", name: "Mein Tool", desc: "Kurzbeschreibung" },
   ```
   (Direkt auf GitHub editierbar: Datei öffnen → Stift-Symbol → Commit)

Das war's. Kein Build, keine Dependencies, kein Deploy-Schritt — jeder Commit ist sofort live.

## Hinweise

- Dateinamen im `TOOLS`-Array müssen exakt den hochgeladenen Dateien entsprechen
- localStorage, WebMIDI, Web Audio: funktioniert alles normal (GitHub Pages liefert über HTTPS aus)
- Eigene Domain später möglich: Settings → Pages → Custom domain
