import katex from "katex";

/**
 * Renders Hebrew text with inline ($...$) and display ($$...$$) LaTeX.
 * Hebrew runs stay RTL; each formula is an isolated LTR island.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith("$$") && p.endsWith("$$")) {
          return <Formula key={i} tex={p.slice(2, -2)} display />;
        }
        if (p.length > 1 && p.startsWith("$") && p.endsWith("$")) {
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
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore" });
  return display ? (
    <div dir="ltr" className="my-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <bdi dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
