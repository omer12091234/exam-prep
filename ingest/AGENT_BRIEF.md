# Transcribing one exam (brief for an ingest agent)

You get one exam of the course "מבוא להנדסת חשמל" (BGU): a `KEY`, the exact `TITLE`, and a
Google Drive `FILE_ID`. Produce a fully transcribed exam the site can show: exact Hebrew
text of every question part, a crop of every figure and part, and a complete worked solution
per part. Work only inside the paths named below. Do not run git, do not touch the database,
do not edit any other file in the repository.

A finished example to imitate (same lecturer, same format):
`data/exams/intro-ee-1/2022A2/extraction.json` and `public/exams/intro-ee-1-2022A2/`.

## Steps

1. **Download** the file with the Google Drive tool `download_file_content` (fileId = FILE_ID).
   The tool saves the PDF (or image) to disk and tells you the path. Copy it to
   `<SCRATCH>/<KEY>/pdf/exam.pdf` where `<SCRATCH>` is
   `/tmp/claude-0/-home-user-exam-prep/3498c344-cdc6-54a1-9788-9bc2380c82c2/scratchpad/ingest`.
   If the download fails (file too large, not found), stop and report that — do not invent content.
2. **Render pages**: `pdftoppm -r 110 -jpeg exam.pdf <SCRATCH>/<KEY>/pages/p`. The crop script
   needs files named `p-1.jpg`, `p-2.jpg`, … (rename `p-01.jpg` → `p-1.jpg` if pdftoppm pads).
   Also render at `-r 220` into another folder and cut zooms with PIL when small text is hard
   to read. Try `pdftotext -layout` first: if the PDF has a text layer, use it to check your reading.
3. **Read every page** (Read tool on the jpg). Identify which pages are the questionnaire and
   which are solutions (lecturer or student handwriting). Transcribe only the questionnaire as
   the questions; use any solution pages to check your own answers.
4. **Write `data/exams/intro-ee-1/<KEY>/extraction.json`** in the format below. Build it with a
   Python script that uses `json.dump(..., ensure_ascii=False, indent=1)` — do not hand-write
   JSON, the LaTeX backslashes will break it. In Python source write LaTeX with doubled
   backslashes (`"\\tau"`) or raw strings.
5. **Crop**: from the repository root run
   `python3 -I ingest/crop.py data/exams/intro-ee-1/<KEY>/extraction.json <SCRATCH>/<KEY>/pages <SCRATCH>/<KEY>/out`
   then **look at every `overlay_Q*.jpg`** it wrote. Blue = stem/figure regions, red = parts.
   Each red box must cover exactly its part's lines and each blue box the question header,
   intro text and figure. Fix the boxes / line counts in your script and re-run until right.
   "box-fallback(review)" in the output is acceptable if the overlay looks right.
6. **Publish crops**: copy `<SCRATCH>/<KEY>/out/*.webp` and `manifest.json` to
   `public/exams/intro-ee-1-<KEY>/` (create it). Do not copy overlays or page images into the repo.
7. **Validate**: run `python3 -I ingest/check_extraction.py data/exams/intro-ee-1/<KEY>/extraction.json`
   and fix everything it reports.

## extraction.json

```json
{
 "exam": {
  "match_title": "<TITLE exactly as given>",
  "drive_file_id": "<FILE_ID>",
  "source_title": "<file name from Drive>",
  "lecturer": "גיא כהן",
  "year": 2022, "date": "2022-03-10",          // date only if printed on the exam
  "duration_minutes": 180,                       // only if printed
  "aids": "…",                                   // "חומר עזר" line, only if printed
  "notes": "anything a reader must know: reconstructed by students, a page is missing, …"
 },
 "questions": [
  {
   "number": 1, "points": 40,
   "stem": "the intro text of the question, exact, with $LaTeX$",
   "figures": ["one short Hebrew description per figure (circuit topology, graph axes…)"],
   "regions": [ {"page": 1, "view": [910, 1287], "box": [x0, y0, x1, y1]} ],
   "subs": [
    {"label": "א", "points": 5, "text": "exact text of the part", "box": [x0,y0,x1,y1],
     "lines": 1, "solution": "full worked solution in Markdown"}
   ]
  }
 ]
}
```

- `view` is the pixel size of the 110-dpi page image you measured the boxes on; `box` is in
  those pixels. `regions[0]` is the question header + intro + main figure; add more regions for
  figures that appear elsewhere (e.g. a second circuit between parts). `lines` = number of
  printed text lines of the part.
- All parts of a question must be on the page of `regions[0]`. If a question continues on the
  next page, stitch the two page images vertically into one tall image (PIL), save it as a new
  page number (e.g. `p-101.jpg`), and measure all of that question's boxes on it.
- A question with no lettered parts gets one part with `"label": ""`.
- A sentence that sits between parts ("מכאן ואילך נתון …") goes at the start of the next
  part's text, and into its box and line count.
- Text: Hebrew exactly as printed (fix nothing but obvious scan artefacts), every formula and
  symbol in LaTeX inside `$…$`. Do not use `\(…\)`. Do not put Hebrew inside math.
- Points: as printed (`[5%]` → 5). Omit when not printed.
- If something is illegible, transcribe what you can and write `[לא קריא]` at that spot, and
  mention it in `exam.notes`. Never guess numbers.
- Student handwriting on the questionnaire is noise: not part of the text. Keep boxes off it
  when possible.

## Solutions

Write for a first-year student preparing for this exam: every part gets a complete solution
that can be followed step by step, in Hebrew, Markdown, formulas in `$…$` and displayed
formulas in `$$…$$` on their own lines.

- Solve it yourself first, from the exact text and figure. State the conventions you use
  (current direction, sign of voltages). Give the governing equation, the derivation, the final
  answer, and a short check (units, limit case, substitution back, initial condition).
- Later parts may use earlier results; say which.
- If the file contains a lecturer or student solution, compare final answers. If they differ,
  re-derive; if you still disagree, keep yours and add a line
  "*הערה: בפתרון הסרוק שבקובץ התקבל … — נראה ששם …*".
- If the question text is ambiguous or data is missing, say so in the solution and state the
  assumption you made.
- No filler, no "great question". Use `**bold**` labels for steps, short paragraphs.
- Double-check algebra of every final answer by substituting numbers or a limit case before
  writing it down. A wrong solution is worse than none: if you cannot solve a part with
  confidence, write what you have and start the solution with "**פתרון חלקי – לא אומת.**".

## Report back (your final message)

Plain text, short:
- KEY, number of questions and parts written, pages in the file and which were questionnaire.
- Crop status per question (line-order or box-fallback) and whether overlays looked right.
- Anything illegible, ambiguous, missing, or any part marked partial.
- Whether a solution in the file agreed with yours.
