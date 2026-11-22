# Signal-processing exams (course `dsp`)

Follow `ingest/AGENT_BRIEF.md` with these differences.

- **Paths**: `data/exams/dsp/<KEY>/extraction.json`, crops in `public/exams/dsp-<KEY>/`, scratch
  `<SCRATCH>/dsp-<KEY>/`. Validate with
  `python3 -I ingest/check_extraction.py data/exams/dsp/<KEY>/extraction.json` (it checks that
  `match_title` is exactly a title in `data/study/dsp.json`).
- **Course**: "מבוא לעיבוד אותות" (BGU). The example exam in the brief is from another course;
  only its format matters.
- **Topics**: every question gets `"topics": [...]` with ids from
  `python3 -I -c "import json;[print(t['id'],t['title']) for t in json.load(open('data/study/dsp.json'))['topics']]"`.
- **Archive files** hold several exams (the title says which page it starts on, e.g. "עמ׳ 12").
  Transcribe only the exam named in your TITLE; use the pages of its solution to check yours.
- **Multiple-choice ("אמריקאי") parts**: each multiple-choice item is a question (or a part, as
  printed) whose `text` includes all the options, one per line. The solution explains why the
  right option is right and why the others are wrong.
- **English text**: if the exam text is in English, add `stem_he` / `text_he` translations as in
  `ingest/SHEET_BRIEF.md`.
- **Conventions**: state them in solutions ($\omega$ in rad/sample vs $\Omega$ in rad/s, DFT length
  $N$, $W_N=e^{-j2\pi/N}$, sampling period $T$).
- **Manual review**: use `"review"` on every part whose TEXT is not certain in the source (a word,
  number, sign or figure detail; see the brief). This matters especially for student
  reconstructions and handwriting. Do not use it for doubts about your own solution: say those
  inside the solution (or mark it "**פתרון חלקי – לא אומת.**").
- If the Drive download fails (file over 10 MB), stop and report it; do not guess the exam.
- **Marked answers**: if the questionnaire has the right answers highlighted or circled (common in
  multiple-choice files "עם פתרון"), use them only to check yours, and after publishing the crops
  run `python3 -I ingest/unhighlight.py public/exams/dsp-<KEY>` so the images don't give the
  answer away. Look at one cleaned crop to confirm.
