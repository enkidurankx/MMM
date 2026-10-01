# MMM Sounds 03 – Gamelan (Ableton Live)

44 Presets zu **gmln.4 v2.0** (34 Instrumente). Stand 01.10.2026. **Alles ist berechnet, nichts davon wurde in Live gehört.**

Gebaut aus deinen Vorlagen `Operator.adv` und `Tension.adv` (Live 12.4.6): es werden nur `<Manual Value>`-Einträge ersetzt, alle 44 Dateien haben dieselbe XML-Struktur wie die Vorlagen (per Skript geprüft), alle Werte liegen in den Bereichen der Vorlage.

## So benutzt du sie
1. In gmln.4 den Rhythmus bauen und **Export MIDI** drücken. Jede Datei heißt `gmln_<name>_<datum>_<NN>-<KÜRZEL>.mid`.
2. Pro Datei eine MIDI-Spur mit dem Preset `MMM_<KÜRZEL>_….adv` (Ordner `Operator/`). Die MIDI-Noten sind 12-TET, die Presets spielen gleichstufig (das „Laras“-Cent-Tuning der App gibt es hier nicht).
3. **Polos/Sangsih** (Gender, Pemade, Kantilan, Reyong) sind zwei Presets: Sangsih hat den weiteren Ombak.
4. **Trommeln und Ceng-ceng:** ein Preset pro Anschlag. Lege sie in ein Drum Rack, eine Pad pro Anschlag, Pad-Note aus der Tabelle unten (die Presets sind für C3 gebaut, weil ein Drum Rack jeder Kette C3 schickt – **Annahme, in Live prüfen**).

## Instrumente → Presets
| Kürzel | Instrument | Lane | Preset |
|---|---|---|---|
| GNG | Gong Ageng | Colotomy | MMM_GNG_Default.adv |
| KNG | Kenong | Colotomy | MMM_KNG_Default.adv |
| KMP | Kempul | Colotomy | MMM_KMP_Default.adv |
| KPR | Kempur | Colotomy | MMM_KPR_Default.adv |
| KMG | Kemong | Colotomy | MMM_KMG_Default.adv |
| JNG | Jengglong | Colotomy | MMM_JNG_Default.adv |
| KTK | Kethuk | Colotomy | MMM_KTK_Default.adv |
| KPY | Kempyang | Colotomy | MMM_KPY_Default.adv |
| KJR | Kajar | Colotomy | MMM_KJR_Default.adv |
| DMG | Demung | Balungan | MMM_DMG_Default.adv |
| SRN | Saron Barung | Balungan | MMM_SRN_Default.adv |
| PKG | Peking | Balungan | MMM_PKG_Default.adv |
| SLN | Slenthem | Balungan | MMM_SLN_Default.adv |
| JBL | Jublag | Balungan | MMM_JBL_Default.adv |
| JGG | Jegogan | Balungan | MMM_JGG_Default.adv |
| GDP | Gender Polos | Kotekan polos | MMM_GDP_Polos.adv |
| PMP | Pemade Polos | Kotekan polos | MMM_PMP_Polos.adv |
| KNP | Kantilan Polos | Kotekan polos | MMM_KNP_Polos.adv |
| RYP | Reyong Polos | Kotekan polos | MMM_RYP_Polos.adv |
| GDS | Gender Sangsih | Kotekan sangsih | MMM_GDS_Sangsih.adv |
| PMS | Pemade Sangsih | Kotekan sangsih | MMM_PMS_Sangsih.adv |
| KNS | Kantilan Sangsih | Kotekan sangsih | MMM_KNS_Sangsih.adv |
| RYS | Reyong Sangsih | Kotekan sangsih | MMM_RYS_Sangsih.adv |
| BNB | Bonang Barung | Elaboration | MMM_BNB_Default.adv |
| BNP | Bonang Panerus | Elaboration | MMM_BNP_Default.adv |
| GAM | Gambang | Elaboration | MMM_GAM_Default.adv |
| KDA | Kendhang Ageng | Drums | MMM_KDA_dang.adv, MMM_KDA_dhe.adv |
| KDK | Ketipung | Drums | MMM_KDK_tak.adv, MMM_KDK_tung.adv |
| KDC | Kendhang Ciblon | Drums | MMM_KDC_dang.adv, MMM_KDC_dhe.adv, MMM_KDC_plak.adv, MMM_KDC_tak.adv, MMM_KDC_tung.adv |
| KBL | Kendang Lanang | Drums | MMM_KBL_tak.adv, MMM_KBL_tut.adv |
| KBW | Kendang Wadon | Drums | MMM_KBW_dag.adv, MMM_KBW_pung.adv |
| CNG | Ceng-ceng | Drums | MMM_CNG_ceng.adv, MMM_CNG_cheng.adv |
| SUL | Suling | Melody | MMM_SUL_Suling.adv |
| RBB | Rebab | Melody | MMM_RBB_Rebab_Operator.adv, MMM_RBB_Rebab_Tension.adv |

