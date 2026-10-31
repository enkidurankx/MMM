# StageSync · Sicherheitsprüfung für die Beta

Stand 29.10.2026 · geprüft: `stagesync-v4_51.html`, erneut `stagesync-v4_55.html` · Audio-Session
Geprüft durch Lesen des Codes und automatische Tests in Chromium. Nicht auf einem Telefon getestet.

## Ergebnis

Keine kritischen Lücken gefunden. Die App läuft komplett im Browser auf dem Handy und hat keinen Server.
In v4.51 wurden fünf Härtungen eingebaut (unten). Offen sind nur kleine Punkte ohne Risiko für die Beta.

## Was geprüft wurde

| Bereich | Befund |
|---|---|
| Daten nach außen | Kein `fetch`, kein XHR, kein WebSocket, kein `sendBeacon` im Code. Test: 0 Anfragen nach außen über den ganzen Ablauf. |
| Fremde Dateien laden | Keine Skripte, Schriften oder Bilder von CDNs. Tailwind ist vorkompiliert, mp4-muxer/webm-muxer (MIT) sind eingebettet, Logos als data:-Bilder. |
| Einschleusen von Code (XSS) | Alle `innerHTML` setzen nur feste SVG-Icons. Songname, Songtext, Fehlermeldungen und Kamera-Namen gehen über `innerText`. Test: Songtext mit `<img onerror>` und `<script>` wird als Text angezeigt, nichts wird ausgeführt. |
| `eval` / `new Function` | Nicht vorhanden. |
| Geheimnisse im Code | Keine Schlüssel, Tokens oder Passwörter (das Repo ist öffentlich). |
| Berechtigungen | Nur die Kamera (`getUserMedia` mit `audio: false`). Das Mikrofon wird nie angefragt. Die Kamera wird außerhalb von Kamera- und Aufnahme-Ansicht ausgeschaltet. |
| Gespeicherte Daten | Seit v4.55 nur technische Einstellungen in `localStorage`: Qualität, Sync-Wert, Titel-Stil, ein Merker "Vorschau schwarz". Songtext, Name im Titel und Diagnose nur im Speicher, solange die App offen ist; alte Einträge (Songtext, letzte Diagnose, Name) werden beim Start gelöscht. Keine Cookies, keine Datenerhebung, kein Tracking. |
| Links nach außen | Studio SHIRO, roter baum, GNU: `target="_blank" rel="noopener noreferrer"`. |
| Dateinamen beim Download | Aus dem Songnamen, ungültige Zeichen entfernt. |
| Hosting | GitHub Pages über HTTPS. |

## Zweite Prüfung v4.55 (nach den Extras aus v4.54)

Geprüft: Titel am Anfang, Songtext im Video, Beat-Effekt, Teilen-Knopf, Speicher.

- Titel, Name und Songtext werden nur auf die Leinwand gezeichnet (`fillText`) oder über `.value`/`innerText` gesetzt. Test mit `<img onerror>`, `<script>` und `<svg onload>` in Titel, Name und Songtext: nichts wird ausgeführt, 0 eingeschleuste Elemente.
- Teilen nutzt das Teilen-Menü des Handys (`navigator.share` mit Datei). Es geht nur auf Tippen los, die App selbst sendet nichts.
- Manipulierter Speicher (falscher Stil, Objekt statt Name, kaputtes JSON): wird ignoriert, keine Fehler.
- Die Diagnose (versteckt, nur über 1 s Halten des i-Knopfs) kopiert technische Werte nur auf Tippen in die Zwischenablage. Sie wird nicht mehr gespeichert.
- Test über den ganzen Ablauf mit allen Extras und Export: 0 CSP-Verstöße, 0 Anfragen nach außen, keine Fehler.

Datenschutz für Jugendliche: keine Datenerhebung, kein Tracking, kein Konto. So steht es auch auf der Startkarte und der Seite Über.

## Härtungen in v4.51

1. **Content Security Policy** (`<meta>`): `default-src 'none'`, `connect-src 'none'`, Bilder, Medien und Schriften nur `data:`/`blob:`. Selbst ein eingeschleustes Skript könnte nichts nachladen und nichts senden. Test über den ganzen Ablauf mit Export: 0 Verstöße.
2. **Kein Referrer** (`<meta name="referrer" content="no-referrer">`).
3. **Unlesbare Song-Datei**: klare Meldung statt Stille; Dateien über 150 MB werden abgelehnt (Speicher am Handy).
4. **Songtext**: höchstens 20 000 Zeichen, Datei höchstens 300 KB.
5. **Datenschutz-Absatz** auf der Seite „Über“: keine Anmeldung, keine Cookies, kein Tracking, keine Werbung, kein Server, nur Kamera.

## Offen (kein Risiko für die Beta)

- **Einbetten in fremde Seiten** (Clickjacking): GitHub Pages erlaubt keine eigenen Header, `frame-ancestors` geht nicht per `<meta>`. Die App hat keine Konten und keine Käufe, daher kein echtes Risiko.
- **Pinch-Zoom ist aus** (`user-scalable=no`): eine Frage der Barrierefreiheit, nicht der Sicherheit.
- **Diagnosezeile**: nur nach 1 s Halten des Info-Knopfs; beim Antippen kopiert sie Browser-Kennung und Kamera-Namen in die Zwischenablage, nur auf ausdrücklichen Tipp.
- **Rechte am Song und am Bild**: liegt bei den Nutzenden (Hinweis im Haftungsausschluss).

## Hinweise für die Beta-Tester (Vorschlag)

- Neueste Version von Chrome (Android) oder Safari (iPhone).
- Song vorher als Datei aufs Handy laden.
- Bei Problemen: 1 s auf den Info-Knopf halten, die Diagnosezeile antippen, den kopierten Text schicken. Er enthält keine persönlichen Daten außer Browser-Version und Kamera-Namen.
