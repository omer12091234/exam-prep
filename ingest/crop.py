import json, sys, os
from PIL import Image, ImageDraw, ImageOps
import numpy as np
ex, pagedir, outdir = sys.argv[1:4]
os.makedirs(outdir, exist_ok=True)
data = json.load(open(ex))
def detect_lines(im, x0, y0, x1, y1, gap=0.05, split=True):
    g = np.asarray(ImageOps.grayscale(im.crop((x0, y0, x1, y1))))
    prof = (g < 140).sum(axis=1)
    on = prof > max(3, 0.01 * (x1 - x0))
    bands, start = [], None
    for i, v in enumerate(on):
        if v and start is None: start = i
        if not v and start is not None: bands.append([start, i]); start = None
    if start is not None: bands.append([start, len(on)])
    if not bands: return []
    hs = sorted(b[1] - b[0] for b in bands); med = hs[len(hs) // 2]
    # merge tiny bands (sub/superscripts, integral limits) into nearest neighbour
    merged = []
    for b in bands:
        if merged and (b[1] - b[0] < 0.45 * med or b[0] - merged[-1][1] < gap * med):
            merged[-1][1] = b[1]
        elif merged and (merged[-1][1] - merged[-1][0] < 0.45 * med):
            merged[-1][1] = b[1]
        else:
            merged.append(b)
    # split abnormally tall bands (two lines touching) at the least-ink row
    out = []
    for a, b in merged:
        while split and b - a > 1.7 * med:
            lo, hi = a + int(0.6 * med), b - int(0.6 * med)
            cut = lo + int(np.argmin(prof[lo:hi]))
            out.append([a, cut]); a = cut + 1
        out.append([a, b])
    return [(y0 + a, y0 + b) for a, b in out]
report = []
for q in data["questions"]:
    r0 = q["regions"][0]; pg, vw = r0["page"], r0["view"]
    im = Image.open(f"{pagedir}/p-{pg}.png").convert("RGB"); W, H = im.size
    sx, sy = W / vw[0], H / vw[1]
    subs = q["subs"]
    bx0 = int(min(s["box"][0] for s in subs) * sx); bx1 = int(max(s["box"][2] for s in subs) * sx)
    by0 = int(min(s["box"][1] for s in subs) * sy); by1 = int(max(s["box"][3] for s in subs) * sy)
    m = int(0.012 * H)
    strip0 = bx1 - int(0.30 * (bx1 - bx0))
    want = sum(s["lines"] for s in subs)
    for gap, split in [(0.05, True), (0.15, True), (0.3, True), (0.15, False), (0.3, False)]:
        lines = detect_lines(im, strip0, by0 - m, bx1, by1 + m, gap, split)
        # drop lines that lie entirely in the margin we added (belong to neighbours)
        lines = [l for l in lines if l[1] > by0 - m // 3 and l[0] < by1 + m // 3]
        if len(lines) == want: break
    mode = "line-order" if len(lines) == want else "box-fallback"
    ov = im.copy(); d = ImageDraw.Draw(ov)
    k = 0
    for s in subs:
        if mode == "line-order":
            seg = lines[k:k + s["lines"]]; k += s["lines"]
            top, bot = seg[0][0], seg[-1][1]
        else:
            top, bot = int(s["box"][1] * sy), int(s["box"][3] * sy)
        pad = int(0.004 * H)
        box = (max(0, bx0 - pad), max(0, top - pad), min(W, bx1 + pad), min(H, bot + pad))
        im.crop(box).save(f"{outdir}/Q{q['number']}_{s['label']}.png")
        d.rectangle(box, outline=(230, 0, 0), width=5)
    for a, b in lines: d.line((bx1 + 15, a, bx1 + 15, b), fill=(0, 160, 0), width=8)
    ov.thumbnail((1100, 1500)); ov.save(f"{outdir}/overlay_Q{q['number']}.jpg", quality=80)
    report.append((q["number"], mode, len(lines), want))
for r in report: print("Q%d %s detected=%d expected=%d" % r)
