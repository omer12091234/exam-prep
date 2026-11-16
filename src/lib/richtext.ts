import katex from "katex";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const MATH = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;

function renderMath(tex: string, display: boolean) {
  // Inside HTML the source may carry entities for &, < and >.
  const src = tex
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  const html = katex.renderToString(src, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
  });
  return display
    ? `<div dir="ltr" class="math-block">${html}</div>`
    : `<bdi dir="ltr">${html}</bdi>`;
}

/**
 * Imported HTML (topic summaries, lectures) with \( … \) / \[ … \] math → safe HTML.
 * The math is lifted out first so the sanitiser never sees TeX (it would mangle "<"),
 * the remaining markup is reduced to a small allow-list, then KaTeX output is put back.
 */
export function richHtml(html: string) {
  const math: string[] = [];
  const stashed = html.replace(
    MATH,
    (_m, display?: string, inline?: string) => {
      math.push(renderMath(display ?? inline ?? "", display != null));
      return `\u0001${math.length - 1}\u0002`;
    },
  );
  return restore(clean(stashed), math);
}

const MD_MATH =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

/** Markdown with $…$ / $$…$$ math (grading reports) → safe HTML. Same lift-out as richHtml. */
export function markdownHtml(md: string) {
  const math: string[] = [];
  const stashed = md.replace(
    MD_MATH,
    (_m, d1?: string, d2?: string, i1?: string, i2?: string) => {
      const display = d1 ?? d2;
      math.push(renderMath(display ?? i1 ?? i2 ?? "", display != null));
      return `\u0001${math.length - 1}\u0002`;
    },
  );
  return restore(clean(marked.parse(stashed, { async: false })), math);
}

const restore = (html: string, math: string[]) =>
  html.replace(/\u0001(\d+)\u0002/g, (_m, i: string) => math[Number(i)] ?? "");

function clean(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "strong",
      "em",
      "b",
      "i",
      "br",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "code",
      "pre",
      "sub",
      "sup",
      "blockquote",
      "a",
    ],
    allowedAttributes: {
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      a: ["href"],
    },
    allowedSchemes: ["https"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}
