import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { examTitle } from "@/lib/courses";
import { db } from "@/lib/db";

/** The checked report as a Markdown file. */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/gradings/[id]/download">,
) {
  const { id } = await ctx.params;
  const user = await requireUser();
  const g = await db.grading.findFirst({
    where: { id, userId: user.id, status: "DONE" },
    include: { exam: true },
  });
  if (!g?.reportMd) return new NextResponse("not found", { status: 404 });
  const header = `<!-- ${examTitle(g.exam)} · ${g.createdAt.toISOString().slice(0, 10)}${g.score != null ? ` · ${g.score}/${g.maxScore}` : ""} -->\n\n`;
  return new NextResponse(header + g.reportMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="grading-${g.id}.md"`,
    },
  });
}
