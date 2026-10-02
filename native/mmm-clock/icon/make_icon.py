#!/usr/bin/env python3
"""Draws the MMM Clock app icon and writes AppIcon.iconset/ (+ AppIcon-1024.png).
Motif: a clock face (24 ticks = the 24 PPQN of the MIDI clock, four heavier ones = the beats) with the five pins
of a MIDI DIN connector on its upper half and a red running hand. build-app.sh turns the iconset into
AppIcon.icns with iconutil (macOS only).
usage: python3 make_icon.py        (needs Pillow; writes next to this script)
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter

S = 2048                      # supersampled canvas, scaled down to 1024
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AppIcon.iconset")

def rounded_mask(inset, radius):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([inset, inset, S - inset, S - inset], radius, fill=255)
    return m

def gradient(top, bottom):
    g = Image.new("RGB", (1, S))
    for y in range(S):
        t = y / (S - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((S, S))

def disc(layer, cx, cy, r, fill):
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)

def draw():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    inset = int(S * 0.045)
    plate = rounded_mask(inset, int(S * 0.225))
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 150), (0, int(S * 0.012)), plate)
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.012)))
    img.paste(gradient((74, 78, 84), (30, 32, 36)).convert("RGBA"), (0, 0), plate)
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle([inset + 6, inset + 6, S - inset - 6, S - inset - 6], int(S * 0.22),
                                           outline=(255, 255, 255, 38), width=6)
    img.alpha_composite(ring)

    cx = cy = S // 2
    R = int(S * 0.355)                                    # outer radius of the clock
    # bezel
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    disc(layer, cx + 0, cy + int(S * 0.012), R + 18, (0, 0, 0, 120))      # soft shadow
    layer = layer.filter(ImageFilter.GaussianBlur(S * 0.01))
    disc(layer, cx, cy, R, (205, 208, 214, 255))                           # bezel
    disc(layer, cx, cy, int(R * 0.93), (60, 63, 69, 255))                  # bezel inner edge
    disc(layer, cx, cy, int(R * 0.90), (244, 241, 232, 255))               # dial
    img.alpha_composite(layer)

    d = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dd = ImageDraw.Draw(d)
    ink = (30, 32, 36, 255)
    # 24 ticks, every sixth one heavy (a beat)
    for i in range(24):
        a = math.radians(i * 15 - 90)
        heavy = i % 6 == 0
        r0 = R * (0.70 if heavy else 0.79)
        r1 = R * 0.87
        w = int(S * (0.014 if heavy else 0.007))
        dd.line([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)), (cx + r1 * math.cos(a), cy + r1 * math.sin(a))],
                fill=ink, width=w)
    # MIDI DIN-5 (180 degrees): connector shell with five pins on a semicircle, in the upper half of the dial
    sx, sy = cx, cy - R * 0.31
    shell = R * 0.37
    dd.ellipse([sx - shell, sy - shell, sx + shell, sy + shell], outline=ink, width=int(S * 0.013))
    pr = R * 0.22
    for k in range(5):
        a = math.radians(180 + k * 45)                    # 180 -> 360 degrees = upper half
        px, pyy = sx + pr * math.cos(a), sy + pr * math.sin(a) + R * 0.07
        pin = int(S * 0.019)
        dd.ellipse([px - pin, pyy - pin, px + pin, pyy + pin], fill=ink)
    # running hand (red) toward 4 o'clock, short tail, hub
    ha = math.radians(60)
    tip = (cx + R * 0.60 * math.cos(ha), cy + R * 0.60 * math.sin(ha))
    tail = (cx - R * 0.16 * math.cos(ha), cy - R * 0.16 * math.sin(ha))
    dd.line([tail, tip], fill=(214, 64, 40, 255), width=int(S * 0.026))
    ellipse_r = int(S * 0.034)
    dd.ellipse([cx - ellipse_r, cy - ellipse_r, cx + ellipse_r, cy + ellipse_r], fill=(214, 64, 40, 255))
    dd.ellipse([cx - ellipse_r * 0.42, cy - ellipse_r * 0.42, cx + ellipse_r * 0.42, cy + ellipse_r * 0.42], fill=(244, 241, 232, 255))
    img.alpha_composite(d)
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
