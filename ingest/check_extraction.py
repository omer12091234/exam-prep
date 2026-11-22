"""Validates one data/exams/<course>/<key>/extraction.json and its published crops.

Usage: python3 -I ingest/check_extraction.py data/exams/intro-ee-1/<KEY>/extraction.json
"""
import json, os, re, sys

path = sys.argv[1]
key = os.path.basename(os.path.dirname(path))
course = os.path.basename(os.path.dirname(os.path.dirname(path)))
kind = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(path))))  # exams | sheets
errors = []
try:
    d = json.load(open(path, encoding="utf8"))
except Exception as e:  # noqa: BLE001
    sys.exit(f"invalid JSON: {e}")

exam = d.get("exam", {})
for f in ("match_title",):
    if not exam.get(f):
        errors.append(f"exam.{f} missing")
study = {"intro-ee-1": "data/study/intro_ee.json"}.get(course) if kind == "exams" else None
if study and exam.get("match_title"):
    titles = {e["title"] for e in json.load(open(study, encoding="utf8"))["exams"]}
    if exam["match_title"] not in titles:
        errors.append(f"exam.match_title is not an exam title in {study} (copy it exactly)")
qs = d.get("questions") or []
if not qs:
    errors.append("no questions")


def check_text(where, s, need=True):
    if not isinstance(s, str) or (need and not s.strip()):
        errors.append(f"{where}: empty")
        return
    if s.count("$") % 2:
        errors.append(f"{where}: odd number of $ (unclosed formula)")
    if "\\(" in s or re.search(r"\\\[(?!\d)", s):  # \\[2mm] inside cases is fine
        errors.append(f"{where}: use $...$ / $$...$$, not \\( \\[")
    for m in re.finditer(r"\$\$[\s\S]+?\$\$|\$[^$\n]+?\$", s):
        # Hebrew is fine inside \text{...} (KaTeX renders it); bare Hebrew in math is not.
        if re.search(r"[֐-׿]", re.sub(r"\\text\{[^{}]*\}", "", m.group(0))):
            errors.append(f"{where}: Hebrew inside math: {m.group(0)[:40]}")
            break
    if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", s):
        errors.append(f"{where}: control character (a LaTeX backslash was eaten, e.g. \\t or \\f)")


seen = set()
for q in qs:
    n = q.get("number")
    w = f"Q{n}"
    if not isinstance(n, int) or n in seen:
        errors.append(f"{w}: number must be a unique integer")
    seen.add(n)
    check_text(f"{w}.stem", q.get("stem", ""), need=False)
    regs = q.get("regions") or []
    if not regs:
        errors.append(f"{w}: no regions")
    for r in regs:
        if not (isinstance(r.get("page"), int) and len(r.get("view", [])) == 2 and len(r.get("box", [])) == 4):
            errors.append(f"{w}: region needs page, view[2], box[4]")
    subs = q.get("subs") or []
    if not subs:
        errors.append(f"{w}: no subs")
    labels = set()
    for s in subs:
        lw = f"{w}{s.get('label', '?')}"
        if s.get("label") in labels:
            errors.append(f"{lw}: duplicate label")
        labels.add(s.get("label"))
        check_text(f"{lw}.text", s.get("text", ""))
        check_text(f"{lw}.solution", s.get("solution", ""))
        if len(s.get("solution", "")) < 80:
            errors.append(f"{lw}: solution too short to be a worked solution")
        if len(s.get("box", [])) != 4 or not isinstance(s.get("lines"), int):
            errors.append(f"{lw}: needs box[4] and integer lines")

if kind == "sheets":
    if not isinstance(exam.get("sheet_number"), int):
        errors.append("exam.sheet_number (integer) missing")
    for q in qs:
        if not q.get("topics"):
            errors.append(f"Q{q.get('number')}: topics (list of topic ids) missing")
pub = f"public/{kind}/{course}-{key}"
man = f"{pub}/manifest.json"
if not os.path.exists(man):
    errors.append(f"{man} missing (run crop.py and copy the crops)")
else:
    m = json.load(open(man))
    for c in m:
        if not os.path.exists(f"{pub}/{c['file']}"):
            errors.append(f"crop file missing: {c['file']}")
    for q in qs:
        got = sum(1 for c in m if c["question"] == q.get("number") and c["role"] == "SUB")
        if got != len(q.get("subs") or []):
            errors.append(f"Q{q.get('number')}: {got} part crops for {len(q.get('subs') or [])} parts")
    extra = [f for f in os.listdir(pub) if not (f.endswith(".webp") or f == "manifest.json")]
    if extra:
        errors.append(f"unexpected files in {pub}: {extra[:3]}")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"OK: {len(qs)} questions, {sum(len(q['subs']) for q in qs)} parts")
