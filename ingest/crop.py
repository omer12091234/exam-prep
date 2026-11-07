"""Crop question / sub-question regions from rendered exam pages.

Usage: python3 -I crop.py extraction.json pages_dir out_dir

Claude supplies structure (subs, approximate boxes in "view" coordinates, and the
number of text lines per sub). This script does the pixel-exact part:
  1. deskew the page (phone scans are tilted 0.5–2°)
  2. detect real text lines with a horizontal ink projection on the right (RTL) strip
  3. assign lines to subs by order + line count (immune to box drift)
  4. cut between subs at the emptiest row of the gap, so no neighbour ascenders leak in
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageOps
import numpy as np

INK = 140  # grayscale threshold for "ink"


def ink_profile(g, x0, x1):
    return (g[:, x0:x1] < INK).sum(axis=1)


def estimate_skew(im, max_deg=3.0, step=0.1):
    """Angle (degrees) that makes text rows sharpest, found on a downscaled copy."""
    small = ImageOps.grayscale(im)
    small.thumbnail((800, 800))
    best, best_score = 0.0, -1.0
    for a in np.arange(-max_deg, max_deg + 1e-9, step):
        r = np.asarray(small.rotate(a, resample=Image.BILINEAR, fillcolor=255))
        prof = (r < INK).sum(axis=1).astype(float)
        score = float((np.diff(prof) ** 2).sum())
        if score > best_score:
            best, best_score = float(a), score
    return best


def rotate_point(x, y, W, H, deg):
    """Where (x, y) lands after PIL's im.rotate(deg) about the centre (counter-clockwise)."""
    t = math.radians(deg)
    cx, cy = W / 2, H / 2
    dx, dy = x - cx, y - cy
    return cx + dx * math.cos(t) + dy * math.sin(t), cy - dx * math.sin(t) + dy * math.cos(t)


