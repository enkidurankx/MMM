# Saiten-Baustelle (Koto, Shamisen) — bewusst nicht abgeglichen

Stand 02.10.2026. Das Thema ist auf Wunsch des Owners **pausiert** ("zu kompliziert"). Nichts hier ist Teil des Inventars, der Hub-Apps oder der veröffentlichten Karten.

Inhalt: Referenz-Renderer `strings.js` (Digital-Waveguide), Spektraltests `verify2.js`, FM-1-Voices `fm1s.js`, MicroFreak/Volca `mf_volca2.js`, Tension-Presets `build_tension.py` und die Rack-Builder `build_racks*.py` (Versionen v1 bis v14, die Zahl ist die Reihenfolge der Iterationen; aktuell: Koto `build_racks14.py`, Shamisen `build_racks8.py`).

Offen / was gelernt wurde:
- Rack-Format: `.adg` = gzip-XML. Makro-Zuordnung steht am Zielparameter als `<KeyMidi>` mit `Channel 16` und `NoteOrController` = Makro-Index; Zonen in `<ZoneSettings>` je Chain. Vorlage des Owners: `Tension_Multichain.adg` (liegt nicht im Repo).
- Velocity-Zonen aus der Datei griffen bei v3 nicht; vom Owner von Hand gesetzt funktionieren sie (Far 88-127, Tsume 1-104, Überblendung 88-104).
- Tension-Pressure-Ziele (Index): 0 None, 1 Voice Volume, 2 Vibrato Amount, 3 Vibrato Speed, 4 Unison Detune, 5 String Inharmon., 6 LFO Rate, 7 F. Cutoff, 8 F. Cut. LFO Depth, 9 F. Cut. Env Depth, 10 F. Q, 11 F. Q LFO Depth, 12 F. Q Env Depth.
- Voice Volume wirkt vermutlich nicht, weil die Basis schon am Maximum steht; Cutoff wirkt nur, wenn die Basis unter 22 kHz liegt.
- Ungeprüft: alle Tension-Werte, Portamento/Legato (evtl. nur mono), Sawari über Termination, Shamisen-Fellmoden.
- Die 4 Starter-Sounds für die Volca-Drum-App (KOTO TSUME/OSHI, SHAMI UCHI/SAWARI) sind aus der App-Version v0.2 entfernt worden (Hub bleibt auf v0.1).
