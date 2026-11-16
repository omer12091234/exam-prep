import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { examTitle } from "@/lib/courses";

export const GRADING_MODEL = "claude-opus-5-5";
export const gradingConfigured = () => !!process.env.ANTHROPIC_API_KEY;

/** Vercel caps a request body at 4.5 MB; leave room for the multipart overhead. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const UPLOAD_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
type UploadType = (typeof UPLOAD_TYPES)[number];
export type Upload = { name: string; type: UploadType; base64: string };

const FALLBACK_SKILL =
  "אתה בודק מבחנים מנוסה. בדוק את פתרון הסטודנט סעיף אחר סעיף, תן ניקוד, הערות, תיקונים וטיפים שהתפספסו. כתוב בעברית, Markdown, נוסחאות ב-$...$. בשורה האחרונה כתוב SCORE: X/Y.";

/** Everything the grader should know about the exam (or one question of it). */
async function examContext(examId: string, questionId: string | null) {
  const exam = await db.exam.findUniqueOrThrow({
    where: { id: examId },
    include: {
      course: { include: { gradingProfile: true } },
      questions: {
        where: questionId ? { id: questionId } : undefined,
        orderBy: { number: "asc" },
        include: {
          subQuestions: {
            orderBy: { order: "asc" },
            include: {
              comments: true,
              topics: {
                include: { topic: { select: { name: true, pitfalls: true } } },
              },
            },
          },
        },
      },
    },
  });

  const lines: string[] = [
    `קורס: ${exam.course.name}`,
    `מבחן: ${examTitle(exam)}`,
  ];
  if (questionId) lines.push("נשלחה לבדיקה שאלה אחת בלבד מתוך המבחן.");
  const pitfalls = new Map<string, string[]>();
  for (const q of exam.questions) {
    lines.push(
      "",
      `## שאלה ${q.label ?? q.number}${q.points ? ` (${q.points} נקודות)` : ""}`,
    );
    if (q.stemText) lines.push(q.stemText);
    if (q.figuresNote) lines.push(`שרטוטים: ${q.figuresNote}`);
    for (const s of q.subQuestions) {
      lines.push(
        `- ${s.label ? `סעיף ${s.label}` : "השאלה"}${s.points ? ` [${s.points} נק']` : ""}: ${s.text}`,
      );
      for (const c of s.comments) {
        lines.push(
          `  - הערת בודק ממבחן אמיתי על הסעיף הזה: ${c.text}${c.pointsLost ? ` (ירדו ${c.pointsLost} מתוך ${c.maxPoints})` : ""}`,
        );
      }
      for (const t of s.topics) pitfalls.set(t.topic.name, t.topic.pitfalls);
    }
  }
  if (!exam.questions.some((q) => q.stemText)) {
    lines.push(
      "",
      "שים לב: לשאלות האלה יש במערכת רק תיאור מקוצר ולא הנוסח המלא עם הנתונים. אם הסטודנט צירף את השאלון, השתמש בו. אחרת בדוק את הדרך והעקביות, ואמור במפורש אילו תוצאות מספריות לא יכולת לאמת.",
    );
  }
  if (pitfalls.size > 0) {
    lines.push("", "## טעויות נפוצות בנושאי השאלות");
    for (const [name, list] of pitfalls)
      lines.push(`### ${name}`, ...list.map((p) => `- ${p}`));
  }
  return {
    context: lines.join("\n"),
    skill: exam.course.gradingProfile?.skillMd ?? FALLBACK_SKILL,
  };
}

/** Runs the check and stores the report. Never throws: a failure is stored on the row. */
export async function runGrading(gradingId: string, uploads: Upload[]) {
  try {
    const grading = await db.grading.findUniqueOrThrow({
      where: { id: gradingId },
    });
    const { context, skill } = await examContext(
      grading.examId,
      grading.questionId,
    );
    const client = new Anthropic();

    const files: Anthropic.ContentBlockParam[] = uploads.map((u) =>
      u.type === "application/pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: u.type, data: u.base64 },
          }
        : {
            type: "image",
            source: { type: "base64", media_type: u.type, data: u.base64 },
          },
    );
    // A long report with thinking can take minutes → stream, then take the final message.
    const message = await client.messages
      .stream({
        model: GRADING_MODEL,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        // The skill is identical for every check in a course → cache it.
        system: [
          { type: "text", text: skill, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: [
              ...files,
              {
                type: "text",
                text: `${context}\n\nהקבצים המצורפים הם הפתרון של הסטודנט. בדוק אותו לפי ההנחיות והחזר את דוח הבדיקה.`,
              },
            ],
          },
        ],
      })
      .finalMessage();

    if (message.stop_reason === "refusal")
      throw new Error("המודל סירב לבדוק את הקובץ הזה.");
    let report = message.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
    if (!report) throw new Error("לא התקבל דוח מהמודל.");
    if (message.stop_reason === "max_tokens")
      report += "\n\n> הדוח נקטע כי הוא ארוך מדי. נסו לשלוח שאלה אחת בכל פעם.";

    const score = report.match(/^\s*SCORE:\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/m);
    await db.grading.update({
      where: { id: gradingId },
      data: {
        status: "DONE",
        reportMd: report.replace(/^\s*SCORE:.*$/m, "").trim(),
        score: score ? Number(score[1]) : null,
        maxScore: score ? Number(score[2]) : null,
        model: message.model,
      },
    });
  } catch (e) {
    await db.grading
      .update({
        where: { id: gradingId },
        data: { status: "FAILED", error: describe(e) },
      })
      .catch(() => {});
  }
}

function describe(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError)
    return "מפתח ה-API של Claude לא תקין.";
  if (e instanceof Anthropic.RateLimitError)
    return "יותר מדי בקשות כרגע. נסו שוב בעוד כמה דקות.";
  if (e instanceof Anthropic.BadRequestError)
    return `הבקשה נדחתה: ${e.message}`.slice(0, 500);
  if (e instanceof Anthropic.APIError)
    return `שגיאה מהשירות של Claude (${e.status ?? "רשת"}).`;
  return e instanceof Error ? e.message.slice(0, 500) : "שגיאה לא ידועה";
}
