#!/usr/bin/env python3
"""Injects the shared shell (feedbacks/shell.css, shell.js, icons.svg.html) into the three feedback apps.
Each app page has marker pairs; everything between them is replaced:
  /*fb:css*/ ... /*/fb:css*/   (inside <style>)      <!--fb:icons--> ... <!--/fb:icons-->      /*fb:js*/ ... /*/fb:js*/   (inside <script>)
Run from the repository root:  python3 feedbacks/build.py <page.html> [...]   (without arguments: the current pages listed below)"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent
css = (root / 'shell.css').read_text().strip()
js = (root / 'shell.js').read_text().strip()
icons = (root / 'icons.svg.html').read_text().strip()
def inject(text, start, end, body):
    pat = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
    if not pat.search(text): raise SystemExit('marker %s not found' % start)
    return pat.sub(lambda m: start + '\n' + body + '\n' + end, text, count=1)
def build(path):
    p = pathlib.Path(path); t = p.read_text()
    t = inject(t, '/*fb:css*/', '/*/fb:css*/', css)
    t = inject(t, '<!--fb:icons-->', '<!--/fb:icons-->', icons)
    t = inject(t, '/*fb:js*/', '/*/fb:js*/', js)
    p.write_text(t); print('built', p)
if __name__ == '__main__':
    pages = sys.argv[1:]
    if not pages: raise SystemExit('give the page files')
    for pg in pages: build(pg)
