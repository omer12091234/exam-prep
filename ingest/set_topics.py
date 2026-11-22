"""Sets the topic tags (or: <study.json> <extraction.json> --from-extraction)

Sets the topic tags of one exam in data/study/<file>.json from its full transcription.

Usage: python3 -I ingest/set_topics.py <study.json> <extraction.json> "1:t10,t6" "2:t7,t12" ...
Each question becomes one item covering all its parts (difficulty 3 unless given as 1:t10,t6@2).
"""
import json, sys

study, extraction, *specs = sys.argv[1:]
ext = json.load(open(extraction, encoding="utf8"))
title = ext["exam"]["match_title"]
if specs == ["--from-extraction"]:
    specs = [f"{q['number']}:{','.join(q['topics'])}" for q in ext["questions"] if q.get("topics")]
d = json.load(open(study, encoding="utf8"))
exam = next(e for e in d["exams"] if e["title"] == title)
items = []
for spec in specs:
    num, rest = spec.split(":")
    topics, _, diff = rest.partition("@")
    items.append({"num": num, "description": "", "topics": topics.split(","), "difficulty": int(diff or 3)})
exam["questions"] = items
exam["has_solution"] = exam.get("has_solution", False)
json.dump(d, open(study, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(f"{title}: {len(items)} questions tagged")
