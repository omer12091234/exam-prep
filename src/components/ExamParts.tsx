import { MathText } from "@/components/MathText";
import { markdownHtml } from "@/lib/richtext";

type Image = { id: string; path: string; role: string };

/** A crop from the scanned exam (question header, figure or one part). */
export function Crop({ src, alt }: { src: string; alt: string }) {
  return (
    // Crops have arbitrary sizes and come from storage; plain img keeps it simple.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="my-2 w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
    />
  );
}

/** The question's intro text and its header/figure crops. */
export function QuestionStem({
  number,
  stemText,
  images,
}: {
  number: number;
  stemText: string | null;
  images: Image[];
}) {
  return (
    <>
      {stemText && (
        <div className="mb-3 leading-8">
          <MathText text={stemText} />
        </div>
      )}
      {images.map((img) => (
        <Crop
          key={img.id}
          src={img.path}
          alt={`שאלה ${number} – ${img.role === "FIGURE" ? "שרטוט" : "גוף השאלה"}`}
        />
      ))}
    </>
  );
}

/** Under one part: its crop, the solutions and real grader comments. */
export function PartExtras({
  label,
  images,
  solutions,
  comments,
}: {
  label: string;
  images: Image[];
  solutions: { id: string; author: string; contentMd: string }[];
  comments: {
    id: string;
    kind: string;
    text: string;
    pointsLost: number | null;
    maxPoints: number | null;
  }[];
}) {
  return (
    <>
      {images.length > 0 && (
        <details className="mt-2" open>
          <summary className="cursor-pointer text-sm text-neutral-500">
            תמונה מהמבחן
          </summary>
          {images.map((img) => (
            <Crop
              key={img.id}
              src={img.path}
              alt={`סעיף ${label} – תמונה מהמבחן`}
            />
          ))}
        </details>
      )}
      {solutions.map((sol) => (
        <details
          key={sol.id}
          className="mt-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
        >
          <summary className="cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-400">
            {sol.author === "AI"
              ? "פתרון מלא עם הסברים (נכתב על ידי Claude, לא פתרון רשמי)"
              : "פתרון"}
          </summary>
          <div
            className="rich mt-2"
            dangerouslySetInnerHTML={{ __html: markdownHtml(sol.contentMd) }}
          />
        </details>
      ))}
      {comments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {comments.map((c) => (
            <li
              key={c.id}
              className={
                c.kind === "PRAISE"
                  ? "text-green-700 dark:text-green-400"
                  : "text-amber-700 dark:text-amber-400"
              }
            >
              הערת בודק: {c.text}
              {c.pointsLost ? ` (−${c.pointsLost} מתוך ${c.maxPoints})` : ""}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
