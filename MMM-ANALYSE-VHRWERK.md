# Analyse: Vhrwerk Soft Tools (vhrwerk.neocities.org)

Stand: 25.10.2026. Gelesen: Startseite, Menü, Soft-Tools-Intro, alle 6 Soft Tools, Hard Tool AB 172. Nichts heruntergeladen, nichts ausgeführt.
Die Seite ist eine einfache HTML-Seite mit Frames. Die Tools sind **Pure-Data-Patches** (Vanilla) mit Externals. Der Autor nennt sich Vhrwerk (gesprochen "Uhrwerk"), Musiker und Werkzeugbauer.

## Die Werkzeuge

| Tool | Was es ist | Kernidee | Stand |
|---|---|---|---|
| **RS-IV** | Resynthesizer, braucht Audio-Eingang oder Datei | Ein Stück des Eingangs wird wie "fotografiert". Dieses Bild ist die Wellenform für überblendende Wavetable-Oszillatoren. Die Tonhöhe folgt der Amplitude. Zeitgeber = "Verschluss". Danach Filter, Dynamik, Hall und ein **zehnstimmiges Delay mit Zeiten nach Fibonacci**. | Download nicht verfügbar |
| **LD-IV** | Loop-Gerät mit zwei Plätzen | Span, Pitch und Zerstörung haben je eine eigene Quelle: von Hand, Sequencer oder **Event-Generator**. Der Event-Generator liest die Audiodatei von vorn und macht aus ihr Steuerwerte für Loop-Auslöser, Richtung und Parameter. Crossfader und Vorhören (PFL). | v1.0 |
| **RG-II** | Ein Sample, das beim Abspielen **überschrieben** wird | Bei jedem Sequencer-Schritt wird das Sample gelesen und zugleich neu beschrieben. Kleine Änderungen, große Wirkung, kaum vorhersagbar, aber rhythmisch. | nicht verfügbar |
| **S-VI** | Polyrhythmischer Sampler mit 6 Plätzen | Jeder Platz hat eigene Schrittzahl, Filter, Hüllkurve. Loops lassen sich **auf genau N Schritte strecken** und bleiben im Takt. Wellenform kann man von Hand zeichnen. | v1.0 |
| **NS-VI** | FM/AM-Synthesizer aus 6 "Neuronen" | Sechs Sinus-Oszillatoren (0,1 bis 5000 Hz), jeder kann jeden modulieren, auch sich selbst. Schalter wählen die Quellen. Je Neuron Pan und Hüllkurve, 24-Bit-Aufnahme. | v1.0 |
| **DM-VIII** | Rein synthetische Drummachine, 8 Stimmen | Alle Klänge in Echtzeit erzeugt, kein Sample. Schrittzahl 1 bis 16 je Stimme, ein eigenes **Shuffle je Kanal**. | v1.0 |
| **AB 172** | Selbstgebautes Paar Kleinmembran-Mikrofone (Kugel) | Messwerte und Frequenzgang auf der Seite, Klangbeispiele im Projekt Division F. | – |

Gemeinsam: Tastatur-Spiel am Rechner, MIDI, schnelle Rücksetzer pro Regler, eingebaute Effekte über Sends, Aufnahme (24 Bit), Wählbare Schrittzahl. Demos als Videos und SoundCloud-Stücke.

## Haltung und Bedingungen
- Der Autor ist gegen Retro: Digitales soll tun, was analog nicht geht. "Alchemistisches Klanglabor, interpolierende Gießerei, elektrische Lutherie."
- **Nutzung frei, auch ändern, aber nicht weiterverkaufen. Namensnennung, wenn verlangt.** Er freut sich über Rückmeldung, wo die Werkzeuge benutzt wurden, und nimmt Vorschläge und Fehler per Mail an.
- Die Patches sind für Pure Data Vanilla gebaut und brauchen Externals (Freeverb, Cyclone, Ext13, Motex, Flatgui). Das heißt: Pure Data muss installiert sein, im Browser laufen sie nicht.

## Was für MMM interessant ist

Nur Ideen. Wir übernehmen keinen Code und keine Patches, wir bauen nach, was uns gefällt, und nennen die Quelle.

1. **Event-Generator (LD-IV)** für chop.4: das Sample steuert sich selbst. Neue Trigger-Art, bei der die Lautstärke- oder Spektralverläufe des Samples Auslöser, Richtung, Tonhöhe und Größe der Stücke setzen. Passt zu unserem Onset-Trigger und zu den LFO-Zielen.
2. **Überschreiben (RG-II)** für chop.4 und die Loop-Apps: ein Schalter "Re-Record", der die erzeugten Stücke ins Sample zurückschreibt. Dadurch zerfällt das Sample von selbst. Verwandt mit entropy und vink.loop.
3. **Fibonacci-Delay (RS-IV)** als Effekt für die Shell: zehn Abgriffe mit Zeiten nach der Fibonacci-Folge. Eine Zeile in `feedbacks/shell.js` neben dem Plattenhall, für alle Shell-Apps.
4. **Foto-Resynthese (RS-IV)** als neue Experimental-App: ein Mikrofonschnipsel wird zur Wellenform, die Amplitude setzt die Tonhöhe. Nahe bei serge (Wellenvervielfacher) und chop.4.
5. **Quelle je Parameter (LD-IV)**: Von Hand, Sequencer oder Ereignis, pro Regler. Unsere LFO-Ziele sind der erste Schritt; eine Quellenwahl je Regler wäre die Fortsetzung.
6. **Polyrhythmischer Slot-Sampler (S-VI)**: sechs Plätze, je eigene Schrittzahl, Loops auf N Schritte gestreckt, Wellenform zeichnen. Fehlt uns bisher. Passt zu rb88 (Polymeter je Zeile), age12 und dem Bild aus chop.4.
7. **Neuronen-Netz (NS-VI)** als spielbare Fassung von knot: Knöpfe je Quelle und Ziel, Hüllkurve je Neuron, Pan je Neuron, Tasten und MIDI. knot und lattice sind selbstlaufend; ein Spielmodus wäre neu.
8. **Shuffle je Stimme (DM-VIII)** in rb88: neben dem globalen Swing ein eigener Anteil je Zeile.
9. **Tastatur und MIDI in der Shell**: "MIDI equipped" haben alle Tools. Die Shell-Apps könnten ein MIDI-Learn bekommen (Regler an einen Controller binden). Das fehlt heute in vink, homoeo, serge, lattice, knot, lichen, creak, entropy und chop.4.

## Was wir nicht tun sollten
- Keine Patches oder Bilder der Seite kopieren oder hosten. Die Bedingung "nicht weiterverkaufen" verbietet das nicht, aber wir haben keine Erlaubnis, sie zu verteilen.
- Nicht ungefragt auf die Seite verlinken oder den Autor erwähnen, wo er nicht genannt werden wollte. Bei einer Übernahme der Idee ein "Idee nach Vhrwerk" im Log genügt.

## Frage an den Owner
- Kennst du den Autor, oder sollen wir ihm schreiben (er nimmt Vorschläge per Mail an)? Eine Web-Fassung einzelner Tools, zum Beispiel NS-VI oder DM-VIII, wäre nur mit seiner Zustimmung sinnvoll.
