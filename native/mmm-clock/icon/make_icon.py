#!/usr/bin/env python3
"""Draws the MMM Clock app icon (LCD readout "120" on a graphite plate) and writes AppIcon.iconset/.
build-app.sh turns the iconset into AppIcon.icns with iconutil (macOS only).
usage: python3 make_icon.py        (needs Pillow; writes next to this script)
"""
import os
from PIL import Image, ImageDraw, ImageFilter

S = 2048                      # supersampled canvas, scaled down to 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AppIcon.iconset")

def rounded_mask(size, inset, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([inset, inset, size - inset, size - inset], radius, fill=255)
    return m

def gradient(size, top, bottom):
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((size, size))

SEG = {"0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg",
       "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg"}

def digit_polys(x, y, w, h, t, slant):
    g = t * 0.10
    def hseg(cy):
        x0, x1 = x + g, x + w - g
        return [(x0, cy), (x0 + t/2, cy - t/2), (x1 - t/2, cy - t/2), (x1, cy), (x1 - t/2, cy + t/2), (x0 + t/2, cy + t/2)]
    def vseg(cx, y0, y1):
        return [(cx, y0), (cx + t/2, y0 + t/2), (cx + t/2, y1 - t/2), (cx, y1), (cx - t/2, y1 - t/2), (cx - t/2, y0 + t/2)]
    top0, mid = y + t/2 + g, y + h/2
    segs = {"a": hseg(y + t/2), "b": vseg(x + w - t/2, top0, mid - g), "c": vseg(x + w - t/2, mid + g, y + h - t/2 - g),
            "d": hseg(y + h - t/2), "e": vseg(x + t/2, mid + g, y + h - t/2 - g), "f": vseg(x + t/2, top0, mid - g),
            "g": hseg(mid)}
    # slant: top edge shifted right
    return {k: [(px + slant * (y + h - py), py) for px, py in pts] for k, pts in segs.items()}

def draw():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    inset = int(S * 0.045)
    plate = rounded_mask(S, inset, int(S * 0.225))
    # soft drop shadow
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 150), (0, int(S * 0.012)), plate)
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.012)))
    # graphite plate
    body = gradient(S, (74, 78, 84), (30, 32, 36)).convert("RGBA")
    img.paste(body, (0, 0), plate)
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle([inset + 6, inset + 6, S - inset - 6, S - inset - 6], int(S * 0.22), outline=(255, 255, 255, 38), width=6)
    img.alpha_composite(ring)
    # LCD window
    lx0, ly0, lx1, ly1 = int(S * 0.15), int(S * 0.30), int(S * 0.85), int(S * 0.68)
    lcd_mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(lcd_mask).rounded_rectangle([lx0, ly0, lx1, ly1], int(S * 0.05), fill=255)
    lcd = gradient(S, (176, 196, 145), (148, 171, 120)).convert("RGBA")
    frame = Image.new("L", (S, S), 0)
    ImageDraw.Draw(frame).rounded_rectangle([lx0 - 14, ly0 - 14, lx1 + 14, ly1 + 14], int(S * 0.056), fill=255)
    img.paste((14, 15, 17, 255), (0, 0), frame)
    img.paste(lcd, (0, 0), lcd_mask)
    d = ImageDraw.Draw(img)
    # digits "120" with ghost segments
    ink = (26, 38, 15, 255)
    ghost = (26, 38, 15, 22)
    dw, dh = int(S * 0.165), int(S * 0.27)
    t = dw * 0.20
    gap = int(S * 0.03)
    total = 3 * dw + 2 * gap
    x = (S - total) // 2 - int(S * 0.012)
    y = int((ly0 + ly1) / 2 - dh / 2)
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for ch in "120":
        polys = digit_polys(x, y, dw, dh, t, 0.12)
        for name, pts in polys.items():
            if name in SEG[ch]:
                ld.polygon([(px + 7, py + 7) for px, py in pts], fill=(26, 38, 15, 50))   # LCD shadow
        for name, pts in polys.items():
            ld.polygon(pts, fill=ink if name in SEG[ch] else ghost)
        x += dw + gap
    img.alpha_composite(layer)
    # "BPM" bar under the LCD: three small segment-like beat marks, the first one lit
    bx = int(S * 0.15); by = int(S * 0.77); bw = int(S * 0.16); bh = int(S * 0.045)
    bars = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(bars)
    for i in range(4):
        col = (224, 90, 60, 255) if i == 0 else (255, 255, 255, 60)
        d.rounded_rectangle([bx + i * (bw + int(S * 0.034)), by, bx + i * (bw + int(S * 0.034)) + bw, by + bh], int(bh * 0.4), fill=col)
    img.alpha_composite(bars)
    return img.resize((1024, 1024), Image.LANCZOS)

def main():
    os.makedirs(OUT, exist_ok=True)
    big = draw()
    for base in (16, 32, 128, 256, 512):
        big.resize((base, base), Image.LANCZOS).save(os.path.join(OUT, f"icon_{base}x{base}.png"))
        big.resize((base * 2, base * 2), Image.LANCZOS).save(os.path.join(OUT, f"icon_{base}x{base}@2x.png"))
    big.save(os.path.join(os.path.dirname(OUT), "AppIcon-1024.png"))
    print("wrote", OUT)

if __name__ == "__main__":
    main()