## Drum-Rack-Noten (Standard-Oktave 0)
| Instrument | Anschlag | MIDI-Note im Export | Preset |
|---|---|---|---|
| KDA | dang | 36 | MMM_KDA_dang.adv |
| KDA | dhe | 37 | MMM_KDA_dhe.adv |
| KDK | tak | 50 | MMM_KDK_tak.adv |
| KDK | tung | 51 | MMM_KDK_tung.adv |
| KDC | dang | 40 | MMM_KDC_dang.adv |
| KDC | dhe | 41 | MMM_KDC_dhe.adv |
| KDC | plak | 44 | MMM_KDC_plak.adv |
| KDC | tak | 42 | MMM_KDC_tak.adv |
| KDC | tung | 43 | MMM_KDC_tung.adv |
| KBL | tak | 54 | MMM_KBL_tak.adv |
| KBL | tut | 58 | MMM_KBL_tut.adv |
| KBW | dag | 49 | MMM_KBW_dag.adv |
| KBW | pung | 51 | MMM_KBW_pung.adv |
| CNG | ceng | 88 | MMM_CNG_ceng.adv |
| CNG | cheng | 89 | MMM_CNG_cheng.adv |

Kethuk (64), Kempyang (76) und Kajar (70) spielen feste Noten und brauchen kein Rack. Stellst du in gmln.4 die Oktave eines Instruments um, verschieben sich diese Noten um 12.

## Wie die Klänge entstehen
Die FM-Profile aus gmln.4 (Verhältnis, Index, Decay, Pitch-Drop, Ombak-Schwebung) werden 1:1 in Operator übertragen: Algorithmus 8 (Index 7), A trägt und wird von B moduliert, C trägt (leicht verstimmt, 40 % Pegel) und wird von D moduliert. Ombak = Verstimmung von C. Pitch-Drop über die Pitch-Hüllkurve. Die Presets klingen also wie die App, nicht wie gemessenes Gamelan: **keine Teiltonlisten pro Taste, keine Röhrenresonanz**, siehe Doc 04 Abschnitt 3/7.

## Ungeprüft / Annahmen
- **Algorithmus:** Index 7 = „Algorithm 8“ = zwei Träger (A←B, C←D), nach Beschreibungen von EDMProd/MusicTech, nicht in Live nachgesehen.
- **Tune:** Ratio = Coarse + Fine/1000 (wie im Handover angenommen).
- **Modulationstiefe:** Volume des Modulators = Index / 6,5. Der Faktor ist geraten, hier wird man in Live nachziehen müssen.
- **Pegel:** Master-Volume aus dem Profil-Level skaliert, keine Lautheit gemessen.
- **Ombak:** Polos wie in der App, Sangsih ×1,5 (eigene Annahme).
- **Trommeln, Ceng-ceng:** Operator hat hier keine Rauschquelle, Schläge und Becken sind FM-Bursts (nur Annäherung an die Rausch-/Filterstimmen der App). Collision oder Drum Synth wären näher dran, dafür fehlten die Vorlagen.
- **Drum Rack:** C3-Verhalten wie oben.
- **Suling:** Sinus + schwache 2. Harmonische, langsamer Einsatz, kein Atemrauschen, kein Vibrato (Operator-LFO von Hand).
- **Rebab:** zwei Varianten. Operator mit Feedback als Näherung, Tension mit `ExcitatorType 0` (= Bow, laut Handover angenommen) und Startwerten.
- **Referenzton:** gmln.4 nutzt als Root C4 (wählbar), nicht Ichikotsu 290,3 Hz wie die anderen Cards.

