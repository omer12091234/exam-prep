import { after, NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  gradingConfigured,
  MAX_UPLOAD_BYTES,
  runGrading,
  UPLOAD_TYPES,
  type Upload,
} from "@/lib/grading";

// The check itself runs after the response (see `after` below) and can take a few minutes.
export const maxDuration = 300;

const fail = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

/** Receives a solution (PDF / photos) for an exam or one question and starts the check. */
export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!gradingConfigured())
    return fail(
      503,
      "הבדיקה האוטומטית עוד לא הופעלה באתר (חסר מפתח API של Claude).",
    );

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, "הבקשה לא תקינה או שהקבצים גדולים מדי.");
  const examId = String(form.get("examId") ?? "");
  const questionId = form.get("questionId")
    ? String(form.get("questionId"))
    : null;
  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return fail(400, "לא צורף קובץ.");
  if (files.length > 10) return fail(400, "אפשר לצרף עד 10 קבצים.");
  if (files.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES)
    return fail(413, "הקבצים גדולים מדי (עד 4MB בסך הכול).");
  const types: readonly string[] = UPLOAD_TYPES;
  if (files.some((f) => !types.includes(f.type)))
    return fail(415, "אפשר לצרף PDF או תמונות (JPG, PNG, WebP).");

  const exam = await db.exam.findFirst({
    where: {
      id: examId,
      published: true,
      ...(questionId ? { questions: { some: { id: questionId } } } : {}),
    },
    select: { id: true },
  });
  if (!exam) return fail(404, "המבחן או השאלה לא נמצאו.");

  // One check at a time per user, and a daily cap: each check costs real money.
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const recent = await db.grading.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    select: { status: true, createdAt: true },
  });
  if (
    recent.some(
      (g) =>
        g.status === "PENDING" &&
        g.createdAt.getTime() > Date.now() - maxDuration * 1000,
    )
  ) {
    return fail(429, "יש בדיקה שעדיין רצה. חכו שתסתיים.");
  }
  if (recent.length >= 20) return fail(429, "הגעת למגבלה של 20 בדיקות ביממה.");

  const uploads: Upload[] = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      type: f.type as Upload["type"],
      base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
    })),
  );
  const grading = await db.grading.create({
    data: {
      userId: user.id,
      examId,
      questionId,
      fileNames: files.map((f) => f.name.slice(0, 120)),
    },
  });
  after(() => runGrading(grading.id, uploads));
  return NextResponse.json({ id: grading.id });
}
