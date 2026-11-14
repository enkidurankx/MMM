# StageSync · Sicherheitsprüfung v4.61

Stand 14.11.2026 · geprüft: `stagesync-v4_61.html` (484 KB, eine Datei) · Session Tools
Methode: Code gelesen (Suche nach riskanten Mustern) und Tests in Chromium mit Handy-Einstellungen. Nicht auf einem Telefon getestet.
Der Code wurde bei dieser Prüfung **nicht verändert**.

## Stand, Geprüft, Offen

- **Stand:** fertig. Keine Lücke gefunden.
- **Geprüft:** siehe Tabelle. Alle Punkte habe ich selbst laufen sehen (Stufe "Ergebnis gesehen").
- **Offen:** Handy-Geräte (Samsung), Safari/iPhone, echter Export einer Videodatei, die Live-Seite auf GitHub Pages.

## Was geprüft wurde

| Bereich | Befund | Wie geprüft |
|---|---|---|
| Daten nach außen | Im eigenen Code kein `fetch`, XHR, WebSocket, `sendBeacon`, EventSource, `importScripts`, Service Worker. | Mustersuche im Code |
| Schutzregel (CSP) wirkt | Abruf, Skript, Bild und Beacon an `example.com` wurden alle von der Schutzregel blockiert (5 Verstöße gemeldet, 0 Antworten). | Test in Chromium |
| Einschleusen von Code | Nur 7 Stellen mit `innerHTML`, alle setzen feste Icons. Keine Inline-Handler im Markup. Kein `eval`, `new Function`, `document.write`. | Mustersuche |
| Einschleus-Test | Fünf Angriffstexte (`<img onerror>`, `<script>`, `<svg onload>`, `javascript:`) im Dateinamen des Songs, im Songnamen, im Namen, im Songtext (Eingabe und Datei): 0 Ausführungen, 0 eingeschleuste Elemente. | Test in Chromium |
| Gespeicherte Daten | Nach einer Sitzung mit Songname und Name liegt nur `stagesync.extras.v1` = `{"style":"neon"}` im Speicher. Keine Cookies, kein IndexedDB, kein Cache. | Test in Chromium |
| Manipulierter Speicher | 10 kaputte oder bösartige Werte (auch `__proto__`, Skripttext, `NaN`): keine Fehler, keine Wirkung. | Test in Chromium |
| Fremdcode | `mp4-muxer 5.2.2` und `webm-muxer 5.1.4` sind eingebettet. Jede Zeile des Originals von npm steht im Bündel (1416 und 1121 Zeilen, 100 %), im Block nur eine zusätzliche Zeile (`</script>`). Die Reihenfolge habe ich nicht geprüft. | Vergleich mit dem npm-Paket |
| Berechtigungen | Ein einziger `getUserMedia`-Aufruf, mit `audio: false`. Das Mikrofon wird nie angefragt. | Code gelesen |
| Links nach außen | Zwei: `enkidu-rankx.de` und `gnu.org`, beide mit `noopener noreferrer`. | Code gelesen |
| Geheimnisse | Keine Schlüssel, Tokens oder Passwörter im eigenen Code. | Mustersuche |
| Grenzen für Eingaben | Song höchstens 150 MB, Songtext-Datei 300 KB, 20 000 Zeichen, Songname 48, Name 40. | Code gelesen |
| Download-Dateiname | Ungültige Zeichen entfernt, höchstens 60 Zeichen. | Code gelesen |

## Hinweise (kein akutes Risiko)

1. **Die Schutzregel erlaubt eingebettete Skripte** (`script-src 'unsafe-inline'`). Das geht bei einer Einzeldatei nicht anders. Würde je Code eingeschleust, bliebe die Sperre für das Netz (`connect-src 'none'`), die Daten könnten die App also nicht verlassen. Ein Wegnavigieren verhindert die Regel nicht. Es wurde keine Einschleusung gefunden.
2. **Einbetten in fremde Seiten** (Clickjacking): GitHub Pages erlaubt keine eigenen Header, `frame-ancestors` geht nicht per `<meta>`. Die App hat keine Konten und keine Käufe. Ein Schutz per Skript wäre möglich. Das ist optional.
3. **Gleiche Herkunft für alle MMM-Apps.** Alle Apps liegen unter `enkidurankx.github.io` und teilen sich den Browser-Speicher. StageSync hat nur einen Stilwert dort, kann aber Werte anderer Apps lesen und wegen der Sperre nichts senden. Wichtiger ist die Gegenrichtung: FOCUS speichert Aufgaben und Medikamente und hat **keine** eigene Schutzregel. Das gehörte nicht zu dieser Prüfung, ich empfehle sie für FOCUS.
4. **Diagnose-Kopie** (Info-Knopf 1 s halten): kopiert Browser-Kennung und Kamera-Namen nur auf Tippen in die Zwischenablage.
5. **Datenschutztext "für Jugendliche gemacht":** eine Frage für dich (Rechtliches), keine Sicherheitsfrage.
6. **Pinch-Zoom aus** (`user-scalable=no`): Barrierefreiheit, nicht Sicherheit.

## Nicht geprüft

- Kamera-Abfrage und Aufnahme auf einem echten Handy (Samsung/Android, iPhone/Safari).
- Ein vollständiger Export bis zur fertigen Videodatei in dieser Prüfung. (Der Abspann wurde in v4.61 auf eine Fläche gezeichnet.)
- Die ausgelieferte Seite auf GitHub Pages (Header, Zertifikat).
- Browser-Erweiterungen und fremde Geräte-Software.
