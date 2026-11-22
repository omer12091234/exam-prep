#!/usr/bin/env bash
# Stage finished transcriptions: validate, tag topics from the extraction, refresh repeats.
# Usage: ingest/finish.sh <course-slug> <key>...   (e.g. ingest/finish.sh dsp d01 d02)
set -euo pipefail
course=$1; shift
declare -A STUDY=([intro-ee-1]=intro_ee [dsp]=dsp [random-processes]=random)
for key in "$@"; do
  f=data/exams/$course/$key/extraction.json
  python3 -I ingest/check_extraction.py "$f"
  if python3 -I -c "import json,sys;sys.exit(0 if all(q.get('topics') for q in json.load(open('$f'))['questions']) else 1)"; then
    python3 -I ingest/set_topics.py "data/study/${STUDY[$course]}.json" "$f" --from-extraction
  else
    echo "  ($key: no topics in extraction; keeping data/study tags)"
  fi
  git add -f "data/exams/$course/$key" "public/exams/$course-$key"
done
python3 -I ingest/find_repeats.py "$course" | head -1
git add data/study data/repeats
