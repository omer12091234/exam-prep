/**
 * Imports the analysed course files in data/study (intro_ee, dsp, random + dsp_lectures):
 * topics with summaries, exams with tagged question parts, practice questions, lectures,
 * and a default grading skill per course.
 *
 * Safe to re-run (it runs on every deploy): ids are derived from the content keys, existing
 * rows are updated in place and nothing a user's progress points at is deleted.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runtimeDbUrl } from "../src/lib/dburl";
import {
  importDetailed,
  importRepeats,
  loadDetailed,
  type Detailed,
} from "./detailed";

type Item = {
  num: string;
  description: string;
  topics: string[];
  difficulty: number;
};
type CourseFile = {
  course: { name: string; code: string };
  topics: {
    id: string;
    title: string;
    summary_html: string;
    formulas: string[];
    pitfalls: string[];
  }[];
  exams: {
    title: string;
    year: string;
    term: string;
    url: string;
    has_solution: boolean;
    questions: Item[];
  }[];
  practice: {
    topic: string;
    difficulty: number;
    question: string;
    hint?: string;
    solution?: string;
  }[];
};
type Lectures = {
  lectures: {
    num: number;
    title: string;
    source_url?: string;
    note?: string;
    html: string;
  }[];
};

const FILES = [
  { file: "intro_ee", slug: "intro-ee-1" },
  { file: "dsp", slug: "dsp" },
  { file: "random", slug: "random-processes" },
];
const LECTURERS = [
  "גיא כהן",
  "תימור מלמד",
  "יגאל ביליק",
  "יקיר חדד",
  "ניר שלזינגר",
  "תרצה רוטנברג",
  "בועז רפאלי",
  "אסף כהן",
  "פרנצוס",
  "טבריקיאן",
  "מתן גל",
];
/** How a lecturer may appear in a title when the full name is not used. */
const ALIASES: Record<string, string> = {
  תימור: "תימור מלמד",
  ביליק: "יגאל ביליק",
};
/** The hand-checked example exam (seed.ts); the import only adds topics to it. */
const SEEDED = {
  slug: "intro-ee-1",
  importKey: "seed:intro-ee-1:2023A1",
  // Matched by exact title: year + moed alone also matched other 2023 moed A exams.
  title: "מבחן 2023 סמסטר א' מועד א' (גיא כהן)",
};

const read = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
const id = (...parts: string[]) =>
  createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 24);
const HEB = "אבגדהוזחטיכלמנסעפצקרשת";

function lecturerOf(title: string) {
  const full = LECTURERS.find((n) => title.includes(n));
  if (full) return full;
  const alias = Object.keys(ALIASES).find((a) => title.includes(a));
  return alias ? ALIASES[alias] : null;
}

function examMeta(title: string, term: string) {
  const t = `${title} ${term}`;
  const moed = Math.max(
    1,
    "אבגד".indexOf((term.match(/מועד ([אבגד])/) ?? [])[1] ?? "א") + 1,
  );
  const semester = /קיץ/.test(t)
    ? "SUMMER"
    : /סמסטר ב|אביב/.test(t)
      ? "B"
      : "A";
  const origin = /שחזור|שוחזר/.test(t)
    ? "RESTORED"
    : /ניסיון|לדוגמה/.test(t)
      ? "PRACTICE"
      : "OFFICIAL";
  return { moed, semester, origin } as const;
}

/** "1א-ב" → question 1, part "א-ב". "א8-9" (exam numbered by part) → its own question. */
function splitNum(num: string) {
  const m = num.match(/^(\d+)(.*)$/);
  return m
    ? { group: m[1], number: Number(m[1]), part: m[2].trim(), label: null }
    : { group: num, number: null, part: "", label: num };
}

/** Letters covered by a part label: "א-ד" → א,ב,ג,ד; "ה" → ה; "" → everything. */
function lettersOf(part: string) {
  const m = part.match(/^([א-ת])(?:\s*[-–]\s*([א-ת]))?/);
  if (!m) return null;
  const a = HEB.indexOf(m[1]);
  const b = m[2] ? HEB.indexOf(m[2]) : a;
  return [...HEB.slice(a, b + 1)];
}

