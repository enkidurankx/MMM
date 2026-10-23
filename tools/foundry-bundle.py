#!/usr/bin/env python3
"""Foundry zu einer einzigen HTML-Datei bündeln (für den MMM-Hub).

Aufruf:  python3 tools/foundry-bundle.py <Ordner foundry/ der Quelle> <Ausgabedatei>
Die Quelle (index.html, css/, js/) wird nicht verändert. CSS und Skripte werden
in der Reihenfolge der <script>-Marken eingebettet, die ?v=-Zähler entfallen."""
import re, sys, pathlib

def main(src, out):
    root = pathlib.Path(src)
    html = (root / 'index.html').read_text(encoding='utf-8')

    def css(m):
        return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
    html = re.sub(r'<link rel="stylesheet" href="([^"?]+)(?:\?[^"]*)?">', css, html)

    def js(m):
        code = (root / m.group(1)).read_text(encoding='utf-8')
        code = code.replace('</script', '<\\/script')
        return '<script>\n' + code + '\n</script>'
    html = re.sub(r'<script src="([^"?]+)(?:\?[^"]*)?"></script>', js, html)

    # Korrektur gegenüber der Quelle: Die Galerie zeichnete die Vorschauen, bevor die Karten auf der
    # Seite standen (Breite 0, dadurch nur 50 x 50 Pixel). Das Raster wird jetzt vorher eingehängt.
    alt = "const grid = el('div', 'grid');\n"
    if alt not in html:
        sys.exit('Korrektur Galerie: Stelle nicht gefunden (Quelle geändert?).')
    html = html.replace(alt, alt + "    main.appendChild(grid);   // MMM-Korrektur: vor dem Zeichnen einhängen\n", 1)

    # Korrektur 2: Der Stil "mix" hat keinen eigenen Kernel; composeParams stürzte dafür ab (Detailansicht von Mix).
    alt = "const style = BG.KERNELS[styleId];\n    const p = {};"
    if alt not in html:
        sys.exit('Korrektur Mix: Stelle nicht gefunden (Quelle geändert?).')
    html = html.replace(alt, "const style = BG.KERNELS[styleId] || {};   // MMM-Korrektur: mix hat keinen Kernel\n    const p = {};", 1)

    # Korrektur 3: "← Modules" führte zur Modul-Übersicht der Quelle (gibt es im Hub nicht), jetzt zurück zur Galerie.
    alt = "const back = el('button', 'btn', '← Modules');\n      back.title = 'Back to the module index';\n      back.addEventListener('click', function () {\n        global.location.href = '../';\n      });"
    if alt not in html:
        sys.exit('Korrektur Zurück: Stelle nicht gefunden (Quelle geändert?).')
    html = html.replace(alt, "const back = el('button', 'btn', '← Gallery');\n      back.title = 'Back to the gallery';\n      back.addEventListener('click', function () {\n        openGallery();\n      });", 1)

    # Zusatz: Dauerdrehung. Gibt der Zusatzdatei Zugriff auf Zustand und Zeichnen (BG._ui) ...
    alt = "  /* ---------- boot ---------- */"
    if alt not in html:
        sys.exit('Zusatz Spin: Anker in ui.js nicht gefunden (Quelle geändert?).')
    html = html.replace(alt, "  BG._ui = { state: state, eff: effectiveParams, rerender: rerenderPreview,\n    mount: function () { if (previewStage && state.view === 'detail') mountPreview(previewStage, state.style, state.seed, effectiveParams(state.style)); } };   // MMM-Zusatz\n" + alt, 1)
    # ... und wird nach ui.js eingebaut.
    spin = (pathlib.Path(__file__).parent / 'foundry-spin.js').read_text(encoding='utf-8').replace('</script', '<\\/script')
    marker = '</script>\n</body>'
    if marker not in html:
        sys.exit('Zusatz Spin: Skript-Ende nicht gefunden.')
    html = html.replace(marker, '</script>\n<script>\n' + spin + '\n</script>\n</body>', 1)

    html = html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n<meta name="robots" content="noindex">', 1)
    if re.search(r'<(?:link|script)[^>]+(?:href|src)="(?!https?:|data:)[^"]*\.(?:css|js)', html):
        sys.exit('Es sind noch externe Dateien übrig.')
    pathlib.Path(out).write_text(html, encoding='utf-8')
    print(out, len(html) // 1024, 'KB')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
