"""Finds questions that repeat across exams of a course, from the exact transcriptions.

Usage: python3 -I ingest/find_repeats.py intro-ee-1
Writes data/repeats/<course>.json, which the import (prisma/import-study.ts) loads.

Two questions count as a repeat when most of their parts match (each part's text is compared
after removing spacing, punctuation and point values), or when the whole question is nearly
identical. Re-run after adding exams and commit the output.
"""
import difflib, glob, json, os, re, sys

course = sys.argv[1]
PART_MATCH = 0.85  # a part "appears" in the other question above this similarity
WHOLE_MATCH = 0.85  # whole-question similarity that counts as a repeat by itself


def norm(s):
    s = re.sub(r"\[\d+%?\]|\(\d+ ?נק[^)]*\)", "", s)
    return re.sub(r"[\s.,:;()\[\]{}'\"!?\-–]+", "", s)


qs = []
for f in sorted(glob.glob(f"data/exams/{course}/*/extraction.json")):
    d = json.load(open(f, encoding="utf8"))
    title = d["exam"]["match_title"]
    for q in d["questions"]:
        parts = [norm(s["text"]) for s in q["subs"]]
        qs.append({"title": title, "number": q["number"], "parts": parts,
                   "whole": norm(q.get("stem", "")) + "".join(parts)})


def same_parts(a, b):
    return sum(1 for p in a["parts"] if any(difflib.SequenceMatcher(None, p, o).ratio() >= PART_MATCH for o in b["parts"]))


pairs = []
for i, a in enumerate(qs):
    for b in qs[i + 1:]:
        if a["title"] == b["title"]:
            continue
        sim = difflib.SequenceMatcher(None, a["whole"], b["whole"]).ratio()
        if sim < 0.45:
            continue
        sa, sb = same_parts(a, b), same_parts(b, a)
        smaller = min(len(a["parts"]), len(b["parts"]))
        if sim >= WHOLE_MATCH or (min(sa, sb) >= 2 and min(sa, sb) >= smaller / 2):
            pairs.append({"a": {"title": a["title"], "number": a["number"], "same": sa, "parts": len(a["parts"])},
                          "b": {"title": b["title"], "number": b["number"], "same": sb, "parts": len(b["parts"])},
                          "similarity": round(sim, 3)})

os.makedirs("data/repeats", exist_ok=True)
out = f"data/repeats/{course}.json"
json.dump(pairs, open(out, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(f"{len(qs)} questions, {len(pairs)} repeat pairs → {out}")
for p in pairs:
    print(f"  {p['similarity']:.2f}  {p['a']['title'][:40]} ש{p['a']['number']} ({p['a']['same']}/{p['a']['parts']})"
          f"  ↔  {p['b']['title'][:40]} ש{p['b']['number']} ({p['b']['same']}/{p['b']['parts']})")