async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: runtimeDbUrl(),
      max: 1,
    }),
  });

  for (const { file, slug } of FILES) {
    const data = read<CourseFile>(`data/study/${file}.json`);
    const number = data.course.code.replaceAll(".", "");
    const course = await db.course.upsert({
      where: { slug },
      update: { name: data.course.name, number },
      create: { slug, name: data.course.name, number, institution: "BGU" },
    });

    // ── topics ──
    const topicId = new Map<string, string>();
    for (const [order, t] of data.topics.entries()) {
      const fields = {
        name: t.title,
        order,
        summaryHtml: t.summary_html,
        formulas: t.formulas ?? [],
        pitfalls: t.pitfalls ?? [],
      };
      const row = await db.topic.upsert({
        where: { courseId_key: { courseId: course.id, key: t.id } },
        update: fields,
        create: {
          id: id(slug, "topic", t.id),
          courseId: course.id,
          key: t.id,
          ...fields,
        },
      });
      topicId.set(t.id, row.id);
    }

    // ── practice questions (nothing references them, so they are simply replaced) ──
    await db.practiceQuestion.deleteMany({
      where: { topic: { courseId: course.id } },
    });
    await db.practiceQuestion.createMany({
      data: data.practice
        .filter((p) => topicId.has(p.topic))
        .map((p, order) => ({
          id: id(slug, "practice", String(order)),
          topicId: topicId.get(p.topic)!,
          order,
          difficulty: p.difficulty,
          question: p.question,
          hint: p.hint,
          solution: p.solution,
        })),
    });

    // ── lecturers ──
    const lecturerId = new Map<string, string>();
    for (const name of new Set(
      data.exams
        .map((e) => lecturerOf(e.title))
        .filter((n): n is string => !!n),
    )) {
      const l = await db.lecturer.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      lecturerId.set(name, l.id);
    }

    // ── exams ──
    const exams: { id: string; data: object }[] = [];
    const questions: {
      id: string;
      examId: string;
      number: number;
      label: string | null;
      stemText: string;
      needsReview: boolean;
    }[] = [];
    const subs: {
      id: string;
      questionId: string;
      label: string;
      order: number;
      text: string;
      difficulty: number;
    }[] = [];
    const links: { subQuestionId: string; topicId: string }[] = [];

    const detailed = loadDetailed(slug);
    const detailedExams: { examId: string; items: Item[]; detail: Detailed }[] =
      [];

    for (const e of data.exams) {
      if (slug === SEEDED.slug && e.title === SEEDED.title) {
        const seeded = detailed.get(e.title)
          ? await db.exam.findUnique({
              where: { importKey: SEEDED.importKey },
              select: { id: true },
            })
          : null;
        if (seeded) {
          // Fully transcribed since: handled like any detailed exam.
          detailedExams.push({
            examId: seeded.id,
            items: e.questions,
            detail: detailed.get(e.title)!,
          });
          continue;
        }
        links.push(
          ...(await tagExam(
            db,
            { importKey: SEEDED.importKey },
            e.questions,
            topicId,
          )),
        );
        continue;
      }
      const examId = id(slug, "exam", e.title);
      const name = lecturerOf(e.title);
      exams.push({
        id: examId,
        data: {
          courseId: course.id,
          importKey: `${slug}:${examId}`,
          title: e.title,
          year: Number(e.year) || 0,
          ...examMeta(e.title, e.term),
          lecturerId: name ? lecturerId.get(name) : null,
          sourceUrl: e.url,
          hasSolution: e.has_solution,
          durationMinutes: 180,
          published: true,
        },
      });
      const detail = detailed.get(e.title);
      if (detail) {
        // Exact text, crops and solutions come from data/exams; only the topics are taken from here.
        detailedExams.push({ examId, items: e.questions, detail });
        continue;
      }
      const groups = new Map<string, { qid: string; count: number }>();
      const usedLabels = new Set<string>();
      for (const item of e.questions) {
        const n = splitNum(item.num);
        let g = groups.get(n.group);
        if (!g) {
          g = { qid: id(examId, "q", n.group), count: 0 };
          groups.set(n.group, g);
          questions.push({
            id: g.qid,
            examId,
            // Exams numbered by part get running numbers; the label keeps the original.
            number: n.number ?? 1000 + groups.size,
            label: n.label,
            stemText: "",
            needsReview: false,
          });
        }
        let label = n.part;
        while (usedLabels.has(`${g.qid}:${label}`)) label += "′";
        usedLabels.add(`${g.qid}:${label}`);
        const sid = id(g.qid, "s", item.num, String(g.count));
        subs.push({
          id: sid,
          questionId: g.qid,
          label,
          order: ++g.count,
          text: item.description,
          difficulty: item.difficulty,
        });
        for (const t of new Set(item.topics))
          if (topicId.has(t))
            links.push({ subQuestionId: sid, topicId: topicId.get(t)! });
      }
    }

    // Exams: few rows, upsert one by one. Questions/subs: create the new ones in bulk and
    // update only rows whose text changed, so a re-run is a handful of queries.
    for (const e of exams) {
      await db.exam.upsert({
        where: { id: e.id },
        update: e.data,
        create: { id: e.id, ...e.data } as never,
      });
    }
    for (const x of detailedExams) {
      await importDetailed(db, x.examId, course.id, x.detail);
      links.push(...(await tagExam(db, { id: x.examId }, x.items, topicId)));
    }
    // ── practice sheets (data/sheets/<slug>): stored as exams of kind SHEET ──
    const sheets = [...loadDetailed(slug, "sheets").values()];
    const sheetIds = sheets.map((sh) => id(slug, "sheet", sh.key));
    await db.exam.deleteMany({
      where: { courseId: course.id, kind: "SHEET", id: { notIn: sheetIds } },
    });
    for (const sh of sheets) {
      const examId = id(slug, "sheet", sh.key);
      const fields = {
        courseId: course.id,
        kind: "SHEET" as const,
        sheetNumber: sh.exam.sheet_number ?? null,
        title: sh.exam.match_title,
        importKey: `${slug}:sheet:${sh.key}`,
        year: 0,
        semester: "A" as const,
        moed: 1,
        origin: "OFFICIAL" as const,
        sourceUrl: sh.exam.drive_file_id
          ? `https://drive.google.com/file/d/${sh.exam.drive_file_id}/view`
          : null,
        hasSolution: false,
        durationMinutes: null,
        published: true,
      };
      await db.exam.upsert({
        where: { id: examId },
        update: fields,
        create: { id: examId, ...fields },
      });
      await importDetailed(db, examId, course.id, sh);
      for (const q of sh.questions) {
        const qid = id(examId, "dq", String(q.number));
        for (const s of q.subs)
          for (const t of new Set(q.topics ?? []))
            if (topicId.has(t))
              links.push({
                subQuestionId: id(qid, "ds", s.label),
                topicId: topicId.get(t)!,
              });
      }
    }
    if (sheets.length) console.log(`${slug}: ${sheets.length} practice sheets`);

    await importRepeats(db, slug, course.id, (title) =>
      id(slug, "exam", title),
    );
    await db.question.createMany({ data: questions, skipDuplicates: true });
    const have = new Map(
      (
        await db.subQuestion.findMany({
          where: { question: { exam: { courseId: course.id } } },
          select: {
            id: true,
            text: true,
            label: true,
            order: true,
            difficulty: true,
          },
        })
      ).map((s) => [s.id, s]),
    );
    await db.subQuestion.createMany({
      data: subs.filter((s) => !have.has(s.id)),
    });
    let changed = 0;
    for (const s of subs) {
      const old = have.get(s.id);
      if (
        old &&
        (old.text !== s.text ||
          old.label !== s.label ||
          old.order !== s.order ||
          old.difficulty !== s.difficulty)
      ) {
        await db.subQuestion.update({
          where: { id: s.id },
          data: {
            text: s.text,
            label: s.label,
            order: s.order,
            difficulty: s.difficulty,
          },
        });
        changed++;
      }
    }
    await db.subQuestionTopic.deleteMany({
      where: { topic: { courseId: course.id } },
    });
    await db.subQuestionTopic.createMany({ data: links, skipDuplicates: true });

    // ── grading skill (kept if an admin already edited it) ──
    const skillPath = `data/grading/${file}.md`;
    if (existsSync(skillPath)) {
      const skillMd = `${readFileSync("data/grading/base.md", "utf8")}\n\n${readFileSync(skillPath, "utf8")}`;
      await db.gradingProfile.upsert({
        where: { courseId: course.id },
        update: {},
        create: { courseId: course.id, skillMd },
      });
    }

    console.log(
      `${slug}: ${data.topics.length} topics, ${exams.length} exams, ${subs.length} question parts (${changed} updated), ${data.practice.length} practice`,
    );
  }

  // ── translated lectures (signal processing) ──
  const dsp = await db.course.findUnique({ where: { slug: "dsp" } });
  if (dsp && existsSync("data/study/dsp_lectures.json")) {
    const { lectures } = read<Lectures>("data/study/dsp_lectures.json");
    for (const [order, l] of lectures.entries()) {
      const fields = {
        title: l.title,
        order,
        note: l.note,
        sourceUrl: l.source_url,
        html: l.html,
      };
      await db.courseDoc.upsert({
        where: { courseId_key: { courseId: dsp.id, key: id(l.title) } },
        update: fields,
        create: { courseId: dsp.id, key: id(l.title), ...fields },
      });
    }
    console.log(`dsp: ${lectures.length} lectures`);
  }
  await db.$disconnect();
}

/** Tags the parts of a fully transcribed exam with the topics of the matching import items ("1א-ד" → א…ד of question 1). */
async function tagExam(
  db: PrismaClient,
  where: { id: string } | { importKey: string },
  items: Item[],
  topicId: Map<string, string>,
) {
  const exam = await db.exam.findUnique({
    where,
    include: { questions: { include: { subQuestions: true } } },
  });
  if (!exam) return [];
  const links: { subQuestionId: string; topicId: string }[] = [];
  for (const item of items) {
    const n = splitNum(item.num);
    const q = exam.questions.find((x) => x.number === n.number);
    if (!q) continue;
    const letters = lettersOf(n.part);
    for (const s of q.subQuestions) {
      if (letters && !letters.includes(s.label.trim()[0])) continue;
      if (s.difficulty == null)
        await db.subQuestion.update({
          where: { id: s.id },
          data: { difficulty: item.difficulty },
        });
      for (const t of new Set(item.topics))
        if (topicId.has(t))
          links.push({ subQuestionId: s.id, topicId: topicId.get(t)! });
    }
  }
  return links;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