## Skript
`build_gamelan_adv.py <gamelan.html> <Operator.adv> <Tension.adv> <ausgabeordner>` liest Instrumente und Profile direkt aus `gamelan-v2_0.html`, braucht Node und deine zwei Vorlagen.


# Teil 2: Collision-Presets (43)

Gleiche Idee, Vorlage `Collision.adv` (Live 12.4.6), nur `<Manual Value>` ersetzt, Struktur gegen die Vorlage geprüft, alle Werte in den Vorlagenbereichen. Dateien `MMM_<KÜRZEL>_<Variante>_Collision.adv` im Ordner `Collision/`. Gleiche Benutzung wie oben (Trommeln und Ceng-ceng pro Anschlag, Pad-Noten aus der Tabelle, für C3 gebaut).

| Gruppe | Aufbau | Instrumente |
|---|---|---|
| Bronzebarren | Resonator 1 **Beam**, Resonator 2 **Tube** (Röhre) um den Ombak verstimmt, harter Mallet | Demung, Saron, Peking, Slenthem, Jublag, Jegogan, Gender, Pemade, Kantilan (Polos/Sangsih) |
| Gongs, Kessel | **Plate** + zweite Plate um den Ombak verstimmt, weicher bis harter Mallet, Pitch-Drop über Start Transpose | Gong ageng, Kempur, Kempul, Kenong, Jengglong, Kemong, Bonang barung/panerus, Reyong (Polos/Sangsih) |
| Kleine Gongs | **Plate**, feste Note, Transpose legt die App-Frequenz | Kethuk, Kempyang, Kajar |
| Holzbarre | **Marimba** + Trog (Tube) | Gambang |
| Trommeln | zwei **Membrane**, Mallet-Rauschen und -Härte nach Anschlag | Kendhang ageng (dang, dhe), Ketipung (tung, tak), Ciblon (dang, dhe, tak, tung, plak), Kendang lanang (tak, tut), wadon (dag, pung) |
| Becken | zwei hohe **Plate**, hartes Rausch-Mallet | Ceng-ceng (ceng, cheng) |
| Melodie | Rausch-Exciter mit Sustain hält den Resonator am Klingen: **Pipe** (Suling), **String** (Rebab) | Suling, Rebab |

## Ungeprüft (Collision)
- **Typ-Reihenfolge:** 0 Beam, 1 Marimba, 2 String, 3 Membrane, 4 Plate, 5 Pipe, 6 Tube (Handover-Annahme).
- **Decay:** Sekunden → 0…1 über eine Kurve, die ich an den Collision-Werten aus Sounds 01 geeicht habe (0,12 ≈ 0,1 s, 0,30 ≈ 0,3 s). Die echte Skala kenne ich nicht, lange Decays (Gong 6 s) sind daher am unsichersten.
- **Start Transpose:** ich nehme ±1 = ±12 Halbtöne an (Gong-Drop, Trommel-Bend). Wenn der Bereich größer ist, wird der Drop zu groß.
- **Damp-Vorzeichen:** negativ = Metall klingt länger, positiv = Holz/Fell dämpft (so eingesetzt wie in Sounds 01).
- **Ombak:** Cent-Versatz aus dem Beat der App und einer Referenznote (G im Register), maximal 50 Cent; Sangsih ×1,5.
- **Suling/Rebab:** ob der Noise-Sustain die Pipe/String wirklich anhält, muss man hören. Kein Vibrato, keine Rauschfilter-Einstellung außer Frequenz und Güte (Filtertyp-Zuordnung unbekannt).
- **Drum Rack C3:** wie oben.

Skript: `build_gamelan_collision.py <gamelan.html> <Collision.adv> <ausgabeordner>`.
