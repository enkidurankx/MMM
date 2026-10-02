#!/usr/bin/env python3
"""Draws the MMM Clock app icon and writes AppIcon.iconset/ (+ AppIcon-1024.png).
Motif: a round clock face that is also a MIDI DIN-5 connector: the five pins sit on an arc over the upper half
(no ticks), the hands show 11:10. build-app.sh turns the iconset into
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
    # MIDI DIN-5 (180 degrees): the five pins on an arc over the upper half, where the hour marks would be
    pr = R * 0.66
    for k in range(5):
        a = math.radians(180 + k * 45)                    # 180 -> 360 degrees = upper half
        px, pyy = cx + pr * math.cos(a), cy + pr * math.sin(a)
        pin = int(S * 0.031)
        dd.ellipse([px - pin, pyy - pin, px + pin, pyy + pin], fill=ink)
    # hands: 11:10 (hour hand just past 11, minute hand on the 2)
    def hand(angle_deg_cw_from_12, length, width, tail):
        a = math.radians(angle_deg_cw_from_12 - 90)
        tip = (cx + R * length * math.cos(a), cy + R * length * math.sin(a))
        back = (cx - R * tail * math.cos(a), cy - R * tail * math.sin(a))
        dd.line([back, tip], fill=ink, width=int(S * width))
        dd.ellipse([tip[0] - S * width / 2, tip[1] - S * width / 2, tip[0] + S * width / 2, tip[1] + S * width / 2], fill=ink)
        dd.ellipse([back[0] - S * width / 2, back[1] - S * width / 2, back[0] + S * width / 2, back[1] + S * width / 2], fill=ink)
    hand((11 + 10 / 60) * 30, 0.40, 0.034, 0.0)          # hour hand: 335 degrees
    hand(10 * 6, 0.56, 0.026, 0.0)                       # minute hand: 60 degrees
    hub = int(S * 0.036)
    dd.ellipse([cx - hub, cy - hub, cx + hub, cy + hub], fill=(214, 64, 40, 255))
    dd.ellipse([cx - hub * 0.4, cy - hub * 0.4, cx + hub * 0.4, cy + hub * 0.4], fill=(244, 241, 232, 255))
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
