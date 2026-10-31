#!/usr/bin/env python3
"""Fetches a Google Fonts stylesheet once and prints the @font-face rules of the latin subset with the font files embedded (base64 woff2),
so that an app needs no request to the outside at runtime (rule of the collection). German umlauts are in the latin subset.
Usage:  python3 tools/embed-google-fonts.py "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap"
Then paste the output into the <style> of the app in place of the @import / <link>."""
import base64, re, sys, urllib.request
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()
css = get(sys.argv[1]).decode()
out = []
for m in re.finditer(r'/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})', css, re.S):
    if m.group(1) != 'latin':
        continue
    block = m.group(2)
    url = re.search(r'url\((https://[^)]+)\)', block).group(1)
    data = base64.b64encode(get(url)).decode()
    block = block.replace(url, 'data:font/woff2;base64,' + data)
    out.append(re.sub(r'\s+', ' ', block).strip())
if not out:
    sys.exit('no latin subset found')
print('\n'.join(out))
