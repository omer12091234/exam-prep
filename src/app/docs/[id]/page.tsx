import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { richHtml } from "@/lib/richtext";

export default function DocPage({ params }: PageProps<"/docs/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}>
        <Doc params={params} />
      </Suspense>
    </main>
  );
}

async function Doc({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const doc = await db.courseDoc.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!doc) notFound();
  return (
    <>
      <Link
        href={`/courses/${doc.course.slug}/topics`}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← {doc.course.name}
      </Link>
      <h1 className="mt-2 mb-2 text-2xl font-bold">{doc.title}</h1>
      {doc.note && <p className="mb-4 text-sm text-neutral-500">{doc.note}</p>}
      {doc.sourceUrl && (
        <p className="mb-4 text-sm">
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            קובץ המקור בדרייב
          </a>
        </p>
      )}
      <article
        className="rich"
        dangerouslySetInnerHTML={{ __html: richHtml(doc.html) }}
      />
    </>
  );
}
