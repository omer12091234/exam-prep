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
        return <span key={i}>{p}</span>;
      })}
    </span>
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
