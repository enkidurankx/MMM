# DENKI-Skalen für Ableton Live 12

Die drei Skalen aus DENKI (`denki/src/dsp/tuning.c`) als Ableton-Tuning-Dateien (`.ascl`).
Grundton A (wie DENKI mit HON 1), A3 = 220 Hz.

| Datei | Skala | Töne | Stimmung |
|---|---|---|---|
| `denki-in-equal.ascl` | In 陰 | A Bb D E F | gleichstufig |
| `denki-in-suiko.ascl` | In 陰 | A Bb D E F | Suiko 純正律 (ST-50 gemessen: Bb -20.8, F -16.0 Cent) |
| `denki-in-koto.ascl` | In 陰 | A Bb D E F | Koto: reine Quinten/Quarten |
| `denki-yo-equal.ascl` | Yo 陽 | A B D E F# | gleichstufig |
| `denki-yo-koto.ascl` | Yo 陽 | A B D E F# | Koto |
| `denki-minyo-equal.ascl` | Min'yo 民謡 | A C D E G | gleichstufig |
| `denki-minyo-koto.ascl` | Min'yo 民謡 | A C D E G | Koto |

Suiko gibt es nur für In: bei Yo und Min'yo sind die Suiko-Töne nicht gemessen, also gleich wie gleichstufig.

## So geht's
1. Datei in Live 12 ins Set ziehen (oder im Browser doppelklicken).
2. Jede Taste spielt dann einen Skalenton: 5 Tasten pro Oktave.

## Ohne Tuning-Datei (nur gleichstufig)
Live 12 hat passende Skalen schon eingebaut (Scale-Auswahl im Clip):
- In = **Hirajoshi** mit Grundton D (D E F A Bb)
- Yo = **Major Pentatonic** mit Grundton D (D E F# A B)
- Min'yo = **Minor Pentatonic** mit Grundton A (A C D E G)
