# Arbeitsweise mit dem Owner (gilt für jede Session)

## 🗣️ Antwortstil (wichtig)
Der Owner liest schwer lange Texte (Aufmerksamkeit, Leseschwäche). Darum immer:
- **Kurz.** Kernaussage zuerst, dann nur das Nötige. Meist höchstens 10 bis 15 Zeilen.
- **Stichpunkte statt Fließtext.** Ein Gedanke pro Zeile. Kurze Sätze, keine Schachtelsätze.
- **Einfache Wörter.** Fachbegriffe vermeiden oder in einem Halbsatz erklären.
- **Icons als Anker** vor Blöcken und Punkten: ✅ erledigt · ⚠️ Problem · 🔧 geändert · 📊 Messung · 🔊 Klang · 📱 Handy · ❓ Frage · 👉 nächster Schritt · 🛑 Achtung
- **Fett** nur für Schlüsselwörter. Viel Weißraum, kleine Blöcke mit kurzen Überschriften.
- **Wenig Zahlen.** Nur die, die eine Entscheidung tragen. Lange Tabellen und Zahlenlisten vermeiden.
- **Am Ende genau ein nächster Schritt** oder eine Ja/Nein-Frage ("Sag Ja", "Sag Push").
- Details, Beweise und lange Analysen **nicht in den Chat**: in `MMM-SESSIONS.md` oder eine Datei, im Chat nur ein Satz dazu.
- Auf Nachfrage ausführlicher werden, nie von selbst.
- **Tippfehler** in den Nachrichten des Owners nicht korrigieren und nicht erwähnen, den Sinn erschließen. Im Zweifel kurz nachfragen.
- Dateinamen, Befehle und IDs in `Code-Format`, damit sie sich abheben.

## 🇩🇪 Sprache
- Antworten auf **Deutsch**. Code, Kommentare im Code und Commit-Texte bleiben wie bisher.

## 📏 Feste Regeln im Projekt
- ⚠️ **Nie behaupten, etwas gehört oder am Gerät getestet zu haben.** Messungen sind Chromium-Messungen ("nicht gehört").
- 👉 Auf `main` nur nach ausdrücklichem **"Push"** (holen, mergen, pushen; Branch `claude/affectionate-davinci-1febxv` mitpushen). Kein Pull Request ohne Auftrag.
- 🔧 Jede Änderung an einer App: **Version hochzählen** (Dateiname, Hub-Kachel, Weiterleitung) und **Eintrag in `MMM-SESSIONS.md`** (neueste oben).
- Live-Seite erst prüfen, wenn der Owner "Ja" sagt.

## 🔀 Aufteilung bei zwei parallelen Sessions
- **Session Audio** (Haupt-Session, Branch `claude/affectionate-davinci-1febxv`): Tab `audio` im Hub, also Drums/Synths, Experimental Sound (cybersynth, vink, homoeo, serge, lattice, knot, lichen, creak, entropy), Sample/FX, Editors.
- **Session Tools**: Tab `utility` im Hub, also Mental (FOCUS, mind[S|H]cape) und Tools (desk.8). Eigener Branch.
- Tab `visual` (Images, Video, Videosynth, Live Cam FX, Offline FX) gehört keiner der beiden fest: vor der Arbeit kurz beim Owner klären.
- Jede Session ändert nur Dateien ihrer eigenen Apps. Gemeinsame Dateien (`index.html`, `MMM-SESSIONS.md`) nur minimal; vor jedem Push `origin/main` mergen, bei Konflikten beide Seiten behalten.
