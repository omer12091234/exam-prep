"""Removes yellow/green marker highlights (e.g. the marked right answer of a multiple-choice
question) from published crops, so the image does not give the answer away.

Usage: python3 -I ingest/unhighlight.py public/exams/<course>-<key>
"""
import glob, sys
from PIL import Image

for path in sorted(glob.glob(f"{sys.argv[1]}/*.webp")):
    im = Image.open(path).convert("RGB")
    px = im.load()
    n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = px[x, y]
            # yellow tint (marker, or ink blended with it): much less blue than red+green.
            # Map to gray by the red/green brightness: marker -> white, ink on marker -> dark.
            if (b < 0.8 * min(r, g) and min(r, g) > 60) or (b < 0.95 * min(r, g) and min(r, g) > 200):
                v = (r + g) // 2
                v = 255 if v > 200 else v
                px[x, y] = (v, v, v)
                n += 1
    if n > 50:
        im.save(path, "WEBP", quality=90)
        print(path, n)
