# Platzplan — Projektstand

**Stand:** 2026-10-03
**Datei:** `platzplan-prototyp.html` (Single-File, läuft offline im Browser)
**Zweck:** Buchungs-Tool, mit dem sich Mitarbeiter eines Büros abstimmen, wer wann welchen Platz nutzt.

---

## Ausgangslage

- 1 Büro, 13 Mitarbeiter, 8 Plätze.
- **4 feste Plätze** (1–4): immer verfügbar.
- **4 Zusatzplätze** (5–8): nur an 2 festgelegten Wochentagen verfügbar.
- Plätze werden **halbstundenweise** vergeben, nicht tageweise.
- Nutzung **primär auf dem Smartphone**, übers Internet.
- Es wurde vorab eine fertige App getestet — nicht zufrieden → Eigenbau.

---

## Aktueller Stand (Prototyp)

Funktionierender Frontend-Prototyp, Mobile-First. Bedienung:

- **Wochentag antippen** (Mo–Fr als Kacheln, Pfeile für andere Wochen).
- **Tagesübersicht**: jeder Platz = ein kompakter Balken über den ganzen Tag; belegte Zeiten als farbige Blöcke. Alle 8 Plätze auf einen Blick, kein langes Scrollen.
- **Buchen** über Button unten → Fenster von unten mit **Platz · Von · Bis** + Schnell-Dauern (30 Min / 1 / 2 / 4 Std).
- Überschneidungen werden erkannt und blockiert.
- **Meine Buchungen** als Liste mit „Löschen".
- Namensauswahl per Dropdown (kein Login).

**Gestaltung:** feste Plätze = Teal, Zusatzplätze = Amber (Farbe trägt Bedeutung). Rote Linie = aktuelle Uhrzeit.

**Konfigurierbar (in den Einstellungen):** Büro-Name, Öffnungszeiten (von/bis), die 2 Zusatztage, Mitarbeiter-Namen.

---

## Wichtige Einschränkung

- Prototyp speichert **nichts** — Daten sind beim Neuladen weg, kein geteilter Stand zwischen Nutzern.
- Dient nur dazu, die **Bedienung** zu testen, bevor die Technik dran kommt.

---

## Offene Entscheidungen

- Schnell-Dauern: 30 Min / 1 / 2 / 4 Std passend, oder andere?
- Fremde Namen auf den Balken zeigen (aktuell ja), oder nur Farbe/„belegt" und Name erst auf Tipp?
- Optional: Höchstdauer pro Person, keine Buchung in der Vergangenheit.

---

## Nächster Schritt

Wenn die Bedienung sitzt: **gemeinsamer Datenstand übers Internet.**

- **Frontend** statisch hosten (Netlify / Cloudflare Pages / GitHub Pages) → eigene URL.
- **Supabase** (Free-Tier) als Datenbank + fertige API → praktisch kein eigenes Backend-Code.
- Ergebnis: für alle 13 live nutzbar, DSGVO-tauglich, Layout/Regeln 100 % eigen.

---

## Technik

- Single-File HTML/CSS/JS, keine externen Abhängigkeiten (Prototyp).
- Buchungsraster intern: 30-Minuten-Slots je Platz und Tag.
