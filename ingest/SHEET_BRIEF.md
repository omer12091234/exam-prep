# Transcribing one practice sheet (דף תרגול)

Follow `ingest/AGENT_BRIEF.md` (download, render, read, write with a Python script, crop, publish,
validate, solution rules, report) with these differences. A practice sheet is handled exactly
like an exam; only the paths and a few fields change.

You get: `COURSE` (a slug such as `dsp`), `KEY` (e.g. `s01`), the Drive `FILE_ID`, and the
sheet's number and title.

- **Paths**: write `data/sheets/<COURSE>/<KEY>/extraction.json`; publish crops to
  `public/sheets/<COURSE>-<KEY>/`; scratch is `<SCRATCH>/sheets-<COURSE>-<KEY>/`.
  Validate with `python3 -I ingest/check_extraction.py data/sheets/<COURSE>/<KEY>/extraction.json`.
- **exam** object: `match_title` = the sheet title as given (e.g. `"דף 1 – דגימה, DTFT, bandpass"`),
  `sheet_number` (integer), `drive_file_id`, `source_title` (file name in Drive), `notes`.
  No lecturer, year, date or duration.
- **topics**: every question gets `"topics": ["t2", "t5"]`, the ids of the course topics it
  practices. Get the list with
  `python3 -I -c "import json;[print(t['id'],t['title']) for t in json.load(open('data/study/<FILE>.json'))['topics']]"`
  (`dsp` → `dsp.json`, `intro-ee-1` → `intro_ee.json`, `random-processes` → `random.json`).
- **Which pages**: transcribe every exercise of the sheet. If the file also has a solution
  (lecturer's or TA's), use it only to check your answers, as with exams, and say whether it
  agreed. An exercise with no lettered parts gets one part with `"label": ""`.
- Solutions follow the same rules as for exams: complete, step by step, in Hebrew, formulas in
  `$…$`, checked. Course material is DSP / signals, so state conventions (e.g. $\omega$ in
  rad/sample, DFT length $N$, $W_N=e^{-j2\pi/N}$).
- **Translation**: when the sheet's text is in English (or any language other than Hebrew), add a
  faithful Hebrew translation next to the original: `"stem_he"` on the question (translation of
  `stem`, omit if the stem is empty) and `"text_he"` on every part (translation of `text`). Keep
  every formula exactly as in the original (same `$…$`), translate only the words; keep technical
  terms the course uses in English where natural (e.g. "aliasing", "Nyquist rate" →
  "קצב נייקוויסט (Nyquist rate)"). Hebrew sheets need no translation fields.
- **General instructions** printed at the top of a sheet (before the first exercise, e.g.
  "Answer all questions…", "Use N=8…") are not lost: put them at the start of the first
  question's `stem`, and their translation at the start of its `stem_he`.