def rotate_box(box, W, H, deg):
    pts = [rotate_point(x, y, W, H, deg) for x in (box[0], box[2]) for y in (box[1], box[3])]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def detect_lines(prof, gap=0.05, split=True):
    on = prof > max(3, 0.01 * prof.max())
    bands, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        if not v and start is not None:
            bands.append([start, i]); start = None
    if start is not None:
        bands.append([start, len(on)])
    if not bands:
        return []
    hs = sorted(b[1] - b[0] for b in bands); med = hs[len(hs) // 2]
    # merge tiny bands (sub/superscripts, integral limits) into their neighbour
    merged = []
    for b in bands:
        if merged and (b[1] - b[0] < 0.45 * med or b[0] - merged[-1][1] < gap * med):
            merged[-1][1] = b[1]
        elif merged and merged[-1][1] - merged[-1][0] < 0.45 * med:
            merged[-1][1] = b[1]
        else:
            merged.append(b)
    # split abnormally tall bands (two touching lines) at the least-ink row
    out = []
    for a, b in merged:
        while split and b - a > 1.7 * med:
            lo, hi = a + int(0.6 * med), b - int(0.6 * med)
            cut = lo + int(np.argmin(prof[lo:hi]))
            out.append([a, cut]); a = cut + 1
        out.append([a, b])
    return out


def emptiest_row(full_prof, a, b):
    """Row in [a, b) with least ink across the full width; ties → middle of the gap."""
    if b <= a:
        return a
    seg = full_prof[a:b]
    mins = np.flatnonzero(seg == seg.min())
    return a + int(mins[len(mins) // 2])


def main():
    ex, pagedir, outdir = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    data = json.load(open(ex))
    report, cache = [], {}
    for q in data["questions"]:
        r0 = q["regions"][0]; pg, vw = r0["page"], r0["view"]
        if pg not in cache:
            raw = Image.open(f"{pagedir}/p-{pg}.png").convert("RGB")
            ang = estimate_skew(raw)
            cache[pg] = (raw.rotate(ang, resample=Image.BICUBIC, fillcolor=(255, 255, 255)), ang)
        im, ang = cache[pg]
        W, H = im.size
        g = np.asarray(ImageOps.grayscale(im))
        sx, sy = W / vw[0], H / vw[1]
        subs = q["subs"]
        raw_box = (min(s["box"][0] for s in subs) * sx, min(s["box"][1] for s in subs) * sy,
                   max(s["box"][2] for s in subs) * sx, max(s["box"][3] for s in subs) * sy)
        bx0, by0, bx1, by1 = (int(v) for v in rotate_box(raw_box, W, H, ang))
        bx0, bx1 = max(0, bx0), min(W, bx1)
        m = int(0.012 * H)
        y0, y1 = max(0, by0 - m), min(H, by1 + m)
        strip = ink_profile(g, bx1 - int(0.30 * (bx1 - bx0)), bx1)[y0:y1]
        full = ink_profile(g, bx0, bx1)
        want = sum(s["lines"] for s in subs)
        lines = []
        for gap, split in [(0.05, True), (0.15, True), (0.3, True), (0.15, False), (0.3, False)]:
            lines = [(y0 + a, y0 + b) for a, b in detect_lines(strip, gap, split)]
            lines = [l for l in lines if l[1] > by0 - m // 3 and l[0] < by1 + m // 3]
            if len(lines) == want:
                break
        ok = len(lines) == want
        ov = im.copy(); d = ImageDraw.Draw(ov)
        pad = int(0.006 * H)
        if ok:
            groups, k = [], 0
            for s in subs:
                groups.append(lines[k:k + s["lines"]]); k += s["lines"]
            # boundaries: emptiest row between consecutive subs; outer edges padded
            cuts = [max(0, groups[0][0][0] - pad)]
            for prev, nxt in zip(groups, groups[1:]):
                cuts.append(emptiest_row(full, prev[-1][1], nxt[0][0]))
            cuts.append(min(H, groups[-1][-1][1] + pad))
            spans = list(zip(cuts, cuts[1:]))
        else:  # fall back to Claude's boxes (flag for manual review)
            spans = [(int(rotate_box((0, s["box"][1] * sy, 0, s["box"][1] * sy), W, H, ang)[1]),
                      int(rotate_box((0, s["box"][3] * sy, 0, s["box"][3] * sy), W, H, ang)[1]))
                     for s in subs]
        for s, (top, bot) in zip(subs, spans):
            box = (max(0, bx0 - pad), top, min(W, bx1 + pad), bot)
            im.crop(box).save(f"{outdir}/Q{q['number']}_{s['label']}.png")
            d.rectangle(box, outline=(230, 0, 0), width=5)
        # stem / figure regions (a question may have several, e.g. a circuit after the subs)
        for i, r in enumerate(q["regions"]):
            if r["page"] != pg:
                continue  # TODO: multi-page questions
            rsx, rsy = W / r["view"][0], H / r["view"][1]
            x0, y0r, x1, y1r = rotate_box([v * s for v, s in zip(r["box"], (rsx, rsy, rsx, rsy))], W, H, ang)
            box = (max(0, int(x0) - pad), max(0, int(y0r) - pad), min(W, int(x1) + pad), min(H, int(y1r) + pad))
            im.crop(box).save(f"{outdir}/Q{q['number']}_stem{i + 1}.png")
            d.rectangle(box, outline=(0, 90, 255), width=5)
        for a, b in lines:
            d.line((min(W - 10, bx1 + 15), a, min(W - 10, bx1 + 15), b), fill=(0, 160, 0), width=8)
        ov.thumbnail((1100, 1500)); ov.save(f"{outdir}/overlay_Q{q['number']}.jpg", quality=80)
        report.append((q["number"], "line-order" if ok else "box-fallback(review)", len(lines), want, ang))
    for r in report:
        print("Q%d %s detected=%d expected=%d skew=%.1f°" % r)


if __name__ == "__main__":
    main()
