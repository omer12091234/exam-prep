import katex from "katex";

/**
 * Renders Hebrew text with inline ($...$ or \\(...\\)) and display ($$...$$ or \\[...\\]) LaTeX.
 * Hebrew runs stay RTL; each formula is an isolated LTR island.
 */
const SPLIT =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$)/g;

export function MathText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(SPLIT);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (
          p.length > 4 &&
          ((p.startsWith("$$") && p.endsWith("$$")) ||
            (p.startsWith("\\[") && p.endsWith("\\]")))
        ) {
          return <Formula key={i} tex={p.slice(2, -2)} display />;
        }
        if (p.length > 4 && p.startsWith("\\(") && p.endsWith("\\)")) {
          return <Formula key={i} tex={p.slice(2, -2)} />;
        }
        if (p.length > 2 && p.startsWith("$") && p.endsWith("$")) {
          return <Formula key={i} tex={p.slice(1, -1)} />;
        }
        return <Plain key={i} text={p} />;
      })}
    </span>
  );
}

/** Non-math text; supports **bold** (the exams bold words like "מעתה"). */
function Plain({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Formula({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
  });
  return display ? (
    <div
      dir="ltr"
      className="my-2 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <bdi dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
