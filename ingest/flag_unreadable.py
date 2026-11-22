"""Adds a "review" note to every part whose text contains [לא קריא] and has none yet.

Usage: python3 -I ingest/flag_unreadable.py data/exams/intro-ee-1/*/extraction.json
"""
import json, sys

NOTE = "חלק מנוסח הסעיף לא היה קריא במקור (מסומן [לא קריא]); כדאי לבדוק מול התמונה או הקובץ המקורי."
for path in sys.argv[1:]:
    d = json.load(open(path, encoding="utf8"))
    n = 0
    for q in d["questions"]:
        for s in q["subs"]:
            if "[לא קריא]" in s.get("text", "") and not s.get("review"):
                s["review"] = NOTE
                n += 1
    if n:
        json.dump(d, open(path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print(path, n)
