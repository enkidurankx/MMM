# Arbeitsweise mit dem Owner (gilt für jede Session)

## Antwortstil (wichtig, Stand 18.10.2026)
Der Owner möchte kurze, klare Texte. Das gilt für jede Antwort.

- Ergebnis zuerst, in 1 bis 2 Sätzen.
- Kurze Sätze, etwa 15 Wörter. Eine Idee pro Satz.
- Einfache Wörter. Fachwörter nur wenn nötig, einmal erklären.
- Aufzählungen: höchstens 5 Punkte, nicht verschachtelt.
- Absätze: höchstens 2 bis 3 Zeilen.
- Symbole sparsam. Nur ✅ erledigt, ⚠️ Achtung, ❌ geht nicht. Höchstens eines pro Zeile.
- Keine Deko-Icons. Keine Icons vor Überschriften. Überschriften schlicht.
- Fett nur für das Wichtigste. Keine Wörter in Großbuchstaben, keine Kursivschrift.
- Klar sagen, wer was tut: "Du machst X", "Ich mache Y".
- Immer gleiche Reihenfolge: **Ergebnis**, **Was jetzt**, **Frage**.
- Höchstens eine Frage am Ende. Höchstens 3 nummerierte Optionen (1, 2, 3), Empfehlung zuerst.
- Details nur auf Nachfrage. Lange Berichte als Datei (z. B. `MMM-SESSIONS.md`), im Chat eine kurze Zusammenfassung.
- Befehle in einem eigenen Codeblock, ein Befehl pro Block. Dateinamen und IDs in `Code-Format`.
- Tippfehler in den Nachrichten des Owners nicht korrigieren und nicht erwähnen. Im Zweifel kurz nachfragen.

Beispiel:

**Ergebnis**
cybersynth v0.74 ist auf dem Branch.

**Was jetzt**
- Du musst nichts tun.
- Ich warte auf "Push".

**Frage**
Soll es auf `main`?
1. Ja, Push
2. Erst noch ändern

## Sicherheit
- Nichts endgültig löschen. Vorher eine Sicherung (z. B. ein Tag), dann nur der Owner löscht.
- Nichts Dauerhaftes (Zugänge, Schlüssel, Berechtigungen, Automatik) ohne ausdrückliches Ja des Owners im selben Chat.
- Keine Zugangsdaten und keine persönlichen oder gesundheitlichen Angaben in dieses öffentliche Repo, in Berichte oder Commits.

## Sprache
- Antworten auf **Deutsch**. Code, Kommentare im Code und Commit-Texte bleiben wie bisher.

## Feste Regeln im Projekt
- **Nie behaupten, etwas gehört oder am Gerät getestet zu haben.** Messungen sind Chromium-Messungen ("nicht gehört").
- Auf `main` nur nach ausdrücklichem **"Push"** (holen, mergen, pushen; Branch `claude/affectionate-davinci-1febxv` mitpushen). Kein Pull Request ohne Auftrag.
- Jede Änderung an einer App: **Version hochzählen** (Dateiname, Hub-Kachel, Weiterleitung) und **Eintrag in `MMM-SESSIONS.md`** (neueste oben).
- Live-Seite erst prüfen, wenn der Owner "Ja" sagt.

## Aufteilung bei zwei parallelen Sessions
- **Session Audio** (Haupt-Session, Branch `claude/affectionate-davinci-1febxv`): Tab `audio` im Hub, also Drums/Synths, Experimental Sound (cybersynth, vink, homoeo, serge, lattice, knot, lichen, creak, entropy), Sample/FX, Editors.
- **Session Tools**: Tab `utility` im Hub, also Mental (FOCUS, mind[S|H]cape) und Tools (desk.8). Eigener Branch.
- **Session Native**: alles unter `native/` (Max for Live, mmm-clock, Offline-Apps, Vocal Chopper). Eigener Branch, startet auf `main`. Der Vocal Chopper liegt noch im Branch `claude/max4live-vocal-chopper-yowsvf`; die Native-Session holt ihn von dort in den eigenen Branch (`git checkout origin/claude/max4live-vocal-chopper-yowsvf -- native/max-for-live/vocal-chopper`). Audio- und Tools-Session lassen `native/` und diesen Branch unangetastet: nicht ändern, nicht mergen, nicht löschen.
- Tab `visual` (Images, Video, Videosynth, Live Cam FX, Offline FX) gehört keiner der beiden fest: vor der Arbeit kurz beim Owner klären.
- Jede Session ändert nur Dateien ihrer eigenen Apps. Gemeinsame Dateien (`index.html`, `MMM-SESSIONS.md`) nur minimal; vor jedem Push `origin/main` mergen, bei Konflikten beide Seiten behalten.
